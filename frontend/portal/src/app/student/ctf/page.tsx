'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    Beaker,
    ChevronRight,
    CheckCircle2,
    Flame,
    Lock,
    RefreshCw,
    ShieldAlert,
    Trophy,
    Target,
    Swords,
} from 'lucide-react';
import { useAuth } from '../../auth/useAuth';

interface CtfChallenge {
    code: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    points: number;
    status: 'LOCKED' | 'UNLOCKED' | 'IN_PROGRESS' | 'COMPLETED';
    solveCount: number;
}

interface CtfProgressSummary {
    totalPoints: number;
    solvedChallenges: number;
    totalChallenges: number;
}

interface LeaderboardEntry {
    student_id: string;
    username: string;
    first_name: string;
    last_name: string;
    challenges_solved: number;
    total_points: number;
    first_bloods: number;
    rank: number;
}

const categoryLabels: Record<string, string> = {
    HSM_ATTACK: 'HSM',
    REPLAY_ATTACK: 'Replay',
    '3DS_BYPASS': '3DS',
    FRAUD_CNP: 'Fraud CNP',
    ISO8583_MANIPULATION: 'ISO8583',
    PIN_CRACKING: 'PIN',
    MITM: 'MITM',
    PRIVILEGE_ESCALATION: 'Privesc',
    CRYPTO_WEAKNESS: 'Crypto',
};

const difficultyStyles: Record<string, string> = {
    BEGINNER: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    INTERMEDIATE: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    ADVANCED: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    EXPERT: 'bg-red-500/20 text-red-300 border-red-500/40',
};

const categoryStyles: Record<string, string> = {
    HSM_ATTACK: 'bg-red-500/15 text-red-300 border-red-500/30',
    REPLAY_ATTACK: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    '3DS_BYPASS': 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    FRAUD_CNP: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    ISO8583_MANIPULATION: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    PIN_CRACKING: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
    MITM: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    PRIVILEGE_ESCALATION: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    CRYPTO_WEAKNESS: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
};

function resolveChallengeIcon(status: CtfChallenge['status']) {
    if (status === 'COMPLETED') return <CheckCircle2 className="text-emerald-400" size={20} />;
    if (status === 'IN_PROGRESS') return <Flame className="text-orange-400" size={20} />;
    if (status === 'LOCKED') return <Lock className="text-slate-500" size={20} />;
    return <ShieldAlert className="text-red-300" size={20} />;
}

