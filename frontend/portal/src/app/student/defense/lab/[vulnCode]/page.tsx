'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../../auth/useAuth';
import { AlertCircle, ChevronRight, Copy, Flag, RefreshCw, RotateCcw, Shield } from 'lucide-react';
import { NotionSkeleton } from '@shared/components/notion';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface Vulnerability {
    vuln_code: string; title: string; description: string;
    severity: Severity; attack_type: string | null;
    is_vulnerable: boolean; defense_unlocked: boolean; defense_hint?: string | null;
}

interface ProbeResult {
    status: number; flag: string | null;
    vulnHeader: string | null; body: unknown; rawBody: string | null;
}

function readHeader(response: Response, name: string): string | null {
    return response.headers.get(name) || response.headers.get(name.toLowerCase()) || response.headers.get(name.toUpperCase());
}

function formatJson(value: unknown): string {
    try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

const SEVERITY_STYLES: Record<Severity, { color: string; bg: string; border: string; bar: string }> = {
    CRITICAL: { color: 'var(--n-danger)',   bg: 'var(--n-danger-bg)',   border: 'var(--n-danger-border)',   bar: 'var(--n-danger)' },
    HIGH:     { color: '#c2410c',           bg: 'rgba(194,65,12,0.08)', border: 'rgba(194,65,12,0.2)',       bar: '#c2410c' },
    MEDIUM:   { color: 'var(--n-warning)',  bg: 'var(--n-warning-bg)',  border: 'var(--n-warning-border)',  bar: 'var(--n-warning)' },
    LOW:      { color: 'var(--n-success)',  bg: 'var(--n-success-bg)',  border: 'var(--n-success-border)',  bar: 'var(--n-success)' },
};

export default function DefenseLabPage({ params }: { params: Promise<{ vulnCode: string }> }) {
    const { vulnCode } = use(params);
    const { user, isLoading } = useAuth(true);

    const [catalogItem, setCatalogItem] = useState<Vulnerability | null>(null);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState<string | null>(null);
    const [probe, setProbe]             = useState<ProbeResult | null>(null);
    const [probing, setProbing]         = useState(false);
    const [unlocking, setUnlocking]     = useState(false);
    const [resetting, setResetting]     = useState(false);
    const [unlockFeedback, setUnlockFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const normalizedVulnCode = useMemo(() => String(vulnCode || '').trim().toUpperCase(), [vulnCode]);

    const fetchCatalogItem = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) { setError('Session expirée.'); return; }
        try {
            setError(null); setLoading(true);
            const res = await fetch('/api/defense/catalog', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.catalog) throw new Error(data?.error || 'Impossible de charger le catalogue defense.');
            const item = (data.catalog as Vulnerability[]).find(v => v.vuln_code === normalizedVulnCode) || null;
            setCatalogItem(item);
            if (!item) setError(`Lab introuvable: vulnCode=${normalizedVulnCode}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur réseau.');
        } finally { setLoading(false); }
    }, [normalizedVulnCode]);

    useEffect(() => { if (isLoading) return; void fetchCatalogItem(); }, [fetchCatalogItem, isLoading]);

    const runProbe = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) { setError('Session expirée.'); return; }
        try {
            setError(null); setProbing(true); setProbe(null); setUnlockFeedback(null);
            const res = await fetch('/api/defense/probe', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ vulnCode: normalizedVulnCode }),
            });
            const flagHeader = readHeader(res, 'X-Defense-Flag');
            const vulnHeader = readHeader(res, 'X-Defense-Vuln');
            const raw = await res.text();
            let parsed: unknown = null;
            try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
            const flagFromBody = (parsed as any)?.probe?.flag;
            const flag = flagHeader || (typeof flagFromBody === 'string' ? flagFromBody : null);
            setProbe({ status: res.status, flag, vulnHeader, body: parsed ?? null, rawBody: parsed ? null : raw });
            if (!res.ok) {
                const bodyError = (parsed as any)?.error || (parsed as any)?.message;
                setError(bodyError || 'Probe impossible (vérifiez que la faille est vulnérable).');
            }
        } catch (err) { setError(err instanceof Error ? err.message : 'Erreur réseau.'); }
        finally { setProbing(false); }
    }, [normalizedVulnCode]);

    const copyFlag = async () => {
        if (!probe?.flag) return;
        try { await navigator.clipboard.writeText(probe.flag); } catch { /* ignore */ }
    };

    const submitFlag = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) { setError('Session expirée.'); return; }
        if (!probe?.flag) { setUnlockFeedback({ type: 'error', message: 'Aucun flag à soumettre.' }); return; }
        try {
            setUnlockFeedback(null); setUnlocking(true);
            const res = await fetch('/api/defense/submit-flag', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ vulnCode: normalizedVulnCode, flag: probe.flag }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success) throw new Error(data?.error || 'Impossible de soumettre le flag.');
            setUnlockFeedback({ type: 'success', message: data?.result?.message || 'Flag accepté. Quiz defense débloqué.' });
            void fetchCatalogItem();
        } catch (err) {
            setUnlockFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Erreur réseau.' });
        } finally { setUnlocking(false); }
    }, [normalizedVulnCode, probe?.flag]);

    const resetVuln = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) { setError('Session expirée.'); return; }
        try {
            setError(null); setResetting(true); setUnlockFeedback(null);
            const res = await fetch('/api/defense/reset', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ vulnCode: normalizedVulnCode }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success) throw new Error(data?.error || 'Reset impossible.');
            setProbe(null); void fetchCatalogItem();
        } catch (err) { setError(err instanceof Error ? err.message : 'Erreur réseau.'); }
        finally { setResetting(false); }
    }, [fetchCatalogItem, normalizedVulnCode]);

    /* ── Loading ── */
    if (loading || isLoading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)', padding: '32px 24px' }}>
                <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <NotionSkeleton type="line" />
                    <NotionSkeleton type="card" />
                    <NotionSkeleton type="card" />
                </div>
            </div>
        );
    }

    const isFixed = catalogItem ? !catalogItem.is_vulnerable : false;
    const sev = (catalogItem?.severity || 'MEDIUM') as Severity;
    const sevStyle = SEVERITY_STYLES[sev] || SEVERITY_STYLES.MEDIUM;
    const stateLabel = catalogItem
        ? (isFixed ? 'Sécurisé' : (catalogItem.defense_unlocked ? 'Quiz débloqué' : 'Défense verrouillée'))
        : '—';

    return (
        <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)' }}>

            {/* ── Page header ── */}
            <div style={{
                background: 'var(--n-bg-primary)', borderBottom: '1px solid var(--n-border)',
                borderLeft: `3px solid ${sevStyle.bar}`, padding: '16px 24px',
            }}>
                {/* Breadcrumb */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--n-text-tertiary)', marginBottom: '10px' }}>
                    <Link href="/student" style={{ color: 'var(--n-text-tertiary)', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--n-accent)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--n-text-tertiary)')}>
                        Mon Parcours
                    </Link>
                    <ChevronRight size={11} />
                    <Link href="/student/defense" style={{ color: 'var(--n-text-tertiary)', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--n-accent)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--n-text-tertiary)')}>
                        Sandbox Défense
                    </Link>
                    <ChevronRight size={11} />
                    <span style={{ color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-mono)', fontSize: '11px' }}>
                        {normalizedVulnCode}
                    </span>
                </div>

                {/* Title row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                        {/* Badges */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <span style={{
                                fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                                padding: '2px 7px', borderRadius: '4px',
                                background: sevStyle.bg, color: sevStyle.color, border: `1px solid ${sevStyle.border}`,
                            }}>
                                {sev}
                            </span>
                            {catalogItem?.attack_type && (
                                <span style={{
                                    fontSize: '11px', padding: '2px 7px', borderRadius: '4px',
                                    background: 'var(--n-bg-secondary)', border: '1px solid var(--n-border)', color: 'var(--n-text-secondary)',
                                }}>
                                    {catalogItem.attack_type}
                                </span>
                            )}
                            <span style={{
                                fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px',
                                background: isFixed ? 'var(--n-success-bg)' : catalogItem?.defense_unlocked ? 'var(--n-accent-light)' : 'var(--n-warning-bg)',
                                border: `1px solid ${isFixed ? 'var(--n-success-border)' : catalogItem?.defense_unlocked ? 'var(--n-accent-border)' : 'var(--n-warning-border)'}`,
                                color: isFixed ? 'var(--n-success)' : catalogItem?.defense_unlocked ? 'var(--n-accent)' : 'var(--n-warning)',
                            }}>
                                {stateLabel}
                            </span>
                        </div>
                        <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--n-text-primary)', lineHeight: 1.2, marginBottom: '3px' }}>
                            {catalogItem?.title || normalizedVulnCode}
                        </h1>
                        {catalogItem?.description && (
                            <p style={{ fontSize: '13px', color: 'var(--n-text-secondary)', lineHeight: 1.5, maxWidth: '600px' }}>
                                {catalogItem.description}
                            </p>
                        )}
                    </div>
                    <Link href="/student/defense"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                            background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)',
                            color: 'var(--n-text-secondary)', textDecoration: 'none', flexShrink: 0,
                        }}>
                        ← Dashboard
                    </Link>
                </div>
            </div>

            {/* ── Content ── */}
            <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

                        {/* Main column */}
                        <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

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

                            {/* Objective */}
                            <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', padding: '16px' }}>
                                <h2 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--n-text-tertiary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Shield size={12} /> Objectif du lab
                                </h2>
                                <p style={{ fontSize: '13px', color: 'var(--n-text-secondary)', lineHeight: 1.6 }}>
                                    Lancez le probe sur{' '}
                                    <code style={{ padding: '1px 5px', borderRadius: '3px', fontSize: '12px', fontFamily: 'var(--n-font-mono)', background: 'var(--n-bg-secondary)', border: '1px solid var(--n-border)', color: 'var(--n-warning)' }}>
                                        {normalizedVulnCode}
                                    </code>{' '}
                                    pour récupérer le flag offensif. Une fois soumis, le quiz défense sera débloqué.
                                </p>
                                {isFixed && (
                                    <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '6px', background: 'var(--n-success-bg)', border: '1px solid var(--n-success-border)', fontSize: '13px', color: 'var(--n-success)' }}>
                                        Cette vulnérabilité est déjà corrigée. Utilisez «&nbsp;Réinitialiser&nbsp;» pour rejouer le lab.
                                    </div>
                                )}
                            </div>

                            {/* Probe results */}
                            {probe ? (
                                <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', padding: '16px' }}>
                                    {/* Result header */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <h2 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--n-text-tertiary)', margin: 0 }}>
                                                Résultat probe
                                            </h2>
                                            <span style={{
                                                fontSize: '11px', fontFamily: 'var(--n-font-mono)', fontWeight: 600,
                                                padding: '2px 7px', borderRadius: '4px',
                                                background: probe.status < 400 ? 'var(--n-success-bg)' : 'var(--n-danger-bg)',
                                                color: probe.status < 400 ? 'var(--n-success)' : 'var(--n-danger)',
                                                border: `1px solid ${probe.status < 400 ? 'var(--n-success-border)' : 'var(--n-danger-border)'}`,
                                            }}>
                                                HTTP {probe.status}
                                            </span>
                                        </div>
                                        {probe.flag
                                            ? <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--n-warning)' }}>🏴 Flag détecté</span>
                                            : <span style={{ fontSize: '12px', color: 'var(--n-text-tertiary)' }}>Aucun flag détecté</span>
                                        }
                                    </div>

                                    {probe.flag && (
                                        <div style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: '6px', background: 'var(--n-warning-bg)', border: '1px solid var(--n-warning-border)' }}>
                                            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--n-warning)', marginBottom: '4px', opacity: 0.7 }}>Flag</p>
                                            <p style={{ fontSize: '13px', fontFamily: 'var(--n-font-mono)', color: 'var(--n-warning)', wordBreak: 'break-all', margin: 0 }}>{probe.flag}</p>
                                        </div>
                                    )}

                                    {unlockFeedback && (
                                        <div style={{
                                            marginBottom: '12px', padding: '10px 12px', borderRadius: '6px', fontSize: '13px',
                                            background: unlockFeedback.type === 'success' ? 'var(--n-success-bg)' : 'var(--n-danger-bg)',
                                            border: `1px solid ${unlockFeedback.type === 'success' ? 'var(--n-success-border)' : 'var(--n-danger-border)'}`,
                                            color: unlockFeedback.type === 'success' ? 'var(--n-success)' : 'var(--n-danger)',
                                        }}>
                                            {unlockFeedback.message}
                                        </div>
                                    )}

                                    {/* Response body */}
                                    <div style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--n-border)' }}>
                                        <div style={{ padding: '6px 12px', background: '#1e2433', display: 'flex', alignItems: 'center', gap: '5px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                                            <span style={{ marginLeft: '8px', fontSize: '11px', fontFamily: 'var(--n-font-mono)', color: 'rgba(148,163,184,0.5)' }}>response body</span>
                                        </div>
                                        <pre style={{ margin: 0, padding: '12px', maxHeight: '240px', overflowY: 'auto', fontSize: '12px', lineHeight: 1.6, fontFamily: 'var(--n-font-mono)', background: '#0f172a', color: '#67e8f9' }}>
                                            {probe.rawBody ? probe.rawBody : formatJson(probe.body)}
                                        </pre>
                                    </div>
                                </div>
                            ) : (
                                <div style={{
                                    textAlign: 'center', padding: '32px 24px', borderRadius: '8px',
                                    background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderStyle: 'dashed',
                                }}>
                                    <Shield size={24} style={{ color: 'var(--n-text-tertiary)', marginBottom: '8px' }} />
                                    <p style={{ fontSize: '13px', color: 'var(--n-text-tertiary)' }}>
                                        Lancez le probe pour afficher le flag et les éléments de diagnostic.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Right sidebar */}
                        <div style={{ width: '200px', flexShrink: 0 }}>
                            <div style={{ position: 'sticky', top: '64px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

                                {/* Workflow */}
                                <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', padding: '14px' }}>
                                    <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--n-text-tertiary)', marginBottom: '12px' }}>Workflow</p>
                                    <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {['Lancer le probe', 'Copier le flag', 'Soumettre pour débloquer', 'Appliquer le correctif'].map((step, i) => (
                                            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                                <span style={{
                                                    flexShrink: 0, width: '18px', height: '18px', borderRadius: '50%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '9px', fontWeight: 700, marginTop: '1px',
                                                    background: 'var(--n-accent-light)', color: 'var(--n-accent)', border: '1px solid var(--n-accent-border)',
                                                }}>
                                                    {i + 1}
                                                </span>
                                                <span style={{ fontSize: '12px', color: 'var(--n-text-secondary)', lineHeight: 1.4 }}>{step}</span>
                                            </li>
                                        ))}
                                    </ol>
                                    {catalogItem?.defense_hint && (
                                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--n-border)' }}>
                                            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--n-text-tertiary)', marginBottom: '6px' }}>Hint</p>
                                            <p style={{ fontSize: '12px', color: 'var(--n-text-secondary)', lineHeight: 1.5 }}>{catalogItem.defense_hint}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--n-text-tertiary)', marginBottom: '6px' }}>Actions</p>

                                    <button onClick={() => void runProbe()} disabled={probing}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                            padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                                            background: 'var(--n-accent)', color: '#fff', border: 'none',
                                            cursor: probing ? 'not-allowed' : 'pointer', opacity: probing ? 0.6 : 1,
                                        }}>
                                        <RefreshCw size={12} className={probing ? 'animate-spin' : ''} />
                                        {probing ? 'Probe…' : 'Lancer le probe'}
                                    </button>

                                    <button onClick={() => void copyFlag()} disabled={!probe?.flag}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                            padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                                            background: 'var(--n-warning-bg)', border: '1px solid var(--n-warning-border)',
                                            color: 'var(--n-warning)', cursor: probe?.flag ? 'pointer' : 'not-allowed',
                                            opacity: probe?.flag ? 1 : 0.4,
                                        }}>
                                        <Copy size={12} /> Copier le flag
                                    </button>

                                    <button onClick={() => void submitFlag()} disabled={!probe?.flag || unlocking}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                            padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                                            background: 'var(--n-success-bg)', border: '1px solid var(--n-success-border)',
                                            color: 'var(--n-success)', cursor: probe?.flag && !unlocking ? 'pointer' : 'not-allowed',
                                            opacity: !probe?.flag || unlocking ? 0.4 : 1,
                                        }}>
                                        <Flag size={12} /> {unlocking ? 'Soumission…' : 'Soumettre le flag'}
                                    </button>

                                    <button onClick={() => void resetVuln()} disabled={resetting}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                            padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                                            background: 'var(--n-bg-secondary)', border: '1px solid var(--n-border)',
                                            color: 'var(--n-text-secondary)', cursor: resetting ? 'not-allowed' : 'pointer',
                                            opacity: resetting ? 0.5 : 1,
                                        }}>
                                        <RotateCcw size={12} /> {resetting ? 'Reset…' : 'Réinitialiser'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
