'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, BookOpen, CheckCircle2, Shield } from 'lucide-react';
import { useAuth } from '../../../../auth/useAuth';
import { CourseCard, CoursePageShell, CoursePill } from '@/components/course/CoursePageShell';
import { APP_URLS } from '@shared/lib/app-urls';

type CtfStatus = 'LOCKED' | 'UNLOCKED' | 'IN_PROGRESS' | 'COMPLETED';

type ChallengeDetail = {
    code: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    points: number;
    status: CtfStatus;
    vulnerabilityType: string;
    attackVector: string;
    learningObjectives: string[];
    targetService: string;
    targetEndpoint: string;
    freeModeDescription?: string;
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

function remediationBlocks(category: string): Array<{ title: string; items: string[] }> {
    const key = String(category || '').trim().toUpperCase();

    if (key === 'REPLAY_ATTACK') {
        return [
            { title: 'Correctifs serveur', items: ['Idempotency key obligatoire', 'Nonce + fenetre temporelle', 'Deduplication cote backend'] },
            { title: 'Observabilite', items: ['Tracer STAN/RRN/nonce', 'Alerting sur doublons', 'Metriques taux de rejouage'] },
            { title: 'Validation', items: ['Tests e2e de rejeu', 'Tests concurrency', 'Rejeu sur plusieurs noeuds'] },
        ];
    }

    if (key === 'HSM_ATTACK') {
        return [
            { title: 'Isolation', items: ['Reseau prive uniquement', 'Allowlist stricte', 'mTLS entre services'] },
            { title: 'Autorisation', items: ['RBAC sur operations sensibles', 'Separation des environnements', 'Audit complet des appels'] },
            { title: 'Validation', items: ['Tests d acces non autorise', 'Revue des endpoints admin', 'Rotation des cles exposees'] },
        ];
    }

    if (key === 'ISO8583_MANIPULATION') {
        return [
            { title: 'Validation messages', items: ['Schema strict', 'Verification champs critiques', 'Rejet des incoherences bitmap/DE'] },
            { title: 'Protection', items: ['Authentifier les messages (MAC)', 'Controle de rejeu', 'Rate limit sur endpoints sensibles'] },
            { title: 'Validation', items: ['Fuzzing format', 'Cas limites DE', 'Tests de rejet'] },
        ];
    }

    return [
        { title: 'Correctifs', items: ['Validation cote serveur', 'Controle d acces / ownership', 'Gestion d erreurs non bavarde'] },
        { title: 'Surveillance', items: ['Logs structurels', 'Correlation IDs', 'Alerting sur patterns anormaux'] },
        { title: 'Validation', items: ['Tests unitaires controles', 'Tests d integration', 'Revue securite'] },
    ];
}

export default function CtfRemediationPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = use(params);
    const { isLoading: authLoading } = useAuth(true);

    const normalizedCode = useMemo(
        () => decodeURIComponent(String(code || '')).trim().toUpperCase(),
        [code]
    );

    const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchChallenge = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Session expiree. Merci de vous reconnecter.');
            setLoading(false);
            return;
        }

        try {
            setError(null);
            setLoading(true);

            const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}?mode=FREE`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success || !data?.challenge) {
                throw new Error(data?.error || 'Impossible de charger la remediation.');
            }

            setChallenge(data.challenge);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur de chargement.');
        } finally {
            setLoading(false);
        }
    }, [normalizedCode]);

    useEffect(() => {
        if (authLoading) return;
        void fetchChallenge();
    }, [authLoading, fetchChallenge]);

    if (authLoading || loading) {
        return (
            <CoursePageShell
                title="Chargement..."
                description="Recuperation des informations de remediation."
                icon={<Shield className="h-8 w-8 text-emerald-300" />}
                crumbs={[
                    { label: 'Mon Parcours', href: '/student' },
                    { label: 'Security Labs', href: APP_URLS.studentCtf },
                    { label: normalizedCode || 'Remediation' },
                    { label: 'Remediation' },
                ]}
                backHref={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}`}
                backLabel="Retour au challenge"
            >
                <CourseCard className="p-8">
                    <div className="flex items-center gap-3 text-slate-300">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-sm">Chargement...</span>
                    </div>
                </CourseCard>
            </CoursePageShell>
        );
    }

    if (!challenge) {
        return (
            <CoursePageShell
                title="Remediation indisponible"
                description={error || 'La remediation est indisponible.'}
                icon={<AlertCircle className="h-8 w-8 text-red-200" />}
                crumbs={[
                    { label: 'Mon Parcours', href: '/student' },
                    { label: 'Security Labs', href: APP_URLS.studentCtf },
                    { label: normalizedCode || 'Remediation' },
                    { label: 'Erreur' },
                ]}
                backHref={APP_URLS.studentCtf}
                backLabel="Retour aux challenges"
            >
                <CourseCard className="border border-red-500/20 bg-red-500/5 p-6 md:p-8">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 text-red-300" />
                        <div className="min-w-0">
                            <h2 className="text-lg font-semibold text-white">Impossible de charger</h2>
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
                                    Retour
                                </Link>
                            </div>
                        </div>
                    </div>
                </CourseCard>
            </CoursePageShell>
        );
    }

    const categoryLabel = CATEGORY_LABELS[challenge.category] || challenge.category;
    const blocks = remediationBlocks(challenge.category);
    const completed = challenge.status === 'COMPLETED';

    return (
        <CoursePageShell
            title="Remediation"
            description={challenge.title}
            icon={<Shield className="h-8 w-8 text-emerald-300" />}
            crumbs={[
                { label: 'Mon Parcours', href: '/student' },
                { label: 'Security Labs', href: APP_URLS.studentCtf },
                { label: normalizedCode || 'Challenge', href: `${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}` },
                { label: 'Remediation' },
            ]}
            backHref={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}`}
            backLabel="Retour au challenge"
            meta={
                <>
                    <CoursePill tone="slate">{challenge.code}</CoursePill>
                    <CoursePill tone="slate">{categoryLabel}</CoursePill>
                    <CoursePill tone="slate">{challenge.difficulty}</CoursePill>
                    <CoursePill tone={completed ? 'emerald' : 'amber'}>
                        {completed ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        {completed ? 'Resolu' : 'Non resolu'}
                    </CoursePill>
                </>
            }
            actions={
                <Link
                    href={APP_URLS.studentCtf}
                    className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 text-sm font-semibold inline-flex items-center gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Dashboard CTF
                </Link>
            }
        >
            <div className="space-y-6">
                {!completed && (
                    <CourseCard className="border border-amber-500/20 bg-amber-500/5 p-6 md:p-8">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-300" />
                            <div>
                                <h2 className="text-lg font-bold text-white">Remediation disponible apres resolution</h2>
                                <p className="mt-2 text-sm text-slate-300">
                                    Terminez le challenge, puis revenez ici pour valider les correctifs.
                                </p>
                            </div>
                        </div>
                    </CourseCard>
                )}

                <CourseCard className="p-6 md:p-8">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-cyan-300" />
                        Resume
                    </h2>
                    <div className="mt-4 grid gap-3">
                        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Vulnerabilite</p>
                            <p className="mt-1 text-sm text-slate-200">{challenge.vulnerabilityType}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Vecteur</p>
                            <p className="mt-1 text-sm text-slate-200">{challenge.attackVector}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Cible</p>
                            <p className="mt-1 text-xs font-mono text-slate-200 whitespace-pre-wrap">{challenge.targetEndpoint}</p>
                            <p className="mt-2 text-xs text-slate-500">Service: {challenge.targetService}</p>
                        </div>
                    </div>
                </CourseCard>

                {blocks.map((block) => (
                    <CourseCard key={block.title} className="p-6 md:p-8">
                        <h2 className="text-lg font-bold text-white">{block.title}</h2>
                        <ul className="mt-4 space-y-2 text-sm text-slate-300">
                            {block.items.map((item) => (
                                <li key={item} className="flex items-start gap-2">
                                    <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </CourseCard>
                ))}

                <CourseCard className="p-6 md:p-8">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Shield className="h-5 w-5 text-emerald-300" />
                        Prochaine etape
                    </h2>
                    <p className="mt-2 text-sm text-slate-300">
                        Appliquez les correctifs dans votre code, puis verifiez dans le lab. Vous pouvez ensuite enchainer
                        sur la Sandbox Defense.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Link
                            href="/student/defense"
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
                        >
                            Aller a Sandbox Defense
                        </Link>
                        <Link
                            href={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}`}
                            className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 text-sm font-semibold"
                        >
                            Retour au challenge
                        </Link>
                    </div>
                </CourseCard>
            </div>
        </CoursePageShell>
    );
}

