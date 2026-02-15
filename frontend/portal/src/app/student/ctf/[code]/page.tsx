'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    AlertCircle,
    ArrowLeft,
    Beaker,
    CheckCircle2,
    Flame,
    Lightbulb,
    Lock,
    Play,
    RefreshCw,
    Send,
    Terminal,
    Trophy,
} from 'lucide-react';
import { useAuth } from '../../../auth/useAuth';
import { CourseCard, CoursePageShell, CoursePill } from '@/components/course/CoursePageShell';
import { APP_URLS } from '@shared/lib/app-urls';

type CtfStatus = 'LOCKED' | 'UNLOCKED' | 'IN_PROGRESS' | 'COMPLETED';
type CtfMode = 'GUIDED' | 'FREE';

type GuidedStep = {
    stepNumber: number;
    stepTitle: string;
    stepDescription: string;
    stepType: string;
    commandTemplate: string | null;
    expectedOutput: string | null;
    hintText: string | null;
};

type HintInfo = {
    hintNumber: number;
    hintText: string | null;
    costPoints: number;
    unlocked: boolean;
};

type ChallengeDetail = {
    id: string;
    code: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    points: number;
    prerequisiteChallengeCode: string | null;
    targetService: string;
    targetEndpoint: string;
    vulnerabilityType: string;
    attackVector: string;
    learningObjectives: string[];
    estimatedMinutes: number;
    status: CtfStatus;
    started?: boolean;
    mode?: CtfMode;
    currentGuidedStep?: number;
    totalSteps?: number;
    guidedSteps?: GuidedStep[];
    freeModeDescription?: string;
    hints?: HintInfo[];
    hintsUnlocked?: number[];
};

const CATEGORY_LABELS: Record<string, string> = {
    HSM_ATTACK: 'HSM',
    REPLAY_ATTACK: 'Replay',
    '3DS_BYPASS': '3DS',
    FRAUD_CNP: 'Fraude CNP',
    ISO8583_MANIPULATION: 'ISO 8583',
    PIN_CRACKING: 'PIN',
    MITM: 'MITM',
    PRIVILEGE_ESCALATION: 'Privesc',
    CRYPTO_WEAKNESS: 'Crypto',
};

const DIFFICULTY_PILL: Record<string, { label: string; tone: Parameters<typeof CoursePill>[0]['tone'] }> = {
    BEGINNER: { label: 'Beginner', tone: 'emerald' },
    INTERMEDIATE: { label: 'Intermediate', tone: 'amber' },
    ADVANCED: { label: 'Advanced', tone: 'rose' },
    EXPERT: { label: 'Expert', tone: 'violet' },
};

function statusMeta(status: CtfStatus): { label: string; tone: Parameters<typeof CoursePill>[0]['tone']; icon: React.ReactNode } {
    if (status === 'COMPLETED') {
        return { label: 'Résolu', tone: 'emerald', icon: <CheckCircle2 className="h-4 w-4" /> };
    }
    if (status === 'IN_PROGRESS') {
        return { label: 'En cours', tone: 'amber', icon: <Flame className="h-4 w-4" /> };
    }
    if (status === 'LOCKED') {
        return { label: 'Verrouillé', tone: 'slate', icon: <Lock className="h-4 w-4" /> };
    }
    return { label: 'Disponible', tone: 'cyan', icon: <Trophy className="h-4 w-4" /> };
}

