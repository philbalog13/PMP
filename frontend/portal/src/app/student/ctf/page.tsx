'use client';

import { Suspense } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
    CheckCircle2,
    ChevronRight,
    Flame,
    Lock,
    RefreshCw,
    Shield,
    Swords,
    Target,
    Trophy,
    Zap,
} from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { APP_URLS } from '@shared/lib/app-urls';
import { NotionSkeleton, NotionEmptyState, NotionProgress, NotionBadge } from '@shared/components/notion';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Room {
    code: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    points: number;
    status: 'LOCKED' | 'UNLOCKED' | 'IN_PROGRESS' | 'COMPLETED';
    solveCount: number;
    totalSteps?: number;
    currentGuidedStep?: number;
}

interface ProgressSummary {
    totalPoints: number;
    solvedChallenges: number;
    totalChallenges: number;
}

interface LeaderboardEntry {
    student_id: string;
    rank: number;
    first_bloods: number;
}

// ─── Static maps ─────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
    HSM_ATTACK: 'HSM Attack',
    REPLAY_ATTACK: 'Replay Attack',
    '3DS_BYPASS': '3-D Secure Bypass',
    FRAUD_CNP: 'Fraud CNP',
    ISO8583_MANIPULATION: 'ISO 8583',
    PIN_CRACKING: 'PIN Cracking',
    MITM: 'Man-in-the-Middle',
    PRIVILEGE_ESCALATION: 'Privilege Escalation',
    CRYPTO_WEAKNESS: 'Crypto Weakness',
    EMV_CLONING: 'EMV Cloning',
    TOKEN_VAULT: 'Token Vault',
    NETWORK_ATTACK: 'Network Attack',
    KEY_MANAGEMENT: 'Key Management',
    ADVANCED_FRAUD: 'Advanced Fraud',
    SUPPLY_CHAIN: 'Supply Chain',
    BOSS: 'Boss Challenge',
};

const CATEGORY_COLORS: Record<string, { text: string; bg: string; border: string }> = {
    HSM_ATTACK:             { text: '#dc2626', bg: 'rgba(220,38,38,0.08)',   border: 'rgba(220,38,38,0.2)' },
    REPLAY_ATTACK:          { text: '#ea580c', bg: 'rgba(234,88,12,0.08)',   border: 'rgba(234,88,12,0.2)' },
    '3DS_BYPASS':           { text: '#e11d48', bg: 'rgba(225,29,72,0.08)',   border: 'rgba(225,29,72,0.2)' },
    FRAUD_CNP:              { text: '#ca8a04', bg: 'rgba(202,138,4,0.08)',   border: 'rgba(202,138,4,0.2)' },
    ISO8583_MANIPULATION:   { text: '#0284c7', bg: 'rgba(2,132,199,0.08)',   border: 'rgba(2,132,199,0.2)' },
    PIN_CRACKING:           { text: '#a21caf', bg: 'rgba(162,28,175,0.08)',  border: 'rgba(162,28,175,0.2)' },
    MITM:                   { text: '#7c3aed', bg: 'rgba(124,58,237,0.08)',  border: 'rgba(124,58,237,0.2)' },
    PRIVILEGE_ESCALATION:   { text: '#4338ca', bg: 'rgba(67,56,202,0.08)',   border: 'rgba(67,56,202,0.2)' },
    CRYPTO_WEAKNESS:        { text: '#db2777', bg: 'rgba(219,39,119,0.08)',  border: 'rgba(219,39,119,0.2)' },
    EMV_CLONING:            { text: '#b45309', bg: 'rgba(180,83,9,0.08)',    border: 'rgba(180,83,9,0.2)' },
    TOKEN_VAULT:            { text: '#0f766e', bg: 'rgba(15,118,110,0.08)',  border: 'rgba(15,118,110,0.2)' },
    NETWORK_ATTACK:         { text: '#0e7490', bg: 'rgba(14,116,144,0.08)',  border: 'rgba(14,116,144,0.2)' },
    KEY_MANAGEMENT:         { text: '#4d7c0f', bg: 'rgba(77,124,15,0.08)',   border: 'rgba(77,124,15,0.2)' },
    ADVANCED_FRAUD:         { text: '#b91c1c', bg: 'rgba(185,28,28,0.08)',   border: 'rgba(185,28,28,0.2)' },
    SUPPLY_CHAIN:           { text: '#475569', bg: 'rgba(71,85,105,0.08)',   border: 'rgba(71,85,105,0.2)' },
    BOSS:                   { text: '#a16207', bg: 'rgba(161,98,7,0.1)',     border: 'rgba(161,98,7,0.25)' },
};

