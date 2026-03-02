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
import { NotionProgress, NotionSkeleton } from '@shared/components/notion';

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

    const avgProgress = workshopStats.length > 0
        ? Math.round(workshopStats.reduce((s, w) => s + w.avgProgress, 0) / workshopStats.length)
        : 0;
    const avgQuizScore = quizStats.length > 0
        ? Math.round(quizStats.reduce((s, q) => s + q.avgScore, 0) / quizStats.length)
        : 0;
    const totalBadges = badgeStats.reduce((s, b) => s + b.studentsEarned, 0);

    if (isLoading || dataLoading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)', padding: '32px 24px' }}>
                <NotionSkeleton type="line" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginTop: '24px' }}>
                    {[0,1,2,3].map(i => <NotionSkeleton key={i} type="stat" />)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '24px' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--n-text-primary)', margin: 0 }}>
                            Analytics &amp; Statistiques
                        </h1>
                        <p style={{ fontSize: '13px', color: 'var(--n-text-secondary)', marginTop: '4px' }}>
                            Vue d&apos;ensemble des performances de la cohorte
                        </p>
                    </div>
                    <button
                        onClick={() => { setDataLoading(true); fetchAnalytics(); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '7px 14px',
                            background: 'var(--n-bg-secondary)', border: '1px solid var(--n-border)',
                            borderRadius: '6px', fontSize: '13px', color: 'var(--n-text-primary)', cursor: 'pointer',
                        }}
                    >
                        <RefreshCw size={14} /> Actualiser
                    </button>
                </div>

                {error && (
                    <div style={{
                        marginTop: '12px', padding: '10px 14px',
                        background: 'var(--n-danger-bg)', border: '1px solid var(--n-danger-border)',
                        borderRadius: '6px', fontSize: '13px', color: 'var(--n-danger)',
                    }}>
                        {error}
                    </div>
                )}
            </div>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Overview Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
                    {[
                        { icon: <Users size={18} />, label: 'Étudiants inscrits', value: totalStudents, accent: 'var(--n-accent)', bg: 'var(--n-accent-light)' },
                        { icon: <TrendingUp size={18} />, label: 'Progression moyenne', value: `${avgProgress}%`, accent: 'var(--n-success)', bg: 'var(--n-success-bg)' },
                        { icon: <BarChart3 size={18} />, label: 'Score moyen quiz', value: `${avgQuizScore}%`, accent: '#7c3aed', bg: '#f5f3ff' },
                        { icon: <Award size={18} />, label: 'Badges délivrés', value: totalBadges, accent: 'var(--n-warning)', bg: 'var(--n-warning-bg)' },
                    ].map(({ icon, label, value, accent, bg }) => (
                        <div key={label} style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ color: accent }}>{icon}</span>
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--n-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                            </div>
                            <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-mono)' }}>{value}</div>
                        </div>
                    ))}
                </div>

                {/* Workshop & Quiz */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                    {/* Workshop Performance */}
                    <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--n-border)' }}>
                            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--n-text-primary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                                <BookOpen size={15} style={{ color: 'var(--n-accent)' }} /> Performance par Atelier
                            </h2>
                        </div>
                        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {workshopStats.length > 0 ? workshopStats.map((workshop) => (
                                <div key={workshop.workshopId} style={{
                                    padding: '12px',
                                    background: 'var(--n-bg-secondary)',
                                    border: '1px solid var(--n-border)',
                                    borderRadius: '6px',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <h3 style={{ fontSize: '13px', fontWeight: 500, color: 'var(--n-text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{workshop.title}</h3>
                                        <span style={{ fontSize: '12px', color: 'var(--n-text-secondary)', flexShrink: 0 }}>{workshop.studentsStarted} participants</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '12px' }}>
                                        <div>
                                            <p style={{ color: 'var(--n-text-secondary)', marginBottom: '4px', margin: 0 }}>Complétion</p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <NotionProgress
                                                        value={workshop.avgProgress}
                                                        variant={workshop.avgProgress >= 80 ? 'success' : workshop.avgProgress >= 60 ? 'warning' : 'danger'}
                                                        size="thin"
                                                    />
                                                </div>
                                                <span style={{ color: 'var(--n-text-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{workshop.avgProgress}%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p style={{ color: 'var(--n-text-secondary)', margin: 0 }}>Terminés</p>
                                            <p style={{ color: 'var(--n-text-primary)', fontWeight: 600, margin: '4px 0 0' }}>{workshop.studentsCompleted}/{workshop.studentsStarted}</p>
                                        </div>
                                        <div>
                                            <p style={{ color: 'var(--n-text-secondary)', margin: 0 }}>Temps moyen</p>
                                            <p style={{ color: 'var(--n-text-primary)', fontWeight: 600, margin: '4px 0 0' }}>{workshop.avgTimeMinutes} min</p>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <p style={{ fontSize: '13px', color: 'var(--n-text-tertiary)', textAlign: 'center', padding: '24px 0' }}>Aucune donnée de progression disponible.</p>
                            )}
                        </div>
                    </div>

                    {/* Quiz Performance */}
                    <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--n-border)' }}>
                            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--n-text-primary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                                <BarChart3 size={15} style={{ color: '#7c3aed' }} /> Performance aux Quiz
                            </h2>
                        </div>
                        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {quizStats.length > 0 ? quizStats.map((quiz) => (
                                <div key={quiz.quizId} style={{
                                    padding: '12px',
                                    background: 'var(--n-bg-secondary)',
                                    border: '1px solid var(--n-border)',
                                    borderRadius: '6px',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <h3 style={{ fontSize: '13px', fontWeight: 500, color: 'var(--n-text-primary)', margin: 0 }}>{quiz.quizId}</h3>
                                        <span style={{ fontSize: '12px', color: 'var(--n-text-secondary)' }}>{quiz.attempts} tentatives</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                                        <div>
                                            <p style={{ color: 'var(--n-text-secondary)', margin: 0 }}>Score moyen</p>
                                            <p style={{
                                                fontSize: '18px', fontWeight: 700, margin: '4px 0 0',
                                                color: quiz.avgScore >= 80 ? 'var(--n-success)' : quiz.avgScore >= 60 ? 'var(--n-warning)' : 'var(--n-danger)',
                                            }}>
                                                {quiz.avgScore}%
                                            </p>
                                        </div>
                                        <div>
                                            <p style={{ color: 'var(--n-text-secondary)', margin: 0 }}>Taux de réussite</p>
                                            <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--n-text-primary)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {quiz.passRate}%
                                                {quiz.passRate >= 80
                                                    ? <CheckCircle2 size={14} style={{ color: 'var(--n-success)' }} />
                                                    : quiz.passRate < 60
                                                        ? <XCircle size={14} style={{ color: 'var(--n-danger)' }} />
                                                        : null}
                                            </p>
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '11px', color: 'var(--n-text-tertiary)', marginTop: '6px' }}>
                                        {quiz.uniqueStudents} étudiant{quiz.uniqueStudents !== 1 ? 's' : ''} unique{quiz.uniqueStudents !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            )) : (
                                <p style={{ fontSize: '13px', color: 'var(--n-text-tertiary)', textAlign: 'center', padding: '24px 0' }}>Aucun quiz soumis pour le moment.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Badges Distribution */}
                {badgeStats.length > 0 && (
                    <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--n-border)' }}>
                            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--n-text-primary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                                <Award size={15} style={{ color: 'var(--n-warning)' }} /> Distribution des Badges
                            </h2>
                        </div>
                        <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: '10px' }}>
                            {badgeStats.map((badge) => (
                                <div key={badge.badgeType} style={{
                                    padding: '10px 12px',
                                    background: 'var(--n-warning-bg)',
                                    border: '1px solid var(--n-warning-border)',
                                    borderRadius: '6px',
                                }}>
                                    <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--n-text-primary)', margin: 0 }}>{badge.name}</p>
                                    <p style={{ fontSize: '12px', color: 'var(--n-text-secondary)', margin: '4px 0 0' }}>
                                        {badge.studentsEarned} étudiant{badge.studentsEarned !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Leaderboard */}
                <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--n-border)' }}>
                        <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--n-text-primary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                            <Award size={15} style={{ color: 'var(--n-warning)' }} /> Classement des Étudiants
                        </h2>
                    </div>
                    {leaderboard.length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'var(--n-bg-secondary)' }}>
                                        {['Rang', 'Étudiant', 'XP Total', 'Ateliers', 'Badges'].map(h => (
                                            <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--n-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaderboard.map((student) => {
                                        const name = [student.first_name, student.last_name].filter(Boolean).join(' ') || student.username;
                                        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                                        const rankColors: Record<number,string> = { 1: 'var(--n-warning)', 2: 'var(--n-text-secondary)', 3: '#c2410c' };
                                        return (
                                            <tr key={student.id} style={{ borderTop: '1px solid var(--n-border)' }}>
                                                <td style={{ padding: '10px 16px' }}>
                                                    <span style={{
                                                        display: 'inline-flex', width: '26px', height: '26px', borderRadius: '50%',
                                                        alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '12px', fontWeight: 700,
                                                        background: 'var(--n-bg-secondary)', color: rankColors[student.rank] || 'var(--n-text-tertiary)',
                                                    }}>
                                                        {student.rank}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 16px' }}>
                                                    <Link href={`/instructor/students/${student.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                                                        <div style={{
                                                            width: '32px', height: '32px', borderRadius: '50%',
                                                            background: 'var(--n-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '11px', fontWeight: 700, color: 'white', flexShrink: 0,
                                                        }}>
                                                            {initials}
                                                        </div>
                                                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--n-text-primary)' }}>{name}</span>
                                                    </Link>
                                                </td>
                                                <td style={{ padding: '10px 16px' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--n-success)', fontFamily: 'var(--n-font-mono)' }}>{student.total_xp.toLocaleString()} XP</span>
                                                </td>
                                                <td style={{ padding: '10px 16px' }}>
                                                    <span style={{ fontSize: '13px', color: 'var(--n-text-primary)' }}>{student.workshops_completed}/6</span>
                                                </td>
                                                <td style={{ padding: '10px 16px' }}>
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: '999px',
                                                        background: 'var(--n-warning-bg)', border: '1px solid var(--n-warning-border)',
                                                        fontSize: '12px', color: 'var(--n-warning)', fontWeight: 500,
                                                    }}>
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
                        <div style={{ padding: '48px', textAlign: 'center', fontSize: '13px', color: 'var(--n-text-tertiary)' }}>
                            Pas encore de classement disponible.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
