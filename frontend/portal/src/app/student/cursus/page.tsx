'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../auth/useAuth';
import {
    BookOpen, Clock, Layers, Play, Star, CheckCircle,
    AlertCircle, Search, TrendingUp, RefreshCw
} from 'lucide-react';
import { NotionCard, NotionBadge, NotionProgress, NotionSkeleton, NotionEmptyState, NotionTag } from '@shared/components/notion';

/* ── Level → NotionBadge variant map ─────────────────────────────────── */
type LevelVariant = 'beginner' | 'inter' | 'advanced' | 'expert';
const LEVEL_VARIANT: Record<string, LevelVariant> = {
    DEBUTANT: 'beginner', INTERMEDIAIRE: 'inter', AVANCE: 'advanced', EXPERT: 'expert',
};
const LEVEL_LABEL: Record<string, string> = {
    DEBUTANT: 'Débutant', INTERMEDIAIRE: 'Intermédiaire', AVANCE: 'Avancé', EXPERT: 'Expert',
};
const ICON_EMOJI: Record<string, string> = {
    'credit-card': '💳', 'shield': '🛡️', 'lock': '🔐', 'layers': '📚',
    'key': '🔑', 'file-text': '📄', 'book-open': '📖',
};

/* ── Type ────────────────────────────────────────────────────────────── */
interface Cursus {
    id: string; title: string; description: string; icon: string;
    color: string; level: string; estimated_hours: number;
    tags: string[]; module_count: number;
    progress: { completed: number; total: number };
}

/* ── CursusCard ──────────────────────────────────────────────────────── */
function CursusCard({ cursus }: { cursus: Cursus }) {
    const pct          = cursus.progress?.total > 0 ? Math.round((cursus.progress.completed / cursus.progress.total) * 100) : 0;
    const isDone       = pct >= 100;
    const hasStarted   = pct > 0 && !isDone;
    const emoji        = ICON_EMOJI[cursus.icon] || '📚';
    const levelVariant = LEVEL_VARIANT[cursus.level] ?? 'beginner';
    const levelLabel   = LEVEL_LABEL[cursus.level] ?? 'Débutant';

    return (
        <NotionCard variant="hover" padding="none">
            <Link href={`/student/cursus/${cursus.id}`} style={{ display: 'flex', textDecoration: 'none', color: 'inherit', borderRadius: 'var(--n-radius-md)', overflow: 'hidden' }}>
                {/* Left accent bar */}
                <div style={{
                    width: '3px', flexShrink: 0,
                    background: isDone ? 'var(--n-success)' : hasStarted ? 'var(--n-accent)' : 'var(--n-border)',
                }} />

                {/* Main content */}
                <div style={{ flex: 1, padding: 'var(--n-space-5)', minWidth: 0 }}>
                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--n-space-3)', marginBottom: 'var(--n-space-3)' }}>
                        <div style={{
                            width: '44px', height: '44px', borderRadius: 'var(--n-radius-sm)',
                            background: 'var(--n-bg-secondary)', border: '1px solid var(--n-border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '22px', flexShrink: 0,
                        }}>{emoji}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-1)', flexWrap: 'wrap' }}>
                                <NotionBadge variant={levelVariant} dot size="sm">{levelLabel}</NotionBadge>
                                {isDone && <NotionBadge variant="success" size="sm"><CheckCircle size={9} /> Terminé</NotionBadge>}
                            </div>
                            <h3 style={{
                                fontSize: 'var(--n-text-base)',
                                fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'],
                                color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)',
                                lineHeight: 'var(--n-leading-snug)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{cursus.title}</h3>
                        </div>
                    </div>

                    {/* Description */}
                    <p style={{
                        fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)',
                        fontFamily: 'var(--n-font-sans)', lineHeight: 'var(--n-leading-relaxed)',
                        marginBottom: 'var(--n-space-3)',
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'], overflow: 'hidden',
                    }}>{cursus.description}</p>

                    {/* Meta */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-4)', marginBottom: 'var(--n-space-3)', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-1)', fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>
                            <Layers size={11} /> {cursus.module_count} modules
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-1)', fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>
                            <Clock size={11} /> {cursus.estimated_hours}h
                        </span>
                        {cursus.progress?.total > 0 && (
                            <span style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>
                                {cursus.progress.completed}/{cursus.progress.total} UA
                            </span>
                        )}
                    </div>

                    {/* Tags */}
                    {cursus.tags?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--n-space-1)', marginBottom: 'var(--n-space-4)' }}>
                            {cursus.tags.slice(0, 4).map(tag => (
                                <NotionTag key={tag} variant="default">{tag}</NotionTag>
                            ))}
                        </div>
                    )}

                    {/* Progress */}
                    <NotionProgress
                        value={pct}
                        variant={isDone ? 'success' : 'accent'}
                        size="thin"
                        showLabel
                        label={isDone ? 'Terminé' : hasStarted ? 'En cours' : 'Non commencé'}
                    />
                </div>

                {/* Right CTA column */}
                <div style={{
                    width: '80px', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderLeft: '1px solid var(--n-border)',
                    background: 'var(--n-bg-secondary)',
                }}>
                    <div style={{ textAlign: 'center', padding: 'var(--n-space-3)' }}>
                        <div style={{ fontSize: '22px', marginBottom: 'var(--n-space-2)' }}>{emoji}</div>
                        <NotionBadge variant={isDone ? 'success' : hasStarted ? 'accent' : 'default'} size="sm">
                            {isDone ? <><Star size={9} /> Revoir</> : hasStarted ? <><Play size={9} /> Suite</> : <><Play size={9} /> Démarrer</>}
                        </NotionBadge>
                    </div>
                </div>
            </Link>
        </NotionCard>
    );
}

