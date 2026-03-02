'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import Link from 'next/link';
import { Award, Lock, RefreshCw, Trophy } from 'lucide-react';
import { NotionCard, NotionBadge, NotionProgress, NotionSkeleton, NotionEmptyState, NotionTag } from '@shared/components/notion';

/* ── Types ──────────────────────────────────────────────────────────────── */

type BadgeRow = { type: string; name: string; description: string; icon: string; xp: number; earned: boolean; earnedAt?: string; };
type BadgeResponse = { badges: BadgeRow[]; earned: number; total: number; totalXP: number };

function getAuthHeaders(): HeadersInit | null {
    const token = localStorage.getItem('token');
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
}

const BADGE_EMOJI: Record<string, string> = {
    star: '🎯', 'clipboard-check': '📋', award: '🏅', trophy: '🏆',
    'book-open': '📖', 'graduation-cap': '🎓', zap: '⚡', flame: '🔥',
    flag: '🚩', droplet: '💧', terminal: '🖥️', crown: '👑', layers: '🗂️',
};

/* ── Main Component ─────────────────────────────────────────────────────── */

export default function StudentBadgesPage() {
    const { isLoading }         = useAuth(true);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);
    const [data, setData]       = useState<BadgeResponse | null>(null);

    const loadBadges = useCallback(async () => {
        const headers = getAuthHeaders();
        if (!headers) { setError('Session invalide'); setLoading(false); return; }
        try {
            setLoading(true); setError(null);
            const response = await fetch('/api/progress/badges', { headers });
            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error || 'Impossible de charger les badges');
            }
            const payload = await response.json();
            setData({
                badges:  payload.badges || [],
                earned:  Number(payload.earned || 0),
                total:   Number(payload.total || 0),
                totalXP: Number(payload.totalXP || 0),
            });
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Impossible de charger les badges');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { if (isLoading) return; loadBadges(); }, [isLoading, loadBadges]);

    const completionRate = useMemo(() => {
        if (!data || data.total === 0) return 0;
        return Math.round((data.earned / data.total) * 100);
    }, [data]);

    const earned = data?.badges.filter(b => b.earned)  || [];
    const locked = data?.badges.filter(b => !b.earned) || [];

    /* ── Loading ──────────────────────────────────────────────────────── */
    if (isLoading || loading) {
        return (
            <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '920px', margin: '0 auto' }}>
                <div style={{ marginBottom: 'var(--n-space-6)' }}>
                    <NotionSkeleton type="line" width="160px" height="28px" />
                    <div style={{ marginTop: 'var(--n-space-2)' }}><NotionSkeleton type="line" width="280px" height="14px" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--n-space-3)', marginBottom: 'var(--n-space-6)' }}>
                    {[...Array(3)].map((_, i) => <NotionSkeleton key={i} type="stat" />)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--n-space-4)' }}>
                    {[...Array(6)].map((_, i) => <NotionSkeleton key={i} type="card" />)}
                </div>
            </div>
        );
    }

    /* ── Render ───────────────────────────────────────────────────────── */
    return (
        <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '920px', margin: '0 auto' }}>

            {/* ── PAGE HEADER ───────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--n-space-4)', marginBottom: 'var(--n-space-7)' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)', letterSpacing: '-0.02em', marginBottom: 'var(--n-space-1)' }}>
                        Mes Badges
                    </h1>
                    <p style={{ color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)' }}>
                        Récompenses débloquées grâce à vos accomplissements
                    </p>
                </div>
                <button onClick={loadBadges}
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', padding: '6px 14px', borderRadius: 'var(--n-radius-sm)', border: '1px solid var(--n-border)', background: 'var(--n-bg-primary)', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)', cursor: 'pointer', flexShrink: 0 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--n-border-strong)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--n-border)'; }}>
                    <RefreshCw size={13} /> Actualiser
                </button>
            </div>

            {/* ── STAT CARDS + PROGRESS ─────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr', gap: 'var(--n-space-3)', marginBottom: 'var(--n-space-7)', alignItems: 'stretch' }}>
                {[
                    { label: 'Débloqués',  value: `${data?.earned || 0}/${data?.total || 0}` },
                    { label: 'XP Badges',  value: `${(data?.totalXP || 0).toLocaleString()} XP` },
                    { label: 'Complétion', value: `${completionRate}%` },
                ].map(({ label, value }) => (
                    <NotionCard key={label} variant="default" padding="sm">
                        <div style={{ padding: 'var(--n-space-2)', textAlign: 'center' }}>
                            <div style={{ fontSize: '20px', fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'], fontFamily: 'var(--n-font-mono)', color: 'var(--n-text-primary)', lineHeight: 1, marginBottom: '3px' }}>{value}</div>
                            <div style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>{label}</div>
                        </div>
                    </NotionCard>
                ))}
                {/* Completion bar card */}
                <NotionCard variant="default" padding="md">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-3)' }}>
                        <Trophy size={14} style={{ color: 'var(--n-accent)', flexShrink: 0 }} />
                        <span style={{ fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)' }}>
                            Progression collection
                        </span>
                    </div>
                    <NotionProgress value={completionRate} variant="accent" size="thick" showLabel />
                </NotionCard>
            </div>

            {/* Error */}
            {error && (
                <div style={{ marginBottom: 'var(--n-space-5)', padding: 'var(--n-space-3) var(--n-space-4)', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-danger-bg)', border: '1px solid var(--n-danger-border)', color: 'var(--n-danger)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{error}</span>
                    <button onClick={loadBadges} style={{ fontSize: 'var(--n-text-xs)', textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>Réessayer</button>
                </div>
            )}

            {/* Empty state */}
            {(!data?.badges || data.badges.length === 0) && (
                <NotionEmptyState
                    icon={<Award size={28} />}
                    title="Aucun badge disponible"
                    description="Complétez des ateliers et des quiz pour débloquer vos premiers badges."
                    action={
                        <Link href="/student" style={{ display: 'inline-flex', alignItems: 'center', padding: '7px 16px', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-accent)', color: '#fff', fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], fontFamily: 'var(--n-font-sans)', textDecoration: 'none' }}>
                            Retour au parcours
                        </Link>
                    }
                />
            )}

            {/* ── EARNED BADGES ─────────────────────────────────────── */}
            {earned.length > 0 && (
                <div style={{ marginBottom: 'var(--n-space-10)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-4)' }}>
                        <h2 style={{ fontSize: 'var(--n-text-base)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)' }}>
                            Badges débloqués
                        </h2>
                        <NotionBadge variant="success" dot>{earned.length}</NotionBadge>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--n-space-4)' }}>
                        {earned.map(badge => (
                            <NotionCard key={badge.type} variant="hover" padding="md" style={{ borderColor: 'var(--n-success-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--n-space-3)' }}>
                                    <span style={{ fontSize: '40px', lineHeight: 1, userSelect: 'none' }}>
                                        {BADGE_EMOJI[badge.icon] || '🏅'}
                                    </span>
                                    <NotionBadge variant="success" size="sm">✓ Débloqué</NotionBadge>
                                </div>
                                <h3 style={{ fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)', marginBottom: 'var(--n-space-1)' }}>
                                    {badge.name}
                                </h3>
                                <p style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)', lineHeight: 'var(--n-leading-relaxed)', marginBottom: 'var(--n-space-3)' }}>
                                    {badge.description}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <NotionBadge variant="accent" size="sm">+{badge.xp} XP</NotionBadge>
                                    {badge.earnedAt && (
                                        <span style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>
                                            {new Date(badge.earnedAt).toLocaleDateString('fr-FR')}
                                        </span>
                                    )}
                                </div>
                            </NotionCard>
                        ))}
                    </div>
                </div>
            )}

            {/* ── LOCKED BADGES ─────────────────────────────────────── */}
            {locked.length > 0 && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-4)' }}>
                        <h2 style={{ fontSize: 'var(--n-text-base)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)' }}>
                            À débloquer
                        </h2>
                        <NotionBadge variant="default">{locked.length}</NotionBadge>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--n-space-4)' }}>
                        {locked.map(badge => (
                            <NotionCard key={badge.type} variant="default" padding="md" style={{ opacity: 0.55 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--n-space-3)' }}>
                                    <span style={{ fontSize: '40px', lineHeight: 1, userSelect: 'none', filter: 'grayscale(1)', opacity: 0.4 }}>
                                        {BADGE_EMOJI[badge.icon] || '🏅'}
                                    </span>
                                    <NotionBadge variant="default" size="sm"><Lock size={9} /> Verrouillé</NotionBadge>
                                </div>
                                <h3 style={{ fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)', marginBottom: 'var(--n-space-1)' }}>
                                    {badge.name}
                                </h3>
                                <p style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)', lineHeight: 'var(--n-leading-relaxed)', marginBottom: 'var(--n-space-3)' }}>
                                    {badge.description}
                                </p>
                                <span style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>
                                    +{badge.xp} XP
                                </span>
                            </NotionCard>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
