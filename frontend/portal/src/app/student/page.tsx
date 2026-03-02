'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Book, CheckCircle, Zap, Target, Award, Play, History, Shield,
    GraduationCap, ChevronRight, BookOpen, Code, Terminal, Beaker, Lock,
    Clock, TrendingUp, Star, BarChart3, RefreshCw, ArrowRight,
    Sparkles, Check,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth/useAuth';
import { isOnboardingDoneLocally, markOnboardingDoneLocally } from '../../lib/onboarding';
import { FIRST_CTF_ROOM_CODE } from '../../lib/ctf-code-map';
import { NotionCard, NotionBadge, NotionProgress, NotionSkeleton, NotionEmptyState, NotionTag } from '@shared/components/notion';

/* ── Types ──────────────────────────────────────────────────────────────── */

interface WorkshopProgress {
    workshop_id: string;
    title: string;
    status: string;
    progress_percent: number;
    current_section: number;
    total_sections: number;
    time_spent_minutes: number;
    started_at?: string;
    completed_at?: string;
    last_accessed_at?: string;
}

interface Badge {
    type: string;
    name: string;
    description: string;
    icon: string;
    xp: number;
    earned: boolean;
    earnedAt?: string;
}

interface Stats {
    workshops: { notStarted: number; inProgress: number; completed: number; total: number; totalTime: number };
    quizzes: { total: number; passed: number; avgScore: number; bestScore: number };
    badges: { earned: number; total: number };
    totalXP: number;
}

interface LeaderboardEntry {
    rank: number;
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    total_xp: number;
    badge_count: number;
    workshops_completed: number;
}

/* ── Workshop metadata ──────────────────────────────────────────────────── */

const WORKSHOP_META: Record<string, {
    icon: typeof BookOpen;
    accentColor: string;
    difficulty: string;
    duration: string;
    description: string;
}> = {
    'intro':           { icon: BookOpen,  accentColor: '#f59e0b', difficulty: 'Débutant',     duration: '45 min',    description: 'Fondamentaux de la monétique et des paiements' },
    'iso8583':         { icon: Code,      accentColor: '#06b6d4', difficulty: 'Intermédiaire', duration: '1h 30min',  description: 'Protocole ISO 8583 et messages de paiement' },
    'hsm-keys':        { icon: Terminal,  accentColor: '#f59e0b', difficulty: 'Avancé',        duration: '2h',        description: 'HSM et gestion des clés cryptographiques' },
    '3ds-flow':        { icon: Code,      accentColor: '#10b981', difficulty: 'Avancé',        duration: '1h',        description: 'Protocole 3D Secure et authentification forte' },
    'fraud-detection': { icon: Shield,    accentColor: '#ef4444', difficulty: 'Intermédiaire', duration: '1h 15min',  description: 'Détection et prévention de la fraude' },
    'emv':             { icon: Beaker,    accentColor: '#a855f7', difficulty: 'Expert',         duration: '3h',        description: 'Standard EMV et transactions par carte à puce' },
};

const WORKSHOP_ORDER = ['intro', 'iso8583', 'hsm-keys', '3ds-flow', 'fraud-detection', 'emv'];

const BADGE_ICONS: Record<string, string> = {
    'star': '🎯', 'clipboard-check': '📋', 'award': '🏅', 'trophy': '🏆',
    'book-open': '📖', 'graduation-cap': '🎓', 'zap': '⚡', 'flame': '🔥',
};

// Maps difficulty string → NotionBadge variant
const DIFF_VARIANT: Record<string, 'beginner' | 'inter' | 'advanced' | 'expert'> = {
    'Débutant':      'beginner',
    'Intermédiaire': 'inter',
    'Avancé':        'advanced',
    'Expert':        'expert',
};

/* ── Count-up hook ──────────────────────────────────────────────────────── */

function useCountUp(target: number, duration = 900, delay = 0): number {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (target === 0) return;
        let frame: number;
        const start = performance.now() + delay;
        const tick = (now: number) => {
            const elapsed = Math.max(0, now - start);
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * target));
            if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [target, duration, delay]);
    return value;
}

/* ── Main Component ─────────────────────────────────────────────────────── */

