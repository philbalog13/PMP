'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    Shield, CheckCircle, AlertTriangle, Lock, Unlock,
    HelpCircle, Activity, Flag, KeyRound, RotateCcw, RefreshCw,
    ChevronRight, Terminal
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../auth/useAuth';
import { NotionProgress, NotionSkeleton } from '@shared/components/notion';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface Vulnerability {
    vuln_code: string;
    title: string;
    description: string;
    severity: Severity;
    bloc_number: number;
    module_number: number | null;
    attack_type: string | null;
    is_vulnerable: boolean;
    defense_unlocked: boolean;
    exploited_at?: string | null;
    fixed_at?: string | null;
    question?: string;
    options?: string[];
}

interface DefenseStatus {
    total: number;
    fixed: number;
    exploited: number;
    progress: number;
    vulnerabilities: Record<string, boolean>;
    states?: Record<string, {
        exploitedAt: string | null;
        fixedAt: string | null;
        defenseUnlocked: boolean;
        isVulnerable: boolean;
    }>;
}

interface FlagFeedback {
    type: 'success' | 'error';
    message: string;
}

// Desaturated severity tokens for Notion style
const SEVERITY_CONFIG: Record<Severity, {
    label: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    barColor: string;
}> = {
    CRITICAL: {
        label: 'CRITICAL',
        badgeBg: 'var(--n-danger-bg)',
        badgeText: 'var(--n-danger)',
        badgeBorder: 'var(--n-danger-border)',
        barColor: 'var(--n-danger)',
    },
    HIGH: {
        label: 'HIGH',
        badgeBg: 'rgba(194,65,12,0.08)',
        badgeText: '#c2410c',
        badgeBorder: 'rgba(194,65,12,0.2)',
        barColor: '#c2410c',
    },
    MEDIUM: {
        label: 'MEDIUM',
        badgeBg: 'var(--n-warning-bg)',
        badgeText: 'var(--n-warning)',
        badgeBorder: 'var(--n-warning-border)',
        barColor: 'var(--n-warning)',
    },
    LOW: {
        label: 'LOW',
        badgeBg: 'var(--n-success-bg)',
        badgeText: 'var(--n-success)',
        badgeBorder: 'var(--n-success-border)',
        barColor: 'var(--n-success)',
    },
};

