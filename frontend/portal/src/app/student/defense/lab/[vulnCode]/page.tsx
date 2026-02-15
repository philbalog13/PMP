'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../../auth/useAuth';
import { AlertCircle, Copy, Flag, RefreshCw, RotateCcw, Shield } from 'lucide-react';
import { CourseCard, CoursePageShell, CoursePill } from '@/components/course/CoursePageShell';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface Vulnerability {
    vuln_code: string;
    title: string;
    description: string;
    severity: Severity;
    attack_type: string | null;
    is_vulnerable: boolean;
    defense_unlocked: boolean;
    defense_hint?: string | null;
}

interface ProbeResult {
    status: number;
    flag: string | null;
    vulnHeader: string | null;
    body: unknown;
    rawBody: string | null;
}

function readHeader(response: Response, name: string): string | null {
    const direct = response.headers.get(name);
    if (direct) return direct;
    // Some runtimes normalize casing, so try the common variants too.
    return response.headers.get(name.toLowerCase()) || response.headers.get(name.toUpperCase());
}

function formatJson(value: unknown): string {
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

export default function DefenseLabPage({ params }: { params: Promise<{ vulnCode: string }> }) {
    const { vulnCode } = use(params);
    const { user, isLoading } = useAuth(true);

    const [catalogItem, setCatalogItem] = useState<Vulnerability | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [probe, setProbe] = useState<ProbeResult | null>(null);
    const [probing, setProbing] = useState(false);
    const [unlocking, setUnlocking] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [unlockFeedback, setUnlockFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const normalizedVulnCode = useMemo(() => String(vulnCode || '').trim().toUpperCase(), [vulnCode]);

    const fetchCatalogItem = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Session expirée. Merci de vous reconnecter.');
            return;
        }

        try {
            setError(null);
            setLoading(true);

            const res = await fetch('/api/defense/catalog', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.catalog) {
                throw new Error(data?.error || 'Impossible de charger le catalogue defense.');
            }

            const item = (data.catalog as Vulnerability[]).find((v) => v.vuln_code === normalizedVulnCode) || null;
            setCatalogItem(item);
            if (!item) {
                setError(`Lab introuvable: vulnCode=${normalizedVulnCode}`);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur réseau.');
        } finally {
            setLoading(false);
        }
    }, [normalizedVulnCode]);

    useEffect(() => {
        if (isLoading) return;
        void fetchCatalogItem();
    }, [fetchCatalogItem, isLoading]);

    const runProbe = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Session expirée. Merci de vous reconnecter.');
            return;
        }

        try {
            setError(null);
            setProbing(true);
            setProbe(null);
            setUnlockFeedback(null);

            const res = await fetch('/api/defense/probe', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ vulnCode: normalizedVulnCode })
            });

            const flagHeader = readHeader(res, 'X-Defense-Flag');
            const vulnHeader = readHeader(res, 'X-Defense-Vuln');

            const raw = await res.text();
            let parsed: unknown = null;
            try {
                parsed = raw ? JSON.parse(raw) : null;
            } catch {
                parsed = null;
            }

            const flagFromBody = (parsed as any)?.probe?.flag;
            const flag = flagHeader || (typeof flagFromBody === 'string' ? flagFromBody : null);

            setProbe({
                status: res.status,
                flag,
                vulnHeader,
                body: parsed ?? null,
                rawBody: parsed ? null : raw,
            });

            if (!res.ok) {
                const bodyError = (parsed as any)?.error || (parsed as any)?.message;
                setError(bodyError || 'Probe impossible (vérifiez que la faille est vulnérable pour vous).');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur réseau.');
        } finally {
            setProbing(false);
        }
    }, [normalizedVulnCode]);

    const copyFlag = async () => {
        if (!probe?.flag) return;
        try {
            await navigator.clipboard.writeText(probe.flag);
        } catch {
            // ignore
        }
    };

    const submitFlag = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Session expirée. Merci de vous reconnecter.');
            return;
        }
        if (!probe?.flag) {
            setUnlockFeedback({ type: 'error', message: 'Aucun flag à soumettre.' });
            return;
        }

        try {
            setUnlockFeedback(null);
            setUnlocking(true);

            const res = await fetch('/api/defense/submit-flag', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ vulnCode: normalizedVulnCode, flag: probe.flag })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || 'Impossible de soumettre le flag.');
            }

            setUnlockFeedback({
                type: 'success',
                message: data?.result?.message || 'Flag accepté. Quiz defense débloqué.'
            });

            void fetchCatalogItem();
        } catch (err) {
            setUnlockFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Erreur réseau.' });
        } finally {
            setUnlocking(false);
        }
    }, [normalizedVulnCode, probe?.flag]);

    const resetVuln = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Session expirée. Merci de vous reconnecter.');
            return;
        }

        try {
            setError(null);
            setResetting(true);
            setUnlockFeedback(null);

            const res = await fetch('/api/defense/reset', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ vulnCode: normalizedVulnCode })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || 'Reset impossible.');
            }

            setProbe(null);
            void fetchCatalogItem();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur réseau.');
        } finally {
            setResetting(false);
        }
    }, [fetchCatalogItem, normalizedVulnCode]);

    if (loading || isLoading) {
        return (
            <CoursePageShell
                title="Chargement du lab…"
                description="Préparation de votre environnement de récupération de flag."
                icon={<Shield className="h-8 w-8 text-emerald-300" />}
                crumbs={[
                    { label: 'Mon Parcours', href: '/student' },
                    { label: 'Sandbox Defense', href: '/student/defense' },
                    { label: 'Lab' },
                ]}
                backHref="/student/defense"
                backLabel="Retour à Sandbox Defense"
            >
                <CourseCard className="p-8">
                    <div className="flex items-center gap-3 text-slate-300">
                        <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
                        <span className="text-sm">Chargement…</span>
                    </div>
                    <div className="mt-6 space-y-3 animate-pulse">
                        <div className="h-3 w-1/2 rounded bg-slate-800/70" />
                        <div className="h-3 w-full rounded bg-slate-800/50" />
                        <div className="h-3 w-5/6 rounded bg-slate-800/40" />
                    </div>
                </CourseCard>
            </CoursePageShell>
        );
    }

    const isFixed = catalogItem ? !catalogItem.is_vulnerable : false;
    const stateLabel = catalogItem
        ? (isFixed ? 'SECURISE' : (catalogItem.defense_unlocked ? 'QUIZ DEBLOQUE' : 'DEFENSE VERROUILLEE'))
        : 'INCONNU';
    const stateTone = catalogItem
        ? (isFixed ? 'emerald' : (catalogItem.defense_unlocked ? 'cyan' : 'amber'))
        : 'slate';
    const severityTone = catalogItem?.severity === 'CRITICAL' ? 'rose'
        : catalogItem?.severity === 'HIGH' ? 'amber'
        : catalogItem?.severity === 'MEDIUM' ? 'violet'
        : 'slate';

    return (
        <CoursePageShell
            title={catalogItem?.title || 'Lab Defense'}
            description={catalogItem?.description || 'Récupérez le flag requis pour débloquer la partie defense.'}
            icon={<Flag className="h-8 w-8 text-emerald-300" />}
            crumbs={[
                { label: 'Mon Parcours', href: '/student' },
                { label: 'Sandbox Defense', href: '/student/defense' },
                { label: 'Lab' },
                { label: normalizedVulnCode },
            ]}
            backHref="/student/defense"
            backLabel="Retour à Sandbox Defense"
            meta={
                <>
                    <CoursePill tone="slate">
                        <span className="font-mono">{normalizedVulnCode}</span>
                    </CoursePill>
                    {catalogItem?.severity ? (
                        <CoursePill tone={severityTone as any}>{catalogItem.severity}</CoursePill>
                    ) : null}
                    {catalogItem?.attack_type ? (
                        <CoursePill tone="slate">{catalogItem.attack_type}</CoursePill>
                    ) : null}
                    <CoursePill tone={stateTone as any}>{stateLabel}</CoursePill>
                </>
            }
            actions={
                <>
                    <button
                        onClick={() => void runProbe()}
                        disabled={probing}
                        className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2"
                    >
                        <RefreshCw size={16} className={probing ? 'animate-spin' : ''} />
                        {probing ? 'Probe…' : 'Lancer le probe'}
                    </button>
                    <Link
                        href="/student/defense"
                        className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 text-sm font-semibold"
                    >
                        Dashboard
                    </Link>
                </>
            }
            aside={
                <div className="space-y-4">
                    <CourseCard className="p-4">
                        <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-[0.2em] mb-3">
                            Workflow
                        </div>
                        <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
                            <li>Lancer le probe pour obtenir le flag.</li>
                            <li>Soumettre le flag pour débloquer le quiz defense.</li>
                            <li>Revenir au dashboard et appliquer le correctif.</li>
                        </ol>
                        {catalogItem?.defense_hint ? (
                            <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/40 p-3 text-xs text-slate-300">
                                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1">Hint defense</div>
                                {catalogItem.defense_hint}
                            </div>
                        ) : null}
                    </CourseCard>

                    <CourseCard className="p-4">
                        <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-[0.2em] mb-3">
                            Actions
                        </div>
                        <div className="space-y-2">
                            <button
                                onClick={() => void runProbe()}
                                disabled={probing}
                                className="w-full px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={16} className={probing ? 'animate-spin' : ''} />
                                {probing ? 'Probe…' : 'Lancer le probe'}
                            </button>

                            <button
                                onClick={() => void copyFlag()}
                                disabled={!probe?.flag}
                                className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
                            >
                                <Copy size={16} />
                                Copier le flag
                            </button>

                            <button
                                onClick={() => void submitFlag()}
                                disabled={!probe?.flag || unlocking}
                                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/40 hover:bg-slate-900/60 border border-white/10 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
                            >
                                <Flag size={16} />
                                {unlocking ? 'Soumission…' : 'Soumettre le flag'}
                            </button>

                            <button
                                onClick={() => void resetVuln()}
                                disabled={resetting}
                                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/40 hover:bg-slate-900/60 border border-white/10 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
                            >
                                <RotateCcw size={16} />
                                {resetting ? 'Reset…' : 'Réinitialiser'}
                            </button>
                        </div>
                    </CourseCard>
                </div>
            }
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

                <CourseCard className="p-6 md:p-8">
                    <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                        <Shield className="text-emerald-400" size={18} />
                        Objectif
                    </h2>
                    <p className="text-sm text-slate-300 leading-relaxed">
                        Ce lab vous permet de récupérer le flag offensif associé à <span className="font-mono text-slate-200">{normalizedVulnCode}</span>.
                        Une fois soumis, le quiz defense sera débloqué sur le dashboard.
                    </p>
                    {isFixed && (
                        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100/90">
                            Cette vulnérabilité est déjà corrigée pour votre profil. Utilisez “Réinitialiser” si vous voulez rejouer le lab.
                        </div>
                    )}
                </CourseCard>

                {probe && (
                    <CourseCard className="p-6 md:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div className="text-sm text-slate-300">
                                Status: <span className="font-mono text-white">{probe.status}</span>
                                {probe.vulnHeader && (
                                    <span className="ml-3 text-xs text-slate-500 font-mono">({probe.vulnHeader})</span>
                                )}
                            </div>
                            {probe.flag ? (
                                <div className="text-xs text-slate-400">
                                    Flag détecté: <span className="font-mono text-emerald-200">OK</span>
                                </div>
                            ) : (
                                <div className="text-xs text-slate-500">
                                    Aucun flag détecté (vérifiez l’état “vulnérable”).
                                </div>
                            )}
                        </div>

                        {probe.flag && (
                            <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                <div className="text-xs text-emerald-300 uppercase tracking-wider mb-1">Flag</div>
                                <div className="font-mono text-emerald-200 break-all">{probe.flag}</div>
                            </div>
                        )}

                        {unlockFeedback && (
                            <div className={`mb-4 p-4 rounded-xl border text-sm ${
                                unlockFeedback.type === 'success'
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                                    : 'bg-red-500/10 border-red-500/30 text-red-200'
                            }`}>
                                {unlockFeedback.message}
                            </div>
                        )}

                        <div className="rounded-xl bg-slate-950/60 border border-white/10 p-4">
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Réponse brute</div>
                            <pre className="text-xs text-slate-200 overflow-auto whitespace-pre-wrap">
                                {probe.rawBody ? probe.rawBody : formatJson(probe.body)}
                            </pre>
                        </div>
                    </CourseCard>
                )}

                {!probe && (
                    <CourseCard className="p-6 md:p-8">
                        <p className="text-sm text-slate-400">
                            Lancez le probe pour afficher le flag et les éléments de diagnostic.
                        </p>
                    </CourseCard>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2">
                    <Link
                        href="/student/defense"
                        className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 text-sm font-semibold"
                    >
                        Retour à Sandbox Defense
                    </Link>
                </div>
            </div>
        </CoursePageShell>
    );
}
