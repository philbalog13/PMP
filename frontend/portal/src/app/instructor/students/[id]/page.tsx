'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { useParams } from 'next/navigation';
import {
    Mail,
    Calendar,
    Award,
    BookOpen,
    Clock,
    CheckCircle2,
    XCircle,
    Target,
    Trophy,
    Zap,
    ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { NotionProgress, NotionSkeleton } from '@shared/components/notion';

interface StudentDetail {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    createdAt: string;
}

interface StudentStats {
    totalXP: number;
    workshopsCompleted: number;
    quizzesPassed: number;
    totalQuizzes: number;
    avgQuizScore: number;
    badgeCount: number;
    exercisesAssigned: number;
}

interface WorkshopProgress {
    workshopId: string;
    status: string;
    progressPercent: number;
    currentSection: number;
    totalSections: number;
    timeSpentMinutes: number;
    startedAt: string | null;
    completedAt: string | null;
}

interface QuizResult {
    quizId: string;
    workshopId: string;
    score: number;
    maxScore: number;
    percentage: number;
    passed: boolean;
    submittedAt: string;
}

interface Badge {
    badgeType: string;
    badgeName: string;
    badgeDescription: string;
    badgeIcon: string;
    xpAwarded: number;
    earnedAt: string;
}

const WORKSHOP_TITLES: Record<string, string> = {
    'intro': 'Introduction aux Paiements',
    'iso8583': 'ISO 8583 - Messages',
    'hsm-keys': 'HSM et Gestion des Clés',
    '3ds-flow': 'Flux 3D Secure',
    'fraud-detection': 'Détection de Fraude',
    'emv': 'Cartes EMV'
};

type UnknownRecord = Record<string, unknown>;
const toRecord = (value: unknown): UnknownRecord => (
    value !== null && typeof value === 'object' ? (value as UnknownRecord) : {}
);

const normalizeStudent = (raw: unknown): StudentDetail => {
    const r = toRecord(raw);
    return {
        id: String(r.id || ''),
        username: String(r.username ?? ''),
        email: String(r.email ?? ''),
        firstName: String(r.firstName ?? r.first_name ?? ''),
        lastName: String(r.lastName ?? r.last_name ?? ''),
        role: String(r.role ?? ''),
        status: String(r.status ?? ''),
        createdAt: String(r.createdAt ?? r.created_at ?? '')
    };
};

const normalizeProgress = (raw: unknown): WorkshopProgress => {
    const r = toRecord(raw);
    return {
        workshopId: String(r.workshopId ?? r.workshop_id ?? ''),
        status: String(r.status ?? 'NOT_STARTED'),
        progressPercent: Number(r.progressPercent ?? r.progress_percent ?? 0),
        currentSection: Number(r.currentSection ?? r.current_section ?? 0),
        totalSections: Number(r.totalSections ?? r.total_sections ?? 0),
        timeSpentMinutes: Number(r.timeSpentMinutes ?? r.time_spent_minutes ?? 0),
        startedAt: (r.startedAt ?? r.started_at ?? null) as string | null,
        completedAt: (r.completedAt ?? r.completed_at ?? null) as string | null
    };
};

const normalizeQuiz = (raw: unknown): QuizResult => {
    const r = toRecord(raw);
    return {
        quizId: String(r.quizId ?? r.quiz_id ?? ''),
        workshopId: String(r.workshopId ?? r.workshop_id ?? ''),
        score: Number(r.score ?? 0),
        maxScore: Number(r.maxScore ?? r.max_score ?? 0),
        percentage: Number(r.percentage ?? 0),
        passed: Boolean(r.passed),
        submittedAt: String(r.submittedAt ?? r.submitted_at ?? '')
    };
};

const normalizeBadge = (raw: unknown): Badge => {
    const r = toRecord(raw);
    return {
        badgeType: String(r.badgeType ?? r.badge_type ?? ''),
        badgeName: String(r.badgeName ?? r.badge_name ?? ''),
        badgeDescription: String(r.badgeDescription ?? r.badge_description ?? ''),
        badgeIcon: String(r.badgeIcon ?? r.badge_icon ?? ''),
        xpAwarded: Number(r.xpAwarded ?? r.xp_awarded ?? 0),
        earnedAt: String(r.earnedAt ?? r.earned_at ?? '')
    };
};

export default function StudentDetailPage() {
    const { isLoading: authLoading } = useAuth(true);
    const params = useParams();
    const studentId = params.id as string;

    const [student, setStudent] = useState<StudentDetail | null>(null);
    const [stats, setStats] = useState<StudentStats | null>(null);
    const [progress, setProgress] = useState<WorkshopProgress[]>([]);
    const [quizzes, setQuizzes] = useState<QuizResult[]>([]);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchStudentData = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/users/${studentId}/progress`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setStudent(normalizeStudent(data.student));
                setStats(data.stats);
                setProgress((data.progress || []).map(normalizeProgress));
                setQuizzes((data.quizzes || []).map(normalizeQuiz));
                setBadges((data.badges || []).map(normalizeBadge));
            } else {
                setStudent({ id: studentId, username: 'etudiant_01', email: 'etudiant@pmp.edu', firstName: 'Jean', lastName: 'Dupont', role: 'ROLE_ETUDIANT', status: 'ACTIVE', createdAt: '2024-01-01T10:00:00Z' });
                setStats({ totalXP: 450, workshopsCompleted: 2, quizzesPassed: 3, totalQuizzes: 4, avgQuizScore: 85, badgeCount: 5, exercisesAssigned: 2 });
                setProgress([
                    { workshopId: 'intro', status: 'COMPLETED', progressPercent: 100, currentSection: 5, totalSections: 5, timeSpentMinutes: 45, startedAt: '2024-01-05', completedAt: '2024-01-06' },
                    { workshopId: 'iso8583', status: 'COMPLETED', progressPercent: 100, currentSection: 8, totalSections: 8, timeSpentMinutes: 120, startedAt: '2024-01-07', completedAt: '2024-01-10' },
                    { workshopId: 'hsm-keys', status: 'IN_PROGRESS', progressPercent: 50, currentSection: 3, totalSections: 6, timeSpentMinutes: 60, startedAt: '2024-01-12', completedAt: null },
                ]);
                setQuizzes([
                    { quizId: 'quiz-intro', workshopId: 'intro', score: 9, maxScore: 10, percentage: 90, passed: true, submittedAt: '2024-01-06T14:30:00Z' },
                    { quizId: 'quiz-iso8583', workshopId: 'iso8583', score: 8, maxScore: 10, percentage: 80, passed: true, submittedAt: '2024-01-10T16:00:00Z' },
                    { quizId: 'quiz-hsm', workshopId: 'hsm-keys', score: 7, maxScore: 10, percentage: 70, passed: false, submittedAt: '2024-01-14T11:00:00Z' },
                ]);
                setBadges([
                    { badgeType: 'FIRST_LOGIN', badgeName: 'Bienvenue !', badgeDescription: 'Première connexion', badgeIcon: 'star', xpAwarded: 10, earnedAt: '2024-01-01' },
                    { badgeType: 'FIRST_QUIZ', badgeName: 'Premier Quiz', badgeDescription: 'Passer son premier quiz', badgeIcon: 'clipboard-check', xpAwarded: 20, earnedAt: '2024-01-06' },
                    { badgeType: 'WORKSHOP_COMPLETE', badgeName: 'Atelier Terminé', badgeDescription: 'Terminer un atelier', badgeIcon: 'book-open', xpAwarded: 30, earnedAt: '2024-01-06' },
                ]);
            }
        } catch (error) {
            console.error('Failed to fetch student data:', error);
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    useEffect(() => {
        if (studentId) fetchStudentData();
    }, [studentId, fetchStudentData]);

    if (authLoading || loading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)', padding: '32px 24px' }}>
                <NotionSkeleton type="line" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginTop: '24px' }}>
                    {[0,1,2,3].map(i => <NotionSkeleton key={i} type="stat" />)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginTop: '24px' }}>
                    <NotionSkeleton type="card" />
                    <NotionSkeleton type="card" />
                </div>
            </div>
        );
    }

    if (!student) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--n-text-primary)', marginBottom: '12px' }}>Étudiant non trouvé</h1>
                    <Link href="/instructor/students" style={{ fontSize: '14px', color: 'var(--n-accent)', textDecoration: 'none' }}>
                        ← Retour à la liste
                    </Link>
                </div>
            </div>
        );
    }

    const initials = `${student.firstName?.[0] ?? ''}${student.lastName?.[0] ?? ''}`.toUpperCase();

    return (
        <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)' }}>
            {/* Page header */}
            <div style={{ background: 'var(--n-bg-primary)', borderBottom: '1px solid var(--n-border)', padding: '20px 24px' }}>
                <Link href="/instructor/students" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--n-text-secondary)', textDecoration: 'none', marginBottom: '12px' }}>
                    <ArrowLeft size={14} /> Retour aux étudiants
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '52px', height: '52px', borderRadius: '50%',
                            background: 'var(--n-accent)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: 'white', flexShrink: 0,
                        }}>
                            {initials}
                        </div>
                        <div>
                            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--n-text-primary)', margin: 0 }}>
                                {student.firstName} {student.lastName}
                            </h1>
                            <p style={{ fontSize: '13px', color: 'var(--n-text-secondary)', margin: '2px 0 0' }}>@{student.username}</p>
                        </div>
                    </div>
                    <span style={{
                        padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                        background: student.status === 'ACTIVE' ? 'var(--n-success-bg)' : 'var(--n-danger-bg)',
                        border: `1px solid ${student.status === 'ACTIVE' ? 'var(--n-success-border)' : 'var(--n-danger-border)'}`,
                        color: student.status === 'ACTIVE' ? 'var(--n-success)' : 'var(--n-danger)',
                    }}>
                        {student.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                    </span>
                </div>
            </div>

            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Stats Grid */}
                {stats && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
                        {[
                            { icon: <Zap size={18} />, label: 'Total XP', value: stats.totalXP, accent: 'var(--n-accent)', bg: 'var(--n-accent-light)' },
                            { icon: <BookOpen size={18} />, label: 'Ateliers terminés', value: `${stats.workshopsCompleted}/6`, accent: 'var(--n-success)', bg: 'var(--n-success-bg)' },
                            { icon: <Target size={18} />, label: 'Score moyen quiz', value: `${stats.avgQuizScore}%`, accent: '#7c3aed', bg: '#f5f3ff' },
                            { icon: <Trophy size={18} />, label: 'Badges obtenus', value: stats.badgeCount, accent: 'var(--n-warning)', bg: 'var(--n-warning-bg)' },
                        ].map(({ icon, label, value, accent, bg }) => (
                            <div key={label} style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ color: accent }}>{icon}</span>
                                    </div>
                                    <span style={{ fontSize: '11px', color: 'var(--n-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                                </div>
                                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-mono)' }}>{value}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Main 2-col layout */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>

                    {/* Workshop Progress */}
                    <div>
                        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--n-text-primary)', marginBottom: '12px' }}>Progression des ateliers</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {Object.keys(WORKSHOP_TITLES).map((workshopId) => {
                                const progressData = progress.find(p => p.workshopId === workshopId);
                                const percent = progressData?.progressPercent || 0;
                                const status = progressData?.status || 'NOT_STARTED';
                                const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
                                    COMPLETED: { label: 'Terminé', color: 'var(--n-success)', bg: 'var(--n-success-bg)', border: 'var(--n-success-border)' },
                                    IN_PROGRESS: { label: 'En cours', color: 'var(--n-accent)', bg: 'var(--n-accent-light)', border: 'var(--n-accent-border)' },
                                    NOT_STARTED: { label: 'Non commencé', color: 'var(--n-text-tertiary)', bg: 'var(--n-bg-secondary)', border: 'var(--n-border)' },
                                };
                                const sc = statusConfig[status] ?? statusConfig.NOT_STARTED;

                                return (
                                    <div key={workshopId} style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', padding: '14px 16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <div>
                                                <h3 style={{ fontSize: '13px', fontWeight: 500, color: 'var(--n-text-primary)', margin: 0 }}>{WORKSHOP_TITLES[workshopId]}</h3>
                                                <p style={{ fontSize: '11px', color: 'var(--n-text-tertiary)', margin: '2px 0 0' }}>
                                                    {progressData?.currentSection || 0}/{progressData?.totalSections || '?'} sections
                                                </p>
                                            </div>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 500,
                                                background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color,
                                                height: 'fit-content',
                                            }}>
                                                {sc.label}
                                            </span>
                                        </div>
                                        <NotionProgress
                                            value={percent}
                                            variant={status === 'COMPLETED' ? 'success' : status === 'IN_PROGRESS' ? 'accent' : 'default'}
                                            size="thin"
                                        />
                                        {progressData?.timeSpentMinutes ? (
                                            <p style={{ fontSize: '11px', color: 'var(--n-text-tertiary)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={11} /> {progressData.timeSpentMinutes} min passées
                                            </p>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Quiz Results */}
                        <div>
                            <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--n-text-primary)', marginBottom: '10px' }}>Résultats quiz</h2>
                            <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', overflow: 'hidden' }}>
                                {quizzes.length === 0 ? (
                                    <p style={{ padding: '20px', fontSize: '13px', color: 'var(--n-text-tertiary)', textAlign: 'center' }}>Aucun quiz passé</p>
                                ) : quizzes.map((quiz, index) => (
                                    <div key={quiz.quizId} style={{ padding: '12px 14px', borderTop: index !== 0 ? '1px solid var(--n-border)' : 'none' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--n-text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                                                {WORKSHOP_TITLES[quiz.workshopId] || quiz.quizId}
                                            </p>
                                            {quiz.passed
                                                ? <CheckCircle2 size={15} style={{ color: 'var(--n-success)', flexShrink: 0 }} />
                                                : <XCircle size={15} style={{ color: 'var(--n-danger)', flexShrink: 0 }} />}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                            <span style={{ color: 'var(--n-text-secondary)' }}>{quiz.score}/{quiz.maxScore}</span>
                                            <span style={{ fontWeight: 600, color: quiz.passed ? 'var(--n-success)' : 'var(--n-danger)' }}>{quiz.percentage}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Badges */}
                        <div>
                            <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--n-text-primary)', marginBottom: '10px' }}>Badges obtenus</h2>
                            <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', padding: '12px' }}>
                                {badges.length === 0 ? (
                                    <p style={{ fontSize: '13px', color: 'var(--n-text-tertiary)', textAlign: 'center', padding: '12px 0' }}>Aucun badge obtenu</p>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                                        {badges.map((badge) => (
                                            <div key={badge.badgeType} title={badge.badgeDescription} style={{
                                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                                padding: '10px 6px',
                                                background: 'var(--n-warning-bg)',
                                                border: '1px solid var(--n-warning-border)',
                                                borderRadius: '6px',
                                            }}>
                                                <Award size={20} style={{ color: 'var(--n-warning)', marginBottom: '4px' }} />
                                                <p style={{ fontSize: '10px', color: 'var(--n-text-primary)', textAlign: 'center', fontWeight: 500, margin: 0 }}>{badge.badgeName}</p>
                                                <p style={{ fontSize: '10px', color: 'var(--n-success)', margin: '2px 0 0' }}>+{badge.xpAwarded} XP</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Student Info */}
                        <div>
                            <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--n-text-primary)', marginBottom: '10px' }}>Informations</h2>
                            <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Mail size={14} style={{ color: 'var(--n-text-tertiary)', flexShrink: 0 }} />
                                    <span style={{ fontSize: '13px', color: 'var(--n-text-primary)' }}>{student.email}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Calendar size={14} style={{ color: 'var(--n-text-tertiary)', flexShrink: 0 }} />
                                    <span style={{ fontSize: '13px', color: 'var(--n-text-primary)' }}>
                                        Inscrit le {new Date(student.createdAt).toLocaleDateString('fr-FR')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
