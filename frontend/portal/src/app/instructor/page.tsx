'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../auth/useAuth';
import {
    Users, Shield, BarChart3, BookOpen, Activity, ChevronRight,
    RefreshCw, Award, Zap, GraduationCap, TrendingUp,
    Target, MessageSquare
} from 'lucide-react';
import { NotionProgress, NotionSkeleton } from '@shared/components/notion';

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
            <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)', padding: '32px 24px' }}>
                <NotionSkeleton type="line" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '24px' }}>
                    {[0,1,2,3].map(i => <NotionSkeleton key={i} type="stat" />)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginTop: '24px' }}>
                    <NotionSkeleton type="card" />
                    <NotionSkeleton type="card" />
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)' }}>
            {/* Page header */}
            <div style={{
                background: 'var(--n-bg-primary)',
                borderBottom: '1px solid var(--n-border)',
                padding: '20px 24px',
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                    <div>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '3px 10px',
                            background: 'var(--n-accent-light)',
                            border: '1px solid var(--n-accent-border)',
                            borderRadius: '999px',
                            fontSize: '11px', fontWeight: 600,
                            color: 'var(--n-accent)',
                            marginBottom: '8px',
                        }}>
                            <Shield size={12} /> Poste de Commande
                        </div>
                        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--n-text-primary)', margin: 0 }}>
                            Hub Formateur
                        </h1>
                        <p style={{ fontSize: '13px', color: 'var(--n-text-secondary)', marginTop: '4px' }}>
                            Bienvenue, {user?.firstName || 'Formateur'}. Pilotez vos sessions et surveillez la progression de la cohorte.
                        </p>
                    </div>
                    <button
                        onClick={refreshData}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '7px 14px',
                            background: 'var(--n-bg-secondary)',
                            border: '1px solid var(--n-border)',
                            borderRadius: '6px',
                            fontSize: '13px', color: 'var(--n-text-primary)',
                            cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                    >
                        <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                        Actualiser
                    </button>
                </div>

                {error && (
                    <div style={{
                        marginTop: '12px', padding: '10px 14px',
                        background: 'var(--n-danger-bg)',
                        border: '1px solid var(--n-danger-border)',
                        borderRadius: '6px',
                        fontSize: '13px', color: 'var(--n-danger)',
                    }}>
                        {error}
                    </div>
                )}
            </div>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>

                {/* Quick Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                    <StatCard icon={<Users size={18} />} label="Étudiants actifs" value={stats.totalStudents} accent="var(--n-accent)" accentBg="var(--n-accent-light)" />
                    <StatCard icon={<Target size={18} />} label="Progression moyenne" value={`${stats.avgProgress}%`} accent="var(--n-success)" accentBg="var(--n-success-bg)" />
                    <StatCard icon={<Award size={18} />} label="Score moyen quiz" value={`${stats.avgQuizScore}%`} accent="var(--n-warning)" accentBg="var(--n-warning-bg)" />
                    <StatCard icon={<Zap size={18} />} label="Badges décernés" value={stats.totalBadges} accent="#7c3aed" accentBg="#f5f3ff" />
                </div>

                {/* Main Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>

                    {/* Left column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Student List */}
                        <div style={{
                            background: 'var(--n-bg-primary)',
                            border: '1px solid var(--n-border)',
                            borderRadius: '8px',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '14px 16px',
                                borderBottom: '1px solid var(--n-border)',
                            }}>
                                <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--n-text-primary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                                    <Users size={15} style={{ color: 'var(--n-accent)' }} /> Progression Cohorte
                                </h2>
                                <Link href="/instructor/students" style={{
                                    fontSize: '12px', color: 'var(--n-accent)',
                                    display: 'flex', alignItems: 'center', gap: '2px',
                                    textDecoration: 'none',
                                }}>
                                    Voir tout <ChevronRight size={12} />
                                </Link>
                            </div>

                            <div style={{ padding: '8px' }}>
                                {students.length === 0 ? (
                                    <p style={{ fontSize: '13px', color: 'var(--n-text-tertiary)', textAlign: 'center', padding: '32px 0' }}>
                                        Aucun étudiant inscrit pour le moment.
                                    </p>
                                ) : (
                                    students.slice(0, 6).map((student) => {
                                        const name = [student.first_name, student.last_name].filter(Boolean).join(' ') || student.username;
                                        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                                        const progressPercent = Math.min(100, Math.round((student.workshops_completed / 6) * 100));
                                        const isStruggling = progressPercent < 20 && student.total_xp < 50;

                                        return (
                                            <Link key={student.id} href={`/instructor/students/${student.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '10px 8px',
                                                    borderRadius: '6px',
                                                    border: `1px solid ${isStruggling ? 'var(--n-warning-border)' : 'transparent'}`,
                                                    background: isStruggling ? 'var(--n-warning-bg)' : 'transparent',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.1s',
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{
                                                            width: '32px', height: '32px', borderRadius: '6px',
                                                            background: 'var(--n-accent-light)',
                                                            border: '1px solid var(--n-accent-border)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '11px', fontWeight: 700, color: 'var(--n-accent)',
                                                            flexShrink: 0,
                                                        }}>
                                                            {initials}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--n-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                {name}
                                                                {isStruggling && (
                                                                    <span style={{
                                                                        padding: '1px 6px', borderRadius: '999px',
                                                                        background: 'var(--n-warning-bg)',
                                                                        border: '1px solid var(--n-warning-border)',
                                                                        fontSize: '10px', fontWeight: 700,
                                                                        color: 'var(--n-warning)',
                                                                    }}>
                                                                        Attention
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p style={{ fontSize: '11px', color: 'var(--n-text-tertiary)', margin: 0 }}>
                                                                {student.workshops_completed} atelier{student.workshops_completed !== 1 ? 's' : ''} · {student.total_xp} XP · {student.badge_count} badge{student.badge_count !== 1 ? 's' : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ width: '80px' }}>
                                                            <NotionProgress
                                                                value={progressPercent}
                                                                variant={isStruggling ? 'warning' : 'accent'}
                                                                size="thin"
                                                            />
                                                        </div>
                                                        <span style={{ fontSize: '11px', color: 'var(--n-text-tertiary)', minWidth: '28px', textAlign: 'right' }}>
                                                            {progressPercent}%
                                                        </span>
                                                        <div style={{
                                                            width: '7px', height: '7px', borderRadius: '50%',
                                                            background: student.status === 'ACTIVE' ? 'var(--n-success)' : 'var(--n-border-strong)',
                                                            flexShrink: 0,
                                                        }} />
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Workshop & Quiz Analytics */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                            {/* Workshop Progress */}
                            <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', padding: '16px' }}>
                                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--n-text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                                    <BookOpen size={14} style={{ color: 'var(--n-success)' }} /> Ateliers
                                </h3>
                                {analytics?.workshopProgress?.length ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {analytics.workshopProgress.map((w) => (
                                            <div key={w.workshopId}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '12px', color: 'var(--n-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{w.title}</span>
                                                    <span style={{ fontSize: '11px', color: 'var(--n-text-tertiary)', flexShrink: 0 }}>{w.avgProgress}%</span>
                                                </div>
                                                <NotionProgress value={w.avgProgress} variant="success" size="thin" />
                                                <p style={{ fontSize: '10px', color: 'var(--n-text-tertiary)', marginTop: '3px' }}>
                                                    {w.studentsCompleted}/{w.studentsStarted} terminés
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ fontSize: '12px', color: 'var(--n-text-tertiary)' }}>Aucune donnée disponible.</p>
                                )}
                            </div>

                            {/* Quiz Performance */}
                            <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', padding: '16px' }}>
                                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--n-text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                                    <BarChart3 size={14} style={{ color: 'var(--n-warning)' }} /> Performance Quiz
                                </h3>
                                {analytics?.quizPerformance?.length ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {analytics.quizPerformance.map((q) => (
                                            <div key={q.quizId} style={{
                                                padding: '8px 10px',
                                                background: 'var(--n-bg-secondary)',
                                                border: '1px solid var(--n-border)',
                                                borderRadius: '6px',
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--n-text-primary)' }}>{q.quizId}</span>
                                                    <span style={{
                                                        fontSize: '12px', fontWeight: 700,
                                                        color: q.avgScore >= 80 ? 'var(--n-success)' : q.avgScore >= 60 ? 'var(--n-warning)' : 'var(--n-danger)',
                                                    }}>
                                                        {q.avgScore}%
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: '10px', color: 'var(--n-text-tertiary)', margin: 0 }}>
                                                    {q.uniqueStudents} étudiant{q.uniqueStudents !== 1 ? 's' : ''} · Réussite {q.passRate}%
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ fontSize: '12px', color: 'var(--n-text-tertiary)' }}>Aucun quiz soumis.</p>
                                )}
                            </div>
                        </div>

                        {/* Recent Activity */}
                        {analytics?.recentActivity?.length ? (
                            <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', padding: '16px' }}>
                                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--n-text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                                    <MessageSquare size={14} style={{ color: 'var(--n-accent)' }} /> Activité Récente
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {analytics.recentActivity.slice(0, 5).map((a, i) => {
                                        const name = [a.first_name, a.last_name].filter(Boolean).join(' ') || a.username;
                                        const timeAgo = formatTimeAgo(a.activity_time);
                                        return (
                                            <div key={i} style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '8px 10px',
                                                background: 'var(--n-bg-secondary)',
                                                border: '1px solid var(--n-border)',
                                                borderRadius: '6px',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--n-accent)', flexShrink: 0 }} />
                                                    <div>
                                                        <p style={{ fontSize: '12px', color: 'var(--n-text-primary)', margin: 0 }}>
                                                            <span style={{ fontWeight: 500 }}>{name}</span> a soumis un quiz
                                                        </p>
                                                        <p style={{ fontSize: '11px', color: 'var(--n-text-tertiary)', margin: 0 }}>
                                                            {a.activity_target} — Score : {Math.round(a.activity_value)}%
                                                        </p>
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: '11px', color: 'var(--n-text-tertiary)', whiteSpace: 'nowrap' }}>{timeAgo}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* Right sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Lab Controls */}
                        <div style={{
                            background: 'var(--n-bg-primary)',
                            border: '1px solid var(--n-border)',
                            borderLeft: '3px solid var(--n-accent)',
                            borderRadius: '8px',
                            padding: '16px',
                        }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--n-text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <Zap size={15} style={{ color: 'var(--n-accent)' }} /> Commande Lab
                            </h3>
                            <p style={{ fontSize: '12px', color: 'var(--n-text-secondary)', marginBottom: '16px' }}>Contrôlez les conditions du simulateur.</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--n-text-secondary)' }}>Latence réseau</span>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--n-text-primary)' }}>{labConditions.latencyMs} ms</span>
                                    </div>
                                    <input
                                        type="range" min={0} max={500} step={10}
                                        value={labConditions.latencyMs}
                                        onChange={(e) => setLabConditions(prev => ({ ...prev, latencyMs: Number(e.target.value) }))}
                                        style={{ width: '100%', accentColor: 'var(--n-accent)' }}
                                    />
                                </div>

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--n-text-secondary)' }}>Taux d&apos;échec auth</span>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--n-text-primary)' }}>{labConditions.authFailureRate}%</span>
                                    </div>
                                    <input
                                        type="range" min={0} max={100} step={5}
                                        value={labConditions.authFailureRate}
                                        onChange={(e) => setLabConditions(prev => ({ ...prev, authFailureRate: Number(e.target.value) }))}
                                        style={{ width: '100%', accentColor: 'var(--n-accent)' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--n-text-secondary)' }}>Injection de fraude</span>
                                    <button
                                        onClick={() => setLabConditions(prev => ({ ...prev, fraudInjection: !prev.fraudInjection }))}
                                        style={{
                                            width: '40px', height: '22px', borderRadius: '999px',
                                            background: labConditions.fraudInjection ? 'var(--n-accent)' : 'var(--n-border-strong)',
                                            border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                                        }}
                                    >
                                        <div style={{
                                            position: 'absolute', top: '3px',
                                            left: labConditions.fraudInjection ? '21px' : '3px',
                                            width: '16px', height: '16px', borderRadius: '50%',
                                            background: 'white', transition: 'left 0.2s',
                                        }} />
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={applyLabConditions}
                                disabled={isApplyingLabConditions}
                                style={{
                                    width: '100%', marginTop: '14px',
                                    padding: '8px',
                                    background: isApplyingLabConditions ? 'var(--n-border)' : 'var(--n-accent)',
                                    border: 'none', borderRadius: '6px',
                                    fontSize: '13px', fontWeight: 600, color: 'white',
                                    cursor: isApplyingLabConditions ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {isApplyingLabConditions ? 'Application...' : 'Appliquer les conditions'}
                            </button>
                            <Link href="/instructor/lab-control" style={{
                                display: 'block', textAlign: 'center', marginTop: '8px',
                                fontSize: '11px', color: 'var(--n-accent)', textDecoration: 'none',
                            }}>
                                Ouvrir le contrôle avancé →
                            </Link>
                        </div>

                        {/* Leaderboard */}
                        <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', padding: '16px' }}>
                            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--n-text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                                <TrendingUp size={14} style={{ color: 'var(--n-warning)' }} /> Classement
                            </h3>
                            {leaderboard.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {leaderboard.slice(0, 5).map((entry) => {
                                        const name = [entry.first_name, entry.last_name].filter(Boolean).join(' ') || entry.username;
                                        const rankColors: Record<number, string> = {
                                            1: 'var(--n-warning)', 2: 'var(--n-text-tertiary)', 3: '#c2410c'
                                        };
                                        return (
                                            <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 4px' }}>
                                                <div style={{
                                                    width: '20px', height: '20px', borderRadius: '50%',
                                                    background: 'var(--n-bg-secondary)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '10px', fontWeight: 700,
                                                    color: rankColors[entry.rank] || 'var(--n-text-tertiary)',
                                                    flexShrink: 0,
                                                }}>
                                                    {entry.rank}
                                                </div>
                                                <span style={{ flex: 1, fontSize: '12px', color: 'var(--n-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                                                <span style={{ fontSize: '11px', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-mono)', whiteSpace: 'nowrap' }}>{entry.total_xp} XP</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p style={{ fontSize: '12px', color: 'var(--n-text-tertiary)' }}>Pas encore de classement.</p>
                            )}
                        </div>

                        {/* Quick Links */}
                        <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', padding: '16px' }}>
                            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--n-text-primary)', marginBottom: '8px' }}>Accès Rapide</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <QuickLink title="Analytics" icon={<Activity size={15} />} href="/instructor/analytics" />
                                <QuickLink title="Transactions" icon={<Activity size={15} />} href="/instructor/transactions" />
                                <QuickLink title="Gestion Étudiants" icon={<Users size={15} />} href="/instructor/students" />
                                <QuickLink title="Exercices" icon={<GraduationCap size={15} />} href="/instructor/exercises" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function StatCard({ icon, label, value, accent, accentBg }: {
    icon: React.ReactNode; label: string; value: string | number;
    accent: string; accentBg: string;
}) {
    return (
        <div style={{
            background: 'var(--n-bg-primary)',
            border: '1px solid var(--n-border)',
            borderRadius: '8px',
            padding: '16px',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{
                    width: '30px', height: '30px', borderRadius: '6px',
                    background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <span style={{ color: accent }}>{icon}</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--n-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-mono)' }}>{value}</div>
        </div>
    );
}

function QuickLink({ title, icon, href }: { title: string; icon: React.ReactNode; href: string }) {
    return (
        <Link href={href} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 6px', borderRadius: '5px', color: 'inherit' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--n-text-tertiary)' }}>{icon}</span>
                <span style={{ fontSize: '13px', color: 'var(--n-text-secondary)' }}>{title}</span>
            </div>
            <ChevronRight size={13} style={{ color: 'var(--n-text-tertiary)' }} />
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
