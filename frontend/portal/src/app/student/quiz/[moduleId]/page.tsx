'use client';

import { useState, useCallback, use, useEffect } from 'react';
import {
    CheckCircle,
    XCircle,
    ArrowRight,
    ArrowLeft,
    Trophy,
    ChevronRight,
    RefreshCw,
    AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../../auth/useAuth';

interface QuizQuestion {
    id: string;
    question: string;
    options: string[];
    explanation?: string;
}

interface QuizDefinition {
    id: string;
    title: string;
    workshopId: string;
    passPercentage: number;
    timeLimitMinutes: number | null;
    questions: QuizQuestion[];
    questionCount: number;
    attempts: number;
}

interface QuizSubmissionReview {
    questionId: string;
    question: string;
    selectedOptionIndex: number | null;
    correctOptionIndex: number;
    isCorrect: boolean;
    explanation?: string;
}

interface QuizSubmissionResult {
    success: boolean;
    passed: boolean;
    passPercentage: number;
    message: string;
    result: {
        percentage: number;
        score: number;
        max_score: number;
        attempt_number: number;
    };
    review: QuizSubmissionReview[];
}

interface WorkshopProgressEntry {
    quiz_id?: string | null;
}

interface WorkshopCatalogEntry {
    id: string;
    quizId?: string | null;
}

export default function QuizPage({ params }: { params: Promise<{ moduleId: string }> }) {
    const { moduleId } = use(params);
    const { isLoading: authLoading } = useAuth(true);

    const [quizDefinition, setQuizDefinition] = useState<QuizDefinition | null>(null);
    const [quizId, setQuizId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submissionResult, setSubmissionResult] = useState<QuizSubmissionResult | null>(null);

    const resolveQuizId = useCallback(async (token: string): Promise<string> => {
        if (moduleId.startsWith('quiz-')) {
            return moduleId;
        }

        const headers = { Authorization: `Bearer ${token}` };

        const progressResponse = await fetch('/api/progress', { headers });
        if (progressResponse.ok) {
            const progressPayload = await progressResponse.json();
            const progressMap: Record<string, WorkshopProgressEntry> = progressPayload.progress || {};
            const foundQuizId = progressMap[moduleId]?.quiz_id;
            if (foundQuizId) {
                return foundQuizId;
            }
        }

        const workshopsResponse = await fetch('/api/progress/workshops', { headers });
        if (workshopsResponse.ok) {
            const workshopsPayload = await workshopsResponse.json();
            const workshops: WorkshopCatalogEntry[] = workshopsPayload.workshops || [];
            const workshop = workshops.find(
                (entry) => entry.id === moduleId || entry.quizId === moduleId
            );
            if (workshop?.quizId) {
                return workshop.quizId;
            }
        }

        throw new Error('Aucun quiz associé à cet atelier.');
    }, [moduleId]);

    const loadQuiz = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Session expirée. Merci de vous reconnecter.');
            }

            const resolvedQuizId = await resolveQuizId(token);
            setQuizId(resolvedQuizId);

            const response = await fetch(`/api/progress/quiz/${resolvedQuizId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error || 'Impossible de charger ce quiz.');
            }

            const body = await response.json();
            if (!body.success || !body.quiz) {
                throw new Error(body.error || 'Quiz indisponible.');
            }

            setQuizDefinition(body.quiz);
            setCurrentQuestion(0);
            setSelectedAnswers([]);
            setShowResults(false);
            setSubmissionResult(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur de chargement du quiz.');
        } finally {
            setLoading(false);
        }
    }, [resolveQuizId]);

    useEffect(() => {
        if (authLoading) return;
        loadQuiz();
    }, [authLoading, loadQuiz]);

    const submitToBackend = useCallback(async () => {
        if (!quizDefinition || !quizId) return;
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Session expirée. Merci de vous reconnecter.');
            }

            const answers = quizDefinition.questions.map((question, index) => ({
                questionId: question.id,
                selectedOptionIndex: selectedAnswers[index] ?? -1
            }));

            const response = await fetch(`/api/progress/quiz/${quizId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workshopId: quizDefinition.workshopId || moduleId,
                    answers
                })
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error || 'Impossible de soumettre ce quiz.');
            }

            const body: QuizSubmissionResult = await response.json();
            if (!body.success) {
                throw new Error(body.message || 'Impossible de soumettre ce quiz.');
            }

            setSubmissionResult(body);
            setShowResults(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors de la soumission du quiz.');
        } finally {
            setSubmitting(false);
        }
    }, [moduleId, quizDefinition, quizId, selectedAnswers]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
                <RefreshCw className="animate-spin w-8 h-8 text-emerald-500" />
            </div>
        );
    }

    if (!quizDefinition) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
                <div className="w-full max-w-2xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
                    <div className="flex items-start gap-3">
                        <AlertCircle size={20} className="text-red-300 mt-0.5" />
                        <div>
                            <h1 className="text-2xl font-bold mb-2">Quiz non disponible</h1>
                            <p className="text-sm text-red-100/90 mb-4">
                                {error || 'Aucun quiz disponible pour ce module.'}
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={loadQuiz}
                                    className="px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-500 transition text-sm font-medium"
                                >
                                    Réessayer
                                </button>
                                <Link
                                    href="/student/quizzes"
                                    className="px-4 py-2 bg-slate-900/60 border border-white/15 rounded-lg hover:bg-slate-800 text-sm"
                                >
                                    Retour aux quiz
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const handleAnswerSelect = (answerIndex: number) => {
        const newAnswers = [...selectedAnswers];
        newAnswers[currentQuestion] = answerIndex;
        setSelectedAnswers(newAnswers);
    };

    const handleNext = () => {
        if (currentQuestion < quizDefinition.questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
            return;
        }
        submitToBackend();
    };

    const handlePrevious = () => {
        if (currentQuestion > 0) setCurrentQuestion(currentQuestion - 1);
    };

    const currentAnswer = selectedAnswers[currentQuestion];
    const scorePercentage = submissionResult?.result?.percentage || 0;
    const passed = Boolean(submissionResult?.passed);

    if (showResults && submissionResult) {
        return (
            <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center space-y-8">
                        {passed ? (
                            <Trophy className="w-24 h-24 text-amber-500 mx-auto animate-bounce" />
                        ) : (
                            <XCircle className="w-24 h-24 text-red-500 mx-auto" />
                        )}
                        <h1 className="text-5xl font-black">
                            {passed ? 'Félicitations !' : 'Presque !'}
                        </h1>
                        <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 space-y-4">
                            <div className={`text-6xl font-black ${passed ? 'text-emerald-500' : 'text-red-400'}`}>
                                {scorePercentage}%
                            </div>
                            <p className="text-xl text-slate-400">
                                {submissionResult.result.score} / {submissionResult.result.max_score} réponses correctes
                            </p>
                            <p className="text-sm text-slate-500">
                                Seuil requis: {submissionResult.passPercentage}%
                            </p>
                        </div>

                        <div className="space-y-4 text-left">
                            <h2 className="text-2xl font-black">Correction</h2>
                            {submissionResult.review.map((review, index) => {
                                const question = quizDefinition.questions[index];
                                const isCorrect = review.isCorrect;
                                const userAnswerLabel = review.selectedOptionIndex !== null && review.selectedOptionIndex >= 0
                                    ? (question?.options?.[review.selectedOptionIndex] || 'Réponse invalide')
                                    : 'Non répondu';
                                const correctAnswerLabel = question?.options?.[review.correctOptionIndex] || 'N/A';

                                return (
                                    <div
                                        key={`${review.questionId}-${index}`}
                                        className={`p-6 rounded-2xl border ${
                                            isCorrect
                                                ? 'bg-emerald-500/10 border-emerald-500/30'
                                                : 'bg-red-500/10 border-red-500/30'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {isCorrect ? (
                                                <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-1" />
                                            ) : (
                                                <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                                            )}
                                            <div className="flex-1 space-y-2">
                                                <p className="font-bold">{question?.question || review.question || 'Question'}</p>
                                                <p className="text-sm text-slate-400">
                                                    Votre réponse:{' '}
                                                    <span className={isCorrect ? 'text-emerald-400' : 'text-red-400'}>
                                                        {userAnswerLabel}
                                                    </span>
                                                </p>
                                                {!isCorrect && (
                                                    <p className="text-sm text-emerald-400">
                                                        Bonne réponse: {correctAnswerLabel}
                                                    </p>
                                                )}
                                                {review.explanation && (
                                                    <p className="text-sm text-slate-500 italic">{review.explanation}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex gap-4 justify-center">
                            <Link
                                href="/student/quizzes"
                                className="px-8 py-4 bg-slate-800 rounded-2xl font-bold hover:bg-slate-700 transition"
                            >
                                Retour aux quiz
                            </Link>
                            <button
                                onClick={() => {
                                    setCurrentQuestion(0);
                                    setSelectedAnswers([]);
                                    setShowResults(false);
                                    setSubmissionResult(null);
                                }}
                                className="px-8 py-4 bg-emerald-600 rounded-2xl font-bold hover:bg-emerald-500 transition"
                            >
                                Réessayer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const question = quizDefinition.questions[currentQuestion];

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
            <div className="max-w-3xl mx-auto space-y-8">
                {error && (
                    <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-200">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Link href="/student" className="hover:text-emerald-400">Mon Parcours</Link>
                        <ChevronRight size={12} />
                        <Link href="/student/quizzes" className="hover:text-emerald-400">Quiz</Link>
                        <ChevronRight size={12} />
                        <span className="text-emerald-400">{quizDefinition.title}</span>
                    </div>
                    <Link
                        href="/student/quizzes"
                        className="text-sm text-slate-400 hover:text-white transition inline-flex items-center gap-1"
                    >
                        <ArrowLeft size={14} /> Retour aux quiz
                    </Link>
                    <h1 className="text-3xl font-black">{quizDefinition.title}</h1>
                    <div className="flex items-center justify-between">
                        <p className="text-slate-400">
                            Question {currentQuestion + 1} / {quizDefinition.questions.length}
                        </p>
                        <div className="flex gap-2">
                            {quizDefinition.questions.map((_, index) => (
                                <div
                                    key={index}
                                    className={`w-2 h-2 rounded-full ${
                                        index === currentQuestion
                                            ? 'bg-emerald-500'
                                            : selectedAnswers[index] !== undefined
                                            ? 'bg-blue-500'
                                            : 'bg-slate-700'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 space-y-6">
                    <h2 className="text-2xl font-bold">{question.question}</h2>
                    <div className="space-y-3">
                        {question.options.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => handleAnswerSelect(index)}
                                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                                    currentAnswer === index
                                        ? 'bg-emerald-500/20 border-emerald-500'
                                        : 'bg-slate-800/50 border-white/10 hover:border-white/30'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                            currentAnswer === index
                                                ? 'border-emerald-500 bg-emerald-500'
                                                : 'border-slate-600'
                                        }`}
                                    >
                                        {currentAnswer === index && <CheckCircle className="w-4 h-4 text-white" />}
                                    </div>
                                    <span>{option}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-between">
                    <button
                        onClick={handlePrevious}
                        disabled={currentQuestion === 0 || submitting}
                        className="px-6 py-3 bg-slate-800 rounded-2xl font-bold hover:bg-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <ArrowLeft className="w-5 h-5" /> Précédent
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={currentAnswer === undefined || submitting}
                        className="px-6 py-3 bg-emerald-600 rounded-2xl font-bold hover:bg-emerald-500 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {submitting ? 'Envoi...' : (currentQuestion === quizDefinition.questions.length - 1 ? 'Terminer' : 'Suivant')}
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