export default function StudentCtfDashboardPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, isLoading } = useAuth(true);

    const [challenges, setChallenges] = useState<CtfChallenge[]>([]);
    const [summary, setSummary] = useState<CtfProgressSummary>({
        totalPoints: 0,
        solvedChallenges: 0,
        totalChallenges: 0,
    });
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('ALL');
    const [difficultyFilter, setDifficultyFilter] = useState<string>('ALL');
    const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchDashboardData = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        const [challengeRes, progressRes, leaderboardRes] = await Promise.all([
            fetch('/api/ctf/challenges', { headers }).catch(() => null),
            fetch('/api/ctf/progress', { headers }).catch(() => null),
            fetch('/api/ctf/leaderboard?limit=100', { headers }).catch(() => null),
        ]);

        if (challengeRes?.ok) {
            const payload = await challengeRes.json();
            setChallenges(payload.challenges || []);
        }

        if (progressRes?.ok) {
            const payload = await progressRes.json();
            if (payload.summary) {
                setSummary(payload.summary);
            }
        }

        if (leaderboardRes?.ok) {
            const payload = await leaderboardRes.json();
            setLeaderboard(payload.leaderboard || []);
        }
    }, []);

    const refresh = useCallback(async () => {
        try {
            setError(null);
            setRefreshing(true);
            await fetchDashboardData();
        } catch (fetchError: any) {
            setError(fetchError.message || 'Impossible de charger le dashboard CTF');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [fetchDashboardData]);

    useEffect(() => {
        if (isLoading) {
            return;
        }

        refresh();
    }, [isLoading, refresh]);

    const categoryList = useMemo(() => {
        const categories = new Set(challenges.map((challenge) => challenge.category));
        return ['ALL', ...Array.from(categories)];
    }, [challenges]);

    const difficultyList = useMemo(() => {
        const difficulties = new Set(challenges.map((challenge) => challenge.difficulty));
        return ['ALL', ...Array.from(difficulties)];
    }, [challenges]);

    useEffect(() => {
        const requestedCategory = searchParams.get('category');
        const requestedDifficulty = searchParams.get('difficulty');

        if (requestedCategory && categoryList.includes(requestedCategory)) {
            if (activeCategory !== requestedCategory) {
                setActiveCategory(requestedCategory);
            }
        } else if (activeCategory !== 'ALL') {
            setActiveCategory('ALL');
        }

        if (requestedDifficulty && difficultyList.includes(requestedDifficulty)) {
            if (difficultyFilter !== requestedDifficulty) {
                setDifficultyFilter(requestedDifficulty);
            }
        } else if (difficultyFilter !== 'ALL') {
            setDifficultyFilter('ALL');
        }
    }, [activeCategory, categoryList, difficultyFilter, difficultyList, searchParams]);

    const updateFilterQuery = useCallback((nextCategory: string, nextDifficulty: string) => {
        const nextQuery = new URLSearchParams(searchParams.toString());

        if (nextCategory === 'ALL') {
            nextQuery.delete('category');
        } else {
            nextQuery.set('category', nextCategory);
        }

        if (nextDifficulty === 'ALL') {
            nextQuery.delete('difficulty');
        } else {
            nextQuery.set('difficulty', nextDifficulty);
        }

        const query = nextQuery.toString();
        const href = query ? `${pathname}?${query}` : pathname;
        router.replace(href, { scroll: false });
    }, [pathname, router, searchParams]);

    const handleCategoryChange = useCallback((category: string) => {
        setActiveCategory(category);
        updateFilterQuery(category, difficultyFilter);
    }, [difficultyFilter, updateFilterQuery]);

    const handleDifficultyChange = useCallback((difficulty: string) => {
        setDifficultyFilter(difficulty);
        updateFilterQuery(activeCategory, difficulty);
    }, [activeCategory, updateFilterQuery]);

    const filteredChallenges = useMemo(() => {
        return challenges.filter((challenge) => {
            const categoryMatch = activeCategory === 'ALL' || challenge.category === activeCategory;
            const difficultyMatch = difficultyFilter === 'ALL' || challenge.difficulty === difficultyFilter;
            return categoryMatch && difficultyMatch;
        });
    }, [activeCategory, challenges, difficultyFilter]);

    const myLeaderboardEntry = useMemo(() => {
        return leaderboard.find((entry) => entry.student_id === user?.id) || null;
    }, [leaderboard, user?.id]);

    if (isLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <Beaker className="h-12 w-12 animate-bounce text-orange-400" />
                    <p className="text-sm text-slate-400">Chargement des security labs...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white pt-24 pb-12">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-xs text-slate-500 mb-6">
                    <Link href="/student" className="hover:text-orange-300">Mon Parcours</Link>
                    <ChevronRight size={12} className="inline mx-1" />
                    <span className="text-orange-300">Security Labs CTF</span>
                </div>

                <div className="mb-8 p-6 rounded-3xl border border-white/10 bg-gradient-to-r from-red-700/30 via-orange-700/20 to-amber-600/20 backdrop-blur-xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,120,80,0.24),transparent_50%),radial-gradient(circle_at_80%_30%,rgba(255,80,80,0.2),transparent_40%)]" />
                    <div className="relative flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                            <div className="shrink-0 animate-pulse-slow">
                                <Image src="/icons/ctf_target_icon.png" alt="CTF Labs" width={80} height={80} className="drop-shadow-[0_0_15px_rgba(255,100,0,0.4)]" />
                            </div>
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs text-orange-200 mb-3">
                                    <Swords size={14} /> Mode CTF
                                </div>
                                <h1 className="text-3xl font-black tracking-tight">Security Labs</h1>
                                <p className="text-sm text-slate-200 mt-1">
                                    Entraînez-vous sur des scénarios d&apos;attaque bancaires réalistes.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={refresh}
                            className={`px-4 py-2 rounded-xl bg-slate-900/60 border border-white/20 hover:bg-slate-900 text-sm flex items-center gap-2 ${refreshing ? 'animate-pulse' : ''}`}
                        >
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                            Actualiser
                        </button>
                    </div>

                    <div className="relative mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard icon={<Trophy size={16} className="text-amber-300" />} label="Points CTF" value={`${summary.totalPoints}`} />
                        <StatCard icon={<Target size={16} className="text-red-300" />} label="Résolutions" value={`${summary.solvedChallenges}/${summary.totalChallenges}`} />
                        <StatCard icon={<Flame size={16} className="text-orange-300" />} label="Classement" value={myLeaderboardEntry ? `#${myLeaderboardEntry.rank}` : '-'} />
                        <StatCard icon={<Beaker size={16} className="text-pink-300" />} label="First Blood" value={`${myLeaderboardEntry?.first_bloods || 0}`} />
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-200 text-sm">
                        {error}
                    </div>
                )}

                <div className="mb-4 flex flex-wrap items-center gap-2">
                    {categoryList.map((category) => {
                        const active = activeCategory === category;
                        return (
                            <button
                                key={category}
                                onClick={() => handleCategoryChange(category)}
                                className={`px-3 py-1.5 rounded-full text-xs border transition ${active
                                    ? 'bg-orange-500/30 border-orange-300/40 text-orange-100'
                                    : 'bg-slate-800/50 border-white/10 text-slate-300 hover:border-orange-300/30'
                                    }`}
                            >
                                {category === 'ALL' ? 'Toutes catégories' : (categoryLabels[category] || category)}
                            </button>
                        );
                    })}

                    <div className="ml-auto flex items-center gap-2">
                        <div className="flex rounded-lg border border-white/10 overflow-hidden">
                            <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 text-xs font-semibold transition ${viewMode === 'grid' ? 'bg-slate-700 text-white' : 'bg-slate-900/40 text-slate-400 hover:bg-slate-800'}`}>
                                Grille
                            </button>
                            <button onClick={() => setViewMode('map')} className={`px-3 py-1.5 text-xs font-semibold transition ${viewMode === 'map' ? 'bg-slate-700 text-white' : 'bg-slate-900/40 text-slate-400 hover:bg-slate-800'}`}>
                                Carte
                            </button>
                        </div>
                        <select
                            value={difficultyFilter}
                            onChange={(event) => handleDifficultyChange(event.target.value)}
                            className="bg-slate-800/70 border border-white/10 rounded-lg px-3 py-2 text-xs"
                        >
                            <option value="ALL">Toutes difficultés</option>
                            <option value="BEGINNER">Beginner</option>
                            <option value="INTERMEDIATE">Intermediate</option>
                            <option value="ADVANCED">Advanced</option>
                            <option value="EXPERT">Expert</option>
                        </select>
                    </div>
                </div>

                {/* Map view */}
                {viewMode === 'map' && (
                    <ChallengeMapView challenges={filteredChallenges} />
                )}

                {/* Grid view */}
                <div className={viewMode === 'grid' ? 'grid sm:grid-cols-2 xl:grid-cols-3 gap-4' : 'hidden'}>
                    {filteredChallenges.map((challenge) => {
                        const isLocked = challenge.status === 'LOCKED';
                        const CardWrapper = isLocked ? 'button' : 'div';
                        const cardProps = isLocked
                            ? {
                                type: 'button' as const,
                                onClick: () => setError('Challenge verrouillé: terminez les prérequis pour le débloquer.'),
                            }
                            : {};

                        const cardClassName = `group rounded-2xl border backdrop-blur bg-slate-800/50 p-5 transition ${isLocked
                            ? 'border-white/10 opacity-60 cursor-not-allowed'
                            : 'border-white/10 hover:border-orange-300/40 hover:-translate-y-0.5'
                            }`;

                        if (isLocked) {
                            return (
                                <CardWrapper
                                    key={challenge.code}
                                    className={cardClassName}
                                    {...cardProps}
                                >
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div>
                                            <p className="text-xs text-slate-400 font-mono">{challenge.code}</p>
                                            <h3 className="font-bold text-lg leading-tight mt-1">{challenge.title}</h3>
                                        </div>
                                        {resolveChallengeIcon(challenge.status)}
                                    </div>

                                    <p className="text-sm text-slate-300 min-h-12">{challenge.description}</p>

                                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                                        <span className={`text-[11px] px-2 py-1 rounded-full border ${categoryStyles[challenge.category] || 'bg-slate-700/60 border-white/20 text-slate-200'}`}>
                                            {categoryLabels[challenge.category] || challenge.category}
                                        </span>
                                        <span className={`text-[11px] px-2 py-1 rounded-full border ${difficultyStyles[challenge.difficulty] || 'bg-slate-700/60 border-white/20 text-slate-200'}`}>
                                            {challenge.difficulty}
                                        </span>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between text-xs">
                                        <span className="text-orange-300 font-semibold">{challenge.points} pts</span>
                                        <span className="text-slate-400">{challenge.solveCount} résolutions</span>
                                    </div>
                                </CardWrapper>
                            );
                        }

                        return (
                            <Link
                                key={challenge.code}
                                href={`/student/ctf/${challenge.code}`}
                                className={cardClassName}
                            >
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div>
                                        <p className="text-xs text-slate-400 font-mono">{challenge.code}</p>
                                        <h3 className="font-bold text-lg leading-tight mt-1">{challenge.title}</h3>
                                    </div>
                                    {resolveChallengeIcon(challenge.status)}
                                </div>

                                <p className="text-sm text-slate-300 min-h-12">{challenge.description}</p>

                                <div className="mt-4 flex items-center gap-2 flex-wrap">
                                    <span className={`text-[11px] px-2 py-1 rounded-full border ${categoryStyles[challenge.category] || 'bg-slate-700/60 border-white/20 text-slate-200'}`}>
                                        {categoryLabels[challenge.category] || challenge.category}
                                    </span>
                                    <span className={`text-[11px] px-2 py-1 rounded-full border ${difficultyStyles[challenge.difficulty] || 'bg-slate-700/60 border-white/20 text-slate-200'}`}>
                                        {challenge.difficulty}
                                    </span>
                                </div>

                                <div className="mt-4 flex items-center justify-between text-xs">
                                    <span className="text-orange-300 font-semibold">{challenge.points} pts</span>
                                    <span className="text-slate-400">{challenge.solveCount} résolutions</span>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {filteredChallenges.length === 0 && (
                    <div className="mt-10 p-6 text-center rounded-xl border border-white/10 bg-slate-900/50 text-slate-400">
                        Aucun challenge pour ce filtre.
                    </div>
                )}
            </div>
        </div>
    );
}

function ChallengeMapView({ challenges }: { challenges: CtfChallenge[] }) {
    // Group challenges by category
    const grouped = challenges.reduce<Record<string, CtfChallenge[]>>((acc, c) => {
        if (!acc[c.category]) acc[c.category] = [];
        acc[c.category].push(c);
        return acc;
    }, {});

    const statusColor = (status: CtfChallenge['status']) => {
        if (status === 'COMPLETED') return 'bg-emerald-500 border-emerald-400';
        if (status === 'IN_PROGRESS') return 'bg-amber-500 border-amber-400';
        if (status === 'LOCKED') return 'bg-slate-800 border-slate-600';
        return 'bg-cyan-600 border-cyan-400';
    };

    const statusLabel = (status: CtfChallenge['status']) => {
        if (status === 'COMPLETED') return '✓';
        if (status === 'IN_PROGRESS') return '●';
        if (status === 'LOCKED') return '🔒';
        return '⚡';
    };

    if (Object.keys(grouped).length === 0) {
        return <p className="text-center py-12 text-slate-500">Aucun challenge à afficher.</p>;
    }

    return (
        <div className="space-y-8 mb-8">
            {Object.entries(grouped).map(([category, cats]) => (
                <div key={category}>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-4">
                        {categoryLabels[category] || category}
                    </p>
                    <div className="overflow-x-auto pb-2">
                        <div className="flex items-center gap-0 min-w-max">
                            {cats.map((challenge, idx) => {
                                const isLocked = challenge.status === 'LOCKED';
                                const nodeEl = (
                                    <div className={`w-36 rounded-2xl border-2 p-4 text-left transition-all ${statusColor(challenge.status)} ${isLocked ? 'opacity-50' : 'hover:scale-105 hover:shadow-lg'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-mono text-white/70">{challenge.code}</span>
                                            <span className="text-base">{statusLabel(challenge.status)}</span>
                                        </div>
                                        <p className="text-xs font-bold text-white leading-tight line-clamp-2">{challenge.title}</p>
                                        <p className="text-[11px] text-white/70 mt-1">{challenge.points} pts</p>
                                    </div>
                                );

                                return (
                                    <div key={challenge.code} className="flex items-center">
                                        {isLocked ? nodeEl : (
                                            <Link href={`/student/ctf/${challenge.code}`}>{nodeEl}</Link>
                                        )}
                                        {idx < cats.length - 1 && (
                                            <div className="flex items-center mx-2">
                                                <div className="w-6 h-0.5 bg-slate-700" />
                                                <svg width="8" height="12" viewBox="0 0 8 12" className="text-slate-600">
                                                    <path d="M0 0 L8 6 L0 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="rounded-xl border border-white/10 bg-slate-900/40 px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-slate-300 mb-1">
                {icon}
                <span>{label}</span>
            </div>
            <p className="text-xl font-extrabold">{value}</p>
        </div>
    );
}