export default function StudentDashboard() {
    const { user, isLoading } = useAuth(true);
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'ateliers' | 'progression' | 'badges'>('ateliers');

    const [workshops, setWorkshops] = useState<WorkshopProgress[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [ctfPoints, setCtfPoints] = useState(0);
    const [ctfSolved, setCtfSolved] = useState(0);
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };

        const [progressRes, statsRes, badgesRes, leaderboardRes, ctfProgressRes] = await Promise.all([
            fetch('/api/progress', { headers }).catch(() => null),
            fetch('/api/progress/stats', { headers }).catch(() => null),
            fetch('/api/progress/badges', { headers }).catch(() => null),
            fetch('/api/progress/leaderboard?limit=10', { headers }).catch(() => null),
            fetch('/api/ctf/progress', { headers }).catch(() => null),
        ]);

        if (progressRes?.ok) {
            const data = await progressRes.json();
            const progressMap = data.progress || {};
            const workshopList: WorkshopProgress[] = Object.entries(
                progressMap as Record<string, Partial<WorkshopProgress>>
            ).map(([id, progress]) => ({
                workshop_id: id,
                title: progress.title || id,
                status: progress.status || 'NOT_STARTED',
                progress_percent: Number(progress.progress_percent || 0),
                current_section: Number(progress.current_section || 0),
                total_sections: Number(progress.total_sections || 0),
                time_spent_minutes: Number(progress.time_spent_minutes || 0),
                started_at: progress.started_at,
                completed_at: progress.completed_at,
                last_accessed_at: progress.last_accessed_at,
            }));
            workshopList.sort((a, b) => {
                const ai = WORKSHOP_ORDER.indexOf(a.workshop_id);
                const bi = WORKSHOP_ORDER.indexOf(b.workshop_id);
                return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
            });
            setWorkshops(workshopList);
        }
        if (statsRes?.ok)       { const d = await statsRes.json();       setStats(d.stats || null); }
        if (badgesRes?.ok)      { const d = await badgesRes.json();      setBadges(d.badges || []); }
        if (leaderboardRes?.ok) { const d = await leaderboardRes.json(); setLeaderboard(d.leaderboard || []); }
        if (ctfProgressRes?.ok) {
            const d = await ctfProgressRes.json();
            setCtfPoints(Number(d.summary?.totalPoints || 0));
            setCtfSolved(Number(d.summary?.solvedChallenges || 0));
        }
    }, []);

    const refreshData = useCallback(async () => {
        try {
            setIsRefreshing(true);
            setError(null);
            await fetchData();
        } catch (e: any) {
            setError(e instanceof Error ? e.message : 'Erreur de chargement');
        } finally {
            setDataLoading(false);
            setIsRefreshing(false);
        }
    }, [fetchData]);

    useEffect(() => {
        if (isLoading) return;
        let cancelled = false;
        const boot = async () => {
            if (isOnboardingDoneLocally(user)) { await refreshData(); return; }
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    const res = await fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } });
                    if (res.ok) {
                        const payload = await res.json().catch(() => null);
                        if (payload?.user?.onboardingDone === true) {
                            markOnboardingDoneLocally(user);
                            if (!cancelled) await refreshData();
                            return;
                        }
                    }
                }
            } catch { /* fallback below */ }
            if (!cancelled) router.push('/student/onboarding');
        };
        void boot();
        return () => { cancelled = true; };
    }, [isLoading, refreshData, router, user]);

    /* ── Computed ─────────────────────────────────────────────────────── */

    const computed = useMemo(() => {
        const totalXP          = stats?.totalXP ?? 0;
        const completedCount   = stats?.workshops.completed ?? 0;
        const totalWorkshops   = stats?.workshops.total ?? workshops.length;
        const avgScore         = stats?.quizzes.avgScore ?? 0;
        const badgesEarned     = stats?.badges.earned ?? 0;
        const overallProgress  = totalWorkshops > 0
            ? Math.round(workshops.reduce((acc, w) => acc + (w.progress_percent || 0), 0) / totalWorkshops)
            : 0;
        const inProgressWorkshop = workshops.find(w => w.status === 'IN_PROGRESS');
        const currentUserId    = user?.id || '';
        const myRank           = currentUserId ? leaderboard.find(e => e.id === currentUserId) : undefined;
        return { totalXP, completedCount, totalWorkshops, avgScore, badgesEarned, overallProgress, inProgressWorkshop, myRank };
    }, [stats, workshops, leaderboard, user]);

    /* ── Workshop lock statuses ───────────────────────────────────────── */

    const workshopStatuses = useMemo(() => {
        const statuses: Record<string, 'completed' | 'in-progress' | 'not-started' | 'locked'> = {};
        let previousCompleted = true;
        for (const w of workshops) {
            if (w.status === 'COMPLETED')        { statuses[w.workshop_id] = 'completed';    previousCompleted = true;  }
            else if (w.status === 'IN_PROGRESS') { statuses[w.workshop_id] = 'in-progress'; previousCompleted = false; }
            else if (previousCompleted)          { statuses[w.workshop_id] = 'not-started'; previousCompleted = false; }
            else                                 { statuses[w.workshop_id] = 'locked'; }
        }
        return statuses;
    }, [workshops]);

    /* ── Loading ──────────────────────────────────────────────────────── */

    if (isLoading || dataLoading) {
        return (
            <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '1200px', margin: '0 auto' }}>
                {/* Skeleton hero */}
                <div style={{ marginBottom: 'var(--n-space-8)' }}>
                    <NotionSkeleton type="line" width="120px" height="22px" />
                    <div style={{ marginTop: 'var(--n-space-3)' }}>
                        <NotionSkeleton type="line" width="280px" height="32px" />
                    </div>
                    <div style={{ marginTop: 'var(--n-space-2)' }}>
                        <NotionSkeleton type="line" width="380px" height="16px" />
                    </div>
                </div>
                {/* Skeleton stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--n-space-3)', marginBottom: 'var(--n-space-8)' }}>
                    {[...Array(5)].map((_, i) => <NotionSkeleton key={i} type="stat" />)}
                </div>
                {/* Skeleton content */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--n-space-8)' }}>
                    <NotionSkeleton type="card" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-3)' }}>
                        <NotionSkeleton type="stat" />
                        <NotionSkeleton type="list" rows={5} />
                    </div>
                </div>
            </div>
        );
    }

    /* ── Render ───────────────────────────────────────────────────────── */

    return (
        <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '1200px', margin: '0 auto' }}>

            {/* ── HERO ──────────────────────────────────────────────── */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--n-space-5)', marginBottom: 'var(--n-space-8)' }}>
                <div>
                    <NotionTag variant="accent" icon={<GraduationCap size={12} />}>
                        Parcours Monétique
                    </NotionTag>
                    <h1 style={{
                        marginTop: 'var(--n-space-3)',
                        marginBottom: 'var(--n-space-2)',
                        fontSize: '28px',
                        fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'],
                        color: 'var(--n-text-primary)',
                        fontFamily: 'var(--n-font-sans)',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.2,
                    }}>
                        Bonjour, {user?.firstName || 'Étudiant'}
                    </h1>
                    <p style={{ color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)' }}>
                        Plateforme de simulation monétique — maîtrisez la sécurité des paiements.
                    </p>
                </div>

                {/* Progress ring + refresh */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-4)' }}>
                    <ProgressRing pct={computed.overallProgress} />
                    <button
                        onClick={refreshData}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)',
                            padding: '6px 14px',
                            borderRadius: 'var(--n-radius-sm)',
                            border: '1px solid var(--n-border)',
                            background: 'var(--n-bg-primary)',
                            color: 'var(--n-text-secondary)',
                            fontSize: 'var(--n-text-sm)',
                            fontFamily: 'var(--n-font-sans)',
                            cursor: 'pointer',
                            transition: 'border-color var(--n-duration-xs)',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--n-border-strong)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--n-border)'; }}
                    >
                        <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                        <span>Actualiser</span>
                    </button>
                </div>
            </div>

            {/* Error callout */}
            {error && (
                <div style={{
                    marginBottom: 'var(--n-space-5)',
                    padding: 'var(--n-space-3) var(--n-space-4)',
                    borderRadius: 'var(--n-radius-md)',
                    background: 'var(--n-danger-bg)',
                    border: '1px solid var(--n-danger-border)',
                    color: 'var(--n-danger)',
                    fontSize: 'var(--n-text-sm)',
                    fontFamily: 'var(--n-font-sans)',
                }}>
                    {error}
                </div>
            )}

            {/* ── STAT CARDS ──────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--n-space-3)', marginBottom: 'var(--n-space-7)' }}>
                <StatCard icon={Zap}    label="XP Total"    rawValue={computed.totalXP}  suffix="pts"  />
                <StatCard icon={Target} label="Ateliers"    value={`${computed.completedCount}/${computed.totalWorkshops}`} />
                <StatCard icon={Star}   label="Score Moyen" rawValue={computed.avgScore} suffix="%" />
                <StatCard icon={Award}  label="Badges"      value={`${computed.badgesEarned}/${badges.length || 8}`} />
                <StatCard icon={Shield} label="CTF"         rawValue={ctfPoints} suffix="pts"
                          subValue={ctfSolved > 0 ? `${ctfSolved} résolu${ctfSolved > 1 ? 's' : ''}` : undefined} />
            </div>

            {/* ── NEXT STEP BANNER ────────────────────────────────── */}
            <NextStepBanner
                inProgressWorkshop={computed.inProgressWorkshop}
                workshops={workshops}
                ctfSolved={ctfSolved}
            />

            {/* ── MAIN CONTENT ────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--n-space-7)' }}>

                {/* Left — tabs + content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-4)' }}>

                    {/* Tab nav */}
                    <div style={{
                        display: 'flex', gap: '2px', padding: '3px',
                        borderRadius: 'var(--n-radius-sm)',
                        border: '1px solid var(--n-border)',
                        background: 'var(--n-bg-secondary)',
                    }}>
                        <TabButton active={activeTab === 'ateliers'}    onClick={() => setActiveTab('ateliers')}    icon={<Book size={14} />}     label="Mon Parcours" />
                        <TabButton active={activeTab === 'progression'} onClick={() => setActiveTab('progression')} icon={<BarChart3 size={14} />} label="Progression"  />
                        <TabButton active={activeTab === 'badges'}      onClick={() => setActiveTab('badges')}      icon={<Award size={14} />}    label="Badges"       />
                    </div>

                    {/* Tab content */}
                    {activeTab === 'ateliers' && (
                        <WorkshopRoadmap workshops={workshops} workshopStatuses={workshopStatuses} />
                    )}
                    {activeTab === 'progression' && (
                        <ProgressView stats={stats} workshops={workshops} computed={computed} />
                    )}
                    {activeTab === 'badges' && (
                        <BadgesGrid badges={badges} />
                    )}
                </div>

                {/* Right — sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-4)' }}>
                    {computed.inProgressWorkshop && (
                        <ContinueLearningCard workshop={computed.inProgressWorkshop} />
                    )}
                    <QuickActions />
                    <LeaderboardWidget entries={leaderboard} currentUserId={user?.id || ''} />
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
 *   SUB-COMPONENTS
 * ══════════════════════════════════════════════════════════════════════════ */

/* ── Progress ring ─────────────────────────────────────────────────────── */

function ProgressRing({ pct }: { pct: number }) {
    const r = 34;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    const countedPct = useCountUp(pct, 1200, 500);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
                    {/* Track */}
                    <circle cx="40" cy="40" r={r} fill="none" stroke="var(--n-bg-tertiary)" strokeWidth="4" />
                    {/* Progress */}
                    <circle
                        cx="40" cy="40" r={r}
                        fill="none"
                        stroke="var(--n-accent)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                        style={{ transition: 'stroke-dashoffset 1.2s var(--n-ease-out)' }}
                    />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{
                        fontSize: '15px',
                        fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'],
                        color: 'var(--n-text-primary)',
                        fontFamily: 'var(--n-font-mono)',
                        letterSpacing: '-0.02em',
                    }}>
                        {countedPct}%
                    </span>
                </div>
            </div>
            <span style={{
                fontSize: 'var(--n-text-xs)',
                color: 'var(--n-text-tertiary)',
                fontFamily: 'var(--n-font-sans)',
                marginTop: 'var(--n-space-1)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
            }}>
                Progression
            </span>
        </div>
    );
}

