'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, ChevronRight, Copy, ExternalLink, RefreshCw, Terminal } from 'lucide-react';
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
        if (!headers) return false;
        const authPath = `${String(attackboxPath || '').replace(/\/+$/, '')}/auth`;
        try {
            const response = await fetch(authPath, { method: 'POST', headers, cache: 'no-store' });
            return response.ok;
        } catch {
            return true;
        }
    }, [getHeaders]);

    const fetchSession = useCallback(async () => {
        const headers = getHeaders();
        if (!headers || !normalizedCode) {
            setError('Session expirée.');
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}/session`, { method: 'GET', headers });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success) throw new Error(data?.error || 'Impossible de charger la session lab.');
            setSession(data.session || null);
            setAttackboxReady(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur de chargement de session.');
        } finally {
            setLoading(false);
        }
    }, [getHeaders, normalizedCode]);

    useEffect(() => { void fetchSession(); }, [fetchSession]);

    useEffect(() => {
        const sessionPath = session?.attackboxPath;
        if (!sessionPath || session?.status !== 'RUNNING') { setAttackboxReady(false); return; }
        let active = true;
        setAttackboxReady(false);
        void (async () => {
            await bootstrapAttackboxAccess(sessionPath);
            if (!active) return;
            setAttackboxReady(true);
        })();
        return () => { active = false; };
    }, [bootstrapAttackboxAccess, session?.attackboxPath, session?.sessionId, session?.status]);

    const copyHelper = async () => {
        try {
            await navigator.clipboard.writeText(helperCommand);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
        } catch { /* ignore */ }
    };

    const sessionStatusColor = session?.status === 'RUNNING'
        ? 'var(--n-success)'
        : session?.status === 'PROVISIONING'
        ? 'var(--n-warning)'
        : 'var(--n-text-tertiary)';

    return (
        <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)' }}>

            {/* ── Page header ── */}
            <div style={{
                background: 'var(--n-bg-primary)',
                borderBottom: '1px solid var(--n-border)',
                padding: '16px 24px',
            }}>
                {/* Breadcrumb */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--n-text-tertiary)', marginBottom: '10px' }}>
                    <Link href="/student" style={{ color: 'var(--n-text-tertiary)', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--n-accent)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--n-text-tertiary)')}>
                        Mon Parcours
                    </Link>
                    <ChevronRight size={11} />
                    <Link href={APP_URLS.studentCtf} style={{ color: 'var(--n-text-tertiary)', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--n-accent)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--n-text-tertiary)')}>
                        Security Labs
                    </Link>
                    <ChevronRight size={11} />
                    <Link href={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}`}
                        style={{ color: 'var(--n-text-tertiary)', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--n-accent)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--n-text-tertiary)')}>
                        {normalizedCode || 'CTF'}
                    </Link>
                    <ChevronRight size={11} />
                    <span style={{ color: 'var(--n-text-secondary)' }}>AttackBox</span>
                </div>

                {/* Title row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '7px',
                            background: 'rgba(0,0,0,0.85)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <Terminal size={16} style={{ color: '#22d3ee' }} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--n-text-primary)', lineHeight: 1.2 }}>
                                AttackBox Terminal
                            </h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <span style={{
                                    display: 'inline-block', width: '6px', height: '6px',
                                    borderRadius: '50%', background: sessionStatusColor,
                                    flexShrink: 0,
                                }} />
                                <span style={{ fontSize: '12px', color: 'var(--n-text-secondary)' }}>
                                    {session?.status || 'NO_SESSION'} · {normalizedCode || 'CTF'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a
                            href={attackboxUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                                background: session && attackboxReady ? 'var(--n-accent-light)' : 'var(--n-bg-tertiary)',
                                border: `1px solid ${session && attackboxReady ? 'var(--n-accent-border)' : 'var(--n-border)'}`,
                                color: session && attackboxReady ? 'var(--n-accent)' : 'var(--n-text-tertiary)',
                                textDecoration: 'none',
                                pointerEvents: session && attackboxReady ? 'auto' : 'none',
                                transition: 'all 0.1s',
                            }}
                        >
                            <ExternalLink size={12} /> Ouvrir onglet
                        </a>
                        <button onClick={() => void fetchSession()}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                                background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)',
                                color: 'var(--n-text-secondary)', cursor: 'pointer', transition: 'all 0.1s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-bg-tertiary)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'var(--n-bg-primary)')}>
                            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
                        </button>
                        <Link href={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}`}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                                background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)',
                                color: 'var(--n-text-secondary)', textDecoration: 'none', transition: 'all 0.1s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-bg-tertiary)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'var(--n-bg-primary)')}>
                            <ArrowLeft size={12} /> Challenge
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── Content ── */}
            <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Error */}
                {error && (
                    <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: '10px',
                        padding: '12px 14px', borderRadius: '8px',
                        background: 'var(--n-danger-bg)', border: '1px solid var(--n-danger-border)',
                    }}>
                        <AlertCircle size={15} style={{ color: 'var(--n-danger)', marginTop: '1px', flexShrink: 0 }} />
                        <p style={{ fontSize: '13px', color: 'var(--n-danger)', margin: 0 }}>{error}</p>
                    </div>
                )}

                {/* No session */}
                {!loading && !session && (
                    <div style={{
                        padding: '16px', borderRadius: '8px',
                        background: 'var(--n-warning-bg)', border: '1px solid var(--n-warning-border)',
                    }}>
                        <p style={{ fontSize: '13px', color: 'var(--n-warning)', marginBottom: '12px', lineHeight: 1.5 }}>
                            Aucune machine active pour cette room. Lance d&apos;abord la room depuis la page principale puis rouvre ce terminal.
                        </p>
                        <Link href={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}`}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '7px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                                background: 'var(--n-accent)', color: '#fff', textDecoration: 'none', transition: 'opacity 0.1s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                            Retour à la room
                        </Link>
                    </div>
                )}

                {/* Helper command */}
                <div style={{
                    background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)',
                    borderRadius: '8px', padding: '16px',
                }}>
                    <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--n-text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Terminal size={14} style={{ color: 'var(--n-accent)' }} />
                        Helper de lab
                    </h2>
                    <p style={{ fontSize: '12px', color: 'var(--n-text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                        Dans l&apos;AttackBox, utilisez le helper ci-dessous pour afficher les objectifs et commandes utiles.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <pre style={{
                            flex: 1, margin: 0, padding: '10px 14px', borderRadius: '6px', fontSize: '13px',
                            background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)',
                            color: '#fbbf24', fontFamily: 'var(--n-font-mono)', overflowX: 'auto',
                        }}>
                            {helperCommand}
                        </pre>
                        <button onClick={() => void copyHelper()}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                                background: 'var(--n-accent)', color: '#fff', border: 'none', cursor: 'pointer', transition: 'opacity 0.1s',
                                flexShrink: 0,
                            }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                            <Copy size={13} />
                            {copied ? 'Copié !' : 'Copier'}
                        </button>
                    </div>
                    <p style={{ marginTop: '8px', fontSize: '11px', fontFamily: 'var(--n-font-mono)', color: 'var(--n-text-tertiary)' }}>
                        Exemple: lab {normalizedCode}
                    </p>
                </div>

                {/* AttackBox */}
                {session && (
                    attackboxReady ? (
                        <div style={{
                            borderRadius: '8px', overflow: 'hidden',
                            border: '1px solid var(--n-border)',
                            boxShadow: '0 2px 8px -2px rgba(0,0,0,0.08)',
                        }}>
                            {/* Terminal mac-style header */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '8px 14px',
                                background: '#1e2433',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                            }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                                <span style={{ marginLeft: '8px', fontSize: '11px', fontFamily: 'var(--n-font-mono)', color: 'rgba(148,163,184,0.6)' }}>
                                    attackbox — {session.machineIp || normalizedCode}
                                </span>
                            </div>
                            <iframe
                                title="CTF AttackBox"
                                src={attackboxUrl}
                                loading="lazy"
                                style={{ width: '100%', height: '65vh', display: 'block', background: '#000', border: 'none' }}
                            />
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '14px 16px', borderRadius: '8px',
                            background: 'var(--n-accent-light)', border: '1px solid var(--n-accent-border)',
                        }}>
                            <RefreshCw size={15} className="animate-spin" style={{ color: 'var(--n-accent)', flexShrink: 0 }} />
                            <p style={{ fontSize: '13px', color: 'var(--n-accent)', margin: 0 }}>
                                Initialisation de l&apos;AttackBox…
                            </p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
