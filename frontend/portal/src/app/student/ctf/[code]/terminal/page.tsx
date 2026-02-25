'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Copy, ExternalLink, RefreshCw, Terminal } from 'lucide-react';
import { CourseCard, CoursePageShell, CoursePill } from '@/components/course/CoursePageShell';
import { APP_URLS } from '@shared/lib/app-urls';
import { CtfLabSession } from '@/lib/ctf-lab';
import { normalizeCtfCode } from '@/lib/ctf-code-map';

export default function CtfTerminalPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = use(params);
    const requestedCode = useMemo(
        () => normalizeCtfCode(decodeURIComponent(String(code || ''))),
        [code]
    );
    const normalizedCode = requestedCode;

    const [session, setSession] = useState<CtfLabSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [attackboxReady, setAttackboxReady] = useState(false);

    const getToken = useCallback(() => localStorage.getItem('token') || '', []);

    const attackboxUrl = useMemo(() => {
        const sessionPath = session?.attackboxPath;
        if (!sessionPath) return APP_URLS.ctfAttackbox;
        const token = getToken();
        // Point directly to lab-access-proxy so WebSocket upgrade works (Next.js rewrites don't proxy WS)
        const base = APP_URLS.labProxy.replace(/\/+$/, '');
        const path = sessionPath.startsWith('/') ? sessionPath : `/${sessionPath}`;
        return token ? `${base}${path}?token=${encodeURIComponent(token)}` : `${base}${path}`;
    }, [session?.attackboxPath, getToken]);

    const helperCommand = `lab ${normalizedCode || '<CODE>'}`;

    const getHeaders = useCallback(() => {
        const token = getToken();
        return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : null;
    }, [getToken]);

    const bootstrapAttackboxAccess = useCallback(async (attackboxPath: string): Promise<boolean> => {
        const headers = getHeaders();
        if (!headers) {
            return false;
        }

        // Auth bootstrap via Next.js rewrite (sets cookie for subsequent requests)
        const authPath = `${String(attackboxPath || '').replace(/\/+$/, '')}/auth`;
        try {
            const response = await fetch(authPath, {
                method: 'POST',
                headers,
                cache: 'no-store',
            });
            return response.ok;
        } catch {
            // Fallback: token will be in the iframe URL query param
            return true;
        }
    }, [getHeaders]);

    const fetchSession = useCallback(async () => {
        const headers = getHeaders();
        if (!headers || !normalizedCode) {
            setError('Session expiree.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}/session`, {
                method: 'GET',
                headers,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || 'Impossible de charger la session lab.');
            }

            setSession(data.session || null);
            setAttackboxReady(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur de chargement de session.');
        } finally {
            setLoading(false);
        }
    }, [getHeaders, normalizedCode]);

    useEffect(() => {
        void fetchSession();
    }, [fetchSession]);

    useEffect(() => {
        const sessionPath = session?.attackboxPath;
        if (!sessionPath || session?.status !== 'RUNNING') {
            setAttackboxReady(false);
            return;
        }

        let active = true;
        setAttackboxReady(false);
        void (async () => {
            // Try auth bootstrap via cookie; if it fails, the token query param in the iframe URL handles auth
            await bootstrapAttackboxAccess(sessionPath);
            if (!active) {
                return;
            }
            // Always mark ready: the iframe URL includes ?token= as fallback auth
            setAttackboxReady(true);
        })();

        return () => {
            active = false;
        };
    }, [bootstrapAttackboxAccess, session?.attackboxPath, session?.sessionId, session?.status]);

    const copyHelper = async () => {
        try {
            await navigator.clipboard.writeText(helperCommand);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
        } catch {
            // ignore
        }
    };

    return (
        <CoursePageShell
            title="AttackBox Terminal"
            description="Terminal d'attaque dans le reseau PMP, inspire TryHackMe."
            icon={<Terminal className="h-8 w-8 text-emerald-300" />}
            crumbs={[
                { label: 'Mon Parcours', href: '/student' },
                { label: 'Security Labs', href: APP_URLS.studentCtf },
                { label: normalizedCode || 'Terminal' },
                { label: 'AttackBox' },
            ]}
            backHref={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}`}
            backLabel="Retour au challenge"
            meta={
                <>
                    <CoursePill tone="slate">{normalizedCode || 'CTF'}</CoursePill>
                    <CoursePill tone="cyan">{session?.status || 'NO_SESSION'}</CoursePill>
                </>
            }
            actions={
                <>
                    <a
                        href={attackboxUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`px-4 py-2.5 rounded-xl text-white text-sm font-semibold inline-flex items-center gap-2 ${
                            session && attackboxReady
                                ? 'bg-cyan-600 hover:bg-cyan-500'
                                : 'bg-slate-700/60 pointer-events-none'
                        }`}
                    >
                        <ExternalLink className="h-4 w-4" />
                        Ouvrir dans un onglet
                    </a>
                    <button
                        onClick={() => void fetchSession()}
                        className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 text-sm font-semibold inline-flex items-center gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <Link
                        href={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}`}
                        className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 text-sm font-semibold inline-flex items-center gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Challenge
                    </Link>
                </>
            }
        >
            <div className="space-y-6">
                {error && (
                    <CourseCard className="border border-red-500/20 bg-red-500/5 p-4">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-red-300 mt-0.5" />
                            <p className="text-sm text-red-100/90">{error}</p>
                        </div>
                    </CourseCard>
                )}

                {!loading && !session && (
                    <CourseCard className="p-6 border border-amber-500/20 bg-amber-500/5">
                        <p className="text-sm text-amber-100/90 leading-relaxed">
                            Aucune machine active pour cette room. Lance d&apos;abord la room depuis la page principale
                            puis reouvre ce terminal.
                        </p>
                        <div className="mt-4">
                            <Link
                                href={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}`}
                                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold inline-flex items-center gap-2"
                            >
                                Retour a la room
                            </Link>
                        </div>
                    </CourseCard>
                )}

                <CourseCard className="p-6 md:p-8">
                    <p className="text-sm text-slate-300 leading-relaxed">
                        Dans l&apos;AttackBox, utilisez le helper ci-dessous pour afficher les objectifs et commandes utiles.
                    </p>
                    <div className="mt-4 flex flex-col sm:flex-row gap-2">
                        <pre className="flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-emerald-200 overflow-auto">
                            {helperCommand}
                        </pre>
                        <button
                            onClick={() => void copyHelper()}
                            className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
                        >
                            <Copy className="h-4 w-4" />
                            {copied ? 'Copie' : 'Copier'}
                        </button>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                        Exemple: <span className="font-mono">lab {normalizedCode}</span>
                    </p>
                </CourseCard>

                {session && (
                    attackboxReady ? (
                        <CourseCard className="p-0 overflow-hidden">
                            <iframe
                                title="CTF AttackBox"
                                src={attackboxUrl}
                                loading="lazy"
                                className="w-full h-[70vh]"
                            />
                        </CourseCard>
                    ) : (
                        <CourseCard className="p-6 border border-cyan-500/20 bg-cyan-500/5">
                            <div className="flex items-center gap-3 text-cyan-100/90">
                                <RefreshCw className="h-4 w-4 animate-spin text-cyan-300" />
                                <p className="text-sm">Initialisation securisee de l&apos;AttackBox...</p>
                            </div>
                        </CourseCard>
                    )
                )}
            </div>
        </CoursePageShell>
    );
}