/* ── Stat card ─────────────────────────────────────────────────────────── */

function StatCard({
    icon: Icon, label, rawValue, value, suffix, subValue
}: {
    icon: React.ElementType;
    label: string;
    rawValue?: number;
    value?: string;
    suffix?: string;
    subValue?: string;
}) {
    const animated = useCountUp(rawValue ?? 0, 900, 300);
    const displayValue = rawValue !== undefined ? animated : value;

    return (
        <NotionCard variant="hover" padding="sm">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-2)', padding: 'var(--n-space-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{
                        width: '28px', height: '28px', borderRadius: 'var(--n-radius-xs)',
                        background: 'var(--n-accent-light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <Icon size={14} style={{ color: 'var(--n-accent)' }} />
                    </div>
                    <span style={{
                        fontSize: 'var(--n-text-xs)',
                        color: 'var(--n-text-tertiary)',
                        fontFamily: 'var(--n-font-sans)',
                        fontWeight: 'var(--n-weight-medium)' as React.CSSProperties['fontWeight'],
                        textAlign: 'right',
                        lineHeight: 1.2,
                    }}>
                        {label}
                    </span>
                </div>
                <div style={{
                    fontSize: '20px',
                    fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'],
                    color: 'var(--n-text-primary)',
                    fontFamily: 'var(--n-font-mono)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                }}>
                    {displayValue}
                    {suffix && rawValue !== undefined && (
                        <span style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', marginLeft: '3px', fontFamily: 'var(--n-font-sans)' }}>{suffix}</span>
                    )}
                </div>
                {subValue && (
                    <div style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)' }}>{subValue}</div>
                )}
            </div>
        </NotionCard>
    );
}

/* ── Tab button ────────────────────────────────────────────────────────── */

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button
            onClick={onClick}
            style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--n-space-2)',
                padding: '6px 12px',
                borderRadius: '5px',
                border: active ? '1px solid var(--n-accent-border)' : '1px solid transparent',
                background: active ? 'var(--n-bg-primary)' : 'transparent',
                color: active ? 'var(--n-accent)' : 'var(--n-text-secondary)',
                fontSize: 'var(--n-text-sm)',
                fontWeight: active ? ('var(--n-weight-semibold)' as React.CSSProperties['fontWeight']) : ('var(--n-weight-regular)' as React.CSSProperties['fontWeight']),
                fontFamily: 'var(--n-font-sans)',
                cursor: 'pointer',
                transition: 'all var(--n-duration-xs)',
                whiteSpace: 'nowrap',
            }}
        >
            {icon}
            {label}
        </button>
    );
}