export default function DefenseDashboard() {
    const { isLoading } = useAuth(true);
    const [status, setStatus] = useState<DefenseStatus | null>(null);
    const [catalog, setCatalog] = useState<Vulnerability[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);
    const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
    const [quizResult, setQuizResult] = useState<{ correct: boolean; explanation?: string } | null>(null);
    const [submittingQuiz, setSubmittingQuiz] = useState(false);

    const [flagInputs, setFlagInputs] = useState<Record<string, string>>({});
    const [flagSubmitting, setFlagSubmitting] = useState<Record<string, boolean>>({});
    const [flagFeedbacks, setFlagFeedbacks] = useState<Record<string, FlagFeedback>>({});
    const [resetSubmitting, setResetSubmitting] = useState<Record<string, boolean>>({});

    const fetchData = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            setLoading(true);
            setError(null);
            const headers = { Authorization: `Bearer ${token}` };

            const [statusRes, catalogRes] = await Promise.all([
                fetch('/api/defense/status', { headers }),
                fetch('/api/defense/catalog', { headers })
            ]);

            if (!statusRes.ok || !catalogRes.ok) {
                const statusBody = await statusRes.json().catch(() => ({}));
                const catalogBody = await catalogRes.json().catch(() => ({}));
                throw new Error(statusBody.error || catalogBody.error || 'Impossible de charger la sandbox defense.');
            }

            const statusData = await statusRes.json();
            const catalogData = await catalogRes.json();

            const nextStatus: DefenseStatus = statusData.status;
            setStatus(nextStatus);

            const states = nextStatus.states || {};

            const mergedCatalog: Vulnerability[] = (catalogData.catalog || []).map((v: Vulnerability) => {
                const st = states[v.vuln_code];
                return {
                    ...v,
                    is_vulnerable: st ? st.isVulnerable : (v.is_vulnerable ?? true),
                    defense_unlocked: st ? st.defenseUnlocked : (v.defense_unlocked ?? false),
                    exploited_at: st ? st.exploitedAt : (v.exploited_at ?? null),
                    fixed_at: st ? st.fixedAt : (v.fixed_at ?? null)
                };
            });

            setCatalog(mergedCatalog);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur reseau.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isLoading) {
            fetchData();
        }
    }, [isLoading, fetchData]);

    const handleSubmitFlag = async (vulnCode: string) => {
        const token = localStorage.getItem('token');
        const flag = (flagInputs[vulnCode] || '').trim();

        if (!token) {
            setError('Session expiree. Merci de vous reconnecter.');
            return;
        }

        if (!flag) {
            setFlagFeedbacks((prev) => ({
                ...prev,
                [vulnCode]: { type: 'error', message: 'Entrez un flag avant validation.' }
            }));
            return;
        }

        try {
            setFlagSubmitting((prev) => ({ ...prev, [vulnCode]: true }));
            setFlagFeedbacks((prev) => ({ ...prev, [vulnCode]: { type: 'error', message: '' } }));

            const res = await fetch('/api/defense/submit-flag', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ vulnCode, flag })
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data.success) {
                setFlagFeedbacks((prev) => ({
                    ...prev,
                    [vulnCode]: { type: 'error', message: data.error || 'Flag invalide.' }
                }));
                return;
            }

            setFlagFeedbacks((prev) => ({
                ...prev,
                [vulnCode]: { type: 'success', message: data.result?.message || 'Flag valide. Defense debloquee.' }
            }));

            await fetchData();
        } catch (err) {
            setFlagFeedbacks((prev) => ({
                ...prev,
                [vulnCode]: { type: 'error', message: err instanceof Error ? err.message : 'Erreur reseau.' }
            }));
        } finally {
            setFlagSubmitting((prev) => ({ ...prev, [vulnCode]: false }));
        }
    };

    const handleResetVuln = async (vulnCode: string) => {
        const token = localStorage.getItem('token');
        if (!token) { setError('Session expiree. Merci de vous reconnecter.'); return; }

        try {
            setResetSubmitting((prev) => ({ ...prev, [vulnCode]: true }));

            const res = await fetch('/api/defense/reset', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ vulnCode })
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) { setError(data.error || 'Erreur lors du reset de la faille.'); return; }
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors du reset de la faille.');
        } finally {
            setResetSubmitting((prev) => ({ ...prev, [vulnCode]: false }));
        }
    };

    const openQuiz = (vuln: Vulnerability) => {
        if (!vuln.defense_unlocked || !vuln.is_vulnerable) return;
        setSelectedVuln(vuln);
        setQuizAnswer(null);
        setQuizResult(null);
    };

    const handleQuizSubmit = async () => {
        if (!selectedVuln || quizAnswer === null) return;
        const token = localStorage.getItem('token');
        if (!token) { setError('Session expiree. Merci de vous reconnecter.'); return; }

        try {
            setSubmittingQuiz(true);
            const res = await fetch('/api/defense/fix', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ vulnCode: selectedVuln.vuln_code, selectedOptionIndex: quizAnswer })
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                setError(data.error || 'Erreur lors de la soumission du quiz defense.');
                return;
            }

            setQuizResult({ correct: Boolean(data.correction?.correct), explanation: data.correction?.explanation });
            if (data.correction?.correct) {
                setTimeout(() => { setSelectedVuln(null); void fetchData(); }, 1200);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors de la soumission du quiz defense.');
        } finally {
            setSubmittingQuiz(false);
        }
    };

    /* ── Loading ── */
    if (loading && !status) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)', padding: '32px 24px' }}>
                <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <NotionSkeleton type="line" />
                    <NotionSkeleton type="card" />
                    <NotionSkeleton type="card" />
                    <NotionSkeleton type="card" />
                </div>
            </div>
        );
    }

    const progressPct = status?.progress ?? 0;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)' }}>

            {/* ── Page header ── */}
            <div style={{ background: 'var(--n-bg-primary)', borderBottom: '1px solid var(--n-border)', padding: '16px 24px' }}>
                {/* Breadcrumb */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--n-text-tertiary)', marginBottom: '10px' }}>
                    <Link href="/student" style={{ color: 'var(--n-text-tertiary)', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--n-accent)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--n-text-tertiary)')}>
                        Mon Parcours
                    </Link>
                    <ChevronRight size={11} />
                    <span style={{ color: 'var(--n-text-secondary)' }}>Sandbox Défense</span>
                </div>

                {/* Title + refresh */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '7px',
                            background: 'var(--n-danger-bg)', border: '1px solid var(--n-danger-border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                            <Shield size={16} style={{ color: 'var(--n-danger)' }} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--n-text-primary)', lineHeight: 1.2 }}>
                                Sandbox Défense
                            </h1>
                            <p style={{ fontSize: '12px', color: 'var(--n-text-secondary)', marginTop: '1px' }}>
                                Exploitez les failles, soumettez les flags, puis appliquez les correctifs.
                            </p>
                        </div>
                    </div>
                    <button onClick={() => void fetchData()} disabled={loading}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                            background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)',
                            color: 'var(--n-text-secondary)', cursor: 'pointer', opacity: loading ? 0.5 : 1,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-bg-tertiary)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--n-bg-primary)')}>
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                        Actualiser
                    </button>
                </div>
            </div>

            {/* ── Stats strip ── */}
            <div style={{ background: 'var(--n-bg-primary)', borderBottom: '1px solid var(--n-border)', padding: '12px 24px' }}>
                <div style={{ maxWidth: '960px', margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '12px' }}>
                        {[
                            { value: status?.total ?? 0, label: 'Vulnérabilités', color: 'var(--n-danger)' },
                            { value: status?.exploited ?? 0, label: 'Flags trouvés', color: '#c2410c' },
                            { value: status?.fixed ?? 0, label: 'Failles corrigées', color: 'var(--n-success)' },
                            { value: `${progressPct}%`, label: 'Progression', color: 'var(--n-accent)' },
                        ].map((stat) => (
                            <div key={stat.label}>
                                <div style={{ fontSize: '22px', fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                                <div style={{ fontSize: '11px', color: 'var(--n-text-tertiary)', marginTop: '3px' }}>{stat.label}</div>
                            </div>
                        ))}
                    </div>
                    <NotionProgress value={progressPct} variant="accent" size="thin" />
                </div>
            </div>

            {/* ── Content ── */}
            <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px' }}>
                {error && (
                    <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: '10px',
                        padding: '12px 14px', borderRadius: '8px', marginBottom: '16px',
                        background: 'var(--n-danger-bg)', border: '1px solid var(--n-danger-border)',
                    }}>
                        <AlertTriangle size={15} style={{ color: 'var(--n-danger)', marginTop: '1px', flexShrink: 0 }} />
                        <p style={{ fontSize: '13px', color: 'var(--n-danger)', margin: 0 }}>{error}</p>
                    </div>
                )}

                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--n-text-tertiary)', marginBottom: '12px' }}>
                    Catalogue des vulnérabilités
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {catalog.map((vuln) => {
                        const isFixed = !vuln.is_vulnerable;
                        const isLocked = vuln.is_vulnerable && !vuln.defense_unlocked;
                        const isReadyForDefense = vuln.is_vulnerable && vuln.defense_unlocked;
                        const feedback = flagFeedbacks[vuln.vuln_code];
                        const submittingFlag = Boolean(flagSubmitting[vuln.vuln_code]);
                        const resettingVuln = Boolean(resetSubmitting[vuln.vuln_code]);
                        const cfg = SEVERITY_CONFIG[vuln.severity] || SEVERITY_CONFIG.MEDIUM;

                        return (
                            <div key={vuln.vuln_code} style={{
                                background: 'var(--n-bg-primary)',
                                border: `1px solid ${isFixed ? 'var(--n-border)' : cfg.badgeBorder}`,
                                borderLeft: `3px solid ${isFixed ? 'var(--n-border-strong)' : cfg.barColor}`,
                                borderRadius: '8px',
                                opacity: isFixed ? 0.7 : 1,
                            }}>
                                <div style={{ padding: '14px 16px' }}>
                                    {/* Badges */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                                        <span style={{
                                            fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                                            padding: '2px 7px', borderRadius: '4px',
                                            background: cfg.badgeBg, color: cfg.badgeText, border: `1px solid ${cfg.badgeBorder}`,
                                        }}>
                                            {cfg.label}
                                        </span>
                                        <span style={{
                                            fontSize: '11px', fontFamily: 'var(--n-font-mono)', padding: '2px 6px', borderRadius: '4px',
                                            background: 'var(--n-bg-secondary)', border: '1px solid var(--n-border)', color: 'var(--n-text-tertiary)',
                                        }}>
                                            BLOC {vuln.bloc_number}
                                        </span>
                                        {typeof vuln.module_number === 'number' && (
                                            <span style={{
                                                fontSize: '11px', fontFamily: 'var(--n-font-mono)', padding: '2px 6px', borderRadius: '4px',
                                                background: 'var(--n-bg-secondary)', border: '1px solid var(--n-border)', color: 'var(--n-text-tertiary)',
                                            }}>
                                                MODULE {vuln.module_number}
                                            </span>
                                        )}
                                        {isFixed && (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700,
                                                textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 7px', borderRadius: '4px',
                                                background: 'var(--n-success-bg)', color: 'var(--n-success)', border: '1px solid var(--n-success-border)',
                                            }}>
                                                <CheckCircle size={9} /> Sécurisé
                                            </span>
                                        )}
                                        {isLocked && (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700,
                                                textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 7px', borderRadius: '4px',
                                                background: 'var(--n-warning-bg)', color: 'var(--n-warning)', border: '1px solid var(--n-warning-border)',
                                            }}>
                                                <Lock size={9} /> Défense verrouillée
                                            </span>
                                        )}
                                        {isReadyForDefense && (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700,
                                                textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 7px', borderRadius: '4px',
                                                background: 'var(--n-accent-light)', color: 'var(--n-accent)', border: '1px solid var(--n-accent-border)',
                                            }}>
                                                <Unlock size={9} /> Quiz débloqué
                                            </span>
                                        )}
                                    </div>

                                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--n-text-primary)', marginBottom: '4px' }}>
                                        {vuln.title}
                                    </h3>
                                    <p style={{ fontSize: '13px', color: 'var(--n-text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                                        {vuln.description}
                                    </p>

                                    {/* Meta */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'var(--n-text-tertiary)', marginBottom: '12px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Activity size={12} /> {vuln.attack_type || 'N/A'}
                                        </span>
                                        {vuln.exploited_at && (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600,
                                                padding: '2px 7px', borderRadius: '999px',
                                                background: 'var(--n-accent-light)', color: 'var(--n-accent)', border: '1px solid var(--n-accent-border)',
                                            }}>
                                                <Flag size={10} /> Flag validé
                                            </span>
                                        )}
                                        {vuln.fixed_at && (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600,
                                                padding: '2px 7px', borderRadius: '999px',
                                                background: 'var(--n-success-bg)', color: 'var(--n-success)', border: '1px solid var(--n-success-border)',
                                            }}>
                                                <CheckCircle size={10} /> Correctif appliqué
                                            </span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: isLocked ? '12px' : 0 }}>
                                        <Link href={`/student/defense/lab/${encodeURIComponent(vuln.vuln_code)}`}
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                padding: '7px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                                                background: 'var(--n-accent)', color: '#fff', textDecoration: 'none',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                                            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                                            <Terminal size={13} /> Accéder au lab
                                        </Link>
                                        {isReadyForDefense && (
                                            <button onClick={() => openQuiz(vuln)}
                                                style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                    padding: '7px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                                                    background: 'var(--n-success-bg)', border: '1px solid var(--n-success-border)',
                                                    color: 'var(--n-success)', cursor: 'pointer',
                                                }}>
                                                <Unlock size={13} /> Corriger la faille
                                            </button>
                                        )}
                                        {isFixed && (
                                            <button onClick={() => void handleResetVuln(vuln.vuln_code)} disabled={resettingVuln}
                                                style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                    padding: '7px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                                                    background: 'var(--n-bg-secondary)', border: '1px solid var(--n-border)',
                                                    color: 'var(--n-text-secondary)', cursor: 'pointer', opacity: resettingVuln ? 0.5 : 1,
                                                }}>
                                                <RotateCcw size={13} /> {resettingVuln ? 'Reset...' : 'Réinitialiser'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Flag input */}
                                    {isLocked && (
                                        <div style={{
                                            padding: '12px 14px', borderRadius: '6px',
                                            background: 'var(--n-bg-secondary)', border: '1px solid var(--n-border)',
                                        }}>
                                            <p style={{
                                                fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                                                color: 'var(--n-text-tertiary)', marginBottom: '10px',
                                                display: 'flex', alignItems: 'center', gap: '5px',
                                            }}>
                                                <Flag size={12} /> Étape offensive — soumettez le flag pour débloquer
                                            </p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    <input
                                                        value={flagInputs[vuln.vuln_code] || ''}
                                                        onChange={(event) => setFlagInputs((prev) => ({ ...prev, [vuln.vuln_code]: event.target.value }))}
                                                        placeholder="FLAG{...}"
                                                        style={{
                                                            flex: 1, minWidth: '200px', padding: '8px 12px', borderRadius: '6px', fontSize: '13px',
                                                            fontFamily: 'var(--n-font-mono)', background: 'var(--n-bg-primary)',
                                                            border: '1px solid var(--n-border)', color: 'var(--n-text-primary)', outline: 'none',
                                                        }}
                                                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--n-accent-border)')}
                                                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--n-border)')}
                                                    />
                                                    <button onClick={() => void handleSubmitFlag(vuln.vuln_code)} disabled={submittingFlag}
                                                        style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                            padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                                                            background: 'var(--n-accent)', color: '#fff', border: 'none',
                                                            cursor: submittingFlag ? 'not-allowed' : 'pointer', opacity: submittingFlag ? 0.5 : 1, flexShrink: 0,
                                                        }}>
                                                        <KeyRound size={13} /> {submittingFlag ? 'Validation...' : 'Valider le flag'}
                                                    </button>
                                                </div>
                                                {feedback?.message && (
                                                    <p style={{ fontSize: '12px', margin: 0, color: feedback.type === 'success' ? 'var(--n-success)' : 'var(--n-danger)' }}>
                                                        {feedback.message}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {catalog.length === 0 && !loading && (
                        <div style={{
                            textAlign: 'center', padding: '48px 24px', borderRadius: '8px',
                            background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderStyle: 'dashed',
                        }}>
                            <Shield size={28} style={{ color: 'var(--n-text-tertiary)', marginBottom: '10px' }} />
                            <p style={{ fontSize: '13px', color: 'var(--n-text-tertiary)' }}>
                                Aucune vulnérabilité disponible pour le moment.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Quiz Modal ── */}
            {selectedVuln && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 50,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '16px', background: 'rgba(0,0,0,0.45)',
                }}>
                    <div style={{
                        maxWidth: '560px', width: '100%', padding: '24px',
                        background: 'var(--n-bg-primary)', borderRadius: '12px',
                        border: '1px solid var(--n-border)',
                        boxShadow: '0 20px 60px -12px rgba(0,0,0,0.2)',
                        position: 'relative',
                    }}>
                        <button onClick={() => setSelectedVuln(null)}
                            style={{
                                position: 'absolute', top: '12px', right: '12px',
                                width: '28px', height: '28px', borderRadius: '6px',
                                background: 'transparent', border: '1px solid var(--n-border)',
                                color: 'var(--n-text-tertiary)', cursor: 'pointer', fontSize: '16px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-bg-secondary)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            ×
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <Shield size={14} style={{ color: 'var(--n-danger)' }} />
                            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--n-danger)' }}>
                                Quiz de défense
                            </span>
                        </div>
                        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--n-text-primary)', marginBottom: '16px' }}>
                            {selectedVuln.title}
                        </h2>

                        {!quizResult ? (
                            <>
                                <div style={{ padding: '14px 16px', borderRadius: '8px', marginBottom: '16px', background: 'var(--n-bg-secondary)', border: '1px solid var(--n-border)' }}>
                                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--n-text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.5 }}>
                                        <HelpCircle size={16} style={{ color: 'var(--n-warning)', flexShrink: 0, marginTop: '1px' }} />
                                        {selectedVuln.question || 'Comment corriger cette vulnérabilité ?'}
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {(selectedVuln.options || []).map((opt, idx) => (
                                            <label key={idx} style={{
                                                display: 'flex', alignItems: 'flex-start', gap: '10px',
                                                padding: '10px 12px', borderRadius: '6px', cursor: 'pointer',
                                                background: quizAnswer === idx ? 'var(--n-accent-light)' : 'var(--n-bg-primary)',
                                                border: `1px solid ${quizAnswer === idx ? 'var(--n-accent-border)' : 'var(--n-border)'}`,
                                                transition: 'all 0.1s',
                                            }}>
                                                <input type="radio" name="quiz" style={{ marginTop: '2px', flexShrink: 0, accentColor: 'var(--n-accent)' }}
                                                    checked={quizAnswer === idx} onChange={() => setQuizAnswer(idx)} />
                                                <span style={{ fontSize: '13px', color: 'var(--n-text-primary)', lineHeight: 1.5 }}>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    <button onClick={() => setSelectedVuln(null)}
                                        style={{ padding: '7px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', color: 'var(--n-text-secondary)', cursor: 'pointer' }}>
                                        Annuler
                                    </button>
                                    <button onClick={() => void handleQuizSubmit()} disabled={quizAnswer === null || submittingQuiz}
                                        style={{ padding: '7px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, background: 'var(--n-accent)', color: '#fff', border: 'none', cursor: quizAnswer === null || submittingQuiz ? 'not-allowed' : 'pointer', opacity: quizAnswer === null || submittingQuiz ? 0.5 : 1 }}>
                                        {submittingQuiz ? 'Validation...' : 'Appliquer le correctif'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                {quizResult.correct ? (
                                    <>
                                        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--n-success-bg)', border: '2px solid var(--n-success-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                            <CheckCircle size={26} style={{ color: 'var(--n-success)' }} />
                                        </div>
                                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--n-success)', marginBottom: '6px' }}>Faille corrigée !</h3>
                                        <p style={{ fontSize: '13px', color: 'var(--n-text-secondary)', lineHeight: 1.5 }}>{quizResult.explanation}</p>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--n-danger-bg)', border: '2px solid var(--n-danger-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                            <AlertTriangle size={26} style={{ color: 'var(--n-danger)' }} />
                                        </div>
                                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--n-danger)', marginBottom: '6px' }}>Correction incorrecte</h3>
                                        <p style={{ fontSize: '13px', color: 'var(--n-text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>{quizResult.explanation || 'Ce n\'est pas la bonne solution. Réessayez.'}</p>
                                        <button onClick={() => setQuizResult(null)}
                                            style={{ padding: '7px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, background: 'var(--n-bg-secondary)', border: '1px solid var(--n-border)', color: 'var(--n-text-secondary)', cursor: 'pointer' }}>
                                            Réessayer
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