const DIFFICULTY_STYLES: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
    BEGINNER:     { label: 'Easy',   color: '#059669', bg: 'rgba(5,150,105,0.08)',   border: 'rgba(5,150,105,0.2)',   dot: '#34d399' },
    INTERMEDIATE: { label: 'Medium', color: '#b45309', bg: 'rgba(180,83,9,0.08)',    border: 'rgba(180,83,9,0.2)',    dot: '#fbbf24' },
    ADVANCED:     { label: 'Hard',   color: '#c2410c', bg: 'rgba(194,65,12,0.08)',   border: 'rgba(194,65,12,0.2)',   dot: '#fb923c' },
    EXPERT:       { label: 'Expert', color: '#b91c1c', bg: 'rgba(185,28,28,0.08)',   border: 'rgba(185,28,28,0.2)',   dot: '#f87171' },
};

// ─── RoomCard ─────────────────────────────────────────────────────────────────

function RoomCard({ room }: { room: Room }) {
    const diff = DIFFICULTY_STYLES[room.difficulty] || { label: room.difficulty, color: 'var(--n-text-secondary)', bg: 'var(--n-bg-elevated)', border: 'var(--n-border)', dot: 'var(--n-text-tertiary)' };
    const cat = CATEGORY_COLORS[room.category] || CATEGORY_COLORS.CRYPTO_WEAKNESS;
    const catLabel = CATEGORY_LABELS[room.category] || room.category;

    const totalSteps = Math.max(1, room.totalSteps || 1);
    const currentStep = Math.min(room.currentGuidedStep || 0, totalSteps);
    const progressPct = room.status === 'COMPLETED'
        ? 100
        : room.status === 'IN_PROGRESS'
            ? Math.round((currentStep / totalSteps) * 100)
            : 0;

    const isLocked = room.status === 'LOCKED';
    const isCompleted = room.status === 'COMPLETED';
    const isInProgress = room.status === 'IN_PROGRESS';

    const borderColor = isCompleted ? 'var(--n-success-border)' : isInProgress ? 'var(--n-accent-border)' : 'var(--n-border)';

    const cardContent = (
        <div
            style={{
                background: 'var(--n-bg-primary)',
                border: `1px solid ${isLocked ? 'var(--n-border)' : borderColor}`,
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                opacity: isLocked ? 0.55 : 1,
                cursor: isLocked ? 'not-allowed' : 'pointer',
                transition: 'box-shadow 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => {
                if (!isLocked) {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px -4px rgba(0,0,0,0.1)';
                    (e.currentTarget as HTMLElement).style.borderColor = isCompleted ? 'var(--n-success)' : isInProgress ? 'var(--n-accent)' : 'var(--n-border-strong)';
                }
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLElement).style.borderColor = isLocked ? 'var(--n-border)' : borderColor;
            }}
        >
            {/* Top row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                {/* Category icon chip */}
                <div style={{
                    flexShrink: 0,
                    width: '36px',
                    height: '36px',
                    borderRadius: '7px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: cat.bg,
                    border: `1px solid ${cat.border}`,
                }}>
                    <Shield size={18} style={{ color: cat.text }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '10px', fontFamily: 'var(--n-font-mono)', color: 'var(--n-text-tertiary)', marginBottom: '2px' }}>
                        {room.code}
                    </p>
                    <h3 style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--n-text-primary)',
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                    }}>
                        {room.title}
                    </h3>
                </div>

                {/* Status icon */}
                <div style={{ flexShrink: 0 }}>
                    {isCompleted && <CheckCircle2 size={16} style={{ color: 'var(--n-success)' }} />}
                    {isInProgress && <Flame size={16} style={{ color: 'var(--n-accent)' }} />}
                    {isLocked && <Lock size={16} style={{ color: 'var(--n-text-tertiary)' }} />}
                    {room.status === 'UNLOCKED' && <Zap size={16} style={{ color: 'var(--n-info)' }} />}
                </div>
            </div>

            {/* Description */}
            <p style={{
                fontSize: '13px',
                color: 'var(--n-text-secondary)',
                lineHeight: 1.5,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                flex: 1,
            }}>
                {room.description}
            </p>

            {/* Progress bar */}
            {(isInProgress || isCompleted) && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--n-text-tertiary)' }}>
                            {isCompleted ? '✓ Complété' : `Tâche ${currentStep}/${totalSteps}`}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: isCompleted ? 'var(--n-success)' : 'var(--n-accent)' }}>
                            {progressPct}%
                        </span>
                    </div>
                    <NotionProgress value={progressPct} max={100} variant={isCompleted ? 'success' : 'accent'} size="default" />
                </div>
            )}

            {/* Footer */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                paddingTop: '8px',
                borderTop: '1px solid var(--n-border)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Difficulty badge */}
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: diff.color,
                        background: diff.bg,
                        border: `1px solid ${diff.border}`,
                    }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: diff.dot, flexShrink: 0 }} />
                        {diff.label}
                    </span>
                    {/* Category badge */}
                    <span style={{
                        padding: '2px 7px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 500,
                        color: cat.text,
                        background: cat.bg,
                        border: `1px solid ${cat.border}`,
                    }}>
                        {catLabel}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: 'var(--n-text-tertiary)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--n-accent)' }}>{room.points} pts</span>
                    <span>{room.solveCount} solves</span>
                </div>
            </div>
        </div>
    );

    if (isLocked) return <div>{cardContent}</div>;

    return (
        <Link href={`${APP_URLS.studentCtf}/${encodeURIComponent(room.code)}`} style={{ textDecoration: 'none', display: 'block' }}>
            {cardContent}
        </Link>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudentCtfPage() {
    return (
        <Suspense fallback={
            <div style={{ padding: '40px 24px', maxWidth: '1200px', margin: '0 auto' }}>
                <NotionSkeleton type="line" style={{ width: '200px', marginBottom: '24px' }} />
                <NotionSkeleton type="stat" style={{ height: '80px', marginBottom: '24px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <NotionSkeleton key={i} type="card" style={{ height: '160px' }} />
                    ))}
                </div>
            </div>
        }>
            <CtfRoomListPage />
        </Suspense>
    );
}

function CtfRoomListPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, isLoading: authLoading } = useAuth(true);

    const [rooms, setRooms] = useState<Room[]>([]);
    const [summary, setSummary] = useState<ProgressSummary>({ totalPoints: 0, solvedChallenges: 0, totalChallenges: 0 });
    const [myEntry, setMyEntry] = useState<LeaderboardEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
    const [difficultyFilter, setDifficultyFilter] = useState<string>('ALL');

    const fetchData = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };

        const [challengeRes, progressRes, leaderboardRes] = await Promise.all([
            fetch('/api/ctf/challenges', { headers }).catch(() => null),
            fetch('/api/ctf/progress', { headers }).catch(() => null),
            fetch('/api/ctf/leaderboard?limit=200', { headers }).catch(() => null),
        ]);

        if (challengeRes?.ok) {
            const data = await challengeRes.json();
            setRooms(data.challenges || []);
        }
        if (progressRes?.ok) {
            const data = await progressRes.json();
            if (data.summary) setSummary(data.summary);
        }
        if (leaderboardRes?.ok) {
            const data = await leaderboardRes.json();
            const entry = (data.leaderboard || []).find((e: LeaderboardEntry) => e.student_id === user?.id);
            if (entry) setMyEntry(entry);
        }
    }, [user?.id]);

    const refresh = useCallback(async () => {
        try {
            setError(null);
            setRefreshing(true);
            await fetchData();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Erreur de chargement');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [fetchData]);

    useEffect(() => {
        if (authLoading) return;
        void refresh();
    }, [authLoading, refresh]);

    // Sync filters with URL
    useEffect(() => {
        const cat = searchParams.get('category') || 'ALL';
        const diff = searchParams.get('difficulty') || 'ALL';
        setCategoryFilter(cat);
        setDifficultyFilter(diff);
    }, [searchParams]);

    const updateFilters = useCallback((cat: string, diff: string) => {
        const q = new URLSearchParams();
        if (cat !== 'ALL') q.set('category', cat);
        if (diff !== 'ALL') q.set('difficulty', diff);
        const qs = q.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, [pathname, router]);

    const categoryList = useMemo(() => {
        const cats = new Set(rooms.map((r) => r.category));
        return ['ALL', ...Array.from(cats)];
    }, [rooms]);

    const filteredRooms = useMemo(() => {
        return rooms.filter((r) => {
            const catOk = categoryFilter === 'ALL' || r.category === categoryFilter;
            const diffOk = difficultyFilter === 'ALL' || r.difficulty === difficultyFilter;
            return catOk && diffOk;
        });
    }, [rooms, categoryFilter, difficultyFilter]);

    const completedCount = useMemo(() => rooms.filter((r) => r.status === 'COMPLETED').length, [rooms]);

    if (authLoading || loading) {
        return (
            <div style={{ padding: '40px 24px', maxWidth: '1200px', margin: '0 auto' }}>
                <NotionSkeleton type="line" style={{ width: '200px', marginBottom: '24px' }} />
                <NotionSkeleton type="stat" style={{ height: '80px', marginBottom: '24px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <NotionSkeleton key={i} type="card" style={{ height: '160px' }} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: 'calc(100vh - 48px)', background: 'var(--n-bg-primary)' }}>

            {/* ── PAGE HEADER ── */}
            <div style={{
                borderBottom: '1px solid var(--n-border)',
                padding: '32px 24px 24px',
                background: 'var(--n-bg-primary)',
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    {/* Breadcrumb */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: 'var(--n-text-tertiary)',
                        marginBottom: '14px',
                    }}>
                        <Link href="/student" style={{ color: 'var(--n-text-tertiary)', textDecoration: 'none' }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'var(--n-text-primary)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--n-text-tertiary)')}>
                            Mon Parcours
                        </Link>
                        <ChevronRight size={12} />
                        <span style={{ color: 'var(--n-text-secondary)' }}>Security Labs</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
                        <div>
                            {/* Label */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
                                <Target size={14} style={{ color: 'var(--n-danger)' }} />
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    color: 'var(--n-danger)',
                                }}>Cyber Range · Security Labs CTF</span>
                            </div>

                            <h1 style={{
                                fontSize: '24px',
                                fontWeight: 700,
                                color: 'var(--n-text-primary)',
                                marginBottom: '6px',
                                letterSpacing: '-0.01em',
                            }}>Hack the Bank 🏦</h1>

                            <p style={{ fontSize: '13px', color: 'var(--n-text-secondary)', lineHeight: 1.5, maxWidth: '480px' }}>
                                Rooms d'attaque sur l'infrastructure PMP. Compromettez les systèmes, trouvez les flags, apprenez les défenses.
                            </p>
                        </div>

                        {/* Stats */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexShrink: 0 }}>
                            {[
                                { value: summary.totalPoints > 0 ? `${summary.totalPoints}` : '0', label: 'Points', color: 'var(--n-accent)' },
                                { value: `${completedCount}/${summary.totalChallenges || rooms.length}`, label: 'Rooms', color: 'var(--n-success)' },
                                { value: myEntry ? `#${myEntry.rank}` : '—', label: 'Classement', color: 'var(--n-danger)' },
                            ].map(({ value, label, color }) => (
                                <div key={label} style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '22px', fontWeight: 800, color, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
                                    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--n-text-tertiary)', marginTop: '2px' }}>{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                        <Link href={APP_URLS.studentCtfLeaderboard} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '7px 14px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--n-accent)',
                            background: 'var(--n-accent-light)',
                            border: '1px solid var(--n-accent-border)',
                            textDecoration: 'none',
                            transition: 'opacity 0.15s',
                        }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                            <Trophy size={13} /> Leaderboard
                        </Link>
                        <button
                            onClick={() => void refresh()}
                            disabled={refreshing}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '7px 14px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 500,
                                color: 'var(--n-text-secondary)',
                                background: 'var(--n-bg-primary)',
                                border: '1px solid var(--n-border)',
                                cursor: refreshing ? 'not-allowed' : 'pointer',
                                opacity: refreshing ? 0.6 : 1,
                            }}
                        >
                            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                            Actualiser
                        </button>
                    </div>
                </div>
            </div>

            {/* ── CONTENT ── */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>

                {error && (
                    <div style={{
                        marginBottom: '16px',
                        padding: '12px 16px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: 'var(--n-danger)',
                        background: 'var(--n-danger-bg)',
                        border: '1px solid var(--n-danger-border)',
                    }}>
                        {error}
                    </div>
                )}

                {/* Filters */}
                <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                    {categoryList.map((cat) => {
                        const active = categoryFilter === cat;
                        const colors = cat !== 'ALL' ? CATEGORY_COLORS[cat] : null;
                        return (
                            <button
                                key={cat}
                                onClick={() => updateFilters(cat, difficultyFilter)}
                                style={{
                                    padding: '5px 10px',
                                    borderRadius: '5px',
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    border: `1px solid ${active && colors ? colors.border : active ? 'var(--n-accent-border)' : 'var(--n-border)'}`,
                                    background: active && colors ? colors.bg : active ? 'var(--n-accent-light)' : 'var(--n-bg-primary)',
                                    color: active && colors ? colors.text : active ? 'var(--n-accent)' : 'var(--n-text-tertiary)',
                                    transition: 'all 0.1s',
                                }}
                                onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = 'var(--n-border-strong)'; }}
                                onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = 'var(--n-border)'; }}
                            >
                                {cat === 'ALL' ? 'Tous' : (CATEGORY_LABELS[cat] || cat)}
                            </button>
                        );
                    })}

                    {/* Difficulty select */}
                    <div style={{ marginLeft: 'auto' }}>
                        <select
                            value={difficultyFilter}
                            onChange={(e) => updateFilters(categoryFilter, e.target.value)}
                            style={{
                                background: 'var(--n-bg-primary)',
                                border: '1px solid var(--n-border)',
                                borderRadius: '5px',
                                padding: '5px 10px',
                                fontSize: '11px',
                                color: 'var(--n-text-primary)',
                                cursor: 'pointer',
                                outline: 'none',
                            }}
                        >
                            <option value="ALL">Toutes les difficultés</option>
                            <option value="BEGINNER">Easy</option>
                            <option value="INTERMEDIATE">Medium</option>
                            <option value="ADVANCED">Hard</option>
                            <option value="EXPERT">Expert</option>
                        </select>
                    </div>
                </div>

                {/* Results count */}
                {filteredRooms.length > 0 && (
                    <p style={{ fontSize: '12px', color: 'var(--n-text-tertiary)', marginBottom: '12px' }}>
                        <span style={{ color: 'var(--n-text-primary)', fontWeight: 600 }}>{filteredRooms.length}</span>
                        {' '}room{filteredRooms.length > 1 ? 's' : ''} affichée{filteredRooms.length > 1 ? 's' : ''}
                    </p>
                )}

                {/* Room grid */}
                {filteredRooms.length > 0 ? (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '10px',
                    }}>
                        {filteredRooms.map((room) => (
                            <RoomCard key={room.code} room={room} />
                        ))}
                    </div>
                ) : (
                    <NotionEmptyState
                        icon={<Swords size={28} />}
                        title="Aucune room pour ces filtres"
                        description="Essayez d'ajuster vos filtres pour trouver des challenges."
                        action={
                            <button
                                onClick={() => updateFilters('ALL', 'ALL')}
                                style={{
                                    padding: '7px 16px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: 'var(--n-accent)',
                                    color: '#fff',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Effacer les filtres
                            </button>
                        }
                    />
                )}
            </div>
        </div>
    );
}