export default function CtfChallengeDetailPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = use(params);
    const router = useRouter();
    const { isLoading: authLoading } = useAuth(true);

    const challengeCode = useMemo(() => decodeURIComponent(String(code || '')).trim(), [code]);
    const normalizedCode = useMemo(() => challengeCode.toUpperCase(), [challengeCode]);

    const [mode, setMode] = useState<CtfMode>('GUIDED');
    const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [flagInput, setFlagInput] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitResult, setSubmitResult] = useState<{ ok: boolean; message: string; pointsAwarded?: number } | null>(null);

    const getHeaders = useCallback(() => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : null;
    }, []);

    const fetchChallenge = useCallback(async (requestedMode?: CtfMode) => {
        if (!normalizedCode) return;

        const headers = getHeaders();
        if (!headers) {
            setError('Session expirée. Merci de vous reconnecter.');
            setLoading(false);
            return;
        }

        const activeMode = requestedMode || mode;

        try {
            setError(null);
            setRefreshing(true);
            setLoading((prev) => prev || !challenge);

            const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}?mode=${activeMode}`, {
                headers,
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok && data?.success && data?.challenge) {
                setChallenge(data.challenge);
                if (data.challenge.mode === 'GUIDED' || data.challenge.mode === 'FREE') {
                    setMode(data.challenge.mode);
                }
                return;
            }

            if (data?.challenge) {
                setChallenge(data.challenge);
            }

            throw new Error(data?.error || 'Impossible de charger ce challenge.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur de chargement.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [challenge, getHeaders, mode, normalizedCode]);

    useEffect(() => {
        if (authLoading) return;
        void fetchChallenge();
    }, [authLoading, fetchChallenge]);

    const startChallenge = useCallback(async () => {
        const headers = getHeaders();
        if (!headers || !normalizedCode) return;

        try {
            setSubmitting(true);
            setSubmitResult(null);
            setError(null);

            const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}/start`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ mode }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || 'Impossible de démarrer ce challenge.');
            }

            await fetchChallenge(mode);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors du démarrage.');
        } finally {
            setSubmitting(false);
        }
    }, [fetchChallenge, getHeaders, mode, normalizedCode]);

    const advanceGuidedStep = useCallback(async () => {
        const headers = getHeaders();
        if (!headers || !normalizedCode) return;

        try {
            setSubmitting(true);
            setError(null);

            const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}/step/next`, {
                method: 'POST',
                headers,
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || 'Impossible d’avancer l’étape guidée.');
            }

            await fetchChallenge('GUIDED');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors de l’avancement.');
        } finally {
            setSubmitting(false);
        }
    }, [fetchChallenge, getHeaders, normalizedCode]);

    const unlockHint = useCallback(async (hintNumber: number) => {
        const headers = getHeaders();
        if (!headers || !normalizedCode) return;

        try {
            setSubmitting(true);
            setError(null);

            const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}/hint/${hintNumber}`, {
                method: 'POST',
                headers,
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || 'Impossible de débloquer cet indice.');
            }

            await fetchChallenge();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors du déblocage.');
        } finally {
            setSubmitting(false);
        }
    }, [fetchChallenge, getHeaders, normalizedCode]);

    const submitFlag = useCallback(async () => {
        const headers = getHeaders();
        if (!headers || !normalizedCode) return;
        if (!flagInput.trim()) return;

        try {
            setSubmitting(true);
            setSubmitResult(null);
            setError(null);

            const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}/submit`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ submittedFlag: flagInput.trim(), mode }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success || !data?.result) {
                throw new Error(data?.error || 'Soumission impossible.');
            }

            if (data.result.isCorrect) {
                setSubmitResult({
                    ok: true,
                    message: data.result.alreadySolved ? 'Déjà résolu. Bravo.' : 'Flag correct. Challenge résolu.',
                    pointsAwarded: data.result.pointsAwarded,
                });
                await fetchChallenge();
                router.push(`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}/remediation`);
            } else {
                setSubmitResult({
                    ok: false,
                    message: data.result.message || 'Flag incorrect. Réessayez.',
                });
            }
        } catch (err) {
            setSubmitResult({ ok: false, message: err instanceof Error ? err.message : 'Erreur lors de la soumission.' });
        } finally {
            setSubmitting(false);
        }
    }, [fetchChallenge, flagInput, getHeaders, mode, normalizedCode, router]);

    const viewModel = useMemo(() => {
        const status: CtfStatus = challenge?.status || 'UNLOCKED';
        const statusInfo = statusMeta(status);
        const difficultyInfo =
            DIFFICULTY_PILL[challenge?.difficulty || ''] || { label: challenge?.difficulty || 'N/A', tone: 'slate' as const };

        const guidedSteps = challenge?.guidedSteps || [];
        const totalSteps = Math.max(0, Number(challenge?.totalSteps || guidedSteps.length || 0));
        const currentGuidedStep = Math.max(1, Number(challenge?.currentGuidedStep || guidedSteps.length || 1));
        const activeStepNumber = status === 'COMPLETED' ? totalSteps : currentGuidedStep;

        const hints = challenge?.hints || [];

        return {
            status,
            statusInfo,
            difficultyInfo,
            categoryLabel: CATEGORY_LABELS[challenge?.category || ''] || challenge?.category || 'N/A',
            totalSteps,
            activeStepNumber,
            guidedSteps,
            hints,
        };
    }, [challenge]);

    if (authLoading || loading) {
        return (
            <CoursePageShell
                title="Chargement du challenge..."
                description="Preparation du contenu CTF et de votre progression."
                icon={<Beaker className="h-8 w-8 text-emerald-300" />}
                crumbs={[
                    { label: 'Mon Parcours', href: '/student' },
                    { label: 'Security Labs', href: APP_URLS.studentCtf },
                    { label: 'Chargement' },
                ]}
                backHref={APP_URLS.studentCtf}
                backLabel="Retour aux challenges"
            >
                <CourseCard className="p-8">
                    <div className="flex items-center gap-3 text-slate-300">
                        <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
                        <span className="text-sm">Chargement...</span>
                    </div>
                    <div className="mt-6 space-y-3 animate-pulse">
                        <div className="h-3 w-2/3 rounded bg-slate-800/70" />
                        <div className="h-3 w-full rounded bg-slate-800/50" />
                        <div className="h-3 w-5/6 rounded bg-slate-800/40" />
                    </div>
                </CourseCard>
            </CoursePageShell>
        );
    }

    if (!challenge) {
        return (
            <CoursePageShell
                title="Challenge introuvable"
                description={error || 'Le challenge demande est introuvable.'}
                icon={<AlertCircle className="h-8 w-8 text-red-200" />}
                crumbs={[
                    { label: 'Mon Parcours', href: '/student' },
                    { label: 'Security Labs', href: APP_URLS.studentCtf },
                    { label: 'Erreur' },
                ]}
                backHref={APP_URLS.studentCtf}
                backLabel="Retour aux challenges"
            >
                <CourseCard className="border border-red-500/20 bg-red-500/5 p-6 md:p-8">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 text-red-300" />
                        <div className="min-w-0">
                            <h2 className="text-lg font-semibold text-white">Impossible de charger le challenge</h2>
                            <p className="mt-1 text-sm text-red-100/90">{error || 'Erreur inconnue.'}</p>
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <button
                                    onClick={() => void fetchChallenge()}
                                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
                                >
                                    Reessayer
                                </button>
                                <Link
                                    href={APP_URLS.studentCtf}
                                    className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 text-sm font-semibold hover:bg-slate-900/60"
                                >
                                    Retour aux challenges
                                </Link>
                            </div>
                        </div>
                    </div>
                </CourseCard>
            </CoursePageShell>
        );
    }

    const isLocked = viewModel.status === 'LOCKED';
    const isUnlocked = viewModel.status === 'UNLOCKED';
    const isInProgress = viewModel.status === 'IN_PROGRESS';
    const isCompleted = viewModel.status === 'COMPLETED';
    const showGuided = mode === 'GUIDED';

    const aside = (
        <div className="space-y-4">
            <CourseCard className="p-4">
                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-[0.2em] mb-3">
                    Mode
                </p>
                <div className="grid grid-cols-2 gap-2">
                    {(['GUIDED', 'FREE'] as const).map((m) => {
                        const active = mode === m;
                        return (
                            <button
                                key={m}
                                onClick={() => {
                                    setMode(m);
                                    void fetchChallenge(m);
                                }}
                                className={`px-3 py-2 rounded-xl text-sm font-semibold border transition ${
                                    active
                                        ? 'bg-white text-slate-950 border-white/10'
                                        : 'bg-slate-950/40 border-white/10 text-slate-200 hover:bg-white/5'
                                }`}
                            >
                                {m === 'GUIDED' ? 'Guide' : 'Libre'}
                            </button>
                        );
                    })}
                </div>
                {challenge.prerequisiteChallengeCode && (
                    <div className="mt-4 text-sm text-slate-400">
                        Prerequis: <span className="font-mono text-slate-200">{challenge.prerequisiteChallengeCode}</span>
                    </div>
                )}
            </CourseCard>

            <CourseCard className="p-4">
                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-[0.2em] mb-3">
                    Actions
                </p>
                <div className="space-y-2">
                    <Link
                        href={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}/terminal`}
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-950/50 border border-white/10 text-sm font-semibold text-slate-200 hover:bg-slate-950 hover:border-white/20 transition"
                    >
                        <Terminal className="h-4 w-4 text-cyan-300" />
                        Ouvrir AttackBox
                    </Link>
                    <Link
                        href={APP_URLS.studentCtfLeaderboard}
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-950/50 border border-white/10 text-sm font-semibold text-slate-200 hover:bg-slate-950 hover:border-white/20 transition"
                    >
                        <Trophy className="h-4 w-4 text-amber-300" />
                        Leaderboard
                    </Link>
                    <Link
                        href={APP_URLS.studentCtf}
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-950/50 border border-white/10 text-sm font-semibold text-slate-200 hover:bg-slate-950 hover:border-white/20 transition"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Retour
                    </Link>
                </div>
            </CourseCard>
        </div>
    );

    return (
        <CoursePageShell
            title={challenge.title}
            description={challenge.description}
            icon={<Beaker className="h-8 w-8 text-emerald-300" />}
            crumbs={[
                { label: 'Mon Parcours', href: '/student' },
                { label: 'Security Labs', href: APP_URLS.studentCtf },
                { label: challenge.code },
            ]}
            backHref={APP_URLS.studentCtf}
            backLabel="Retour aux challenges"
            meta={
                <>
                    <CoursePill tone="slate">{challenge.code}</CoursePill>
                    <CoursePill tone={viewModel.difficultyInfo.tone}>{viewModel.difficultyInfo.label}</CoursePill>
                    <CoursePill tone="slate">{viewModel.categoryLabel}</CoursePill>
                    <CoursePill tone="slate">{challenge.points} pts</CoursePill>
                    <CoursePill tone={viewModel.statusInfo.tone}>
                        {viewModel.statusInfo.icon}
                        {viewModel.statusInfo.label}
                    </CoursePill>
                    <CoursePill tone="slate">~{challenge.estimatedMinutes} min</CoursePill>
                </>
            }
            headerFooter={
                showGuided && (isInProgress || isCompleted) ? (
                    <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 bg-slate-800/70 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-700"
                                style={{
                                    width: `${viewModel.totalSteps > 0 ? Math.round((viewModel.activeStepNumber / viewModel.totalSteps) * 100) : 0}%`,
                                }}
                            />
                        </div>
                        <span className="text-xs font-mono text-emerald-200">
                            {viewModel.activeStepNumber}/{Math.max(1, viewModel.totalSteps)}
                        </span>
                    </div>
                ) : null
            }
            actions={
                <button
                    onClick={() => void fetchChallenge()}
                    className={`px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 text-sm font-semibold inline-flex items-center gap-2 ${
                        refreshing ? 'opacity-70' : ''
                    }`}
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Actualiser
                </button>
            }
            aside={aside}
        >
            <div className="space-y-6">
                {error && (
                    <CourseCard className="border border-red-500/20 bg-red-500/5 p-4 md:p-5">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 h-5 w-5 text-red-300" />
                            <p className="text-sm text-red-100/90">{error}</p>
                        </div>
                    </CourseCard>
                )}

                {isLocked && (
                    <CourseCard className="p-6 md:p-8 border border-amber-500/20 bg-amber-500/5">
                        <div className="flex items-start gap-3">
                            <Lock className="mt-0.5 h-5 w-5 text-amber-300" />
                            <div className="min-w-0">
                                <h2 className="text-lg font-bold text-white">Challenge verrouille</h2>
                                <p className="mt-1 text-sm text-slate-300">
                                    Terminez le prerequis pour le debloquer.
                                </p>
                                {challenge.prerequisiteChallengeCode && (
                                    <p className="mt-3 text-sm text-slate-400">
                                        Prerequis: <span className="font-mono text-slate-200">{challenge.prerequisiteChallengeCode}</span>
                                    </p>
                                )}
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <Link
                                        href={APP_URLS.studentCtf}
                                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
                                    >
                                        Voir les challenges
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </CourseCard>
                )}

                {isUnlocked && (
                    <CourseCard className="p-6 md:p-8">
                        <h2 className="text-xl font-black tracking-tight text-white">Pret a commencer</h2>
                        <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                            Choisissez un mode, ouvrez l AttackBox, puis demarrez le challenge.
                        </p>
                        <div className="mt-5 flex flex-wrap items-center gap-2">
                            <Link
                                href={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}/terminal`}
                                className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 text-sm font-semibold inline-flex items-center gap-2"
                            >
                                <Terminal className="h-4 w-4 text-cyan-300" />
                                Ouvrir AttackBox
                            </Link>
                            <button
                                onClick={() => void startChallenge()}
                                disabled={submitting}
                                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                            >
                                <Play className="h-4 w-4" />
                                {submitting ? 'Demarrage...' : 'Demarrer'}
                            </button>
                        </div>
                    </CourseCard>
                )}

                {(isInProgress || isCompleted) && showGuided && (
                    <CourseCard className="p-6 md:p-8">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Terminal className="h-5 w-5 text-cyan-300" />
                                    Etapes guidees
                                </h2>
                                <p className="mt-1 text-sm text-slate-400">
                                    Avancez une etape a la fois. Les commandes affichees sont adaptees au lab.
                                </p>
                            </div>
                            {!isCompleted && (
                                <button
                                    onClick={() => void advanceGuidedStep()}
                                    disabled={submitting}
                                    className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2"
                                >
                                    <RefreshCw className={`h-4 w-4 ${submitting ? 'animate-spin' : ''}`} />
                                    Etape suivante
                                </button>
                            )}
                        </div>

                        <div className="mt-6 space-y-3">
                            {viewModel.guidedSteps.length > 0 ? (
                                viewModel.guidedSteps.map((step) => {
                                    const isActive = !isCompleted && step.stepNumber === viewModel.activeStepNumber;
                                    const isDone = isCompleted || step.stepNumber < viewModel.activeStepNumber;
                                    return (
                                        <div
                                            key={step.stepNumber}
                                            className={`rounded-2xl border p-5 transition ${
                                                isDone
                                                    ? 'bg-emerald-500/5 border-emerald-500/15'
                                                    : isActive
                                                        ? 'bg-cyan-500/5 border-cyan-500/20'
                                                        : 'bg-slate-950/40 border-white/10'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div
                                                    className={`h-9 w-9 rounded-xl flex items-center justify-center text-sm font-black ${
                                                        isDone ? 'bg-emerald-500 text-slate-950' : isActive ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-200'
                                                    }`}
                                                >
                                                    {isDone ? <CheckCircle2 className="h-5 w-5" /> : step.stepNumber}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-white">{step.stepTitle}</p>
                                                    <p className="mt-1 text-sm text-slate-300 leading-relaxed">{step.stepDescription}</p>

                                                    {step.commandTemplate && (
                                                        <pre className="mt-3 rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs text-emerald-200 overflow-auto whitespace-pre-wrap">
                                                            {step.commandTemplate}
                                                        </pre>
                                                    )}

                                                    {isActive && step.hintText && (
                                                        <div className="mt-3 text-xs text-amber-200 flex items-start gap-2">
                                                            <Lightbulb className="h-4 w-4 text-amber-300 mt-0.5 flex-shrink-0" />
                                                            <p className="leading-relaxed">{step.hintText}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-sm text-slate-400">Aucune etape disponible pour le moment.</p>
                            )}
                        </div>
                    </CourseCard>
                )}

                {(isInProgress || isCompleted) && mode === 'FREE' && (
                    <CourseCard className="p-6 md:p-8">
                        <h2 className="text-lg font-bold text-white">Mode libre</h2>
                        <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                            {challenge.freeModeDescription || 'Objectif: resoudre le challenge en autonomie, puis soumettre le flag.'}
                        </p>
                        <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                            <p className="font-semibold text-white mb-2">Cible</p>
                            <p className="font-mono text-xs text-slate-200 whitespace-pre-wrap">{challenge.targetEndpoint}</p>
                            <p className="mt-2 text-xs text-slate-500">Service: {challenge.targetService}</p>
                        </div>
                    </CourseCard>
                )}

                {(isInProgress || isCompleted) && viewModel.hints.length > 0 && (
                    <CourseCard className="p-6 md:p-8">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Lightbulb className="h-5 w-5 text-amber-300" />
                            Indices
                        </h2>
                        <div className="mt-5 space-y-2">
                            {viewModel.hints.map((hint) => (
                                <div
                                    key={hint.hintNumber}
                                    className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-white">Indice {hint.hintNumber}</p>
                                        {hint.unlocked ? (
                                            <span className="text-xs font-semibold text-emerald-300">Debloque</span>
                                        ) : (
                                            <button
                                                onClick={() => void unlockHint(hint.hintNumber)}
                                                disabled={submitting}
                                                className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-semibold hover:bg-amber-500/20 disabled:opacity-60"
                                            >
                                                Debloquer (-{hint.costPoints} pts)
                                            </button>
                                        )}
                                    </div>
                                    {hint.unlocked && hint.hintText && (
                                        <p className="mt-2 text-sm text-slate-300 leading-relaxed">{hint.hintText}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CourseCard>
                )}

                {(isInProgress || isCompleted) && (
                    <CourseCard className="p-6 md:p-8">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Send className="h-5 w-5 text-cyan-300" />
                            Soumettre le flag
                        </h2>

                        {submitResult && (
                            <div
                                className={`mt-4 rounded-2xl border p-4 text-sm ${
                                    submitResult.ok
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-100'
                                        : 'bg-rose-500/10 border-rose-500/20 text-rose-100'
                                }`}
                            >
                                <p className="font-semibold">
                                    {submitResult.ok ? 'Succes' : 'Erreur'}: {submitResult.message}
                                    {typeof submitResult.pointsAwarded === 'number' && submitResult.ok && (
                                        <span className="ml-2 font-mono text-emerald-200">+{submitResult.pointsAwarded} pts</span>
                                    )}
                                </p>
                            </div>
                        )}

                        {!isCompleted ? (
                            <div className="mt-4 flex flex-col sm:flex-row gap-2">
                                <input
                                    type="text"
                                    value={flagInput}
                                    onChange={(event) => setFlagInput(event.target.value)}
                                    placeholder="PMP{...}"
                                    className="flex-1 px-4 py-3 rounded-xl bg-slate-950/40 border border-white/10 text-sm font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            void submitFlag();
                                        }
                                    }}
                                />
                                <button
                                    onClick={() => void submitFlag()}
                                    disabled={submitting || !flagInput.trim()}
                                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 disabled:opacity-50 text-white text-sm font-bold inline-flex items-center justify-center gap-2"
                                >
                                    {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    Soumettre
                                </button>
                            </div>
                        ) : (
                            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center">
                                <CheckCircle2 className="h-10 w-10 text-emerald-300 mx-auto" />
                                <p className="mt-2 text-emerald-100 font-bold">Challenge resolu</p>
                                <div className="mt-4 flex flex-wrap justify-center gap-2">
                                    <Link
                                        href={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}/remediation`}
                                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
                                    >
                                        Voir la remediation
                                    </Link>
                                    <Link
                                        href={APP_URLS.studentCtf}
                                        className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 text-sm font-semibold"
                                    >
                                        Retour au dashboard
                                    </Link>
                                </div>
                            </div>
                        )}
                    </CourseCard>
                )}
            </div>
        </CoursePageShell>
    );
}
