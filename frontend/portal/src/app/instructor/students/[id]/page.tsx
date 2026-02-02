'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { useParams } from 'next/navigation';
import {
    User,
    Mail,
    Calendar,
    Award,
    BookOpen,
    Clock,
    TrendingUp,
    CheckCircle2,
    XCircle,
    ChevronRight,
    BarChart3,
    Target,
    Trophy,
    Zap,
    ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

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

export default function StudentDetailPage() {
    const { user: authUser, isLoading: authLoading } = useAuth(true);
    const params = useParams();
    const studentId = params.id as string;

    const [student, setStudent] = useState<StudentDetail | null>(null);
    const [stats, setStats] = useState<StudentStats | null>(null);
    const [progress, setProgress] = useState<WorkshopProgress[]>([]);
    const [quizzes, setQuizzes] = useState<QuizResult[]>([]);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (studentId) {
            fetchStudentData();
        }
    }, [studentId]);

    const fetchStudentData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/users/${studentId}/progress`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setStudent(data.student);
                setStats(data.stats);
                setProgress(data.progress);
                setQuizzes(data.quizzes);
                setBadges(data.badges);
            } else {
                // Mock data
                setStudent({
                    id: studentId,
                    username: 'etudiant_01',
                    email: 'etudiant@pmp.edu',
                    firstName: 'Jean',
                    lastName: 'Dupont',
                    role: 'ROLE_ETUDIANT',
                    status: 'ACTIVE',
                    createdAt: '2024-01-01T10:00:00Z'
                });

                setStats({
                    totalXP: 450,
                    workshopsCompleted: 2,
                    quizzesPassed: 3,
                    totalQuizzes: 4,
                    avgQuizScore: 85,
                    badgeCount: 5,
                    exercisesAssigned: 2
                });

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
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="min-h-screen bg-slate-950 pt-24 pb-12">
                <div className="max-w-5xl mx-auto px-6 text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">Étudiant non trouvé</h1>
                    <Link href="/instructor/students" className="text-blue-400 hover:text-blue-300">
                        Retour à la liste
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pt-24 pb-12">
            <div className="max-w-6xl mx-auto px-6">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/instructor/students"
                        className="flex items-center gap-2 text-slate-400 hover:text-blue-400 text-sm mb-4"
                    >
                        <ArrowLeft size={16} />
                        Retour aux étudiants
                    </Link>

                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                                {student.firstName?.[0]}{student.lastName?.[0]}
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white">
                                    {student.firstName} {student.lastName}
                                </h1>
                                <p className="text-slate-400">@{student.username}</p>
                            </div>
                        </div>
                        <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                            student.status === 'ACTIVE'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400'
                        }`}>
                            {student.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                        </span>
                    </div>
                </div>

                {/* Stats Grid */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/30 rounded-2xl p-6">
                            <div className="p-3 bg-blue-500/20 rounded-xl w-fit mb-4">
                                <Zap className="w-6 h-6 text-blue-400" />
                            </div>
                            <p className="text-sm text-slate-400 mb-1">Total XP</p>
                            <p className="text-2xl font-bold text-white">{stats.totalXP}</p>
                        </div>

                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                            <div className="p-3 bg-emerald-500/20 rounded-xl w-fit mb-4">
                                <BookOpen className="w-6 h-6 text-emerald-400" />
                            </div>
                            <p className="text-sm text-slate-400 mb-1">Ateliers terminés</p>
                            <p className="text-2xl font-bold text-white">{stats.workshopsCompleted}/6</p>
                        </div>

                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                            <div className="p-3 bg-purple-500/20 rounded-xl w-fit mb-4">
                                <Target className="w-6 h-6 text-purple-400" />
                            </div>
                            <p className="text-sm text-slate-400 mb-1">Score moyen quiz</p>
                            <p className="text-2xl font-bold text-white">{stats.avgQuizScore}%</p>
                        </div>

                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                            <div className="p-3 bg-amber-500/20 rounded-xl w-fit mb-4">
                                <Trophy className="w-6 h-6 text-amber-400" />
                            </div>
                            <p className="text-sm text-slate-400 mb-1">Badges obtenus</p>
                            <p className="text-2xl font-bold text-white">{stats.badgeCount}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Workshop Progress */}
                    <div className="lg:col-span-2">
                        <h2 className="text-xl font-semibold text-white mb-4">Progression des ateliers</h2>
                        <div className="space-y-4">
                            {Object.keys(WORKSHOP_TITLES).map((workshopId) => {
                                const progressData = progress.find(p => p.workshopId === workshopId);
                                const percent = progressData?.progressPercent || 0;
                                const status = progressData?.status || 'NOT_STARTED';

                                return (
                                    <div key={workshopId} className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <h3 className="font-medium text-white">{WORKSHOP_TITLES[workshopId]}</h3>
                                                <p className="text-sm text-slate-400">
                                                    {progressData?.currentSection || 0}/{progressData?.totalSections || '?'} sections
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs ${
                                                status === 'COMPLETED'
                                                    ? 'bg-emerald-500/20 text-emerald-400'
                                                    : status === 'IN_PROGRESS'
                                                    ? 'bg-blue-500/20 text-blue-400'
                                                    : 'bg-slate-700 text-slate-400'
                                            }`}>
                                                {status === 'COMPLETED' ? 'Terminé' : status === 'IN_PROGRESS' ? 'En cours' : 'Non commencé'}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    status === 'COMPLETED'
                                                        ? 'bg-emerald-500'
                                                        : 'bg-blue-500'
                                                }`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                        {progressData?.timeSpentMinutes && (
                                            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                                <Clock size={12} />
                                                {progressData.timeSpentMinutes} minutes passées
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Quiz Results */}
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-4">Résultats quiz</h2>
                            <div className="bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden">
                                {quizzes.length === 0 ? (
                                    <p className="p-4 text-slate-400 text-center">Aucun quiz passé</p>
                                ) : (
                                    quizzes.map((quiz, index) => (
                                        <div key={quiz.quizId} className={`p-4 ${index !== 0 ? 'border-t border-white/5' : ''}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="font-medium text-white text-sm">
                                                    {WORKSHOP_TITLES[quiz.workshopId] || quiz.quizId}
                                                </p>
                                                {quiz.passed ? (
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                                ) : (
                                                    <XCircle className="w-5 h-5 text-red-400" />
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-400">{quiz.score}/{quiz.maxScore}</span>
                                                <span className={`font-semibold ${
                                                    quiz.passed ? 'text-emerald-400' : 'text-red-400'
                                                }`}>
                                                    {quiz.percentage}%
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Badges */}
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-4">Badges obtenus</h2>
                            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                                {badges.length === 0 ? (
                                    <p className="text-slate-400 text-center">Aucun badge obtenu</p>
                                ) : (
                                    <div className="grid grid-cols-3 gap-3">
                                        {badges.map((badge) => (
                                            <div
                                                key={badge.badgeType}
                                                className="flex flex-col items-center p-3 bg-slate-900/50 rounded-xl"
                                                title={badge.badgeDescription}
                                            >
                                                <Award className="w-8 h-8 text-amber-400 mb-2" />
                                                <p className="text-xs text-white text-center font-medium">
                                                    {badge.badgeName}
                                                </p>
                                                <p className="text-xs text-emerald-400">+{badge.xpAwarded} XP</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Student Info */}
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-4">Informations</h2>
                            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    <Mail className="w-5 h-5 text-slate-400" />
                                    <span className="text-sm text-white">{student.email}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-5 h-5 text-slate-400" />
                                    <span className="text-sm text-white">
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