/* ── Workshop Roadmap ─────────────────────────────────────────────────── */

function WorkshopRoadmap({
    workshops,
    workshopStatuses,
}: {
    workshops: WorkshopProgress[];
    workshopStatuses: Record<string, 'completed' | 'in-progress' | 'not-started' | 'locked'>;
}) {
    const completedCount = workshops.filter(w => workshopStatuses[w.workshop_id] === 'completed').length;
    const progressFraction = workshops.length > 0 ? completedCount / workshops.length : 0;

    if (workshops.length === 0) {
        return (
            <NotionEmptyState
                icon={<BookOpen size={28} />}
                title="Aucun atelier disponible"
                description="Les ateliers apparaîtront ici dès qu'ils seront disponibles."
            />
        );
    }

    return (
        <NotionCard variant="default" padding="lg">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--n-space-5)' }}>
                <div>
                    <h3 style={{
                        fontSize: 'var(--n-text-base)',
                        fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'],
                        color: 'var(--n-text-primary)',
                        fontFamily: 'var(--n-font-sans)',
                        marginBottom: 'var(--n-space-1)',
                    }}>
                        Votre Parcours
                    </h3>
                    <p style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)' }}>
                        {completedCount} / {workshops.length} ateliers complétés
                    </p>
                </div>
                <NotionBadge variant="accent">
                    {Math.round(progressFraction * 100)}% complet
                </NotionBadge>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: 'var(--n-space-6)' }}>
                <NotionProgress value={Math.round(progressFraction * 100)} variant="accent" size="default" />
            </div>

            {/* Roadmap */}
            <div style={{ position: 'relative' }}>
                {/* Spine track */}
                <div style={{
                    position: 'absolute',
                    left: '50%', top: '20px', bottom: '20px', width: '1px',
                    transform: 'translateX(-50%)',
                    background: 'var(--n-border)',
                }} />

                {/* Spine progress fill */}
                {completedCount > 0 && (
                    <div style={{
                        position: 'absolute',
                        left: '50%', top: '20px', width: '1px',
                        transform: 'translateX(-50%)',
                        height: `${progressFraction * 100}%`,
                        background: 'var(--n-success)',
                        transition: 'height 0.8s var(--n-ease-out)',
                    }} />
                )}

                {workshops.map((workshop, idx) => {
                    const status = workshopStatuses[workshop.workshop_id] || 'locked';
                    const isLeft = idx % 2 === 0;
                    const meta = WORKSHOP_META[workshop.workshop_id];

                    return (
                        <div key={workshop.workshop_id}
                             style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: idx < workshops.length - 1 ? '28px' : '0' }}>
                            {/* Left side */}
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', paddingRight: 'var(--n-space-5)' }}>
                                {isLeft ? (
                                    <RoadmapCard workshop={workshop} status={status} meta={meta} align="right" />
                                ) : (
                                    <div style={{ width: '100%' }} />
                                )}
                            </div>

                            {/* Center spine node */}
                            <div style={{ position: 'relative', zIndex: 10, flexShrink: 0, width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <SpineNode status={status} number={idx + 1} />
                            </div>

                            {/* Right side */}
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', paddingLeft: 'var(--n-space-5)' }}>
                                {!isLeft ? (
                                    <RoadmapCard workshop={workshop} status={status} meta={meta} align="left" />
                                ) : (
                                    <div style={{ width: '100%' }} />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </NotionCard>
    );
}

/* ── Spine node ────────────────────────────────────────────────────────── */

function SpineNode({ status, number }: { status: string; number: number }) {
    const base: React.CSSProperties = {
        width: '32px', height: '32px',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 'var(--n-text-xs)',
        fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'],
        fontFamily: 'var(--n-font-sans)',
        flexShrink: 0,
        position: 'relative', zIndex: 10,
    };

    if (status === 'completed') {
        return (
            <div style={{ ...base, background: 'var(--n-success)', border: '2px solid var(--n-success)' }}>
                <Check size={14} style={{ color: '#fff' }} />
            </div>
        );
    }
    if (status === 'in-progress') {
        return (
            <div style={{ ...base, background: 'var(--n-accent)', border: '2px solid var(--n-accent)', color: '#fff' }}>
                {number}
            </div>
        );
    }
    if (status === 'not-started') {
        return (
            <div style={{ ...base, background: 'var(--n-bg-primary)', border: '2px solid var(--n-border-strong)', color: 'var(--n-text-secondary)' }}>
                {number}
            </div>
        );
    }
    return (
        <div style={{ ...base, background: 'var(--n-bg-secondary)', border: '2px solid var(--n-border)', color: 'var(--n-text-tertiary)' }}>
            <Lock size={11} />
        </div>
    );
}

/* ── Roadmap card ──────────────────────────────────────────────────────── */

function RoadmapCard({
    workshop, status, meta, align
}: {
    workshop: WorkshopProgress;
    status: string;
    meta: typeof WORKSHOP_META[string] | undefined;
    align: 'left' | 'right';
}) {
    const Icon = meta?.icon || BookOpen;
    const isLocked    = status === 'locked';
    const isActive    = status === 'in-progress';
    const isDone      = status === 'completed';
    const diffVariant = DIFF_VARIANT[meta?.difficulty || ''] ?? 'beginner';

    const cardContent = (
        <div style={{
            maxWidth: '220px', width: '100%',
            padding: 'var(--n-space-3) var(--n-space-4)',
            borderRadius: 'var(--n-radius-md)',
            background: isLocked ? 'var(--n-bg-secondary)' : 'var(--n-bg-elevated)',
            border: isDone
                ? '1px solid var(--n-success-border)'
                : isActive
                    ? '1px solid var(--n-accent-border)'
                    : '1px solid var(--n-border)',
            opacity: isLocked ? 0.5 : 1,
            textAlign: align === 'right' ? 'right' : 'left',
            marginLeft: align === 'left' ? 0 : 'auto',
            transition: 'border-color var(--n-duration-sm), box-shadow var(--n-duration-sm), transform var(--n-duration-sm)',
            boxShadow: isActive ? 'var(--n-shadow-sm)' : 'none',
        }}
        onMouseEnter={e => {
            if (!isLocked) {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'var(--n-shadow-md)';
            }
        }}
        onMouseLeave={e => {
            if (!isLocked) {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = isActive ? 'var(--n-shadow-sm)' : 'none';
            }
        }}>
            {/* Top row: icon + difficulty badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-2)', flexDirection: align === 'right' ? 'row-reverse' : 'row' }}>
                <div style={{
                    width: '24px', height: '24px', borderRadius: 'var(--n-radius-xs)',
                    background: 'var(--n-bg-tertiary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                    <Icon size={13} style={{ color: 'var(--n-text-secondary)' }} />
                </div>
                <NotionBadge variant={diffVariant} size="sm">{meta?.difficulty || '—'}</NotionBadge>
                {isDone && <CheckCircle size={13} style={{ color: 'var(--n-success)', marginLeft: 'auto' }} />}
            </div>

            {/* Title */}
            <p style={{
                fontSize: 'var(--n-text-sm)',
                fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'],
                color: 'var(--n-text-primary)',
                fontFamily: 'var(--n-font-sans)',
                marginBottom: 'var(--n-space-1)',
                lineHeight: 'var(--n-leading-snug)',
            }}>
                {workshop.title}
            </p>

            {/* Description */}
            {meta?.description && (
                <p style={{
                    fontSize: 'var(--n-text-xs)',
                    color: 'var(--n-text-tertiary)',
                    fontFamily: 'var(--n-font-sans)',
                    lineHeight: 'var(--n-leading-relaxed)',
                    marginBottom: 'var(--n-space-3)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'],
                    overflow: 'hidden',
                }}>
                    {meta.description}
                </p>
            )}

            {/* Progress bar */}
            {!isLocked && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--n-space-1)' }}>
                        <span style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>{meta?.duration}</span>
                    </div>
                    <NotionProgress
                        value={workshop.progress_percent || 0}
                        variant={isDone ? 'success' : 'accent'}
                        size="thin"
                    />
                </div>
            )}

            {/* Locked message */}
            {isLocked && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--n-space-1)',
                    fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)',
                    fontFamily: 'var(--n-font-sans)',
                    justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
                }}>
                    <Lock size={10} /> Terminez l&apos;atelier précédent
                </div>
            )}
        </div>
    );

    if (isLocked) return cardContent;
    return <Link href={`/student/theory/${workshop.workshop_id}`} style={{ display: 'block', textDecoration: 'none' }}>{cardContent}</Link>;
}

