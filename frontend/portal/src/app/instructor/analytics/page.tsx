'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import Link from 'next/link';
import {
    BarChart3,
    TrendingUp,
    Users,
    CheckCircle2,
    XCircle,
    Award,
    BookOpen,
    ChevronRight,
    RefreshCw
} from 'lucide-react';

interface WorkshopStats {
    workshopId: string;
    title: string;
    studentsStarted: number;
    studentsCompleted: number;
    avgProgress: number;
    avgTimeMinutes: number;
}

interface QuizStats {
    quizId: string;
    attempts: number;
    uniqueStudents: number;
    avgScore: number;
    passRate: number;
}

interface BadgeDistribution {
    badgeType: string;
    name: string;
    studentsEarned: number;
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

export default function InstructorAnalyticsPage() {
    const { isLoading } = useAuth(true);
    const [workshopStats, setWorkshopStats] = useState<WorkshopStats[]>([]);
    const [quizStats, setQuizStats] = useState<QuizStats[]>([]);
    const [badgeStats, setBadgeStats] = useState<BadgeDistribution[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [totalStudents, setTotalStudents] = useState(0);
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            setError(null);
            const headers = { Authorization: `Bearer ${token}` };
            const [cohortRes, leaderboardRes, studentsRes] = await Promise.all([
                fetch('/api/progress/cohort', { headers }).catch(() => null),
                fetch('/api/progress/leaderboard?limit=10', { headers }).catch(() => null),
                fetch('/api/users/students?limit=50', { headers }).catch(() => null),
            ]);

            if (cohortRes?.ok) {
                const data = await cohortRes.json();
                const analytics = data.analytics || {};
                setWorkshopStats(analytics.workshopProgress || []);
                setQuizStats(analytics.quizPerformance || []);
                setBadgeStats(analytics.badgeDistribution || []);
                setTotalStudents(analytics.totalStudents || 0);
            }

            if (leaderboardRes?.ok) {
                const data = await leaderboardRes.json();
                setLeaderboard(data.leaderboard || []);
            }

            if (studentsRes?.ok) {
                const data = await studentsRes.json();
                const students = data.students || [];
                if (totalStudents === 0) setTotalStudents(students.length);
            }
        } catch (e: any) {
            const message = e instanceof Error ? e.message : 'Erreur lors du chargement des analytics';
            setError(message);
        } finally {
            setDataLoading(false);
        }
    }, [totalStudents]);

    useEffect(() => {
        if (isLoading) return;
        fetchAnalytics();
    }, [isLoading, fetchAnalytics]);

    // Computed
    const avgProgress = workshopStats.length > 0
        ? Math.round(workshopStats.reduce((s, w) => s + w.avgProgress, 0) / workshopStats.length)
        : 0;
    const avgQuizScore = quizStats.length > 0
        ? Math.round(quizStats.reduce((s, q) => s + q.avgScore, 0) / quizStats.length)
        : 0;
    const totalBadges = badgeStats.reduce((s, b) => s + b.studentsEarned, 0);

    if (isLoading || dataLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <BarChart3 className="animate-bounce w-12 h-12 text-blue-500" />
                    <span className="text-sm text-slate-500">Chargement des analytics...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pt-24 pb-12">
            <div className="max-w-7xl mx-auto px-6">
                {/* Breadcrumb */}
                <div className="text-xs text-slate-500 mb-6">
                    <Link href="/instructor" className="hover:text-blue-400">Dashboard</Link>
                    <ChevronRight size={12} className="inline mx-1" />
                    <span className="text-blue-400">Analytics</span>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Analytics & Statistiques</h1>
                        <p className="text-slate-400">
                            Vue d&apos;ensemble des performances de la cohorte
                        </p>
                    </div>
                    <button
                        onClick={() => { setDataLoading(true); fetchAnalytics(); }}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-white/10 text-white rounded-xl hover:bg-slate-700"
                    >
                        <RefreshCw size={18} />
                        Actualiser
                    </button>
                </div>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm mb-6">
                        {error}
                    </div>
                )}

                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/30 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-500/20 rounded-xl">
                                <Users className="w-6 h-6 text-blue-400" />
                            </div>
                        </div>
                        <p className="text-sm text-slate-400 mb-1">Étudiants inscrits</p>
                        <p className="text-2xl font-bold text-white">{totalStudents}</p>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="p-3 bg-emerald-500/20 rounded-xl w-fit mb-4">
                            <TrendingUp className="w-6 h-6 text-emerald-400" />
                        </div>
                        <p className="text-sm text-slate-400 mb-1">Progression moyenne</p>
                        <p className="text-2xl font-bold text-white">{avgProgress}%</p>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="p-3 bg-purple-500/20 rounded-xl w-fit mb-4">
                            <BarChart3 className="w-6 h-6 text-purple-400" />
                        </div>
                        <p className="text-sm text-slate-400 mb-1">Score moyen quiz</p>
                        <p className="text-2xl font-bold text-white">{avgQuizScore}%</p>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="p-3 bg-amber-500/20 rounded-xl w-fit mb-4">
                            <Award className="w-6 h-6 text-amber-400" />
                        </div>
                        <p className="text-sm text-slate-400 mb-1">Badges délivrés</p>
                        <p className="text-2xl font-bold text-white">{totalBadges}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Workshop Performance */}
                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/10">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <BookOpen size={20} className="text-blue-400" />
                                Performance par Atelier
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            {workshopStats.length > 0 ? workshopStats.map((workshop) => (
                                <div key={workshop.workshopId} className="p-4 bg-slate-900/50 rounded-xl">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-medium text-white truncate">{workshop.title}</h3>
                                        <span className="text-sm text-slate-400 shrink-0 ml-2">{workshop.studentsStarted} participants</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <p className="text-slate-400 mb-1">Complétion</p>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${
                                                            workshop.avgProgress >= 80 ? 'bg-emerald-500' :
                                                            workshop.avgProgress >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                                        }`}
                                                        style={{ width: `${workshop.avgProgress}%` }}
                                                    />
                                                </div>
                                                <span className="text-white font-medium">{workshop.avgProgress}%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 mb-1">Terminés</p>
                                            <p className="text-white font-medium">{workshop.studentsCompleted}/{workshop.studentsStarted}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 mb-1">Temps moyen</p>
                                            <p className="text-white font-medium">{workshop.avgTimeMinutes} min</p>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-sm text-slate-500 text-center py-8">Aucune donnée de progression disponible.</p>
                            )}
                        </div>
                    </div>

                    {/* Quiz Performance */}
                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/10">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <BarChart3 size={20} className="text-purple-400" />
                                Performance aux Quiz
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            {quizStats.length > 0 ? quizStats.map((quiz) => (
                                <div key={quiz.quizId} className="p-4 bg-slate-900/50 rounded-xl">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-medium text-white">{quiz.quizId}</h3>
                                        <span className="text-sm text-slate-400">{quiz.attempts} tentatives</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-slate-400 mb-1">Score moyen</p>
                                            <p className={`text-xl font-bold ${
                                                quiz.avgScore >= 80 ? 'text-emerald-400' :
                                                quiz.avgScore >= 60 ? 'text-amber-400' : 'text-red-400'
                                            }`}>
                                                {quiz.avgScore}%
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 mb-1">Taux de réussite</p>
                                            <p className="text-xl font-bold text-white flex items-center gap-2">
                                                {quiz.passRate}%
                                                {quiz.passRate >= 80 ? (
                                                    <CheckCircle2 size={16} className="text-emerald-400" />
                                                ) : quiz.passRate < 60 ? (
                                                    <XCircle size={16} className="text-red-400" />
                                                ) : null}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">
                                        {quiz.uniqueStudents} étudiant{quiz.uniqueStudents !== 1 ? 's' : ''} unique{quiz.uniqueStudents !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            )) : (
                                <p className="text-sm text-slate-500 text-center py-8">Aucun quiz soumis pour le moment.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Student Rankings */}
                <div className="bg-slate-800/50 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/10">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Award size={20} className="text-amber-400" />
                            Classement des Étudiants
                        </h2>
                    </div>
                    {leaderboard.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-900/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Rang</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Étudiant</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">XP Total</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Ateliers</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Badges</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {leaderboard.map((student) => {
                                        const name = [student.first_name, student.last_name].filter(Boolean).join(' ') || student.username;
                                        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                                        return (
                                            <tr key={student.id} className="hover:bg-white/5 transition">
                                                <td className="px-6 py-4">
                                                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                                        student.rank === 1 ? 'bg-amber-500/20 text-amber-400' :
                                                        student.rank === 2 ? 'bg-slate-400/20 text-slate-300' :
                                                        student.rank === 3 ? 'bg-orange-500/20 text-orange-400' :
                                                        'bg-slate-700 text-slate-400'
                                                    }`}>
                                                        {student.rank}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Link href={`/instructor/students/${student.id}`} className="flex items-center gap-3 hover:text-blue-400 transition-colors">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                                                            {initials}
                                                        </div>
                                                        <span className="font-medium text-white">{name}</span>
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-emerald-400">{student.total_xp.toLocaleString()} XP</td>
                                                <td className="px-6 py-4 text-slate-300">{student.workshops_completed}/6</td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm">
                                                        {student.badge_count}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-slate-500">
                            Pas encore de classement disponible.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

