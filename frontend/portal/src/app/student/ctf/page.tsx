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

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    HSM_ATTACK:             { bg: 'bg-red-500/15',      text: 'text-red-300',     border: 'border-red-500/30',     glow: 'shadow-red-900/20' },
    REPLAY_ATTACK:          { bg: 'bg-orange-500/15',   text: 'text-orange-300',  border: 'border-orange-500/30',  glow: 'shadow-orange-900/20' },
    '3DS_BYPASS':           { bg: 'bg-rose-500/15',     text: 'text-rose-300',    border: 'border-rose-500/30',    glow: 'shadow-rose-900/20' },
    FRAUD_CNP:              { bg: 'bg-yellow-500/15',   text: 'text-yellow-300',  border: 'border-yellow-500/30',  glow: 'shadow-yellow-900/20' },
    ISO8583_MANIPULATION:   { bg: 'bg-sky-500/15',      text: 'text-sky-300',     border: 'border-sky-500/30',     glow: 'shadow-sky-900/20' },
    PIN_CRACKING:           { bg: 'bg-fuchsia-500/15',  text: 'text-fuchsia-300', border: 'border-fuchsia-500/30', glow: 'shadow-fuchsia-900/20' },
    MITM:                   { bg: 'bg-violet-500/15',   text: 'text-violet-300',  border: 'border-violet-500/30',  glow: 'shadow-violet-900/20' },
    PRIVILEGE_ESCALATION:   { bg: 'bg-indigo-500/15',   text: 'text-indigo-300',  border: 'border-indigo-500/30',  glow: 'shadow-indigo-900/20' },
    CRYPTO_WEAKNESS:        { bg: 'bg-pink-500/15',     text: 'text-pink-300',    border: 'border-pink-500/30',    glow: 'shadow-pink-900/20' },
    EMV_CLONING:            { bg: 'bg-amber-500/15',    text: 'text-amber-300',   border: 'border-amber-500/30',   glow: 'shadow-amber-900/20' },
    TOKEN_VAULT:            { bg: 'bg-teal-500/15',     text: 'text-teal-300',    border: 'border-teal-500/30',    glow: 'shadow-teal-900/20' },
    NETWORK_ATTACK:         { bg: 'bg-cyan-500/15',     text: 'text-cyan-300',    border: 'border-cyan-500/30',    glow: 'shadow-cyan-900/20' },
    KEY_MANAGEMENT:         { bg: 'bg-lime-500/15',     text: 'text-lime-300',    border: 'border-lime-500/30',    glow: 'shadow-lime-900/20' },
    ADVANCED_FRAUD:         { bg: 'bg-red-600/15',      text: 'text-red-200',     border: 'border-red-600/30',     glow: 'shadow-red-900/30' },
    SUPPLY_CHAIN:           { bg: 'bg-slate-500/15',    text: 'text-slate-300',   border: 'border-slate-500/30',   glow: 'shadow-slate-900/20' },
    BOSS:                   { bg: 'bg-yellow-600/20',   text: 'text-yellow-200',  border: 'border-yellow-500/40',  glow: 'shadow-yellow-900/30' },
};

