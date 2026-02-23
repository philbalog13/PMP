'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import Link from 'next/link';
import {
    CheckCircle2,
    XCircle,
    Clock,
    Play,
    RotateCcw,
    Trophy,
    Target,
    BookOpen,
    Lock,
    RefreshCw,
    ChevronRight
} from 'lucide-react';

interface QuizAttempt {
    date: string;
    score: number;
    passed: boolean;
    timeSpent: number;
}

interface Quiz {
    id: string;
    quizId: string | null;
    name: string;
    workshopId: string;
    workshopName: string;
    questions: number;
    timeLimit: number;
    attempts: QuizAttempt[];
    bestScore?: number;
    passed: boolean;
    available: boolean;
}

interface WorkshopCatalogEntry {
    id: string;
    title?: string;
    sections?: number;
    quizId?: string | null;
    moduleOrder?: number;
}

const WORKSHOP_ORDER = ['intro', 'iso8583', 'hsm-keys', '3ds-flow', 'fraud-detection', 'emv'];

function parseAttemptPassed(value: unknown, percentage: number, fallbackThreshold = 80): boolean {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'number') {
        return value === 1;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === 't' || normalized === '1') {
            return true;
        }
        if (normalized === 'false' || normalized === 'f' || normalized === '0') {
            return false;
        }
    }

    return percentage >= fallbackThreshold;
}

const WORKSHOP_NAMES: Record<string, string> = {
    'intro': 'Introduction aux Paiements',
    'iso8583': 'Protocole ISO 8583',
    'hsm-keys': 'Gestion des Clés HSM',
    '3ds-flow': '3D Secure v2',
    'fraud-detection': 'Détection de Fraude',
    'emv': 'Cartes EMV',
};