/* ── Next step banner ──────────────────────────────────────────────────── */

function NextStepBanner({
    inProgressWorkshop, workshops, ctfSolved,
}: {
    inProgressWorkshop?: WorkshopProgress;
    workshops: WorkshopProgress[];
    ctfSolved: number;
}) {
    let href = '/student/cursus';
    let label = 'Commencer le Cursus';
    let sublabel = 'Démarrez votre parcours monétique';

    if (inProgressWorkshop) {
        href = `/student/theory/${inProgressWorkshop.workshop_id}`;
        label = `Continuer — ${inProgressWorkshop.title}`;
        sublabel = `${inProgressWorkshop.progress_percent || 0}% complété`;
    } else if (ctfSolved === 0) {
        href = `/student/ctf/${FIRST_CTF_ROOM_CODE}`;
        label = 'Lancer ton premier challenge CTF';
        sublabel = 'PAY-001 · The Unsecured Payment Terminal · 150 pts';
    } else {
        const next = workshops.find(w => w.status === 'NOT_STARTED');
        if (next) {
            href = `/student/theory/${next.workshop_id}`;
            label = `Commencer — ${next.title}`;
            sublabel = 'Prochain atelier du parcours';
        } else {
            href = '/student/ctf';
            label = 'Explorer les challenges avancés';
            sublabel = `${ctfSolved} challenge${ctfSolved > 1 ? 's' : ''} résolu${ctfSolved > 1 ? 's' : ''} — continue !`;
        }
    }

    return (
        <Link href={href} style={{ textDecoration: 'none', display: 'block', marginBottom: 'var(--n-space-7)' }}>
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--n-space-4)',
                padding: 'var(--n-space-4) var(--n-space-5)',
                borderRadius: 'var(--n-radius-md)',
                background: 'var(--n-accent-light)',
                border: '1px solid var(--n-accent-border)',
                transition: 'box-shadow var(--n-duration-sm), transform var(--n-duration-sm)',
            }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = 'var(--n-shadow-md)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-3)' }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: 'var(--n-radius-sm)',
                        background: 'var(--n-accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <Sparkles size={16} style={{ color: '#fff' }} />
                    </div>
                    <div>
                        <p style={{
                            fontSize: 'var(--n-text-xs)',
                            color: 'var(--n-text-secondary)',
                            fontFamily: 'var(--n-font-sans)',
                            fontWeight: 'var(--n-weight-medium)' as React.CSSProperties['fontWeight'],
                            marginBottom: '2px',
                        }}>
                            Prochaine étape recommandée
                        </p>
                        <p style={{
                            fontSize: 'var(--n-text-sm)',
                            fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'],
                            color: 'var(--n-accent)',
                            fontFamily: 'var(--n-font-sans)',
                        }}>
                            {label}
                        </p>
                        <p style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>
                            {sublabel}
                        </p>
                    </div>
                </div>
                <ArrowRight size={18} style={{ color: 'var(--n-accent)', flexShrink: 0 }} />
            </div>
        </Link>
    );
}