const DIFFICULTY_STYLES: Record<string, { label: string; cls: string }> = {
    BEGINNER:     { label: 'Easy',   cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    INTERMEDIATE: { label: 'Medium', cls: 'bg-amber-500/15   text-amber-300   border-amber-500/30'   },
    ADVANCED:     { label: 'Hard',   cls: 'bg-orange-500/15  text-orange-300  border-orange-500/30'  },
    EXPERT:       { label: 'Expert', cls: 'bg-red-500/20     text-red-300     border-red-500/40'     },
};

// ─── Category icon helper ─────────────────────────────────────────────────────

function CategoryIcon({ category, size = 28 }: { category: string; size?: number }) {
    const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.CRYPTO_WEAKNESS;
    return (
        <div className={`flex items-center justify-center rounded-xl ${colors.bg} ${colors.border} border`}
            style={{ width: size + 16, height: size + 16 }}>
            <Shield size={size} className={colors.text} />
        </div>
    );
}

// ─── RoomCard ────────────────────────────────────────────────────────────────

function RoomCard({ room }: { room: Room }) {
    const diff = DIFFICULTY_STYLES[room.difficulty] || { label: room.difficulty, cls: 'bg-slate-700/60 text-slate-200 border-white/20' };
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

    const cardContent = (
        <div className={`group relative flex flex-col rounded-2xl border bg-slate-900/60 backdrop-blur p-5 transition-all duration-200 ${
            isLocked
                ? 'border-white/8 opacity-55 cursor-not-allowed'
                : isCompleted
                    ? 'border-emerald-500/25 hover:border-emerald-400/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-900/20'
                    : isInProgress
                        ? 'border-amber-500/25 hover:border-amber-400/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-900/20'
                        : `${cat.border} border-opacity-20 hover:border-opacity-50 hover:-translate-y-0.5 hover:shadow-lg ${cat.glow}`
        }`}>
            {/* Top row */}
            <div className="flex items-start justify-between gap-3 mb-4">
                <CategoryIcon category={room.category} size={22} />
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-mono text-slate-500">{room.code}</p>
                    <h3 className="font-bold text-base leading-tight mt-0.5 text-white group-hover:text-slate-100 line-clamp-2">
                        {room.title}
                    </h3>
                </div>
                {isCompleted && <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0 mt-1" />}
                {isInProgress && <Flame size={18} className="text-amber-400 flex-shrink-0 mt-1" />}
                {isLocked && <Lock size={18} className="text-slate-600 flex-shrink-0 mt-1" />}
                {room.status === 'UNLOCKED' && <Zap size={18} className="text-cyan-400 flex-shrink-0 mt-1" />}
            </div>

            {/* Description */}
            <p className="text-sm text-slate-400 leading-relaxed line-clamp-2 flex-1 mb-4">
                {room.description}
            </p>

            {/* Progress bar */}
            {(isInProgress || isCompleted) && (
                <div className="mb-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                        <span>{isCompleted ? 'Completed' : `Task ${currentStep}/${totalSteps}`}</span>
                        <span>{progressPct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${isCompleted ? 'bg-emerald-500' : 'bg-amber-400'}`}
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Footer badges */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/5">
                <div className="flex items-center gap-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${diff.cls}`}>
                        {diff.label}
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${cat.bg} ${cat.text} ${cat.border}`}>
                        {catLabel}
                    </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="text-orange-300 font-semibold">{room.points} pts</span>
                    <span>{room.solveCount} solves</span>
                </div>
            </div>
        </div>
    );

    if (isLocked) {
        return <div>{cardContent}</div>;
    }

    return (
        <Link href={`${APP_URLS.studentCtf}/${encodeURIComponent(room.code)}`}>
            {cardContent}
        </Link>
    );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex flex-col items-center gap-1 px-5 py-3 rounded-2xl border border-white/10 bg-slate-900/50">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                {icon}
                <span>{label}</span>
            </div>
            <p className="text-2xl font-extrabold text-white">{value}</p>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudentCtfPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Swords className="h-10 w-10 animate-bounce text-orange-400" />
                    <p className="text-sm text-slate-400">Chargement des rooms...</p>
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
    const inProgressCount = useMemo(() => rooms.filter((r) => r.status === 'IN_PROGRESS').length, [rooms]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Swords className="h-10 w-10 animate-bounce text-orange-400" />
                    <p className="text-sm text-slate-400">Chargement des rooms...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white pt-24 pb-16">
            <div className="max-w-7xl mx-auto px-6">

                {/* Breadcrumb */}
                <div className="text-xs text-slate-500 mb-8 flex items-center gap-1">
                    <Link href="/student" className="hover:text-orange-300 transition-colors">Mon Parcours</Link>
                    <ChevronRight size={12} />
                    <span className="text-orange-300">Security Labs</span>
                </div>

                {/* Hero */}
                <div className="relative mb-10 rounded-3xl border border-white/10 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,100,50,0.18),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(100,50,200,0.12),transparent_50%)]" />
                    <div className="relative px-8 py-8">
                        <div className="flex flex-wrap items-start justify-between gap-6">
                            <div>
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                                        <Target size={32} className="text-red-400" />
                                    </div>
                                    <div className="inline-flex items-center rounded-full bg-orange-500/15 border border-orange-500/25 px-3 py-1 text-xs text-orange-300">
                                        Security Labs CTF
                                    </div>
                                </div>
                                <h1 className="text-4xl font-black tracking-tight text-white">
                                    Hack the Bank
                                </h1>
                                <p className="mt-2 text-slate-400 text-sm max-w-xl">
                                    Rooms d&apos;attaque sur l&apos;infrastructure PMP. Compromettez les systèmes, trouvez les flags, apprenez les défenses.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link
                                    href={APP_URLS.studentCtfLeaderboard}
                                    className="px-4 py-2 rounded-xl border border-white/15 bg-slate-800/60 hover:bg-slate-800 text-sm font-semibold inline-flex items-center gap-2 transition-colors"
                                >
                                    <Trophy size={15} className="text-amber-300" />
                                    Leaderboard
                                </Link>
                                <button
                                    onClick={() => void refresh()}
                                    className={`px-4 py-2 rounded-xl border border-white/15 bg-slate-800/60 hover:bg-slate-800 text-sm font-semibold inline-flex items-center gap-2 transition-colors ${refreshing ? 'opacity-70' : ''}`}
                                >
                                    <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                                    Refresh
                                </button>
                            </div>
                        </div>

                        {/* Stats row */}
                        <div className="mt-6 flex flex-wrap gap-3">
                            <StatPill
                                icon={<Trophy size={13} className="text-amber-300" />}
                                label="Points"
                                value={`${summary.totalPoints}`}
                            />
                            <StatPill
                                icon={<CheckCircle2 size={13} className="text-emerald-300" />}
                                label="Rooms complétées"
                                value={`${completedCount}/${summary.totalChallenges || rooms.length}`}
                            />
                            <StatPill
                                icon={<Flame size={13} className="text-amber-300" />}
                                label="En cours"
                                value={`${inProgressCount}`}
                            />
                            <StatPill
                                icon={<Target size={13} className="text-red-300" />}
                                label="Classement"
                                value={myEntry ? `#${myEntry.rank}` : '—'}
                            />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/8 text-red-200 text-sm p-4">
                        {error}
                    </div>
                )}

                {/* Filters */}
                <div className="mb-6 flex flex-wrap items-center gap-2">
                    {/* Category filter */}
                    <div className="flex flex-wrap gap-2">
                        {categoryList.map((cat) => {
                            const active = categoryFilter === cat;
                            const colors = cat !== 'ALL' ? CATEGORY_COLORS[cat] : null;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => updateFilters(cat, difficultyFilter)}
                                    className={`px-3 py-1.5 rounded-full text-xs border font-medium transition-all ${
                                        active
                                            ? colors
                                                ? `${colors.bg} ${colors.text} ${colors.border}`
                                                : 'bg-orange-500/20 text-orange-200 border-orange-400/30'
                                            : 'bg-slate-800/50 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
                                    }`}
                                >
                                    {cat === 'ALL' ? 'All Rooms' : (CATEGORY_LABELS[cat] || cat)}
                                </button>
                            );
                        })}
                    </div>

                    {/* Difficulty select */}
                    <div className="ml-auto">
                        <select
                            value={difficultyFilter}
                            onChange={(e) => updateFilters(categoryFilter, e.target.value)}
                            className="bg-slate-800/70 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-orange-400/30"
                        >
                            <option value="ALL">All Difficulties</option>
                            <option value="BEGINNER">Easy</option>
                            <option value="INTERMEDIATE">Medium</option>
                            <option value="ADVANCED">Hard</option>
                            <option value="EXPERT">Expert</option>
                        </select>
                    </div>
                </div>

                {/* Results count */}
                {filteredRooms.length > 0 && (
                    <p className="text-xs text-slate-500 mb-4">
                        {filteredRooms.length} room{filteredRooms.length > 1 ? 's' : ''} found
                    </p>
                )}

                {/* Room grid */}
                {filteredRooms.length > 0 ? (
                    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredRooms.map((room) => (
                            <RoomCard key={room.code} room={room} />
                        ))}
                    </div>
                ) : (
                    <div className="mt-16 text-center">
                        <Shield size={40} className="text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-400">Aucune room pour ces filtres.</p>
                        <button
                            onClick={() => updateFilters('ALL', 'ALL')}
                            className="mt-3 text-xs text-orange-300 hover:text-orange-200 underline"
                        >
                            Effacer les filtres
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
