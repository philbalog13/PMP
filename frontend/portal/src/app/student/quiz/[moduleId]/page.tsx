'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
    CheckCircle, XCircle, ArrowRight, ArrowLeft,
    Trophy, Clock, RefreshCw, AlertCircle, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../auth/useAuth';
import { NotionSkeleton, NotionBadge, NotionProgress } from '@shared/components/notion';

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
    result: { percentage: number; score: number; max_score: number; attempt_number: number };
    review: QuizSubmissionReview[];
}

interface WorkshopProgressEntry { quiz_id?: string | null }
interface WorkshopCatalogEntry  { id: string; quizId?: string | null }

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function QuizPage() {
    const params = useParams<{ moduleId: string }>();
    const moduleId = decodeURIComponent(String(params?.moduleId || '')).trim();
    const { isLoading: authLoading } = useAuth(true);

    const [quizDefinition, setQuizDefinition] = useState<QuizDefinition | null>(null);
    const [quizId, setQuizId]       = useState<string | null>(null);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState<string | null>(null);

    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
    const [showResults, setShowResults]         = useState(false);
    const [submitting, setSubmitting]           = useState(false);
    const [submissionResult, setSubmissionResult] = useState<QuizSubmissionResult | null>(null);
    const [showStickyBar, setShowStickyBar]     = useState(false);
    const heroRef = useRef<HTMLDivElement>(null);

    const resolveQuizId = useCallback(async (token: string): Promise<string> => {
        if (!moduleId) throw new Error('Identifiant de module manquant.');
        if (moduleId.startsWith('quiz-')) return moduleId;
        const headers = { Authorization: `Bearer ${token}` };
        const progressRes = await fetch('/api/progress', { headers });
        if (progressRes.ok) {
            const progressPayload = await progressRes.json();
            const progressMap: Record<string, WorkshopProgressEntry> = progressPayload.progress || {};
            const found = progressMap[moduleId]?.quiz_id;
            if (found) return found;
        }
        const workshopsRes = await fetch('/api/progress/workshops', { headers });
        if (workshopsRes.ok) {
            const workshopsPayload = await workshopsRes.json();
            const workshops: WorkshopCatalogEntry[] = workshopsPayload.workshops || [];
            const workshop = workshops.find(e => e.id === moduleId || e.quizId === moduleId);
            if (workshop?.quizId) return workshop.quizId;
        }
        throw new Error('Aucun quiz associé à cet atelier.');
    }, [moduleId]);

    const loadQuiz = useCallback(async () => {
        try {
            setLoading(true); setError(null);
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Session expirée. Merci de vous reconnecter.');
            const resolvedQuizId = await resolveQuizId(token);
            setQuizId(resolvedQuizId);
            const res = await fetch(`/api/progress/quiz/${resolvedQuizId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || 'Impossible de charger ce quiz.');
            }
            const body = await res.json();
            if (!body.success || !body.quiz) throw new Error(body.error || 'Quiz indisponible.');
            const normalizedQuiz: QuizDefinition = {
                ...body.quiz,
                questions: Array.isArray(body.quiz.questions) ? body.quiz.questions : [],
                questionCount: Number.isFinite(body.quiz.questionCount) ? body.quiz.questionCount : (Array.isArray(body.quiz.questions) ? body.quiz.questions.length : 0),
                attempts: Number.isFinite(body.quiz.attempts) ? body.quiz.attempts : 0,
            };
            setQuizDefinition(normalizedQuiz);
            setCurrentQuestion(0); setSelectedAnswers([]); setShowResults(false); setSubmissionResult(null);
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

    useEffect(() => {
        const handleScroll = () => {
            if (heroRef.current) setShowStickyBar(heroRef.current.getBoundingClientRect().bottom < 0);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const submitToBackend = useCallback(async () => {
        if (!quizDefinition || !quizId) return;
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Session expirée.');
            const answers = quizDefinition.questions.map((q, i) => ({
                questionId: q.id,
                selectedOptionIndex: selectedAnswers[i] ?? -1,
            }));
            const res = await fetch(`/api/progress/quiz/${quizId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ workshopId: quizDefinition.workshopId || moduleId, answers }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || 'Impossible de soumettre ce quiz.');
            }
            const body: QuizSubmissionResult = await res.json();
            if (!body.success) throw new Error(body.message || 'Impossible de soumettre ce quiz.');
            setSubmissionResult(body);
            setShowResults(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors de la soumission du quiz.');
        } finally {
            setSubmitting(false);
        }
    }, [moduleId, quizDefinition, quizId, selectedAnswers]);

    /* ── Loading ── */
    if (authLoading || loading) {
        return (
            <div style={{ padding: '40px 24px', maxWidth: '720px', margin: '0 auto' }}>
                <NotionSkeleton type="line" style={{ width: '180px', marginBottom: '24px' }} />
                <NotionSkeleton type="stat" style={{ height: '80px', marginBottom: '24px' }} />
                <NotionSkeleton type="card" style={{ height: '200px', marginBottom: '16px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <NotionSkeleton key={i} type="card" style={{ height: '52px' }} />
                    ))}
                </div>
            </div>
        );
    }

    /* ── Error / No quiz ── */
    if (!quizDefinition) {
        return (
            <div style={{ padding: '80px 24px', display: 'flex', justifyContent: 'center' }}>
                <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                    <AlertCircle size={36} style={{ color: 'var(--n-danger)', margin: '0 auto 16px' }} />
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--n-text-primary)', marginBottom: '8px' }}>
                        Quiz indisponible
                    </h2>
                    <p style={{ fontSize: '14px', color: 'var(--n-text-tertiary)', marginBottom: '24px' }}>
                        {error || 'Aucun quiz disponible pour ce module.'}
                    </p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button onClick={loadQuiz} style={{
                            padding: '8px 18px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'var(--n-accent)',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}>
                            <RefreshCw size={13} />
                            Réessayer
                        </button>
                        <Link href="/student/quizzes" style={{
                            padding: '8px 18px',
                            borderRadius: '6px',
                            border: '1px solid var(--n-border)',
                            background: 'var(--n-bg-primary)',
                            color: 'var(--n-text-secondary)',
                            fontSize: '13px',
                            fontWeight: 500,
                            textDecoration: 'none',
                        }}>
                            Retour aux quiz
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const questions      = Array.isArray(quizDefinition.questions) ? quizDefinition.questions : [];
    const totalQuestions = questions.length;

    /* ── No questions ── */
    if (totalQuestions === 0) {
        return (
            <div style={{ padding: '80px 24px', display: 'flex', justifyContent: 'center' }}>
                <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                    <AlertCircle size={36} style={{ color: 'var(--n-warning)', margin: '0 auto 16px' }} />
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--n-text-primary)', marginBottom: '8px' }}>
                        Quiz vide
                    </h2>
                    <p style={{ fontSize: '14px', color: 'var(--n-text-tertiary)', marginBottom: '24px' }}>
                        Ce quiz est actuellement vide. Merci de réessayer plus tard.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button onClick={loadQuiz} style={{
                            padding: '8px 18px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'var(--n-accent)',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}>
                            Recharger
                        </button>
                        <Link href="/student/quizzes" style={{
                            padding: '8px 18px',
                            borderRadius: '6px',
                            border: '1px solid var(--n-border)',
                            background: 'var(--n-bg-primary)',
                            color: 'var(--n-text-secondary)',
                            fontSize: '13px',
                            fontWeight: 500,
                            textDecoration: 'none',
                        }}>
                            Retour aux quiz
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    /* ── RESULTS SCREEN ── */
    if (showResults && submissionResult) {
        const scorePercentage = submissionResult.result?.percentage || 0;
        const passed = Boolean(submissionResult.passed);
        return (
            <div style={{ minHeight: 'calc(100vh - 48px)', background: 'var(--n-bg-primary)' }}>
                {/* Result header */}
                <div style={{
                    borderBottom: '1px solid var(--n-border)',
                    padding: '40px 24px 32px',
                    textAlign: 'center',
                    background: passed ? 'var(--n-success-bg)' : 'var(--n-danger-bg)',
                }}>
                    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            color: 'var(--n-text-tertiary)',
                            marginBottom: '20px',
                        }}>
                            <Link href="/student/quizzes" style={{ color: 'var(--n-text-tertiary)', textDecoration: 'none' }}>Quiz</Link>
                            <ChevronRight size={12} />
                            <span style={{ color: passed ? 'var(--n-success)' : 'var(--n-danger)' }}>Résultats</span>
                        </div>

                        <div style={{ fontSize: '48px', marginBottom: '12px', lineHeight: 1 }}>{passed ? '🏆' : '🎯'}</div>
                        <h1 style={{
                            fontSize: '28px',
                            fontWeight: 700,
                            color: 'var(--n-text-primary)',
                            marginBottom: '8px',
                            letterSpacing: '-0.01em',
                        }}>
                            {passed ? 'Félicitations !' : 'Presque !'}
                        </h1>
                        <div style={{
                            fontSize: '52px',
                            fontWeight: 800,
                            color: passed ? 'var(--n-success)' : 'var(--n-danger)',
                            letterSpacing: '-0.03em',
                            marginBottom: '6px',
                            lineHeight: 1,
                        }}>
                            {scorePercentage}%
                        </div>
                        <p style={{ fontSize: '14px', color: 'var(--n-text-secondary)', marginBottom: '4px' }}>
                            {submissionResult.result.score} / {submissionResult.result.max_score} réponses correctes
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--n-text-tertiary)', marginBottom: '24px' }}>
                            Seuil requis : {submissionResult.passPercentage}%
                            {submissionResult.result.attempt_number > 0 && ` · Tentative #${submissionResult.result.attempt_number}`}
                        </p>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Link href="/student/quizzes" style={{
                                padding: '9px 20px',
                                borderRadius: '6px',
                                border: '1px solid var(--n-border)',
                                background: 'var(--n-bg-primary)',
                                color: 'var(--n-text-secondary)',
                                fontSize: '13px',
                                fontWeight: 500,
                                textDecoration: 'none',
                            }}>
                                ← Retour aux quiz
                            </Link>
                            <button
                                onClick={() => {
                                    setCurrentQuestion(0); setSelectedAnswers([]);
                                    setShowResults(false); setSubmissionResult(null);
                                }}
                                style={{
                                    padding: '9px 20px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: 'var(--n-accent)',
                                    color: '#fff',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Réessayer le quiz
                            </button>
                        </div>
                    </div>
                </div>

                {/* Detailed correction */}
                <div style={{ maxWidth: '720px', margin: '0 auto', padding: '28px 24px 48px' }}>
                    <div style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'var(--n-text-tertiary)',
                        marginBottom: '16px',
                    }}>Correction détaillée</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {submissionResult.review.map((review, index) => {
                            const question = questions[index];
                            const isCorrect = review.isCorrect;
                            const userAnswerLabel = review.selectedOptionIndex !== null && review.selectedOptionIndex >= 0
                                ? (question?.options?.[review.selectedOptionIndex] || 'Réponse invalide')
                                : 'Non répondu';
                            const correctAnswerLabel = question?.options?.[review.correctOptionIndex] || 'N/A';
                            return (
                                <div
                                    key={`${review.questionId}-${index}`}
                                    style={{
                                        padding: '16px',
                                        borderRadius: '8px',
                                        background: 'var(--n-bg-primary)',
                                        border: `1px solid ${isCorrect ? 'var(--n-success-border)' : 'var(--n-danger-border)'}`,
                                        borderLeft: `3px solid ${isCorrect ? 'var(--n-success)' : 'var(--n-danger)'}`,
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                                        {isCorrect
                                            ? <CheckCircle size={18} style={{ color: 'var(--n-success)', flexShrink: 0, marginTop: '1px' }} />
                                            : <XCircle size={18} style={{ color: 'var(--n-danger)', flexShrink: 0, marginTop: '1px' }} />
                                        }
                                        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--n-text-primary)', lineHeight: 1.4, margin: 0 }}>
                                            {question?.question || review.question}
                                        </p>
                                    </div>
                                    <div style={{ marginLeft: '28px' }}>
                                        <p style={{ fontSize: '13px', color: 'var(--n-text-secondary)', marginBottom: '4px' }}>
                                            Votre réponse :{' '}
                                            <span style={{ color: isCorrect ? 'var(--n-success)' : 'var(--n-danger)', fontWeight: 600 }}>
                                                {userAnswerLabel}
                                            </span>
                                        </p>
                                        {!isCorrect && (
                                            <p style={{ fontSize: '13px', color: 'var(--n-text-secondary)', marginBottom: '4px' }}>
                                                Bonne réponse :{' '}
                                                <span style={{ color: 'var(--n-success)', fontWeight: 600 }}>
                                                    {correctAnswerLabel}
                                                </span>
                                            </p>
                                        )}
                                        {review.explanation && (
                                            <p style={{
                                                fontSize: '12px',
                                                fontStyle: 'italic',
                                                color: 'var(--n-text-tertiary)',
                                                lineHeight: 1.5,
                                                marginTop: '6px',
                                                paddingLeft: '10px',
                                                borderLeft: '2px solid var(--n-border)',
                                            }}>
                                                {review.explanation}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    /* ── IN-PROGRESS ── */
    const boundedIdx    = Math.min(Math.max(currentQuestion, 0), totalQuestions - 1);
    const question      = questions[boundedIdx];
    const currentAnswer = selectedAnswers[currentQuestion];
    const progressPct   = Math.round(((currentQuestion + 1) / totalQuestions) * 100);

    const handleAnswerSelect = (answerIndex: number) => {
        const newAnswers = [...selectedAnswers];
        newAnswers[currentQuestion] = answerIndex;
        setSelectedAnswers(newAnswers);
    };

    const handleNext = () => {
        if (currentQuestion < totalQuestions - 1) {
            setCurrentQuestion(currentQuestion + 1);
        } else {
            submitToBackend();
        }
    };

    const handlePrevious = () => {
        if (currentQuestion > 0) setCurrentQuestion(currentQuestion - 1);
    };

    return (
        <div style={{ minHeight: 'calc(100vh - 48px)', background: 'var(--n-bg-primary)' }}>

            {/* ── STICKY PROGRESS BAR ── */}
            <div style={{
                position: 'fixed',
                top: '48px',
                left: 0,
                right: 0,
                zIndex: 40,
                transform: showStickyBar ? 'translateY(0)' : 'translateY(-100%)',
                transition: 'transform 0.25s ease',
            }}>
                <div style={{
                    background: 'var(--n-bg-primary)',
                    borderBottom: '1px solid var(--n-border)',
                    padding: '8px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--n-text-tertiary)', flexShrink: 0 }}>Quiz</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--n-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {quizDefinition.title}
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--n-accent)', marginLeft: '8px', flexShrink: 0 }}>
                                Q{currentQuestion + 1}/{totalQuestions}
                            </span>
                        </div>
                        <NotionProgress value={progressPct} max={100} variant="accent" size="default" />
                    </div>
                </div>
            </div>

            {/* ── PAGE HEADER ── */}
            <div ref={heroRef} style={{
                borderBottom: '1px solid var(--n-border)',
                padding: '32px 24px 24px',
                background: 'var(--n-bg-primary)',
            }}>
                <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                    {/* Breadcrumb */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: 'var(--n-text-tertiary)',
                        marginBottom: '14px',
                    }}>
                        <Link href="/student/quizzes" style={{ color: 'var(--n-text-tertiary)', textDecoration: 'none' }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'var(--n-text-primary)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--n-text-tertiary)')}>
                            Quiz
                        </Link>
                        <ChevronRight size={12} />
                        <span style={{ color: 'var(--n-text-secondary)' }}>{quizDefinition.title}</span>
                    </div>

                    {/* Type label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Trophy size={14} style={{ color: 'var(--n-accent)' }} />
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: 'var(--n-accent)',
                        }}>Quiz d'évaluation</span>
                    </div>

                    <h1 style={{
                        fontSize: '22px',
                        fontWeight: 700,
                        color: 'var(--n-text-primary)',
                        marginBottom: '14px',
                        letterSpacing: '-0.01em',
                    }}>{quizDefinition.title}</h1>

                    {/* Meta */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                        <NotionBadge variant="default">
                            {totalQuestions} questions
                        </NotionBadge>
                        <NotionBadge variant="accent">
                            Seuil {quizDefinition.passPercentage}%
                        </NotionBadge>
                        {quizDefinition.timeLimitMinutes && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--n-text-secondary)' }}>
                                <Clock size={12} style={{ color: 'var(--n-text-tertiary)' }} />
                                {quizDefinition.timeLimitMinutes} min
                            </span>
                        )}
                        {quizDefinition.attempts > 0 && (
                            <span style={{ fontSize: '12px', color: 'var(--n-text-tertiary)' }}>
                                {quizDefinition.attempts} tentative(s)
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── QUESTION CONTENT ── */}
            <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px 24px 48px' }}>

                {/* Error */}
                {error && (
                    <div style={{
                        padding: '12px 16px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '13px',
                        background: 'var(--n-danger-bg)',
                        border: '1px solid var(--n-danger-border)',
                        color: 'var(--n-danger)',
                        marginBottom: '16px',
                    }}>
                        <AlertCircle size={15} style={{ flexShrink: 0 }} />
                        {error}
                    </div>
                )}

                {/* Question tracker dots */}
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--n-border)',
                    background: 'var(--n-bg-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '14px',
                }}>
                    <p style={{ fontSize: '13px', color: 'var(--n-text-secondary)', margin: 0 }}>
                        Question{' '}
                        <span style={{ color: 'var(--n-text-primary)', fontWeight: 700 }}>{currentQuestion + 1}</span>
                        {' '}sur {totalQuestions}
                    </p>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        {questions.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentQuestion(index)}
                                style={{
                                    width: '9px',
                                    height: '9px',
                                    borderRadius: '50%',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: index === currentQuestion
                                        ? 'var(--n-accent)'
                                        : selectedAnswers[index] !== undefined
                                        ? 'var(--n-success)'
                                        : 'var(--n-border-strong)',
                                    padding: 0,
                                    transition: 'background 0.15s',
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Question card */}
                <div style={{
                    borderRadius: '8px',
                    background: 'var(--n-bg-primary)',
                    border: '1px solid var(--n-accent-border)',
                    borderLeft: '3px solid var(--n-accent)',
                    marginBottom: '14px',
                }}>
                    {/* Question text */}
                    <div style={{ padding: '20px 20px 16px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '14px',
                            color: 'var(--n-text-tertiary)',
                        }}>
                            <div style={{ height: '1px', flex: 1, background: 'var(--n-border)' }} />
                            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                Répondez à la question ci-dessous
                            </span>
                            <div style={{ height: '1px', flex: 1, background: 'var(--n-border)' }} />
                        </div>
                        <h2 style={{
                            fontSize: '17px',
                            fontWeight: 700,
                            color: 'var(--n-text-primary)',
                            lineHeight: 1.4,
                            letterSpacing: '-0.01em',
                            margin: 0,
                        }}>
                            {question.question}
                        </h2>
                    </div>

                    {/* Options */}
                    <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {question.options.map((option, index) => {
                            const selected = currentAnswer === index;
                            return (
                                <button
                                    key={index}
                                    onClick={() => handleAnswerSelect(index)}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 14px',
                                        borderRadius: '6px',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        border: `2px solid ${selected ? 'var(--n-accent-border)' : 'var(--n-border)'}`,
                                        background: selected ? 'var(--n-accent-light)' : 'var(--n-bg-primary)',
                                        transition: 'all 0.1s',
                                    }}
                                    onMouseEnter={e => {
                                        if (!selected) {
                                            e.currentTarget.style.borderColor = 'var(--n-border-strong)';
                                            e.currentTarget.style.background = 'var(--n-bg-hover)';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (!selected) {
                                            e.currentTarget.style.borderColor = 'var(--n-border)';
                                            e.currentTarget.style.background = 'var(--n-bg-primary)';
                                        }
                                    }}
                                >
                                    <div style={{
                                        flexShrink: 0,
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        fontWeight: 800,
                                        background: selected ? 'var(--n-accent)' : 'var(--n-bg-elevated)',
                                        color: selected ? '#fff' : 'var(--n-text-tertiary)',
                                        transition: 'all 0.1s',
                                    }}>
                                        {OPTION_LETTERS[index] || index + 1}
                                    </div>
                                    <span style={{
                                        fontSize: '14px',
                                        fontWeight: selected ? 500 : 400,
                                        color: selected ? 'var(--n-text-primary)' : 'var(--n-text-secondary)',
                                        lineHeight: 1.4,
                                    }}>
                                        {option}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Navigation */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                    <button
                        onClick={handlePrevious}
                        disabled={currentQuestion === 0 || submitting}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '9px 18px',
                            borderRadius: '6px',
                            border: '1px solid var(--n-border)',
                            background: 'var(--n-bg-primary)',
                            color: 'var(--n-text-secondary)',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: currentQuestion === 0 || submitting ? 'not-allowed' : 'pointer',
                            opacity: currentQuestion === 0 || submitting ? 0.4 : 1,
                        }}
                    >
                        <ArrowLeft size={16} /> Précédent
                    </button>

                    {/* Progress bar */}
                    <div style={{ flex: 1, maxWidth: '120px' }}>
                        <NotionProgress value={progressPct} max={100} variant="accent" size="default" />
                    </div>

                    <button
                        onClick={handleNext}
                        disabled={currentAnswer === undefined || submitting}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '9px 18px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'var(--n-accent)',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: currentAnswer === undefined || submitting ? 'not-allowed' : 'pointer',
                            opacity: currentAnswer === undefined || submitting ? 0.4 : 1,
                        }}
                    >
                        {submitting ? (
                            <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Envoi…</>
                        ) : currentQuestion === totalQuestions - 1 ? (
                            <><Trophy size={14} /> Terminer</>
                        ) : (
                            <>Suivant <ArrowRight size={14} /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
