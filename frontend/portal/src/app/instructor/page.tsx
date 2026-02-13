'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../auth/useAuth';
import {
    Users, Shield, BarChart3, BookOpen, Activity, ChevronRight,
    RefreshCw, Award, Zap, GraduationCap, TrendingUp,
    Target, MessageSquare
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────── */

interface Student {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    status: string;
    workshops_completed: number;
    total_xp: number;
    badge_count: number;
}

interface WorkshopProgress {
    workshopId: string;
    title: string;
    studentsStarted: number;
    studentsCompleted: number;
    avgProgress: number;
    avgTimeMinutes: number;
}

interface QuizPerformance {
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

interface RecentActivity {
    username: string;
    first_name: string;
    last_name: string;
    activity_type: string;
    activity_target: string;
    activity_value: number;
    activity_time: string;
}

interface CohortAnalytics {
    totalStudents: number;
    workshopProgress: WorkshopProgress[];
    quizPerformance: QuizPerformance[];
    badgeDistribution: BadgeDistribution[];
    recentActivity: RecentActivity[];
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

/* ── Lab state ──────────────────────────────────────────────────────── */

interface LabConditions {
    latencyMs: number;
    authFailureRate: number;
    fraudInjection: boolean;
    hsmLatencyMs: number;
    networkErrors: boolean;
}

/* ── Main Component ─────────────────────────────────────────────────── */

export default function InstructorPage() {
    const { user, isLoading } = useAuth(true);
    const [students, setStudents] = useState<Student[]>([]);
    const [analytics, setAnalytics] = useState<CohortAnalytics | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isApplyingLabConditions, setIsApplyingLabConditions] = useState(false);

    const [labConditions, setLabConditions] = useState<LabConditions>({
        latencyMs: 0,
        authFailureRate: 0,
        fraudInjection: false,
        hsmLatencyMs: 0,
        networkErrors: false,
    });

    const normalizeLabConditions = useCallback((raw: Record<string, unknown> | null | undefined): LabConditions => ({
        latencyMs: Number(raw?.latencyMs ?? raw?.latency ?? 0) || 0,
        authFailureRate: Number(raw?.authFailureRate ?? raw?.authFailRate ?? 0) || 0,
        fraudInjection: Boolean(raw?.fraudInjection),
        hsmLatencyMs: Number(raw?.hsmLatencyMs ?? raw?.hsmLatency ?? 0) || 0,
        networkErrors: Boolean(raw?.networkErrors)
    }), []);

    const fetchData = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const headers = { Authorization: `Bearer ${token}` };

        const [studentsRes, analyticsRes, leaderboardRes, labConditionsRes] = await Promise.all([
            fetch('/api/users/students?limit=50', { headers }).catch(() => null),
            fetch('/api/progress/cohort', { headers }).catch(() => null),
            fetch('/api/progress/leaderboard?limit=10', { headers }).catch(() => null),
            fetch('/api/progress/lab/conditions', { headers }).catch(() => null),
        ]);

        if (studentsRes?.ok) {
            const data = await studentsRes.json();
            setStudents(data.students || []);
        }

        if (analyticsRes?.ok) {
            const data = await analyticsRes.json();
            setAnalytics(data.analytics || null);
        }

        if (leaderboardRes?.ok) {
            const data = await leaderboardRes.json();
            setLeaderboard(data.leaderboard || []);
        }

        if (labConditionsRes?.ok) {
            const data = await labConditionsRes.json();
            setLabConditions(normalizeLabConditions(data.conditions || {}));
        }
    }, [normalizeLabConditions]);

    const applyLabConditions = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Session introuvable');
            return;
        }

        try {
            setIsApplyingLabConditions(true);
            setError(null);

            const response = await fetch('/api/progress/lab/conditions', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(labConditions)
            });

            if (!response.ok) {
                throw new Error(`Erreur API (${response.status})`);
            }

            const data = await response.json();
            setLabConditions(normalizeLabConditions(data.conditions || {}));
        } catch (e: any) {
            setError(e.message || 'Impossible de mettre a jour les conditions du lab');
        } finally {
            setIsApplyingLabConditions(false);
        }
    }, [labConditions, normalizeLabConditions]);

    const refreshData = useCallback(async () => {
        try {
            setIsRefreshing(true);
            setError(null);
            await fetchData();
        } catch (e: any) {
            setError(e.message || 'Erreur de chargement');
        } finally {
            setDataLoading(false);
            setIsRefreshing(false);
        }
    }, [fetchData]);

    useEffect(() => {
        if (isLoading) return;
        refreshData();
    }, [isLoading, refreshData]);

    /* ── Computed ──────────────────────────────────────────────────── */

    const stats = useMemo(() => {
        const totalStudents = analytics?.totalStudents ?? students.length;
        const totalWorkshops = analytics?.workshopProgress?.length ?? 0;
        const avgProgress = totalWorkshops > 0
            ? Math.round(analytics!.workshopProgress.reduce((s, w) => s + w.avgProgress, 0) / totalWorkshops)
            : 0;
        const avgQuizScore = analytics?.quizPerformance?.length
            ? Math.round(analytics.quizPerformance.reduce((s, q) => s + q.avgScore, 0) / analytics.quizPerformance.length)
            : 0;
        const totalBadges = analytics?.badgeDistribution?.reduce((s, b) => s + b.studentsEarned, 0) ?? 0;

        return { totalStudents, avgProgress, avgQuizScore, totalBadges };
    }, [students, analytics]);

    /* ── Loading ───────────────────────────────────────────────────── */

    if (isLoading || dataLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <Shield className="animate-bounce w-12 h-12 text-blue-500" />
                    <span className="text-sm text-slate-500">Chargement du hub formateur...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white pt-24 pb-12">
            <div className="max-w-7xl mx-auto px-6 space-y-8">
                {/* Breadcrumb */}
                <div className="text-xs text-slate-500">
                    <Link href="/" className="hover:text-blue-400">Accueil</Link>
                    <ChevronRight size={12} className="inline mx-1" />
                    <span className="text-blue-400">Hub Formateur</span>
                </div>

                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-medium mb-3">
                            <Shield size={14} /> Poste de Commande
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">Hub Formateur</h1>
                        <p className="text-slate-400">
                            Bienvenue, {user?.firstName || 'Formateur'}. Pilotez vos sessions et surveillez la progression de la cohorte.
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
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
                        {error}
                    </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={<Users className="text-blue-400" />} label="Étudiants actifs" value={stats.totalStudents} color="blue" />
                    <StatCard icon={<Target className="text-emerald-400" />} label="Progression moyenne" value={`${stats.avgProgress}%`} color="emerald" />
                    <StatCard icon={<Award className="text-amber-400" />} label="Score moyen quiz" value={`${stats.avgQuizScore}%`} color="amber" />
                    <StatCard icon={<Zap className="text-purple-400" />} label="Badges décernés" value={stats.totalBadges} color="purple" />
                </div>

                {/* Main Grid */}
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left: 2/3 */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Student List */}
                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <Users className="text-blue-400" size={20} /> Progression Cohorte
                                </h2>
                                <Link href="/instructor/students" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                    Voir tout <ChevronRight size={14} />
                                </Link>
                            </div>

                            {students.length === 0 ? (
                                <p className="text-slate-500 text-sm text-center py-8">Aucun étudiant inscrit pour le moment.</p>
                            ) : (
                                <div className="space-y-3">
                                    {students.slice(0, 6).map((student) => {
                                        const name = [student.first_name, student.last_name].filter(Boolean).join(' ') || student.username;
                                        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                                        const progressPercent = Math.min(100, Math.round((student.workshops_completed / 6) * 100));
                                        const isStruggling = progressPercent < 20 && student.total_xp < 50;

                                        return (
                                            <Link key={student.id} href={`/instructor/students/${student.id}`} className="block">
                                                <div className={`flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border transition-colors cursor-pointer ${isStruggling ? 'border-amber-500/30 hover:border-amber-500/50' : 'border-white/5 hover:border-blue-500/20'}`}>
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">
                                                            {initials}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-medium text-white flex items-center gap-2">
                                                                {name}
                                                                {isStruggling && (
                                                                    <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] rounded-full font-bold">
                                                                        Attention
                                                                    </span>
                                                                )}
                                                            </h4>
                                                            <p className="text-xs text-slate-500">
                                                                {student.workshops_completed} atelier{student.workshops_completed !== 1 ? 's' : ''} terminé{student.workshops_completed !== 1 ? 's' : ''}
                                                                {' '}&middot;{' '}{student.total_xp} XP
                                                                {' '}&middot;{' '}{student.badge_count} badge{student.badge_count !== 1 ? 's' : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="hidden md:flex flex-col items-end gap-1">
                                                            <span className="text-xs text-slate-500">{progressPercent}%</span>
                                                            <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                                <div className={`h-full transition-all ${isStruggling ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${progressPercent}%` }} />
                                                            </div>
                                                        </div>
                                                        <span className={`w-2 h-2 rounded-full ${student.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Workshop & Quiz Analytics */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Workshop Progress */}
                            <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                    <BookOpen className="text-emerald-400" size={18} /> Ateliers
                                </h3>
                                {analytics?.workshopProgress?.length ? (
                                    <div className="space-y-4">
                                        {analytics.workshopProgress.map((w) => (
                                            <div key={w.workshopId}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-slate-300 truncate">{w.title}</span>
                                                    <span className="text-slate-500">{w.avgProgress}%</span>
                                                </div>
                                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${w.avgProgress}%` }} />
                                                </div>
                                                <p className="text-xs text-slate-600 mt-1">
                                                    {w.studentsCompleted}/{w.studentsStarted} terminé{w.studentsCompleted !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500">Aucune donnée de progression disponible.</p>
                                )}
                            </div>

                            {/* Quiz Performance */}
                            <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                    <BarChart3 className="text-amber-400" size={18} /> Performance Quiz
                                </h3>
                                {analytics?.quizPerformance?.length ? (
                                    <div className="space-y-3">
                                        {analytics.quizPerformance.map((q) => (
                                            <div key={q.quizId} className="p-3 bg-slate-900/50 rounded-xl">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm text-white font-medium">{q.quizId}</span>
                                                    <span className={`text-sm font-bold ${q.avgScore >= 80 ? 'text-emerald-400' : q.avgScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                                                        {q.avgScore}%
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                                    <span>{q.uniqueStudents} étudiant{q.uniqueStudents !== 1 ? 's' : ''}</span>
                                                    <span>&middot;</span>
                                                    <span>{q.attempts} tentative{q.attempts !== 1 ? 's' : ''}</span>
                                                    <span>&middot;</span>
                                                    <span>Réussite : {q.passRate}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500">Aucun quiz soumis pour le moment.</p>
                                )}
                            </div>
                        </div>

                        {/* Recent Activity */}
                        {analytics?.recentActivity?.length ? (
                            <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                    <MessageSquare className="text-blue-400" size={18} /> Activité Récente
                                </h3>
                                <div className="space-y-3">
                                    {analytics.recentActivity.slice(0, 5).map((a, i) => {
                                        const name = [a.first_name, a.last_name].filter(Boolean).join(' ') || a.username;
                                        const timeAgo = formatTimeAgo(a.activity_time);
                                        return (
                                            <div key={i} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                                    <div>
                                                        <p className="text-sm text-white">
                                                            <span className="font-medium">{name}</span>
                                                            {' '}a soumis un quiz
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {a.activity_target} — Score : {Math.round(a.activity_value)}%
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-xs text-slate-600">{timeAgo}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* Right sidebar: 1/3 */}
                    <div className="space-y-6">
                        {/* Lab Controls */}
                        <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/20 rounded-2xl p-6">
                            <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                                <Zap className="text-blue-400" size={18} /> Commande Lab
                            </h3>
                            <p className="text-sm text-slate-400 mb-6">Contrôlez les conditions du simulateur.</p>

                            <div className="space-y-5">
                                <div>
                                    <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                                        <span>Latence réseau</span>
                                        <span className="text-white font-medium">{labConditions.latencyMs} ms</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={0} max={500} step={10}
                                        value={labConditions.latencyMs}
                                        onChange={(e) => setLabConditions(prev => ({ ...prev, latencyMs: Number(e.target.value) }))}
                                        className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                                        <span>Taux d&apos;échec auth</span>
                                        <span className="text-white font-medium">{labConditions.authFailureRate}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={0} max={100} step={5}
                                        value={labConditions.authFailureRate}
                                        onChange={(e) => setLabConditions(prev => ({ ...prev, authFailureRate: Number(e.target.value) }))}
                                        className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-400">Injection de fraude</span>
                                    <button
                                        onClick={() => setLabConditions(prev => ({ ...prev, fraudInjection: !prev.fraudInjection }))}
                                        className={`w-11 h-6 rounded-full transition-all relative ${labConditions.fraudInjection ? 'bg-blue-500' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${labConditions.fraudInjection ? 'right-1' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={applyLabConditions}
                                disabled={isApplyingLabConditions}
                                className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors disabled:opacity-60"
                            >
                                {isApplyingLabConditions ? 'Application...' : 'Appliquer les conditions'}
                            </button>
                            <Link
                                href="/instructor/lab-control"
                                className="mt-2 block text-center text-xs text-blue-300 hover:text-blue-200"
                            >
                                Ouvrir le controle avance
                            </Link>
                        </div>

                        {/* Leaderboard */}
                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                <TrendingUp className="text-amber-400" size={18} /> Classement
                            </h3>
                            {leaderboard.length > 0 ? (
                                <div className="space-y-2">
                                    {leaderboard.slice(0, 5).map((entry) => {
                                        const name = [entry.first_name, entry.last_name].filter(Boolean).join(' ') || entry.username;
                                        return (
                                            <div key={entry.id} className="flex items-center gap-3 p-2 rounded-lg">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                    entry.rank === 1 ? 'bg-amber-500 text-slate-950' :
                                                    entry.rank === 2 ? 'bg-slate-400 text-slate-950' :
                                                    entry.rank === 3 ? 'bg-amber-700 text-white' :
                                                    'bg-slate-800 text-slate-400'
                                                }`}>
                                                    {entry.rank}
                                                </div>
                                                <span className="flex-1 text-sm text-white truncate">{name}</span>
                                                <span className="text-xs font-mono text-slate-500">{entry.total_xp} XP</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">Pas encore de classement.</p>
                            )}
                        </div>

                        {/* Quick Links */}
                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold mb-4">Accès Rapide</h3>
                            <div className="space-y-2">
                                <QuickLink title="Analytics" icon={<Activity size={18} />} href="/instructor/analytics" />
                                <QuickLink title="Transactions" icon={<Activity size={18} />} href="/instructor/transactions" />
                                <QuickLink title="Gestion Étudiants" icon={<Users size={18} />} href="/instructor/students" />
                                <QuickLink title="Exercices" icon={<GraduationCap size={18} />} href="/instructor/exercises" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
    const colors: Record<string, string> = {
        blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
        emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
        amber: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
        purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
    };

    return (
        <div className={`p-5 rounded-2xl bg-gradient-to-br ${colors[color]} border`}>
            <div className="flex items-center gap-3 mb-2">
                {icon}
                <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-2xl font-bold font-mono">{value}</div>
        </div>
    );
}

function QuickLink({ title, icon, href }: { title: string; icon: React.ReactNode; href: string }) {
    return (
        <Link
            href={href}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
        >
            <div className="flex items-center gap-3">
                <div className="text-slate-500 group-hover:text-blue-400 transition-colors">{icon}</div>
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{title}</span>
            </div>
            <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
        </Link>
    );
}

function formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'à l\'instant';
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days}j`;
}