export default function StudentQuizzesPage() {
    const { isLoading } = useAuth(true);
    const [filter, setFilter] = useState<'all' | 'passed' | 'pending' | 'failed'>('all');
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchQuizData = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            setError(null);
            const headers = { Authorization: `Bearer ${token}` };
            const [progressRes, statsRes, workshopsRes] = await Promise.all([
                fetch('/api/progress', { headers }).catch(() => null),
                fetch('/api/progress/stats', { headers }).catch(() => null),
                fetch('/api/progress/workshops', { headers }).catch(() => null),
            ]);

            const progressData = progressRes?.ok ? await progressRes.json() : null;
            const statsData = statsRes?.ok ? await statsRes.json() : null;
            const workshopsData = workshopsRes?.ok ? await workshopsRes.json() : null;

            const progressMap = progressData?.progress || {};
            const quizResults = statsData?.stats?.quizResults || [];
            const workshopCatalog: WorkshopCatalogEntry[] = workshopsData?.workshops || [];
            const orderedWorkshopIds = workshopCatalog.length > 0
                ? [...workshopCatalog]
                    .sort((a, b) => (a.moduleOrder || 0) - (b.moduleOrder || 0))
                    .map((entry) => entry.id)
                : WORKSHOP_ORDER;
            const workshopCatalogMap = new Map(workshopCatalog.map((entry) => [entry.id, entry]));

            // Build quiz list from workshop progress
            let previousCompleted = true;
            const builtQuizzes: Quiz[] = orderedWorkshopIds.map((workshopId, index) => {
                const wp = progressMap[workshopId];
                const workshopMeta = workshopCatalogMap.get(workshopId);
                const workshopName = workshopMeta?.title || wp?.title || WORKSHOP_NAMES[workshopId] || workshopId;
                const totalSections = wp?.total_sections || workshopMeta?.sections || 5;
                const status = wp?.status || 'NOT_STARTED';
                const quizId = wp?.quiz_id || workshopMeta?.quizId || null;

                // Collect all attempts for this workshop/quiz
                const matchingResults = quizResults.filter((q: Record<string, unknown>) => {
                    const byWorkshopId = q?.workshop_id === workshopId || q?.workshopId === workshopId;
                    const byQuizId =
                        (quizId && (q?.quiz_id === quizId || q?.quizId === quizId))
                        || false;
                    return byWorkshopId || byQuizId;
                });

                const attempts: QuizAttempt[] = matchingResults.map((result: Record<string, unknown>) => {
                    const score = Number(result?.percentage ?? 0);
                    return {
                        date: String(result?.submitted_at || result?.date || new Date().toISOString()),
                        score: Number.isFinite(score) ? score : 0,
                        passed: parseAttemptPassed(result?.passed, score),
                        timeSpent: Number(result?.time_taken_seconds ?? result?.timeSpent ?? 0),
                    };
                });

                const bestScore = attempts.length > 0 ? Math.max(...attempts.map(a => a.score)) : undefined;
                const passed = attempts.some((attempt) => attempt.passed);

                // Workshop availability: sequential unlock
                const available = Boolean(quizId) && (
                    index === 0
                    || previousCompleted
                    || status === 'IN_PROGRESS'
                    || status === 'COMPLETED'
                );

                if (status === 'COMPLETED') {
                    previousCompleted = true;
                } else {
                    previousCompleted = false;
                }

                return {
                    id: `quiz-${workshopId}`,
                    quizId,
                    name: `Quiz ${workshopName}`,
                    workshopId,
                    workshopName,
                    questions: Math.max(5, totalSections * 2),
                    timeLimit: Math.max(10, totalSections * 3),
                    attempts,
                    bestScore,
                    passed,
                    available,
                };
            });

            setQuizzes(builtQuizzes);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Erreur lors du chargement des quiz');
        } finally {
            setDataLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isLoading) return;
        fetchQuizData();
    }, [isLoading, fetchQuizData]);

    // Stats
    const totalQuizzes = quizzes.length;
    const passedQuizzes = quizzes.filter(q => q.passed).length;
    const totalAttempts = quizzes.reduce((acc, q) => acc + q.attempts.length, 0);
    const quizzesWithScore = quizzes.filter(q => q.bestScore !== undefined);
    const averageScore = quizzesWithScore.length > 0
        ? quizzesWithScore.reduce((acc, q) => acc + (q.bestScore || 0), 0) / quizzesWithScore.length
        : 0;

    // Filter quizzes
    const filteredQuizzes = quizzes.filter(quiz => {
        if (filter === 'all') return true;
        if (filter === 'passed') return quiz.passed;
        if (filter === 'pending') return !quiz.passed && quiz.attempts.length === 0;
        if (filter === 'failed') return !quiz.passed && quiz.attempts.length > 0;
        return true;
    });

    if (isLoading || dataLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Target className="animate-bounce w-12 h-12 text-emerald-500" />
                    <span className="text-sm text-slate-500">Chargement des quiz...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pt-24 pb-12">
            <div className="max-w-4xl mx-auto px-6">
                {/* Breadcrumb */}
                <div className="text-xs text-slate-500 mb-6">
                    <Link href="/student" className="hover:text-emerald-400">Mon Parcours</Link>
                    <ChevronRight size={12} className="inline mx-1" />
                    <span className="text-emerald-400">Mes Quiz</span>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Mes Quiz</h1>
                        <p className="text-slate-400">
                            Testez vos connaissances et validez vos acquis
                        </p>
                    </div>
                    <button
                        onClick={() => { setDataLoading(true); fetchQuizData(); }}
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

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-500/20 rounded-lg">
                                <CheckCircle2 size={18} className="text-emerald-400" />
                            </div>
                            <span className="text-sm text-slate-400">Réussis</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{passedQuizzes}/{totalQuizzes}</p>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                <Target size={18} className="text-purple-400" />
                            </div>
                            <span className="text-sm text-slate-400">Score moyen</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{averageScore.toFixed(0)}%</p>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <RotateCcw size={18} className="text-blue-400" />
                            </div>
                            <span className="text-sm text-slate-400">Tentatives</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{totalAttempts}</p>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-500/20 rounded-lg">
                                <Trophy size={18} className="text-amber-400" />
                            </div>
                            <span className="text-sm text-slate-400">Taux réussite</span>
                        </div>
                        <p className="text-2xl font-bold text-white">
                            {totalQuizzes > 0 ? Math.round((passedQuizzes / totalQuizzes) * 100) : 0}%
                        </p>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {[
                        { value: 'all', label: 'Tous', count: quizzes.length },
                        { value: 'passed', label: 'Réussis', count: quizzes.filter(q => q.passed).length },
                        { value: 'pending', label: 'À faire', count: quizzes.filter(q => !q.passed && q.attempts.length === 0).length },
                        { value: 'failed', label: 'À refaire', count: quizzes.filter(q => !q.passed && q.attempts.length > 0).length },
                    ].map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setFilter(tab.value as typeof filter)}
                            className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                                filter === tab.value
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                        >
                            {tab.label} ({tab.count})
                        </button>
                    ))}
                </div>

                {/* Quiz List */}
                <div className="space-y-4">
                    {filteredQuizzes.map((quiz) => (
                        <div
                            key={quiz.id}
                            className={`bg-slate-800/50 border rounded-2xl overflow-hidden ${
                                !quiz.available
                                    ? 'border-white/5 opacity-60'
                                    : quiz.passed
                                    ? 'border-emerald-500/30'
                                    : quiz.attempts.length > 0
                                    ? 'border-amber-500/30'
                                    : 'border-white/10'
                            }`}
                        >
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-white text-lg">{quiz.name}</h3>
                                            {quiz.passed && (
                                                <CheckCircle2 size={18} className="text-emerald-400" />
                                            )}
                                            {!quiz.available && (
                                                <Lock size={16} className="text-slate-500" />
                                            )}
                                        </div>
                                        <Link
                                            href={`/student/theory/${quiz.workshopId}`}
                                            className="text-sm text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1"
                                        >
                                            <BookOpen size={14} />
                                            {quiz.workshopName}
                                        </Link>
                                    </div>

                                    {quiz.bestScore !== undefined && (
                                        <div className="text-right">
                                            <p className={`text-2xl font-bold ${
                                                quiz.passed ? 'text-emerald-400' : 'text-amber-400'
                                            }`}>
                                                {quiz.bestScore}%
                                            </p>
                                            <p className="text-xs text-slate-500">Meilleur score</p>
                                        </div>
                                    )}
                                </div>

                                {/* Quiz Info */}
                                <div className="flex items-center gap-6 mb-4 text-sm text-slate-400">
                                    <span className="flex items-center gap-1">
                                        <Target size={14} />
                                        {quiz.questions} questions
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock size={14} />
                                        {quiz.timeLimit} min max
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <RotateCcw size={14} />
                                        {quiz.attempts.length} tentative{quiz.attempts.length !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                {/* Previous Attempts */}
                                {quiz.attempts.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-xs text-slate-500 mb-2">Historique des tentatives</p>
                                        <div className="flex flex-wrap gap-2">
                                            {quiz.attempts.map((attempt, index) => (
                                                <div
                                                    key={index}
                                                    className={`px-3 py-1 rounded-lg text-xs flex items-center gap-2 ${
                                                        attempt.passed
                                                            ? 'bg-emerald-500/20 text-emerald-400'
                                                            : 'bg-red-500/20 text-red-400'
                                                    }`}
                                                >
                                                    {attempt.passed ? (
                                                        <CheckCircle2 size={12} />
                                                    ) : (
                                                        <XCircle size={12} />
                                                    )}
                                                    <span>{attempt.score}%</span>
                                                    <span className="text-slate-500">&middot;</span>
                                                    <span className="text-slate-500">
                                                        {new Date(attempt.date).toLocaleDateString('fr-FR')}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Action Button */}
                                {quiz.available ? (
                                    <Link
                                        href={`/student/quiz/${quiz.workshopId}`}
                                        className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                                            quiz.passed
                                                ? 'bg-slate-700 text-white hover:bg-slate-600'
                                                : quiz.attempts.length > 0
                                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90'
                                                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:opacity-90'
                                        }`}
                                    >
                                        {quiz.passed ? (
                                            <>
                                                <RotateCcw size={18} />
                                                Refaire le quiz
                                            </>
                                        ) : quiz.attempts.length > 0 ? (
                                            <>
                                                <RotateCcw size={18} />
                                                Réessayer
                                            </>
                                        ) : (
                                            <>
                                                <Play size={18} />
                                                Commencer le quiz
                                            </>
                                        )}
                                    </Link>
                                ) : !quiz.quizId ? (
                                    <div className="w-full py-3 bg-slate-900 text-slate-500 rounded-xl text-center flex items-center justify-center gap-2">
                                        <Lock size={18} />
                                        Quiz indisponible pour cet atelier
                                    </div>
                                ) : (
                                    <div className="w-full py-3 bg-slate-900 text-slate-500 rounded-xl text-center flex items-center justify-center gap-2">
                                        <Lock size={18} />
                                        Terminez l&apos;atelier précédent pour débloquer
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {filteredQuizzes.length === 0 && (
                    <div className="text-center py-12">
                        <Target size={48} className="text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400">Aucun quiz dans cette catégorie</p>
                    </div>
                )}

                {/* Info Box */}
                <div className="mt-8 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <h3 className="text-sm font-medium text-white mb-2">Comment valider un quiz ?</h3>
                    <ul className="text-sm text-slate-400 space-y-1">
                        <li>Un score minimum de <span className="text-emerald-400 font-medium">80%</span> est requis pour valider</li>
                        <li>Vous pouvez repasser les quiz autant de fois que nécessaire</li>
                        <li>Seul le meilleur score est conservé</li>
                        <li>Les quiz validés donnent des XP et débloquent des badges</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