/* ── Progress view ─────────────────────────────────────────────────────── */

function ProgressView({
    stats, workshops, computed
}: {
    stats: Stats | null;
    workshops: WorkshopProgress[];
    computed: { overallProgress: number; completedCount: number; totalWorkshops: number };
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-4)' }}>
            {/* Global progress */}
            <NotionCard variant="default" padding="lg">
                <h3 style={{
                    fontSize: 'var(--n-text-base)',
                    fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'],
                    color: 'var(--n-text-primary)',
                    fontFamily: 'var(--n-font-sans)',
                    marginBottom: 'var(--n-space-5)',
                }}>
                    Progression Globale
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--n-space-2)' }}>
                    <span style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)' }}>
                        Parcours Complet
                    </span>
                    <span style={{
                        fontSize: 'var(--n-text-sm)',
                        fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'],
                        color: 'var(--n-accent)',
                        fontFamily: 'var(--n-font-mono)',
                    }}>
                        {computed.overallProgress}%
                    </span>
                </div>
                <div style={{ marginBottom: 'var(--n-space-6)' }}>
                    <NotionProgress value={computed.overallProgress} variant="accent" size="thick" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--n-space-3)' }}>
                    {workshops.map((w) => (
                        <div key={w.workshop_id} style={{
                            textAlign: 'center', padding: 'var(--n-space-3)',
                            borderRadius: 'var(--n-radius-sm)',
                            background: 'var(--n-bg-secondary)',
                            border: '1px solid var(--n-border)',
                        }}>
                            <div style={{
                                fontSize: '18px',
                                fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'],
                                fontFamily: 'var(--n-font-mono)',
                                color: w.status === 'COMPLETED' ? 'var(--n-success)' : w.status === 'IN_PROGRESS' ? 'var(--n-accent)' : 'var(--n-text-tertiary)',
                                marginBottom: 'var(--n-space-1)',
                            }}>
                                {w.progress_percent || 0}%
                            </div>
                            <div style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {w.title}
                            </div>
                            <div style={{ marginTop: 'var(--n-space-2)' }}>
                                <NotionProgress
                                    value={w.progress_percent || 0}
                                    variant={w.status === 'COMPLETED' ? 'success' : 'accent'}
                                    size="thin"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </NotionCard>

            {/* Quiz stats */}
            {stats && (
                <NotionCard variant="default" padding="lg">
                    <h3 style={{
                        fontSize: 'var(--n-text-base)',
                        fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'],
                        color: 'var(--n-text-primary)',
                        fontFamily: 'var(--n-font-sans)',
                        marginBottom: 'var(--n-space-5)',
                    }}>
                        Statistiques Quiz
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--n-space-3)' }}>
                        {[
                            { label: 'Total passés',  value: stats.quizzes.total },
                            { label: 'Réussis',       value: stats.quizzes.passed },
                            { label: 'Score moyen',   value: `${stats.quizzes.avgScore}%` },
                            { label: 'Meilleur score',value: `${stats.quizzes.bestScore}%` },
                        ].map(({ label, value }) => (
                            <div key={label} style={{
                                textAlign: 'center', padding: 'var(--n-space-3)',
                                borderRadius: 'var(--n-radius-sm)',
                                background: 'var(--n-bg-secondary)',
                                border: '1px solid var(--n-border)',
                            }}>
                                <div style={{
                                    fontSize: '20px',
                                    fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'],
                                    color: 'var(--n-text-primary)',
                                    fontFamily: 'var(--n-font-mono)',
                                    marginBottom: 'var(--n-space-1)',
                                }}>{value}</div>
                                <div style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>{label}</div>
                            </div>
                        ))}
                    </div>
                    {stats.workshops.totalTime > 0 && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)',
                            marginTop: 'var(--n-space-4)',
                            padding: 'var(--n-space-3)',
                            borderRadius: 'var(--n-radius-sm)',
                            background: 'var(--n-bg-secondary)',
                            border: '1px solid var(--n-border)',
                        }}>
                            <Clock size={14} style={{ color: 'var(--n-text-tertiary)', flexShrink: 0 }} />
                            <span style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)' }}>
                                Temps total d&apos;étude :{' '}
                                <strong style={{ color: 'var(--n-text-primary)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'] }}>
                                    {stats.workshops.totalTime} min
                                </strong>
                            </span>
                        </div>
                    )}
                </NotionCard>
            )}
        </div>
    );
}

