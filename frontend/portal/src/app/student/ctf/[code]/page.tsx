'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    AlertCircle,
    ArrowLeft,
    Beaker,
    BookOpen,
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
    adaptiveGuidance?: {
        learnerProfile: 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED';
        focus: string;
        checklist: string[];
        successSignal: string;
    };
};

type HintInfo = {
    hintNumber: number;
    hintText: string | null;
    costPoints: number;
    unlocked: boolean;
    eligible?: boolean;
    lockedReason?: string | null;
    unlockPolicy?: {
        minMinutes: number;
        minFailedAttempts: number;
        requiredPreviousHint: number | null;
        elapsedMinutes: number;
        failedAttempts: number;
    };
};

type MissionBrief = {
    role: string;
    businessContext: string;
    incidentTrigger: string;
    objective: string;
    successCriteria: string;
};

type IncidentArtifact = {
    artifactId: string;
    artifactType: 'LOG' | 'TRACE' | 'TICKET' | 'SIEM';
    title: string;
    description: string;
    sample: string;
};

type RubricCriteria = {
    criterion: string;
    weight: number;
    description: string;
};

type ProofRubric = {
    technical: RubricCriteria[];
    communication: RubricCriteria[];
    passingScore: number;
};

type DebriefPayload = {
    rootCause: string;
    impactSummary: string;
    mitigationPriorities: string[];
    evidenceSummary: string;
    technicalScore?: number;
    communicationScore?: number;
    patchScore?: number;
    completed?: boolean;
    updatedAt?: string | null;
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
    relatedWorkshopPath?: string;
    learnerProfile?: 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED';
    adaptiveProfiles?: Array<'NOVICE' | 'INTERMEDIATE' | 'ADVANCED'>;
    adaptivePathNotes?: Partial<Record<'NOVICE' | 'INTERMEDIATE' | 'ADVANCED', string>>;
    failedAttempts?: number;
    missionBrief?: MissionBrief;
    incidentArtifacts?: IncidentArtifact[];
    proofRubric?: ProofRubric;
    debriefTemplate?: {
        rootCausePrompt?: string;
        impactPrompt?: string;
        mitigationPrompt?: string;
        evidencePrompt?: string;
        checklist?: string[];
    };
    debrief?: DebriefPayload | null;
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

const LEGACY_WORKSHOP_REDIRECTS: Record<string, string> = {
    '/workshops/intro': '/student/theory/intro',
    '/workshops/iso8583': '/student/theory/iso8583',
    '/workshops/hsm-keys': '/student/theory/hsm-keys',
    '/workshops/3ds-flow': '/student/theory/3ds-flow',
    '/workshops/fraud-detection': '/student/theory/fraud-detection',
    '/workshops/emv': '/student/theory/emv',
    '/workshops/session-security': '/student/cursus'
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

function normalizeRelatedTheoryPath(path?: string | null): string | null {
    if (!path) {
        return null;
    }

    const trimmed = path.trim();
    if (!trimmed) {
        return null;
    }

    if (LEGACY_WORKSHOP_REDIRECTS[trimmed]) {
        return LEGACY_WORKSHOP_REDIRECTS[trimmed];
    }

    if (trimmed.startsWith('/workshops/')) {
        return '/student/cursus';
    }

    return trimmed;
}

export default function CtfChallengeDetailPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = use(params);
    const router = useRouter();
    const { isLoading: authLoading } = useAuth(true);

    const challengeCode = useMemo(() => decodeURIComponent(String(code || '')).trim(), [code]);
    const normalizedCode = useMemo(() => challengeCode.toUpperCase(), [challengeCode]);

    const [mode, setMode] = useState<CtfMode>('GUIDED');
    const [learnerProfile, setLearnerProfile] = useState<'NOVICE' | 'INTERMEDIATE' | 'ADVANCED'>('INTERMEDIATE');
    const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [flagInput, setFlagInput] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showLearningModal, setShowLearningModal] = useState(false);
    const [learningAnswers, setLearningAnswers] = useState<{ vulnerabilityType: string; businessImpact: string; fixPriority: string }>({ vulnerabilityType: '', businessImpact: '', fixPriority: '' });
    const [submitResult, setSubmitResult] = useState<{
        ok: boolean;
        message: string;
        pointsAwarded?: number;
        axisScores?: { time: number; proof: number; patch: number; total: number };
        feedback?: Array<{ code: string; severity: string; message: string }>;
        debriefRequired?: boolean;
    } | null>(null);
    const [debriefDraft, setDebriefDraft] = useState<DebriefPayload>({
        rootCause: '',
        impactSummary: '',
        mitigationPriorities: [],
        evidenceSummary: '',
    });
    const [debriefInput, setDebriefInput] = useState('');
    const [debriefSaving, setDebriefSaving] = useState(false);
    const [debriefMessage, setDebriefMessage] = useState<string | null>(null);

    const getHeaders = useCallback(() => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : null;
    }, []);

    const fetchChallenge = useCallback(async (
        requestedMode?: CtfMode,
        requestedProfile?: 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED'
    ) => {
        if (!normalizedCode) return;

        const headers = getHeaders();
        if (!headers) {
            setError('Session expirée. Merci de vous reconnecter.');
            setLoading(false);
            return;
        }

        const activeMode = requestedMode || mode;
        const activeProfile = requestedProfile || learnerProfile;

        try {
            setError(null);
            setRefreshing(true);
            setLoading((prev) => prev || !challenge);

            const params = new URLSearchParams({
                mode: activeMode,
                profile: activeProfile,
            });

            const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}?${params.toString()}`, {
                headers,
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok && data?.success && data?.challenge) {
                const normalizedChallenge: ChallengeDetail = {
                    ...data.challenge,
                    relatedWorkshopPath: normalizeRelatedTheoryPath(data.challenge.relatedWorkshopPath)
                };
                setChallenge(normalizedChallenge);
                if (normalizedChallenge.mode === 'GUIDED' || normalizedChallenge.mode === 'FREE') {
                    setMode(normalizedChallenge.mode);
                }
                if (normalizedChallenge.learnerProfile === 'NOVICE' || normalizedChallenge.learnerProfile === 'INTERMEDIATE' || normalizedChallenge.learnerProfile === 'ADVANCED') {
                    setLearnerProfile(normalizedChallenge.learnerProfile);
                }
                if (normalizedChallenge.debrief) {
                    setDebriefDraft(normalizedChallenge.debrief);
                    setDebriefInput((normalizedChallenge.debrief.mitigationPriorities || []).join('\n'));
                }
                return;
            }

            if (data?.challenge) {
                const normalizedChallenge: ChallengeDetail = {
                    ...data.challenge,
                    relatedWorkshopPath: normalizeRelatedTheoryPath(data.challenge.relatedWorkshopPath)
                };
                setChallenge(normalizedChallenge);
            }

            throw new Error(data?.error || 'Impossible de charger ce challenge.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur de chargement.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [challenge, getHeaders, learnerProfile, mode, normalizedCode]);

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
                body: JSON.stringify({ mode, learnerProfile }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || 'Impossible de démarrer ce challenge.');
            }

            await fetchChallenge(mode, learnerProfile);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors du démarrage.');
        } finally {
            setSubmitting(false);
        }
    }, [fetchChallenge, getHeaders, learnerProfile, mode, normalizedCode]);

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
                body: JSON.stringify({ submittedFlag: flagInput.trim(), mode, learnerProfile }),
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
                    axisScores: data.result.axisScores,
                    feedback: data.result.feedback || [],
                    debriefRequired: Boolean(data.result.debriefRequired),
                });
                await fetchChallenge();
                if (!data.result.debriefRequired && !data.result.alreadySolved) {
                    setShowLearningModal(true);
                } else if (!data.result.debriefRequired) {
                    router.push(`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}/remediation`);
                }
            } else {
                setSubmitResult({
                    ok: false,
                    message: data.result.message || 'Flag incorrect. Réessayez.',
                    axisScores: data.result.axisScores,
                    feedback: data.result.feedback || [],
                });
            }
        } catch (err) {
            setSubmitResult({ ok: false, message: err instanceof Error ? err.message : 'Erreur lors de la soumission.' });
        } finally {
            setSubmitting(false);
        }
    }, [fetchChallenge, flagInput, getHeaders, learnerProfile, mode, normalizedCode, router]);

    const submitLearningCheck = useCallback(async () => {
        const headers = getHeaders();
        if (headers && normalizedCode) {
            try {
                await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}/learning-check`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(learningAnswers),
                });
            } catch { /* ignore — redirect anyway */ }
        }
        setShowLearningModal(false);
        router.push(`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}/remediation`);
    }, [getHeaders, learningAnswers, normalizedCode, router]);

    const submitDebrief = useCallback(async () => {
        const headers = getHeaders();
        if (!headers || !normalizedCode) return;

        const mitigationPriorities = debriefInput
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);

        const payload = {
            rootCause: debriefDraft.rootCause || '',
            impactSummary: debriefDraft.impactSummary || '',
            mitigationPriorities,
            evidenceSummary: debriefDraft.evidenceSummary || '',
        };

        try {
            setDebriefSaving(true);
            setDebriefMessage(null);
            setError(null);

            const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}/debrief`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || 'Debrief submission failed.');
            }

            setDebriefMessage('Debrief enregistre. Le scoring multi-axe est mis a jour.');
            await fetchChallenge();
        } catch (err) {
            setDebriefMessage(err instanceof Error ? err.message : 'Erreur lors de la soumission du debrief.');
        } finally {
            setDebriefSaving(false);
        }
    }, [debriefDraft.evidenceSummary, debriefDraft.impactSummary, debriefDraft.rootCause, debriefInput, fetchChallenge, getHeaders, normalizedCode]);

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
                                    void fetchChallenge(m, learnerProfile);
                                }}
                                className={`px-3 py-2 rounded-xl text-sm font-semibold border transition ${active
                                        ? 'bg-white text-slate-950 border-white/10'
                                        : 'bg-slate-950/40 border-white/10 text-slate-200 hover:bg-white/5'
                                    }`}
                            >
                                {m === 'GUIDED' ? 'Guide' : 'Libre'}
                            </button>
                        );
                    })}
                </div>
                <div className="mt-4">
                    <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-[0.2em] mb-2">
                        Profil
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                        {(challenge?.adaptiveProfiles || ['NOVICE', 'INTERMEDIATE', 'ADVANCED']).map((profile) => {
                            const active = learnerProfile === profile;
                            return (
                                <button
                                    key={profile}
                                    onClick={() => {
                                        setLearnerProfile(profile);
                                        void fetchChallenge(mode, profile);
                                    }}
                                    className={`px-2 py-2 rounded-xl text-xs font-semibold border transition ${active
                                        ? 'bg-cyan-400 text-slate-950 border-cyan-300/60'
                                        : 'bg-slate-950/40 border-white/10 text-slate-200 hover:bg-white/5'
                                        }`}
                                >
                                    {profile === 'INTERMEDIATE' ? 'INTER' : profile}
                                </button>
                            );
                        })}
                    </div>
                    {challenge?.adaptivePathNotes?.[learnerProfile] && (
                        <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                            {challenge.adaptivePathNotes[learnerProfile]}
                        </p>
                    )}
                </div>
                {challenge.prerequisiteChallengeCode && (
                    <div className="mt-4 text-sm text-slate-400">
                        Prerequis: <span className="font-mono text-slate-200">{challenge.prerequisiteChallengeCode}</span>
                    </div>
                )}
                <div className="mt-3 text-xs text-slate-500">
                    Essais rates: <span className="font-mono text-slate-300">{challenge.failedAttempts || 0}</span>
                </div>
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
                    {challenge?.relatedWorkshopPath && (
                        <Link
                            href={challenge.relatedWorkshopPath}
                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-sm font-semibold text-indigo-200 hover:bg-indigo-500/15 hover:border-indigo-500/30 transition"
                        >
                            <BookOpen className="h-4 w-4 text-indigo-300" />
                            Revoir la théorie
                        </Link>
                    )}
                </div>
            </CourseCard>
        </div>
    );

    const learningModal = showLearningModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl border border-emerald-500/20 bg-slate-900 p-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-1">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400 flex-shrink-0" />
                    <h2 className="text-xl font-black text-white">Qu&apos;as-tu appris ?</h2>
                </div>
                <p className="text-sm text-slate-400 mb-6 ml-11">3 questions rapides pour consolider ton apprentissage.</p>

                <div className="space-y-5">
                    <div>
                        <p className="text-sm font-semibold text-slate-200 mb-2">1. Type de vulnérabilité exploitée ?</p>
                        <div className="grid grid-cols-2 gap-2">
                            {["Contrôle d'accès brisé", 'Faiblesse cryptographique', 'Injection / manipulation', 'Mauvaise configuration'].map((opt) => (
                                <button key={opt} onClick={() => setLearningAnswers((prev) => ({ ...prev, vulnerabilityType: opt }))}
                                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition text-left ${learningAnswers.vulnerabilityType === opt ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700'}`}>
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="text-sm font-semibold text-slate-200 mb-2">2. Impact réel si en production ?</p>
                        <div className="grid grid-cols-3 gap-2">
                            {['Fraude financière directe', 'Fuite de données sensibles', 'Perturbation de service'].map((opt) => (
                                <button key={opt} onClick={() => setLearningAnswers((prev) => ({ ...prev, businessImpact: opt }))}
                                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition text-center ${learningAnswers.businessImpact === opt ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700'}`}>
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="text-sm font-semibold text-slate-200 mb-2">3. Fix le plus urgent ?</p>
                        <div className="grid grid-cols-3 gap-2">
                            {['Rotation des clés', 'Validation stricte des inputs', 'Audit et monitoring'].map((opt) => (
                                <button key={opt} onClick={() => setLearningAnswers((prev) => ({ ...prev, fixPriority: opt }))}
                                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition text-center ${learningAnswers.fixPriority === opt ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700'}`}>
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={() => void submitLearningCheck()}
                        className="flex-1 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm"
                    >
                        Valider et voir la remédiation →
                    </button>
                    <button
                        onClick={() => void submitLearningCheck()}
                        className="px-4 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm"
                    >
                        Passer
                    </button>
                </div>
            </div>
        </div>
    ) : null;

    return (
        <>
        {learningModal}
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
                    className={`px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 text-sm font-semibold inline-flex items-center gap-2 ${refreshing ? 'opacity-70' : ''
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

                {(challenge.missionBrief || (challenge.incidentArtifacts || []).length > 0) && (
                    <CourseCard className="p-6 md:p-8">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-cyan-300" />
                            Mission brief & incident artifacts
                        </h2>
                        {challenge.missionBrief && (
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Role</p>
                                    <p className="mt-1 text-sm text-slate-200">{challenge.missionBrief.role}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Business context</p>
                                    <p className="mt-1 text-sm text-slate-200">{challenge.missionBrief.businessContext}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 md:col-span-2">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Incident trigger</p>
                                    <p className="mt-1 text-sm text-slate-200">{challenge.missionBrief.incidentTrigger}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Objective</p>
                                    <p className="mt-1 text-sm text-slate-200">{challenge.missionBrief.objective}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Success criteria</p>
                                    <p className="mt-1 text-sm text-slate-200">{challenge.missionBrief.successCriteria}</p>
                                </div>
                            </div>
                        )}

                        {(challenge.incidentArtifacts || []).length > 0 && (
                            <div className="mt-5 space-y-3">
                                {(challenge.incidentArtifacts || []).slice(0, 3).map((artifact) => (
                                    <div key={artifact.artifactId} className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm font-semibold text-white">{artifact.title}</p>
                                            <span className="text-[11px] font-semibold text-cyan-200 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded-full">
                                                {artifact.artifactType}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm text-slate-300">{artifact.description}</p>
                                        <pre className="mt-3 rounded-lg border border-white/10 bg-slate-950/70 p-3 text-[11px] text-cyan-100 overflow-auto whitespace-pre-wrap">
                                            {artifact.sample}
                                        </pre>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CourseCard>
                )}

                {challenge.proofRubric && (
                    <CourseCard className="p-6 md:p-8">
                        <h2 className="text-lg font-bold text-white">Proof rubric (technique + communication)</h2>
                        <p className="mt-1 text-xs text-slate-400">
                            Score minimum attendu: {challenge.proofRubric.passingScore}/100
                        </p>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                                <p className="text-xs uppercase tracking-wider text-slate-500">Technique</p>
                                <ul className="mt-2 space-y-2 text-sm text-slate-300">
                                    {(challenge.proofRubric.technical || []).map((item) => (
                                        <li key={`${item.criterion}-${item.weight}`} className="flex items-start justify-between gap-2">
                                            <span>{item.criterion}</span>
                                            <span className="font-mono text-cyan-200">{item.weight}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                                <p className="text-xs uppercase tracking-wider text-slate-500">Communication</p>
                                <ul className="mt-2 space-y-2 text-sm text-slate-300">
                                    {(challenge.proofRubric.communication || []).map((item) => (
                                        <li key={`${item.criterion}-${item.weight}`} className="flex items-start justify-between gap-2">
                                            <span>{item.criterion}</span>
                                            <span className="font-mono text-cyan-200">{item.weight}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
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

                        {/* Horizontal step timeline */}
                        {viewModel.guidedSteps.length > 0 && (
                            <div className="mt-5 overflow-x-auto">
                                <div className="flex items-center gap-0 min-w-max pb-1">
                                    {viewModel.guidedSteps.map((step, idx) => {
                                        const isDone = isCompleted || step.stepNumber < viewModel.activeStepNumber;
                                        const isActive = !isCompleted && step.stepNumber === viewModel.activeStepNumber;
                                        return (
                                            <div key={step.stepNumber} className="flex items-center">
                                                <div className={`flex flex-col items-center gap-1`}>
                                                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${isDone ? 'bg-emerald-500 text-slate-950' : isActive ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-300/40' : 'bg-slate-800 text-slate-500'}`}>
                                                        {isDone ? <CheckCircle2 className="h-4 w-4" /> : step.stepNumber}
                                                    </div>
                                                    <span className={`text-[10px] font-semibold max-w-[60px] text-center leading-tight ${isDone ? 'text-emerald-300' : isActive ? 'text-cyan-300' : 'text-slate-600'}`}>
                                                        {step.stepTitle.split(' ').slice(0, 2).join(' ')}
                                                    </span>
                                                </div>
                                                {idx < viewModel.guidedSteps.length - 1 && (
                                                    <div className={`h-0.5 w-8 mx-1 rounded-full transition-all ${isDone ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                                                )}
                                            </div>
                                        );
                                    })}
                                    <div className="flex items-center ml-0">
                                        <div className={`h-0.5 w-8 mx-1 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                                        <div className={`flex flex-col items-center gap-1`}>
                                            <div className={`h-8 w-14 rounded-xl flex items-center justify-center text-xs font-black ${isCompleted ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 border border-dashed border-slate-600 text-slate-500'}`}>
                                                {isCompleted ? <Trophy className="h-4 w-4" /> : 'Flag'}
                                            </div>
                                            <span className={`text-[10px] font-semibold ${isCompleted ? 'text-amber-300' : 'text-slate-600'}`}>Flag</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 space-y-3">
                            {viewModel.guidedSteps.length > 0 ? (
                                viewModel.guidedSteps.map((step) => {
                                    const isActive = !isCompleted && step.stepNumber === viewModel.activeStepNumber;
                                    const isDone = isCompleted || step.stepNumber < viewModel.activeStepNumber;
                                    return (
                                        <div
                                            key={step.stepNumber}
                                            className={`rounded-2xl border p-5 transition ${isDone
                                                    ? 'bg-emerald-500/5 border-emerald-500/15'
                                                    : isActive
                                                        ? 'bg-cyan-500/5 border-cyan-500/20'
                                                        : 'bg-slate-950/40 border-white/10'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div
                                                    className={`h-9 w-9 rounded-xl flex items-center justify-center text-sm font-black ${isDone ? 'bg-emerald-500 text-slate-950' : isActive ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-200'
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

                                                    {step.adaptiveGuidance && (
                                                        <div className="mt-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
                                                            <p className="text-xs font-semibold text-cyan-200 uppercase tracking-wider">
                                                                Guidance {step.adaptiveGuidance.learnerProfile}
                                                            </p>
                                                            <p className="mt-1 text-xs text-slate-200">{step.adaptiveGuidance.focus}</p>
                                                            <ul className="mt-2 space-y-1 text-xs text-slate-300">
                                                                {step.adaptiveGuidance.checklist.map((item) => (
                                                                    <li key={item} className="flex items-start gap-2">
                                                                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-300 flex-shrink-0" />
                                                                        <span>{item}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                            <p className="mt-2 text-[11px] text-cyan-100">Success signal: {step.adaptiveGuidance.successSignal}</p>
                                                        </div>
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
                                                disabled={submitting || hint.eligible === false}
                                                className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-semibold hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Debloquer (-{hint.costPoints} pts)
                                            </button>
                                        )}
                                    </div>
                                    {!hint.unlocked && hint.lockedReason && (
                                        <p className="mt-2 text-xs text-amber-100/80">{hint.lockedReason}</p>
                                    )}
                                    {!hint.unlocked && hint.unlockPolicy && (
                                        <p className="mt-1 text-[11px] text-slate-500">
                                            Seuil: {hint.unlockPolicy.minMinutes} min ou {hint.unlockPolicy.minFailedAttempts} essais rates
                                            {typeof hint.unlockPolicy.requiredPreviousHint === 'number' ? `, apres indice ${hint.unlockPolicy.requiredPreviousHint}` : ''}
                                            . Actuel: {hint.unlockPolicy.elapsedMinutes} min / {hint.unlockPolicy.failedAttempts} essais.
                                        </p>
                                    )}
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
                                className={`mt-4 rounded-2xl border p-4 text-sm ${submitResult.ok
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
                                {submitResult.axisScores && (
                                    <p className="mt-2 text-xs text-slate-200/90">
                                        Score multi-axe - Temps: {submitResult.axisScores.time}, Preuves: {submitResult.axisScores.proof},
                                        Patch: {submitResult.axisScores.patch}, Total: {submitResult.axisScores.total}
                                    </p>
                                )}
                                {(submitResult.feedback || []).length > 0 && (
                                    <ul className="mt-2 space-y-1 text-xs">
                                        {(submitResult.feedback || []).map((item) => (
                                            <li key={`${item.code}-${item.message}`} className="text-slate-200/90">
                                                [{item.code}] {item.message}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {submitResult.debriefRequired && (
                                    <p className="mt-2 text-xs text-cyan-100">
                                        Debrief obligatoire: completez le formulaire ci-dessous pour finaliser le score.
                                    </p>
                                )}
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

                {isCompleted && (
                    <CourseCard className="p-6 md:p-8">
                        <h2 className="text-lg font-bold text-white">Debrief obligatoire</h2>
                        <p className="mt-1 text-sm text-slate-400">
                            Completez le debrief (cause racine, impact, mitigation priorisee, preuves) pour finaliser votre score multi-axe.
                        </p>

                        <div className="mt-4 grid gap-3">
                            <label className="text-sm text-slate-300">
                                Cause racine
                                <textarea
                                    value={debriefDraft.rootCause || ''}
                                    onChange={(event) => setDebriefDraft((prev) => ({ ...prev, rootCause: event.target.value }))}
                                    className="mt-1 w-full min-h-[110px] px-3 py-2 rounded-xl bg-slate-950/40 border border-white/10 text-sm text-slate-100"
                                    placeholder={challenge.debriefTemplate?.rootCausePrompt || 'Expliquez le controle qui a echoue.'}
                                />
                            </label>
                            <label className="text-sm text-slate-300">
                                Impact
                                <textarea
                                    value={debriefDraft.impactSummary || ''}
                                    onChange={(event) => setDebriefDraft((prev) => ({ ...prev, impactSummary: event.target.value }))}
                                    className="mt-1 w-full min-h-[110px] px-3 py-2 rounded-xl bg-slate-950/40 border border-white/10 text-sm text-slate-100"
                                    placeholder={challenge.debriefTemplate?.impactPrompt || 'Impact business et securite.'}
                                />
                            </label>
                            <label className="text-sm text-slate-300">
                                Mitigations priorisees (une ligne par action)
                                <textarea
                                    value={debriefInput}
                                    onChange={(event) => setDebriefInput(event.target.value)}
                                    className="mt-1 w-full min-h-[100px] px-3 py-2 rounded-xl bg-slate-950/40 border border-white/10 text-sm text-slate-100"
                                    placeholder={challenge.debriefTemplate?.mitigationPrompt || 'Action 1 ...\\nAction 2 ...'}
                                />
                            </label>
                            <label className="text-sm text-slate-300">
                                Preuves
                                <textarea
                                    value={debriefDraft.evidenceSummary || ''}
                                    onChange={(event) => setDebriefDraft((prev) => ({ ...prev, evidenceSummary: event.target.value }))}
                                    className="mt-1 w-full min-h-[110px] px-3 py-2 rounded-xl bg-slate-950/40 border border-white/10 text-sm text-slate-100"
                                    placeholder={challenge.debriefTemplate?.evidencePrompt || 'Referencez commandes, logs et verification avant/apres.'}
                                />
                            </label>
                        </div>

                        {(challenge.debriefTemplate?.checklist || []).length > 0 && (
                            <ul className="mt-3 space-y-1 text-xs text-slate-400">
                                {(challenge.debriefTemplate?.checklist || []).map((item) => (
                                    <li key={item}>- {item}</li>
                                ))}
                            </ul>
                        )}

                        {debriefMessage && (
                            <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-100">
                                {debriefMessage}
                            </div>
                        )}

                        <div className="mt-4">
                            <button
                                onClick={() => void submitDebrief()}
                                disabled={debriefSaving}
                                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2"
                            >
                                {debriefSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                {debriefSaving ? 'Enregistrement...' : 'Soumettre le debrief'}
                            </button>
                        </div>
                    </CourseCard>
                )}
            </div>
        </CoursePageShell>
        </>
    );
}
