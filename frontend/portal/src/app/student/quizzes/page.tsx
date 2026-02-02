'use client';

import { useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import Link from 'next/link';
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Clock,
    Play,
    RotateCcw,
    Trophy,
    Target,
    BookOpen,
    Lock
} from 'lucide-react';

interface Quiz {
    id: string;
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

interface QuizAttempt {
    date: string;
    score: number;
    passed: boolean;
    timeSpent: number;
}

const mockQuizzes: Quiz[] = [
    {
        id: 'quiz-01',
        name: 'Quiz Module 1',
        workshopId: 'intro',
        workshopName: 'Introduction à la Monétique',
        questions: 10,
        timeLimit: 15,
        attempts: [
            { date: '2024-01-10', score: 70, passed: false, timeSpent: 12 },
            { date: '2024-01-11', score: 92, passed: true, timeSpent: 10 },
        ],
        bestScore: 92,
        passed: true,
        available: true
    },
    {
        id: 'quiz-02',
        name: 'Quiz Module 2',
        workshopId: 'iso8583',
        workshopName: 'Protocole ISO 8583',
        questions: 15,
        timeLimit: 20,
        attempts: [
            { date: '2024-01-14', score: 65, passed: false, timeSpent: 18 },
        ],
        bestScore: 65,
        passed: false,
        available: true
    },
    {
        id: 'quiz-03',
        name: 'Quiz Module 3',
        workshopId: 'hsm-keys',
        workshopName: 'Gestion des Clés HSM',
        questions: 12,
        timeLimit: 18,
        attempts: [],
        passed: false,
        available: true
    },
    {
        id: 'quiz-04',
        name: 'Quiz Module 4',
        workshopId: '3ds-flow',
        workshopName: '3D Secure v2',
        questions: 10,
        timeLimit: 15,
        attempts: [],
        passed: false,
        available: false
    },
];

export default function StudentQuizzesPage() {
    const { isLoading } = useAuth(true);
    const [filter, setFilter] = useState<'all' | 'passed' | 'pending' | 'failed'>('all');

    // Stats
    const totalQuizzes = mockQuizzes.length;
    const passedQuizzes = mockQuizzes.filter(q => q.passed).length;
    const totalAttempts = mockQuizzes.reduce((acc, q) => acc + q.attempts.length, 0);
    const averageScore = mockQuizzes
        .filter(q => q.bestScore !== undefined)
        .reduce((acc, q, _, arr) => acc + (q.bestScore || 0) / arr.length, 0);

    // Filter quizzes
    const filteredQuizzes = mockQuizzes.filter(quiz => {
        if (filter === 'all') return true;
        if (filter === 'passed') return quiz.passed;
        if (filter === 'pending') return !quiz.passed && quiz.attempts.length === 0;
        if (filter === 'failed') return !quiz.passed && quiz.attempts.length > 0;
        return true;
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pt-24 pb-12">
            <div className="max-w-4xl mx-auto px-6">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/student"
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
                    >
                        <ArrowLeft size={18} />
                        Retour au dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-white mb-2">Mes Quiz</h1>
                    <p className="text-slate-400">
                        Testez vos connaissances et validez vos acquis
                    </p>
                </div>

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
                        { value: 'all', label: 'Tous', count: mockQuizzes.length },
                        { value: 'passed', label: 'Réussis', count: mockQuizzes.filter(q => q.passed).length },
                        { value: 'pending', label: 'À faire', count: mockQuizzes.filter(q => !q.passed && q.attempts.length === 0).length },
                        { value: 'failed', label: 'À refaire', count: mockQuizzes.filter(q => !q.passed && q.attempts.length > 0).length },
                    ].map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setFilter(tab.value as any)}
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
                                            href={`/workshops/${quiz.workshopId}`}
                                            className="text-sm text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-1"
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
                                                    <span className="text-slate-500">•</span>
                                                    <span className="text-slate-500">{attempt.date}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Action Button */}
                                {quiz.available ? (
                                    <Link
                                        href={`/quiz?module=${quiz.workshopId.replace('-', '')}`}
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
                                ) : (
                                    <div className="w-full py-3 bg-slate-900 text-slate-500 rounded-xl text-center flex items-center justify-center gap-2">
                                        <Lock size={18} />
                                        Terminez l'atelier pour débloquer
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
                <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                    <h3 className="text-sm font-medium text-white mb-2">Comment valider un quiz ?</h3>
                    <ul className="text-sm text-slate-400 space-y-1">
                        <li>• Un score minimum de <span className="text-emerald-400 font-medium">80%</span> est requis pour valider</li>
                        <li>• Vous pouvez repasser les quiz autant de fois que nécessaire</li>
                        <li>• Seul le meilleur score est conservé</li>
                        <li>• Les quiz validés donnent des XP et débloquent des badges</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