/* ── Badges grid ───────────────────────────────────────────────────────── */

function BadgesGrid({ badges }: { badges: Badge[] }) {
    if (badges.length === 0) {
        return (
            <NotionEmptyState
                icon={<Award size={28} />}
                title="Aucun badge disponible"
                description="Complétez des ateliers et des quiz pour débloquer vos badges."
            />
        );
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--n-space-3)' }}>
            {badges.map((badge) => (
                <NotionCard
                    key={badge.type}
                    variant={badge.earned ? 'hover' : 'default'}
                    padding="md"
                    style={{ opacity: badge.earned ? 1 : 0.45 }}
                >
                    <div style={{ fontSize: '32px', marginBottom: 'var(--n-space-2)', lineHeight: 1 }}>
                        {BADGE_ICONS[badge.icon] || '🏅'}
                    </div>
                    <h4 style={{
                        fontSize: 'var(--n-text-sm)',
                        fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'],
                        color: 'var(--n-text-primary)',
                        fontFamily: 'var(--n-font-sans)',
                        marginBottom: 'var(--n-space-1)',
                    }}>
                        {badge.name}
                    </h4>
                    <p style={{
                        fontSize: 'var(--n-text-xs)',
                        color: 'var(--n-text-tertiary)',
                        fontFamily: 'var(--n-font-sans)',
                        lineHeight: 'var(--n-leading-relaxed)',
                        marginBottom: 'var(--n-space-3)',
                    }}>
                        {badge.description}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <NotionBadge variant="accent" size="sm">+{badge.xp} XP</NotionBadge>
                        {badge.earned ? (
                            <NotionBadge variant="success" size="sm">
                                {badge.earnedAt ? new Date(badge.earnedAt).toLocaleDateString('fr-FR') : 'Débloqué'}
                            </NotionBadge>
                        ) : (
                            <NotionBadge variant="default" size="sm"><Lock size={9} /> Verrouillé</NotionBadge>
                        )}
                    </div>
                </NotionCard>
            ))}
        </div>
    );
}

/* ── Continue learning card ────────────────────────────────────────────── */

