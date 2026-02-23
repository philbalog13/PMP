'use client';

import { useState, useCallback, useEffect } from 'react';
import {
    CheckCircle,
    XCircle,
    ArrowRight,
    ArrowLeft,
    Trophy,
    Clock,
    RefreshCw,
    AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../auth/useAuth';
import { CourseCard, CoursePageShell, CoursePill } from '@/components/course/CoursePageShell';

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

export default function QuizPage() {
    const params = useParams<{ moduleId: string }>();
    const moduleId = decodeURIComponent(String(params?.moduleId || '')).trim();
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
        if (!moduleId) {
            throw new Error('Identifiant de module manquant.');
        }

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

            const normalizedQuiz: QuizDefinition = {
                ...body.quiz,
                questions: Array.isArray(body.quiz.questions) ? body.quiz.questions : [],
                questionCount: Number.isFinite(body.quiz.questionCount)
                    ? body.quiz.questionCount
                    : (Array.isArray(body.quiz.questions) ? body.quiz.questions.length : 0),
                attempts: Number.isFinite(body.quiz.attempts) ? body.quiz.attempts : 0
            };

            setQuizDefinition(normalizedQuiz);
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
            <CoursePageShell
                title="Chargement du quiz…"
                description="Préparation des questions et de votre session."
                icon={<Trophy className="h-8 w-8 text-emerald-300" />}
                crumbs={[
                    { label: 'Mon Parcours', href: '/student' },
                    { label: 'Quiz', href: '/student/quizzes' },
                    { label: 'Chargement' },
                ]}
                backHref="/student/quizzes"
                backLabel="Retour aux quiz"
            >
                <CourseCard className="p-8">
                    <div className="flex items-center gap-3 text-slate-300">
                        <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
                        <span className="text-sm">Chargement…</span>
                    </div>
                    <div className="mt-6 space-y-3 animate-pulse">
                        <div className="h-3 w-1/2 rounded bg-slate-800/70" />
                        <div className="h-3 w-full rounded bg-slate-800/50" />
                        <div className="h-3 w-5/6 rounded bg-slate-800/40" />
                    </div>
                </CourseCard>
            </CoursePageShell>
        );
    }

    if (!quizDefinition) {
        return (
            <CoursePageShell
                title="Quiz non disponible"
                description={error || 'Aucun quiz disponible pour ce module.'}
                icon={<AlertCircle className="h-8 w-8 text-red-200" />}
                crumbs={[
                    { label: 'Mon Parcours', href: '/student' },
                    { label: 'Quiz', href: '/student/quizzes' },
                    { label: 'Erreur' },
                ]}
                backHref="/student/quizzes"
                backLabel="Retour aux quiz"
            >
                <CourseCard className="border border-red-500/20 bg-red-500/5">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 text-red-300" />
                        <div className="min-w-0">
                            <h2 className="text-lg font-semibold text-white">Impossible de charger le quiz</h2>
                            <p className="mt-1 text-sm text-red-100/90">
                                {error || 'Aucun quiz disponible pour ce module.'}
                            </p>
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <button
                                    onClick={loadQuiz}
                                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
                                >
                                    Réessayer
                                </button>
                                <Link
                                    href="/student/quizzes"
                                    className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 text-sm font-semibold hover:bg-slate-900/60"
                                >
                                    Retour aux quiz
                                </Link>
                            </div>
                        </div>
                    </div>
                </CourseCard>
            </CoursePageShell>
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
            <CoursePageShell
                title={quizDefinition.title}
                description="Résultats du quiz"
                icon={<Trophy className="h-8 w-8 text-emerald-300" />}
                crumbs={[
                    { label: 'Mon Parcours', href: '/student' },
                    { label: 'Quiz', href: '/student/quizzes' },
                    { label: quizDefinition.title },
                ]}
                backHref="/student/quizzes"
                backLabel="Retour aux quiz"
                meta={
                    <>
                        <CoursePill tone={passed ? 'emerald' : 'rose'}>
                            {passed ? 'Réussi' : 'Non réussi'}
                        </CoursePill>
                        <CoursePill tone="slate">{scorePercentage}%</CoursePill>
                    </>
                }
            >
                <div className="max-w-5xl mx-auto">
                    <div className="text-center space-y-8">
                        {passed ? (
                            <Trophy className="w-24 h-24 text-amber-500 mx-auto animate-bounce" />
                        ) : (
                            <XCircle className="w-24 h-24 text-red-500 mx-auto" />
                        )}
                        <h1 className="text-5xl font-black">
                            {passed ? 'Félicitations !' : 'Presque !'}
                        </h1>
                        <CourseCard className="rounded-3xl p-7 md:p-8 space-y-4">
                            <div className={`text-6xl font-black ${passed ? 'text-emerald-400' : 'text-rose-300'}`}>
                                {scorePercentage}%
                            </div>
                            <p className="text-lg md:text-xl text-slate-300">
                                {submissionResult.result.score} / {submissionResult.result.max_score} réponses correctes
                            </p>
                            <p className="text-sm text-slate-500">
                                Seuil requis: {submissionResult.passPercentage}%
                            </p>
                        </CourseCard>

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
                                                <p className="text-base text-slate-300">
                                                    Votre réponse:{' '}
                                                    <span className={isCorrect ? 'text-emerald-400' : 'text-red-400'}>
                                                        {userAnswerLabel}
                                                    </span>
                                                </p>
                                                {!isCorrect && (
                                                    <p className="text-base text-emerald-300">
                                                        Bonne réponse: {correctAnswerLabel}
                                                    </p>
                                                )}
                                                {review.explanation && (
                                                    <p className="text-base text-slate-400 italic">{review.explanation}</p>
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
            </CoursePageShell>
        );
    }

    const questions = Array.isArray(quizDefinition.questions) ? quizDefinition.questions : [];
    const totalQuestions = questions.length;
    const progressPercent = totalQuestions > 0
        ? Math.round(((currentQuestion + 1) / totalQuestions) * 100)
        : 0;

    if (totalQuestions === 0) {
        return (
            <CoursePageShell
                title={quizDefinition.title}
                description="Quiz indisponible"
                icon={<AlertCircle className="h-8 w-8 text-red-200" />}
                crumbs={[
                    { label: 'Mon Parcours', href: '/student' },
                    { label: 'Quiz', href: '/student/quizzes' },
                    { label: quizDefinition.title },
                ]}
                backHref="/student/quizzes"
                backLabel="Retour aux quiz"
            >
                <CourseCard className="border border-red-500/20 bg-red-500/5 p-6 md:p-8">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 text-red-300" />
                        <div className="min-w-0">
                            <h2 className="text-lg font-semibold text-white">Aucune question disponible</h2>
                            <p className="mt-1 text-sm text-red-100/90">
                                Ce quiz est actuellement vide. Merci de réessayer plus tard.
                            </p>
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <button
                                    onClick={loadQuiz}
                                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
                                >
                                    Recharger
                                </button>
                                <Link
                                    href="/student/quizzes"
                                    className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 text-sm font-semibold hover:bg-slate-900/60"
                                >
                                    Retour aux quiz
                                </Link>
                            </div>
                        </div>
                    </div>
                </CourseCard>
            </CoursePageShell>
        );
    }

    const boundedQuestionIndex = Math.min(Math.max(currentQuestion, 0), totalQuestions - 1);
    const question = questions[boundedQuestionIndex];

    return (
        <CoursePageShell
            title={quizDefinition.title}
            description="Quiz"
            icon={<Trophy className="h-8 w-8 text-emerald-300" />}
            crumbs={[
                { label: 'Mon Parcours', href: '/student' },
                { label: 'Quiz', href: '/student/quizzes' },
                { label: quizDefinition.title },
            ]}
            backHref="/student/quizzes"
            backLabel="Retour aux quiz"
            meta={
                <>
                    <CoursePill tone="violet">Seuil {quizDefinition.passPercentage}%</CoursePill>
                    <CoursePill tone="slate">{quizDefinition.questionCount} questions</CoursePill>
                    {quizDefinition.timeLimitMinutes ? (
                        <CoursePill tone="slate">
                            <Clock className="h-4 w-4 text-slate-300" />
                            {quizDefinition.timeLimitMinutes} min
                        </CoursePill>
                    ) : null}
                </>
            }
            headerFooter={
                <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 bg-slate-800/70 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-700"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <span className="text-xs font-mono text-emerald-200">{progressPercent}%</span>
                </div>
            }
        >
            <div className="max-w-5xl mx-auto space-y-6">
                {error && (
                    <CourseCard className="border border-red-500/20 bg-red-500/5 p-4 md:p-5">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 h-5 w-5 text-red-300" />
                            <p className="text-sm text-red-100/90">{error}</p>
                        </div>
                    </CourseCard>
                )}

                <CourseCard className="p-5 md:p-6">
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-slate-300 text-base">
                            Question <span className="text-white font-semibold">{currentQuestion + 1}</span> / {totalQuestions}
                        </p>
                        <div className="flex gap-2">
                            {questions.map((_, index) => (
                                <div
                                    key={index}
                                    className={`w-2 h-2 rounded-full ${
                                        index === currentQuestion
                                            ? 'bg-emerald-500'
                                            : selectedAnswers[index] !== undefined
                                            ? 'bg-cyan-500'
                                            : 'bg-slate-700'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </CourseCard>

                <CourseCard className="p-6 md:p-8">
                    <h2 className="text-2xl font-black tracking-tight text-white">{question.question}</h2>
                    <div className="mt-6 space-y-3">
                        {question.options.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => handleAnswerSelect(index)}
                                className={`w-full p-4 rounded-2xl border-2 text-left transition-colors ${
                                    currentAnswer === index
                                        ? 'bg-emerald-500/15 border-emerald-500/60'
                                        : 'bg-slate-950/30 border-white/10 hover:border-white/25'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                            currentAnswer === index
                                                ? 'border-emerald-400 bg-emerald-500'
                                                : 'border-slate-600'
                                        }`}
                                    >
                                        {currentAnswer === index && <CheckCircle className="w-4 h-4 text-white" />}
                                    </div>
                                    <span className="text-slate-200">{option}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </CourseCard>

                <div className="flex justify-between">
                    <button
                        onClick={handlePrevious}
                        disabled={currentQuestion === 0 || submitting}
                        className="px-6 py-3 bg-slate-900/40 border border-white/10 rounded-2xl font-bold hover:bg-slate-900/60 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <ArrowLeft className="w-5 h-5" /> Précédent
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={currentAnswer === undefined || submitting}
                        className="px-6 py-3 bg-emerald-600 rounded-2xl font-bold hover:bg-emerald-500 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {submitting ? 'Envoi…' : (currentQuestion === totalQuestions - 1 ? 'Terminer' : 'Suivant')}
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </CoursePageShell>
    );
}
