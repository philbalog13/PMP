'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Book, CheckCircle, Zap, Target, Award, Play, History, Shield,
    GraduationCap, ChevronRight, BookOpen, Code, Terminal, Beaker, Lock,
    Clock, TrendingUp, Star, Trophy, BarChart3, RefreshCw, ArrowRight, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth/useAuth';
import { isOnboardingDoneLocally, markOnboardingDoneLocally } from '../../lib/onboarding';
import { FIRST_CTF_ROOM_CODE } from '../../lib/ctf-code-map';

/* â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

/* â”€â”€ Workshop metadata for icons/colors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const WORKSHOP_META: Record<string, { icon: typeof BookOpen; color: string; difficulty: string; duration: string }> = {
    'intro': { icon: BookOpen, color: 'blue', difficulty: 'DÃ©butant', duration: '45 min' },
    'iso8583': { icon: Code, color: 'purple', difficulty: 'IntermÃ©diaire', duration: '1h 30min' },
    'hsm-keys': { icon: Terminal, color: 'amber', difficulty: 'AvancÃ©', duration: '2h' },
    '3ds-flow': { icon: Zap, color: 'emerald', difficulty: 'AvancÃ©', duration: '1h' },
    'fraud-detection': { icon: Shield, color: 'red', difficulty: 'IntermÃ©diaire', duration: '1h 15min' },
    'emv': { icon: Beaker, color: 'indigo', difficulty: 'Expert', duration: '3h' },
};

const BADGE_ICONS: Record<string, string> = {
    'star': '\u{1F3AF}', 'clipboard-check': '\u{1F4CB}', 'award': '\u{1F3C5}', 'trophy': '\u{1F3C6}',
    'book-open': '\u{1F4D6}', 'graduation-cap': '\u{1F393}', 'zap': '\u26A1', 'flame': '\u{1F525}',
};

/* â”€â”€ Workshop ordering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const WORKSHOP_ORDER = ['intro', 'iso8583', 'hsm-keys', '3ds-flow', 'fraud-detection', 'emv'];

/* â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

        if (statsRes?.ok) {
            const data = await statsRes.json();
            setStats(data.stats || null);
        }

        if (badgesRes?.ok) {
            const data = await badgesRes.json();
            setBadges(data.badges || []);
        }

        if (leaderboardRes?.ok) {
            const data = await leaderboardRes.json();
            setLeaderboard(data.leaderboard || []);
        }

        if (ctfProgressRes?.ok) {
            const data = await ctfProgressRes.json();
            setCtfPoints(Number(data.summary?.totalPoints || 0));
            setCtfSolved(Number(data.summary?.solvedChallenges || 0));
        }
    }, []);

    const refreshData = useCallback(async () => {
        try {
            setIsRefreshing(true);
            setError(null);
            await fetchData();
        } catch (error: any) {
            setError(error instanceof Error ? error.message : 'Erreur de chargement');
        } finally {
            setDataLoading(false);
            setIsRefreshing(false);
        }
    }, [fetchData]);

    useEffect(() => {
        if (isLoading) return;

        let cancelled = false;

        const bootstrapStudentDashboard = async () => {
            if (isOnboardingDoneLocally(user)) {
                await refreshData();
                return;
            }

            try {
                const token = localStorage.getItem('token');
                if (token) {
                    const response = await fetch('/api/users/me', {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (response.ok) {
                        const payload = await response.json().catch(() => null);
                        const onboardingDone = payload?.user?.onboardingDone === true;
                        if (onboardingDone) {
                            markOnboardingDoneLocally(user);
                            if (!cancelled) {
                                await refreshData();
                            }
                            return;
                        }
                    }
                }
            } catch {
                // Best-effort check; fallback below redirects to onboarding.
            }

            if (!cancelled) {
                router.push('/student/onboarding');
            }
        };

        void bootstrapStudentDashboard();

        return () => {
            cancelled = true;
        };
    }, [isLoading, refreshData, router, user]);

    /* â”€â”€ Computed values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

    const computed = useMemo(() => {
        const totalXP = stats?.totalXP ?? 0;
        const completedCount = stats?.workshops.completed ?? 0;
        const totalWorkshops = stats?.workshops.total ?? workshops.length;
        const avgScore = stats?.quizzes.avgScore ?? 0;
        const badgesEarned = stats?.badges.earned ?? 0;

        const overallProgress = totalWorkshops > 0
            ? Math.round(workshops.reduce((acc, w) => acc + (w.progress_percent || 0), 0) / totalWorkshops)
            : 0;

        const inProgressWorkshop = workshops.find(w => w.status === 'IN_PROGRESS');

        const currentUserId = user?.id || '';
        const myRank = currentUserId ? leaderboard.find((entry) => entry.id === currentUserId) : undefined;

        return { totalXP, completedCount, totalWorkshops, avgScore, badgesEarned, overallProgress, inProgressWorkshop, myRank };
    }, [stats, workshops, leaderboard, user]);

    /* â”€â”€ Determine locked workshops â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    const workshopStatuses = useMemo(() => {
        const statuses: Record<string, 'completed' | 'in-progress' | 'not-started' | 'locked'> = {};
        let previousCompleted = true;

        for (const w of workshops) {
            if (w.status === 'COMPLETED') {
                statuses[w.workshop_id] = 'completed';
                previousCompleted = true;
            } else if (w.status === 'IN_PROGRESS') {
                statuses[w.workshop_id] = 'in-progress';
                previousCompleted = false;
            } else if (previousCompleted) {
                statuses[w.workshop_id] = 'not-started';
                previousCompleted = false;
            } else {
                statuses[w.workshop_id] = 'locked';
            }
        }
        return statuses;
    }, [workshops]);

    /* â”€â”€ Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

    if (isLoading || dataLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <GraduationCap className="animate-bounce w-12 h-12 text-emerald-500" />
                    <span className="text-sm text-slate-500">Chargement de votre espace...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white pt-24 pb-12">
            <div className="relative z-10 max-w-7xl mx-auto px-6">
                {/* Breadcrumb */}
                <div className="text-xs text-slate-500 mb-6">
                    <Link href="/" className="hover:text-emerald-400">Accueil</Link>
                    <ChevronRight size={12} className="inline mx-1" />
                    <span className="text-emerald-400">Espace Ã‰tudiant</span>
                </div>

                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-medium">
                                <GraduationCap size={14} /> Parcours MonÃ©tique
                            </div>
                            {computed.overallProgress > 0 && (
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-white/10 rounded-full text-xs font-mono">
                                    <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${computed.overallProgress}%` }} />
                                    </div>
                                    <span className="text-emerald-400">{computed.overallProgress}%</span>
                                </div>
                            )}
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                            Bonjour, {user?.firstName || 'Ã‰tudiant'}
                        </h1>
                        <p className="text-slate-400">
                            Suivez votre progression et validez vos compÃ©tences en monÃ©tique.
                        </p>
                    </div>
                    <button
                        onClick={refreshData}
                        className={`flex items-center gap-2 px-4 py-2 bg-slate-800 border border-white/10 text-white rounded-xl hover:bg-slate-700 ${isRefreshing ? 'animate-pulse' : ''}`}
                    >
                        <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                        Actualiser
                    </button>
                </div>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm mb-6">
                        {error}
                    </div>
                )}

                {/* Header Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <StatCard icon={<Trophy className="text-amber-400" />} label="XP Total" value={computed.totalXP} suffix="pts" color="amber" />
                    <StatCard icon={<Target className="text-emerald-400" />} label="Ateliers" value={`${computed.completedCount}/${computed.totalWorkshops}`} color="emerald" />
                    <StatCard icon={<Star className="text-blue-400" />} label="Score Moyen" value={computed.avgScore} suffix="%" color="blue" />
                    <StatCard icon={<Award className="text-purple-400" />} label="Badges" value={`${computed.badgesEarned}/${badges.length || 8}`} color="purple" />
                    <StatCard icon={<Shield className="text-orange-400" />} label="CTF Points" value={`${ctfPoints} (${ctfSolved})`} color="amber" />
                </div>

                {/* Next Step Banner */}
                <NextStepBanner
                    inProgressWorkshop={computed.inProgressWorkshop}
                    workshops={workshops}
                    ctfSolved={ctfSolved}
                />

                {/* Main Content */}
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Column - Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Tabs */}
                        <div className="flex gap-2 p-1 bg-slate-900/50 rounded-2xl border border-white/5">
                            <TabButton active={activeTab === 'ateliers'} onClick={() => setActiveTab('ateliers')} icon={<Book size={16} />} label="Mes Ateliers" />
                            <TabButton active={activeTab === 'progression'} onClick={() => setActiveTab('progression')} icon={<BarChart3 size={16} />} label="Progression" />
                            <TabButton active={activeTab === 'badges'} onClick={() => setActiveTab('badges')} icon={<Award size={16} />} label="Badges" />
                        </div>

                        {/* Tab Content */}
                        {activeTab === 'ateliers' && (
                            <div className="space-y-4">
                                {workshops.map((workshop, idx) => (
                                    <WorkshopCard
                                        key={workshop.workshop_id}
                                        workshop={workshop}
                                        displayStatus={workshopStatuses[workshop.workshop_id] || 'locked'}
                                        number={String(idx + 1).padStart(2, '0')}
                                    />
                                ))}
                                {workshops.length === 0 && (
                                    <div className="text-center py-12 text-slate-500">
                                        Aucun atelier disponible pour le moment.
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'progression' && (
                            <div className="space-y-6">
                                <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-8">
                                    <h3 className="text-xl font-bold mb-6">Progression Globale</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400">Parcours Complet</span>
                                            <span className="font-mono font-bold">{computed.overallProgress}%</span>
                                        </div>
                                        <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-1000"
                                                style={{ width: `${computed.overallProgress}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 mt-8">
                                        {workshops.map((w) => (
                                            <div key={w.workshop_id} className="text-center p-4 bg-slate-900/50 rounded-xl">
                                                <div className={`text-2xl font-bold mb-1 ${w.status === 'COMPLETED' ? 'text-emerald-400' :
                                                    w.status === 'IN_PROGRESS' ? 'text-amber-400' : 'text-slate-600'
                                                    }`}>
                                                    {w.progress_percent || 0}%
                                                </div>
                                                <div className="text-xs text-slate-500 truncate">{w.title}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Quiz Scores */}
                                {stats && (
                                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-8">
                                        <h3 className="text-xl font-bold mb-6">Statistiques Quiz</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <MiniStat label="Total passÃ©s" value={stats.quizzes.total} />
                                            <MiniStat label="RÃ©ussis" value={stats.quizzes.passed} />
                                            <MiniStat label="Score moyen" value={`${stats.quizzes.avgScore}%`} />
                                            <MiniStat label="Meilleur score" value={`${stats.quizzes.bestScore}%`} />
                                        </div>
                                        {stats.workshops.totalTime > 0 && (
                                            <div className="mt-6 p-4 bg-slate-900/50 rounded-xl flex items-center gap-3">
                                                <Clock className="text-slate-400" size={18} />
                                                <span className="text-sm text-slate-400">
                                                    Temps total d&apos;Ã©tude : <strong className="text-white">{stats.workshops.totalTime} min</strong>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'badges' && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {badges.map((badge) => (
                                    <div
                                        key={badge.type}
                                        className={`p-6 rounded-2xl border transition-all ${badge.earned
                                            ? 'bg-slate-800/50 border-amber-500/20 hover:border-amber-500/40'
                                            : 'bg-slate-900/30 border-white/5 opacity-50'
                                            }`}
                                    >
                                        <div className="text-4xl mb-3">{BADGE_ICONS[badge.icon] || '\u{1F396}\uFE0F'}</div>
                                        <h4 className="font-bold mb-1">{badge.name}</h4>
                                        <p className="text-xs text-slate-500 mb-2">{badge.description}</p>
                                        <div className="text-xs text-amber-400/60 mb-1">+{badge.xp} XP</div>
                                        {badge.earned && badge.earnedAt && (
                                            <div className="text-xs text-emerald-400">
                                                DÃ©bloquÃ© le {new Date(badge.earnedAt).toLocaleDateString('fr-FR')}
                                            </div>
                                        )}
                                        {!badge.earned && (
                                            <div className="flex items-center gap-1 text-xs text-slate-600">
                                                <Lock size={12} /> VerrouillÃ©
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {badges.length === 0 && (
                                    <div className="col-span-full text-center py-12 text-slate-500">
                                        Aucun badge disponible pour le moment.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Column - Sidebar */}
                    <div className="space-y-6">
                        {/* Continue Learning */}
                        {computed.inProgressWorkshop && (
                            <div className="bg-gradient-to-br from-emerald-600/20 to-teal-600/10 rounded-2xl border border-emerald-500/20 p-6">
                                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
                                    <Play size={14} /> Continuer
                                </div>
                                <h3 className="text-xl font-bold mb-2">{computed.inProgressWorkshop.title}</h3>
                                <p className="text-sm text-slate-400 mb-4">
                                    Vous Ãªtes Ã  {computed.inProgressWorkshop.progress_percent}% â€” Continuez lÃ  oÃ¹ vous vous Ãªtes arrÃªtÃ©.
                                </p>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
                                    <div className="h-full bg-emerald-500" style={{ width: `${computed.inProgressWorkshop.progress_percent}%` }} />
                                </div>
                                <Link
                                    href={`/student/theory/${computed.inProgressWorkshop.workshop_id}`}
                                    className="block w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-center font-bold transition-colors"
                                >
                                    Reprendre l&apos;atelier
                                </Link>
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                            <h3 className="font-bold mb-4">AccÃ¨s Rapide</h3>
                            <div className="space-y-2">
                                <QuickAction href="/student/cursus" icon={<GraduationCap size={18} />} label="Mes Cursus" />
                                <QuickAction href="/student/quizzes" icon={<Target size={18} />} label="Mes Quiz" />
                                <QuickAction href="/student/progress" icon={<BarChart3 size={18} />} label="Ma Progression" />
                                <QuickAction href="/student/badges" icon={<Award size={18} />} label="Mes Badges" />
                                <QuickAction href="/student/transactions" icon={<History size={18} />} label="Transactions" />
                                <QuickAction href="/student/defense" icon={<Shield size={18} />} label="Sandbox DÃ©fense" />
                            </div>
                        </div>

                        {/* Leaderboard */}
                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <TrendingUp size={18} className="text-amber-400" />
                                Classement
                            </h3>
                            {leaderboard.length > 0 ? (
                                <div className="space-y-2">
                                    {leaderboard.slice(0, 5).map((entry) => {
                                        const name = [entry.first_name, entry.last_name].filter(Boolean).join(' ') || entry.username;
                                        const isMe = entry.id === (user?.id || '');
                                        return (
                                            <div key={entry.id} className={`flex items-center gap-3 p-2 rounded-lg ${isMe ? 'bg-emerald-500/10' : ''}`}>
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${entry.rank === 1 ? 'bg-amber-500 text-slate-950' :
                                                    entry.rank === 2 ? 'bg-slate-400 text-slate-950' :
                                                        entry.rank === 3 ? 'bg-amber-700 text-white' :
                                                            'bg-slate-800 text-slate-400'
                                                    }`}>
                                                    {entry.rank}
                                                </div>
                                                <span className={`flex-1 text-sm truncate ${isMe ? 'font-bold text-emerald-400' : ''}`}>
                                                    {isMe ? 'Vous' : name}
                                                </span>
                                                <span className="text-xs font-mono text-slate-500">{entry.total_xp} XP</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">Pas encore de classement.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function StatCard({ icon, label, value, suffix, color }: { icon: React.ReactNode; label: string; value: string | number; suffix?: string; color: string }) {
    const colors: Record<string, string> = {
        amber: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
        emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
        blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
        purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
    };

    return (
        <div className={`p-5 rounded-2xl bg-gradient-to-br ${colors[color]} border`}>
            <div className="flex items-center gap-3 mb-2">
                {icon}
                <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-2xl font-bold font-mono">
                {value}{suffix && <span className="text-sm text-slate-500 ml-1">{suffix}</span>}
            </div>
        </div>
    );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${active
                ? 'bg-white text-slate-950'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
        >
            {icon}
            {label}
        </button>
    );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="text-center p-4 bg-slate-900/50 rounded-xl">
            <div className="text-2xl font-bold text-white mb-1">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
        </div>
    );
}

function WorkshopCard({ workshop, displayStatus, number }: { workshop: WorkshopProgress; displayStatus: string; number: string }) {
    const meta = WORKSHOP_META[workshop.workshop_id] || { icon: BookOpen, color: 'blue', difficulty: '-', duration: '-' };
    const Icon = meta.icon;

    const colors: Record<string, { bg: string; text: string; border: string }> = {
        blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
        purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
        amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
        emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
        red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
        indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
    };

    const colorScheme = colors[meta.color] || colors.blue;
    const isLocked = displayStatus === 'locked';

    return (
        <div className={`p-6 rounded-2xl border transition-all ${isLocked
            ? 'bg-slate-900/30 border-white/5 opacity-60'
            : 'bg-slate-800/50 border-white/10 hover:border-white/20'
            }`}>
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${colorScheme.bg} ${colorScheme.border} border`}>
                    <Icon className={colorScheme.text} size={24} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-slate-500 font-mono">#{number}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${meta.difficulty === 'DÃ©butant' ? 'bg-green-500/10 text-green-400' :
                                    meta.difficulty === 'IntermÃ©diaire' ? 'bg-blue-500/10 text-blue-400' :
                                        meta.difficulty === 'AvancÃ©' ? 'bg-amber-500/10 text-amber-400' :
                                            'bg-purple-500/10 text-purple-400'
                                    }`}>
                                    {meta.difficulty}
                                </span>
                            </div>
                            <h3 className="font-bold text-lg">{workshop.title}</h3>
                        </div>

                        <div className="text-right">
                            <div className="text-xs text-slate-500 flex items-center gap-1 justify-end">
                                <Clock size={12} />
                                {meta.duration}
                            </div>
                        </div>
                    </div>

                    {/* Progress bar */}
                    {!isLocked && (
                        <div className="mt-4">
                            <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-slate-500">
                                    Section {workshop.current_section || 0}/{workshop.total_sections || '?'}
                                </span>
                                <span className={displayStatus === 'completed' ? 'text-emerald-400' : 'text-slate-400'}>
                                    {workshop.progress_percent || 0}%
                                </span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all ${displayStatus === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'
                                        }`}
                                    style={{ width: `${workshop.progress_percent || 0}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-4">
                        {isLocked ? (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Lock size={14} />
                                ComplÃ©tez l&apos;atelier prÃ©cÃ©dent pour dÃ©bloquer
                            </div>
                        ) : (
                            <>
                                <Link
                                    href={`/student/theory/${workshop.workshop_id}`}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${displayStatus === 'completed'
                                        ? 'bg-slate-800 hover:bg-slate-700 text-white'
                                        : `${colorScheme.bg} ${colorScheme.text} hover:opacity-80`
                                        }`}
                                >
                                    {displayStatus === 'completed' ? 'Revoir' : displayStatus === 'in-progress' ? 'Continuer' : 'Commencer'}
                                </Link>
                                {displayStatus === 'completed' && (
                                    <CheckCircle size={20} className="text-emerald-500" />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
        >
            <div className="text-slate-400 group-hover:text-white transition-colors">{icon}</div>
            <span className="text-sm">{label}</span>
            <ChevronRight size={14} className="ml-auto text-slate-600 group-hover:text-slate-400 transition-colors" />
        </Link>
    );
}

function NextStepBanner({
    inProgressWorkshop,
    workshops,
    ctfSolved,
}: {
    inProgressWorkshop?: WorkshopProgress;
    workshops: WorkshopProgress[];
    ctfSolved: number;
}) {
    let href = '/student/cursus';
    let label = 'Commencer le Cursus';
    let sublabel = 'DÃ©marrez votre parcours monÃ©tique';
    let tone: 'emerald' | 'amber' | 'cyan' = 'emerald';

    if (inProgressWorkshop) {
        href = `/student/theory/${inProgressWorkshop.workshop_id}`;
        label = `Continuer â€” ${inProgressWorkshop.title}`;
        sublabel = `${inProgressWorkshop.progress_percent || 0}% complÃ©tÃ©`;
        tone = 'amber';
    } else if (ctfSolved === 0) {
        href = `/student/ctf/${FIRST_CTF_ROOM_CODE}`;
        label = 'Lancer ton premier challenge CTF';
        sublabel = 'PAY-001 - The Unsecured Payment Terminal - BEGINNER - 150 pts';
        tone = 'cyan';
    } else {
        const nextWorkshop = workshops.find(w => w.status === 'NOT_STARTED');
        if (nextWorkshop) {
            href = `/student/theory/${nextWorkshop.workshop_id}`;
            label = `Commencer â€” ${nextWorkshop.title}`;
            sublabel = 'Prochain atelier du parcours';
            tone = 'emerald';
        } else {
            href = '/student/ctf';
            label = 'Explorer les challenges avancÃ©s';
            sublabel = `${ctfSolved} challenge${ctfSolved > 1 ? 's' : ''} rÃ©solu${ctfSolved > 1 ? 's' : ''} â€” continue !`;
            tone = 'cyan';
        }
    }

    const gradients = {
        emerald: 'from-emerald-500/10 via-emerald-600/5 to-transparent border-emerald-500/20',
        amber: 'from-amber-500/10 via-amber-600/5 to-transparent border-amber-500/20',
        cyan: 'from-cyan-500/10 via-cyan-600/5 to-transparent border-cyan-500/20',
    };
    const textColors = {
        emerald: 'text-emerald-400',
        amber: 'text-amber-400',
        cyan: 'text-cyan-400',
    };

    return (
        <Link
            href={href}
            className={`flex items-center justify-between gap-4 mb-8 px-6 py-4 rounded-2xl bg-gradient-to-r ${gradients[tone]} border hover:brightness-110 transition-all group`}
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-slate-900/60 ${textColors[tone]}`}>
                    <Sparkles size={20} />
                </div>
                <div>
                    <p className="text-[11px] text-slate-500 uppercase tracking-widest font-medium mb-0.5">Prochaine Ã©tape recommandÃ©e</p>
                    <p className={`font-bold text-sm md:text-base ${textColors[tone]}`}>{label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{sublabel}</p>
                </div>
            </div>
            <ArrowRight size={20} className={`shrink-0 ${textColors[tone]} opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all`} />
        </Link>
    );
}