/* ── Main Page ────────────────────────────────────────────────────────── */
export default function CursusListPage() {
    const { isLoading: authLoading }    = useAuth(true);
    const [cursusList, setCursusList]   = useState<Cursus[]>([]);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterLevel, setFilterLevel] = useState<string>('ALL');

    const fetchCursus = useCallback(async () => {
        try {
            setError(null);
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await fetch('/api/cursus', { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error('Impossible de charger les cursus');
            const data = await res.json();
            if (data.success) setCursusList(data.cursus || []);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Erreur de chargement');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => {
        if (authLoading) return;
        fetchCursus();
    }, [authLoading, fetchCursus]);

    const filteredCursus = cursusList.filter((c) => {
        const matchesSearch = !searchQuery
            || c.title.toLowerCase().includes(searchQuery.toLowerCase())
            || c.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesLevel = filterLevel === 'ALL' || c.level === filterLevel;
        return matchesSearch && matchesLevel;
    });

    const totalCompleted = cursusList.reduce((s, c) => s + (c.progress?.completed || 0), 0);
    const totalChapters  = cursusList.reduce((s, c) => s + (c.progress?.total || 0), 0);
    const totalProgress  = totalChapters > 0 ? Math.round((totalCompleted / totalChapters) * 100) : 0;
    const totalHours     = cursusList.reduce((s, c) => s + c.estimated_hours, 0);
    const totalModules   = cursusList.reduce((s, c) => s + c.module_count, 0);

    if (authLoading || (loading && cursusList.length === 0)) {
        return (
            <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '860px', margin: '0 auto' }}>
                <div style={{ marginBottom: 'var(--n-space-6)' }}>
                    <NotionSkeleton type="line" width="200px" height="28px" />
                    <div style={{ marginTop: 'var(--n-space-2)' }}><NotionSkeleton type="line" width="360px" height="14px" /></div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-3)' }}>
                    {[...Array(4)].map((_, i) => <NotionSkeleton key={i} type="card" />)}
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '860px', margin: '0 auto' }}>

            {/* ── PAGE HEADER ───────────────────────────────────────── */}
            <div style={{ marginBottom: 'var(--n-space-7)' }}>
                <NotionTag variant="accent"><BookOpen size={12} /> Parcours d&apos;apprentissage</NotionTag>
                <h1 style={{
                    marginTop: 'var(--n-space-3)', marginBottom: 'var(--n-space-2)',
                    fontSize: '26px',
                    fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'],
                    color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)', letterSpacing: '-0.02em',
                }}>Académie MoneTIC</h1>
                <p style={{ color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)', maxWidth: '520px', lineHeight: 'var(--n-leading-relaxed)' }}>
                    Maîtrisez l&apos;écosystème de la monétique — des protocoles de paiement à la sécurité des transactions.
                </p>
            </div>

            {/* ── STATS ─────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--n-space-3)', marginBottom: 'var(--n-space-6)' }}>
                {[
                    { icon: BookOpen,   label: 'Modules',    value: totalModules > 0 ? `${totalModules}` : '—' },
                    { icon: Clock,      label: 'De contenu', value: totalHours > 0 ? `${totalHours}h` : '—'    },
                    { icon: TrendingUp, label: 'Complété',   value: `${totalProgress}%`                        },
                ].map(({ icon: Icon, label, value }) => (
                    <NotionCard key={label} variant="default" padding="sm">
                        <div style={{ padding: 'var(--n-space-2)', textAlign: 'center' }}>
                            <Icon size={16} style={{ color: 'var(--n-accent)', display: 'block', margin: '0 auto 4px' }} />
                            <div style={{ fontSize: '20px', fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'], fontFamily: 'var(--n-font-mono)', color: 'var(--n-text-primary)', marginBottom: '2px' }}>{value}</div>
                            <div style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>{label}</div>
                        </div>
                    </NotionCard>
                ))}
            </div>

            {/* Error */}
            {error && (
                <div style={{ marginBottom: 'var(--n-space-5)', padding: 'var(--n-space-3) var(--n-space-4)', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-danger-bg)', border: '1px solid var(--n-danger-border)', color: 'var(--n-danger)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)' }}><AlertCircle size={14} /> {error}</span>
                    <button onClick={fetchCursus} style={{ fontSize: 'var(--n-text-xs)', textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>Réessayer</button>
                </div>
            )}

            {/* ── FILTERS ───────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-3)', marginBottom: 'var(--n-space-6)', flexWrap: 'wrap' }}>
                {/* Level filter */}
                <div style={{ display: 'flex', gap: '2px', padding: '3px', borderRadius: 'var(--n-radius-sm)', border: '1px solid var(--n-border)', background: 'var(--n-bg-secondary)', flexShrink: 0 }}>
                    {(['ALL', 'DEBUTANT', 'INTERMEDIAIRE', 'AVANCE', 'EXPERT'] as const).map(lvl => (
                        <button key={lvl} onClick={() => setFilterLevel(lvl)} style={{
                            padding: '4px 10px', borderRadius: '5px',
                            border: filterLevel === lvl ? '1px solid var(--n-accent-border)' : '1px solid transparent',
                            background: filterLevel === lvl ? 'var(--n-bg-primary)' : 'transparent',
                            color: filterLevel === lvl ? 'var(--n-accent)' : 'var(--n-text-secondary)',
                            fontSize: 'var(--n-text-xs)',
                            fontWeight: filterLevel === lvl ? ('var(--n-weight-semibold)' as React.CSSProperties['fontWeight']) : undefined,
                            fontFamily: 'var(--n-font-sans)', cursor: 'pointer', whiteSpace: 'nowrap',
                            transition: 'all var(--n-duration-xs)',
                        }}>
                            {lvl === 'ALL' ? 'Tous' : LEVEL_LABEL[lvl]}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                    <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--n-text-tertiary)', pointerEvents: 'none' }} />
                    <input
                        type="text" placeholder="Rechercher un cursus…"
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%', boxSizing: 'border-box',
                            paddingLeft: '32px', paddingRight: '12px', paddingTop: '7px', paddingBottom: '7px',
                            borderRadius: 'var(--n-radius-sm)', border: '1px solid var(--n-border)',
                            background: 'var(--n-bg-primary)', color: 'var(--n-text-primary)',
                            fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)', outline: 'none',
                        }}
                        onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--n-accent-border)'; }}
                        onBlur={e =>  { (e.target as HTMLInputElement).style.borderColor = 'var(--n-border)'; }}
                    />
                </div>

                {!loading && (
                    <span style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', flexShrink: 0 }}>
                        <strong style={{ color: 'var(--n-text-primary)' }}>{filteredCursus.length}</strong> cursus
                    </span>
                )}
                <button onClick={fetchCursus} title="Actualiser" style={{ display: 'flex', alignItems: 'center', padding: '7px', borderRadius: 'var(--n-radius-sm)', border: '1px solid var(--n-border)', background: 'var(--n-bg-primary)', color: 'var(--n-text-secondary)', cursor: 'pointer', flexShrink: 0 }}>
                    <RefreshCw size={13} />
                </button>
            </div>

            {/* ── CURSUS LIST ───────────────────────────────────────── */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-3)' }}>
                    {[...Array(3)].map((_, i) => <NotionSkeleton key={i} type="card" />)}
                </div>
            ) : filteredCursus.length === 0 ? (
                <NotionEmptyState
                    icon={<BookOpen size={28} />}
                    title={searchQuery || filterLevel !== 'ALL' ? 'Aucun résultat' : 'Aucun cursus disponible'}
                    description={searchQuery || filterLevel !== 'ALL' ? 'Modifiez vos filtres pour voir plus de cursus.' : 'Les cursus seront bientôt disponibles.'}
                />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-3)' }}>
                    {filteredCursus.map(c => <CursusCard key={c.id} cursus={c} />)}
                </div>
            )}

            {/* ── TIP CALLOUT ───────────────────────────────────────── */}
            {!loading && cursusList.length > 0 && (
                <div style={{ marginTop: 'var(--n-space-10)', padding: 'var(--n-space-4)', borderRadius: 'var(--n-radius-md)', background: 'var(--n-info-bg)', border: '1px solid var(--n-info-border)' }}>
                    <h3 style={{ fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-info)', fontFamily: 'var(--n-font-sans)', marginBottom: 'var(--n-space-2)' }}>
                        Conseil de parcours
                    </h3>
                    <p style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)', lineHeight: 'var(--n-leading-relaxed)' }}>
                        Commencez par les cursus <strong style={{ color: 'var(--n-level-beginner)' }}>Débutant</strong> pour bâtir une base solide, puis progressez vers les niveaux <strong style={{ color: 'var(--n-level-expert)' }}>Expert</strong>. Chaque module complété débloque des badges et XP.
                    </p>
                </div>
            )}
        </div>
    );
}