function ContinueLearningCard({ workshop }: { workshop: WorkshopProgress }) {
    const meta = WORKSHOP_META[workshop.workshop_id];
    return (
        <NotionCard variant="selected" padding="md">
            <div style={{
                display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)',
                marginBottom: 'var(--n-space-3)',
                fontSize: 'var(--n-text-xs)',
                fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'],
                color: 'var(--n-accent)',
                fontFamily: 'var(--n-font-sans)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
                <Play size={11} /> Continuer
            </div>
            <h3 style={{
                fontSize: 'var(--n-text-base)',
                fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'],
                color: 'var(--n-text-primary)',
                fontFamily: 'var(--n-font-sans)',
                marginBottom: 'var(--n-space-1)',
                lineHeight: 'var(--n-leading-snug)',
            }}>
                {workshop.title}
            </h3>
            <p style={{
                fontSize: 'var(--n-text-sm)',
                color: 'var(--n-text-secondary)',
                fontFamily: 'var(--n-font-sans)',
                marginBottom: 'var(--n-space-4)',
            }}>
                Vous êtes à {workshop.progress_percent}% — reprenez là où vous vous êtes arrêté.
            </p>
            <div style={{ marginBottom: 'var(--n-space-4)' }}>
                <NotionProgress value={workshop.progress_percent} variant="accent" size="default" showLabel />
            </div>
            <Link href={`/student/theory/${workshop.workshop_id}`}
                  style={{
                      display: 'block', width: '100%',
                      padding: '8px',
                      textAlign: 'center',
                      borderRadius: 'var(--n-radius-sm)',
                      background: 'var(--n-accent)',
                      color: '#fff',
                      fontSize: 'var(--n-text-sm)',
                      fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'],
                      fontFamily: 'var(--n-font-sans)',
                      textDecoration: 'none',
                      transition: 'opacity var(--n-duration-xs)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}>
                Reprendre l&apos;atelier
            </Link>
        </NotionCard>
    );
}

/* ── Quick actions ─────────────────────────────────────────────────────── */

function QuickActions() {
    const links = [
        { href: '/student/cursus',       icon: GraduationCap, label: 'Mes Cursus'     },
        { href: '/student/quizzes',      icon: Target,        label: 'Mes Quiz'        },
        { href: '/student/progress',     icon: BarChart3,     label: 'Ma Progression'  },
        { href: '/student/badges',       icon: Award,         label: 'Mes Badges'      },
        { href: '/student/transactions', icon: History,       label: 'Transactions'    },
        { href: '/student/defense',      icon: Shield,        label: 'Sandbox Défense' },
    ];

    return (
        <NotionCard variant="default" padding="md">
            <h3 style={{
                fontSize: 'var(--n-text-sm)',
                fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'],
                color: 'var(--n-text-primary)',
                fontFamily: 'var(--n-font-sans)',
                marginBottom: 'var(--n-space-3)',
            }}>
                Accès Rapide
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {links.map(({ href, icon: Icon, label }) => (
                    <Link key={href} href={href}
                          style={{
                              display: 'flex', alignItems: 'center', gap: 'var(--n-space-3)',
                              padding: 'var(--n-space-2) var(--n-space-2)',
                              borderRadius: 'var(--n-radius-xs)',
                              color: 'var(--n-text-secondary)',
                              textDecoration: 'none',
                              fontSize: 'var(--n-text-sm)',
                              fontFamily: 'var(--n-font-sans)',
                              transition: 'background var(--n-duration-xs), color var(--n-duration-xs)',
                          }}
                          onMouseEnter={e => {
                              (e.currentTarget as HTMLElement).style.background = 'var(--n-bg-secondary)';
                              (e.currentTarget as HTMLElement).style.color = 'var(--n-text-primary)';
                          }}
                          onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.background = 'transparent';
                              (e.currentTarget as HTMLElement).style.color = 'var(--n-text-secondary)';
                          }}>
                        <Icon size={14} style={{ color: 'var(--n-text-tertiary)', flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{label}</span>
                        <ChevronRight size={12} style={{ color: 'var(--n-text-tertiary)', opacity: 0.6 }} />
                    </Link>
                ))}
            </div>
        </NotionCard>
    );
}

/* ── Leaderboard widget ────────────────────────────────────────────────── */

function LeaderboardWidget({ entries, currentUserId }: { entries: LeaderboardEntry[]; currentUserId: string }) {
    const rankBadge = (rank: number) => {
        if (rank === 1) return <span style={{ fontSize: '14px' }}>🥇</span>;
        if (rank === 2) return <span style={{ fontSize: '14px' }}>🥈</span>;
        if (rank === 3) return <span style={{ fontSize: '14px' }}>🥉</span>;
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '20px', height: '20px',
                borderRadius: '50%',
                background: 'var(--n-bg-tertiary)',
                fontSize: 'var(--n-text-xs)',
                fontFamily: 'var(--n-font-mono)',
                color: 'var(--n-text-tertiary)',
                flexShrink: 0,
            }}>
                {rank}
            </span>
        );
    };

    return (
        <NotionCard variant="default" padding="md">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-4)' }}>
                <TrendingUp size={14} style={{ color: 'var(--n-accent)' }} />
                <h3 style={{
                    fontSize: 'var(--n-text-sm)',
                    fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'],
                    color: 'var(--n-text-primary)',
                    fontFamily: 'var(--n-font-sans)',
                }}>
                    Classement
                </h3>
            </div>

            {entries.length === 0 ? (
                <p style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-tertiary)', textAlign: 'center', padding: 'var(--n-space-3) 0', fontFamily: 'var(--n-font-sans)' }}>
                    Pas encore de classement.
                </p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {entries.slice(0, 5).map((entry) => {
                        const name = [entry.first_name, entry.last_name].filter(Boolean).join(' ') || entry.username;
                        const isMe = entry.id === currentUserId;
                        return (
                            <div key={entry.id}
                                 style={{
                                     display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)',
                                     padding: 'var(--n-space-2)',
                                     borderRadius: 'var(--n-radius-xs)',
                                     background: isMe ? 'var(--n-accent-light)' : 'transparent',
                                     border: isMe ? '1px solid var(--n-accent-border)' : '1px solid transparent',
                                 }}>
                                {rankBadge(entry.rank)}
                                <span style={{
                                    flex: 1,
                                    fontSize: 'var(--n-text-sm)',
                                    color: isMe ? 'var(--n-accent)' : 'var(--n-text-secondary)',
                                    fontWeight: isMe ? ('var(--n-weight-semibold)' as React.CSSProperties['fontWeight']) : undefined,
                                    fontFamily: 'var(--n-font-sans)',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                    {isMe ? 'Vous' : name}
                                </span>
                                <span style={{
                                    fontSize: 'var(--n-text-xs)',
                                    color: 'var(--n-text-tertiary)',
                                    fontFamily: 'var(--n-font-mono)',
                                    flexShrink: 0,
                                }}>
                                    {entry.total_xp} XP
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </NotionCard>
    );
}
