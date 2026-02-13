'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../../auth/useAuth';
import { CourseRichRenderer } from '../../../../../components/cursus/CourseRichRenderer';
import {
    ArrowLeft, BookOpen, Clock, CheckCircle2, ChevronLeft, ChevronRight,
    FileQuestion, Lightbulb, Award, Sparkles, Code2, AlertCircle
} from 'lucide-react';

interface Chapter {
    id: string;
    title: string;
    content: string;
    key_points: string[];
    chapter_order: number;
    estimated_minutes: number;
}

interface Quiz {
    id: string;
    title: string;
    pass_percentage: number;
    questions: { id: string; question: string; options: string[]; questionOrder: number }[];
}

interface Exercise {
    id: string;
    title: string;
    type: string;
    description: string;
    instructions: string[];
    hints: string[];
    estimated_minutes: number;
}

interface ModuleInfo {
    id: string;
    title: string;
    module_order: number;
    cursus_title: string;
}

interface QuizReviewItem {
    questionId: string;
    correct: boolean;
    correctAnswer: number;
    userAnswer: number;
    explanation?: string;
}

interface QuizSubmissionResult {
    passed: boolean;
    score: number;
    maxScore: number;
    percentage: number;
    passPercentage: number;
    results: QuizReviewItem[];
}

export default function ModuleContentPage() {
    const { isLoading: authLoading } = useAuth(true);
    const params = useParams();
    const cursusId = params?.cursusId as string;
    const moduleId = params?.moduleId as string;

    const [module_, setModule] = useState<ModuleInfo | null>(null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [exercise, setExercise] = useState<Exercise | null>(null);
    const [completedIds, setCompletedIds] = useState<string[]>([]);
    const [activeChapter, setActiveChapter] = useState(0);
    const [activeTab, setActiveTab] = useState<'theory' | 'quiz' | 'exercise'>('theory');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Quiz state
    const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
    const [quizResult, setQuizResult] = useState<QuizSubmissionResult | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Sidebar collapsed on mobile
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const fetch_ = async () => {
            try {
                setError(null);
                setLoading(true);
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('Session expirée. Merci de vous reconnecter.');
                    return;
                }

                const res = await fetch(`/api/cursus/${cursusId}/module/${moduleId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) {
                    const payload = await res.json().catch(() => ({}));
                    throw new Error(payload.error || 'Impossible de charger le module.');
                }

                const data = await res.json();
                if (!data.success) {
                    throw new Error(data.error || 'Impossible de charger le module.');
                }

                const nextChapters: Chapter[] = data.chapters || [];
                const nextQuiz: Quiz | null = data.quiz || null;
                const nextExercise: Exercise | null = data.exercise || null;

                setModule(data.module || null);
                setChapters(nextChapters);
                setQuiz(nextQuiz);
                setExercise(nextExercise);
                setCompletedIds(data.completedChapterIds || []);
                setActiveChapter(0);
                setQuizResult(null);
                setQuizAnswers({});

                if (nextChapters.length === 0) {
                    if (nextQuiz) {
                        setActiveTab('quiz');
                    } else if (nextExercise) {
                        setActiveTab('exercise');
                    }
                }

                if (!data.module || (nextChapters.length === 0 && !nextQuiz && !nextExercise)) {
                    setError('Ce module ne contient pas encore de contenu publiable.');
                }
            } catch (err) {
                console.error('Failed to fetch module', err);
                setError(err instanceof Error ? err.message : 'Erreur de chargement du module.');
            } finally {
                setLoading(false);
            }
        };
        if (authLoading) return;
        if (cursusId && moduleId) fetch_();
    }, [authLoading, cursusId, moduleId]);

    const markChapterComplete = async (chapterId: string) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            await fetch(`/api/cursus/${cursusId}/progress`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ moduleId, chapterId }),
            });
            if (!completedIds.includes(chapterId)) {
                setCompletedIds([...completedIds, chapterId]);
            }
        } catch (err) { console.error(err); }
    };

    const submitQuiz = async () => {
        if (!quiz) return;
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Session expirée. Merci de vous reconnecter.');
                return;
            }

            const answers = quiz.questions.map((_, i) => quizAnswers[i] ?? -1);
            const res = await fetch(`/api/cursus/${cursusId}/quiz/${quiz.id}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers }),
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error || 'Impossible de soumettre le quiz.');
            }
            const data = await res.json();
            if (data.success) setQuizResult(data);
            else throw new Error(data.error || 'Impossible de soumettre le quiz.');
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Erreur lors de la soumission du quiz.');
        }
        finally { setSubmitting(false); }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-white pt-24 pb-16">
                <div className="max-w-5xl mx-auto px-6 animate-pulse space-y-4">
                    <div className="h-4 w-32 bg-slate-800 rounded" />
                    <div className="h-24 bg-slate-900/50 rounded-2xl border border-white/5" />
                    <div className="flex gap-4">
                        <div className="w-56 h-64 bg-slate-900/50 rounded-xl border border-white/5 flex-shrink-0 hidden md:block" />
                        <div className="flex-1 h-96 bg-slate-900/50 rounded-xl border border-white/5" />
                    </div>
                </div>
            </div>
        );
    }

    if (!module_) {
        return (
            <div className="min-h-screen bg-slate-950 text-white pt-24 pb-16">
                <div className="max-w-3xl mx-auto px-6">
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
                        <div className="flex items-start gap-3">
                            <AlertCircle size={18} className="text-red-300 mt-0.5" />
                            <div>
                                <h1 className="text-lg font-semibold text-white mb-2">Module indisponible</h1>
                                <p className="text-sm text-red-100/90 mb-4">
                                    {error || 'Le module demandé est introuvable ou non publié.'}
                                </p>
                                <div className="flex flex-wrap items-center gap-3">
                                    <Link
                                        href={`/student/cursus/${cursusId}`}
                                        className="px-4 py-2 rounded-lg bg-slate-900/60 border border-white/10 text-sm hover:bg-slate-800/80"
                                    >
                                        Retour au cursus
                                    </Link>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="px-4 py-2 rounded-lg bg-emerald-600 text-sm font-medium hover:bg-emerald-500"
                                    >
                                        Réessayer
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const currentChapter = chapters[activeChapter];
    const completedPercent = chapters.length > 0
        ? Math.round((completedIds.length / chapters.length) * 100)
        : 0;

    return (
        <div className="min-h-screen bg-slate-950 text-white pt-24 pb-16">
            <div className="max-w-5xl mx-auto px-6">
                {/* Breadcrumb */}
                <div className="text-xs text-slate-500 mb-4 flex items-center gap-1.5 flex-wrap">
                    <Link href="/" className="hover:text-emerald-400">Accueil</Link>
                    <ChevronRight size={10} />
                    <Link href="/student/cursus" className="hover:text-emerald-400">Cursus</Link>
                    <ChevronRight size={10} />
                    <Link href={`/student/cursus/${cursusId}`} className="hover:text-emerald-400 truncate max-w-[120px]">
                        {module_?.cursus_title || 'Cursus'}
                    </Link>
                    <ChevronRight size={10} />
                    <span className="text-emerald-400 truncate max-w-[150px]">Module {module_?.module_order}</span>
                </div>

                {/* Back */}
                <Link href={`/student/cursus/${cursusId}`} className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-5 transition-colors">
                    <ArrowLeft size={14} /> {module_?.cursus_title || 'Retour'}
                </Link>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm flex items-start gap-2">
                        <AlertCircle size={16} className="mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Module header */}
                <div className="rounded-xl bg-slate-900/50 border border-white/5 p-6 mb-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 text-[10px] font-semibold uppercase tracking-wider">
                                    Module {module_?.module_order}
                                </span>
                            </div>
                            <h1 className="text-xl md:text-2xl font-bold text-white mb-2">
                                {module_?.title}
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 flex-wrap text-xs text-slate-500">
                        <span className="flex items-center gap-1"><BookOpen size={12} /> {chapters.length} chapitres</span>
                        <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-400" /> {completedIds.length}/{chapters.length} lus</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> ~{Math.round(chapters.reduce((s, c) => s + c.estimated_minutes, 0))} min</span>
                    </div>
                    {/* Mini progress bar */}
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-4">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-700"
                            style={{ width: `${completedPercent}%` }}
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 p-1 bg-slate-900/50 rounded-xl border border-white/5 w-fit">
                    {[
                        { key: 'theory' as const, label: 'Théorie', icon: <BookOpen size={14} /> },
                        ...(quiz ? [{ key: 'quiz' as const, label: 'Quiz', icon: <FileQuestion size={14} /> }] : []),
                        ...(exercise ? [{ key: 'exercise' as const, label: 'Exercice', icon: <Code2 size={14} /> }] : []),
                    ].map((tab) => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
                                ? 'bg-white text-slate-950'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* ===== THEORY TAB ===== */}
                {activeTab === 'theory' && currentChapter && (
                    <div className="flex gap-5 items-start">
                        {/* Chapter nav sidebar */}
                        <div className="hidden md:block w-56 flex-shrink-0 sticky top-28">
                            <div className="bg-slate-900/50 rounded-xl border border-white/5 p-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
                                <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-widest mb-3">
                                    Chapitres
                                </p>
                                {chapters.map((ch, idx) => (
                                    <button key={ch.id} onClick={() => setActiveChapter(idx)}
                                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-all mb-0.5 ${idx === activeChapter
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                                            }`}>
                                        {completedIds.includes(ch.id)
                                            ? <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                                            : <span className="w-3.5 h-3.5 rounded-full border border-slate-600 flex-shrink-0" />
                                        }
                                        <span className="truncate">{ch.title}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Mobile sidebar toggle */}
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="md:hidden fixed bottom-6 left-6 z-50 p-3 rounded-xl bg-emerald-600/90 text-white shadow-lg shadow-emerald-500/20 backdrop-blur-sm"
                        >
                            <BookOpen size={18} />
                        </button>

                        {/* Mobile sidebar overlay */}
                        {sidebarOpen && (
                            <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}>
                                <div className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900 border-r border-white/5 p-4 overflow-y-auto"
                                    onClick={e => e.stopPropagation()}>
                                    <p className="text-xs text-slate-500 font-semibold mb-3">Chapitres</p>
                                    {chapters.map((ch, idx) => (
                                        <button key={ch.id}
                                            onClick={() => { setActiveChapter(idx); setSidebarOpen(false); }}
                                            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm mb-1 ${idx === activeChapter ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400'
                                                }`}>
                                            {completedIds.includes(ch.id)
                                                ? <CheckCircle2 size={14} className="text-emerald-400" />
                                                : <span className="w-3.5 h-3.5 rounded-full border border-slate-600" />
                                            }
                                            <span className="truncate">{ch.title}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Chapter content */}
                        <div className="flex-1 min-w-0">
                            <div className="bg-slate-900/50 rounded-xl border border-white/5 p-6 md:p-8 mb-5">
                                <div className="flex items-start justify-between gap-4 mb-1">
                                    <h2 className="text-lg md:text-xl font-bold text-white">
                                        {currentChapter.title}
                                    </h2>
                                    <span className="text-xs text-slate-500 flex items-center gap-1 flex-shrink-0 mt-1">
                                        <Clock size={11} /> ~{currentChapter.estimated_minutes} min
                                    </span>
                                </div>
                                <div className="h-px bg-white/5 my-4" />

                                {/* Rendered Markdown */}
                                <CourseRichRenderer content={currentChapter.content} />
                            </div>

                            {/* Key points */}
                            {currentChapter.key_points && currentChapter.key_points.length > 0 && (
                                <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-5 mb-5">
                                    <p className="text-emerald-400 text-sm font-semibold mb-3 flex items-center gap-2">
                                        <Lightbulb size={15} /> Points clés
                                    </p>
                                    <ul className="space-y-1.5 text-sm text-slate-400 leading-relaxed">
                                        {currentChapter.key_points.map((kp, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <span className="text-emerald-500 mt-1.5">&#8226;</span>
                                                <span>{kp}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Navigation + mark complete */}
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <button
                                    disabled={activeChapter === 0}
                                    onClick={() => setActiveChapter(activeChapter - 1)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm border transition-colors ${activeChapter === 0
                                        ? 'border-white/5 text-slate-600 cursor-not-allowed'
                                        : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20 bg-slate-900/50'
                                        }`}>
                                    <ChevronLeft size={14} /> Précédent
                                </button>

                                <button
                                    onClick={() => {
                                        markChapterComplete(currentChapter.id);
                                        if (activeChapter < chapters.length - 1) setActiveChapter(activeChapter + 1);
                                    }}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${completedIds.includes(currentChapter.id)
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/15'
                                        }`}>
                                    {completedIds.includes(currentChapter.id)
                                        ? <><CheckCircle2 size={14} /> Lu</>
                                        : 'Marquer comme lu ✓'}
                                </button>

                                <button
                                    disabled={activeChapter === chapters.length - 1}
                                    onClick={() => setActiveChapter(activeChapter + 1)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm border transition-colors ${activeChapter === chapters.length - 1
                                        ? 'border-white/5 text-slate-600 cursor-not-allowed'
                                        : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20 bg-slate-900/50'
                                        }`}>
                                    Suivant <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'theory' && !currentChapter && (
                    <div className="bg-slate-900/50 rounded-xl border border-white/5 p-6 md:p-8">
                        <div className="flex items-start gap-3">
                            <AlertCircle size={18} className="text-amber-400 mt-0.5" />
                            <div>
                                <h2 className="text-lg font-semibold text-white mb-2">Contenu théorique indisponible</h2>
                                <p className="text-sm text-slate-400 mb-4">
                                    Aucun chapitre n&apos;est disponible pour ce module.
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                    {quiz && (
                                        <button
                                            onClick={() => setActiveTab('quiz')}
                                            className="px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm"
                                        >
                                            Aller au quiz
                                        </button>
                                    )}
                                    {exercise && (
                                        <button
                                            onClick={() => setActiveTab('exercise')}
                                            className="px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-sm"
                                        >
                                            Aller à l&apos;exercice
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== QUIZ TAB ===== */}
                {activeTab === 'quiz' && quiz && (
                    <div className="bg-slate-900/50 rounded-xl border border-white/5 p-6 md:p-8">
                        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <FileQuestion size={20} className="text-violet-400" /> {quiz.title}
                        </h2>

                        {quizResult ? (
                            <div>
                                {/* Result banner */}
                                <div className={`rounded-xl p-6 mb-6 border ${quizResult.passed
                                    ? 'bg-emerald-500/5 border-emerald-500/15'
                                    : 'bg-rose-500/5 border-rose-500/15'
                                    }`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        {quizResult.passed
                                            ? <Award size={24} className="text-emerald-400" />
                                            : <FileQuestion size={24} className="text-rose-400" />}
                                        <span className={`text-xl font-bold ${quizResult.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {quizResult.passed ? 'Réussi ! 🎉' : 'Non réussi'}
                                        </span>
                                    </div>
                                    <p className="text-slate-400 text-sm">
                                        Score : <strong className="text-white">{quizResult.score}/{quizResult.maxScore}</strong> ({quizResult.percentage}%) — Seuil : {quizResult.passPercentage}%
                                    </p>
                                </div>

                                {/* Question results */}
                                <div className="space-y-3">
                                    {quizResult.results?.map((r, i) => (
                                        <div key={i} className={`rounded-lg p-4 border ${r.correct ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'
                                            }`}>
                                            <p className="text-sm text-white mb-1">
                                                {r.correct ? '\u2705' : '\u274C'} {quiz.questions[i]?.question}
                                            </p>
                                            {r.explanation && (
                                                <p className="text-xs text-slate-500 italic flex items-start gap-1">
                                                    <Lightbulb size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
                                                    {r.explanation}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <button onClick={() => { setQuizResult(null); setQuizAnswers({}); }}
                                    className="mt-6 px-4 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/15 transition-colors">
                                    Retenter le quiz
                                </button>
                            </div>
                        ) : (
                            <div>
                                {quiz.questions.map((q, qIdx) => (
                                    <div key={q.id} className="mb-6 pb-5 border-b border-white/5 last:border-0">
                                        <p className="text-white text-sm font-medium mb-3">
                                            <span className="text-slate-500 mr-2">{qIdx + 1}.</span>
                                            {q.question}
                                        </p>
                                        <div className="space-y-2">
                                            {q.options.map((opt, oIdx) => (
                                                <label key={oIdx}
                                                    className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg text-sm transition-all border ${quizAnswers[qIdx] === oIdx
                                                        ? 'bg-blue-500/10 border-blue-500/20 text-white'
                                                        : 'bg-slate-800/30 border-white/5 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                                                        }`}>
                                                    <input type="radio" name={`q-${qIdx}`}
                                                        checked={quizAnswers[qIdx] === oIdx}
                                                        onChange={() => setQuizAnswers({ ...quizAnswers, [qIdx]: oIdx })}
                                                        className="accent-blue-500"
                                                    />
                                                    {opt}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                <button onClick={submitQuiz} disabled={submitting}
                                    className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${submitting
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/15'
                                        }`}>
                                    {submitting ? 'Envoi...' : 'Soumettre le quiz'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'quiz' && !quiz && (
                    <div className="bg-slate-900/50 rounded-xl border border-white/5 p-6 md:p-8">
                        <p className="text-sm text-slate-400">Aucun quiz n&apos;est disponible pour ce module.</p>
                    </div>
                )}

                {/* ===== EXERCISE TAB ===== */}
                {activeTab === 'exercise' && exercise && (
                    <div className="bg-slate-900/50 rounded-xl border border-white/5 p-6 md:p-8">
                        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                            <Code2 size={20} className="text-cyan-400" /> {exercise.title}
                        </h2>
                        <div className="flex gap-3 mb-5 flex-wrap">
                            <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 text-xs font-medium border border-cyan-500/15">
                                {exercise.type}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock size={11} /> ~{exercise.estimated_minutes} min
                            </span>
                        </div>

                        <p className="text-slate-300 text-sm leading-relaxed mb-6">
                            {exercise.description}
                        </p>

                        {/* Instructions */}
                        <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                            <Sparkles size={14} className="text-amber-400" /> Instructions
                        </h3>
                        <div className="space-y-2 mb-6">
                            {exercise.instructions.map((inst, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30 border border-white/5 text-sm text-slate-300">
                                    <span className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 font-semibold flex items-center justify-center flex-shrink-0 text-xs">
                                        {i + 1}
                                    </span>
                                    <span className="leading-relaxed">{inst}</span>
                                </div>
                            ))}
                        </div>

                        {/* Hints */}
                        {exercise.hints && exercise.hints.length > 0 && (
                            <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-5">
                                <p className="text-amber-400 text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Lightbulb size={15} /> Indices
                                </p>
                                <ul className="space-y-1.5 text-sm text-slate-400 leading-relaxed">
                                    {exercise.hints.map((h, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-amber-500 mt-1.5">&#8226;</span>
                                            <span>{h}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'exercise' && !exercise && (
                    <div className="bg-slate-900/50 rounded-xl border border-white/5 p-6 md:p-8">
                        <p className="text-sm text-slate-400">Aucun exercice n&apos;est disponible pour ce module.</p>
                    </div>
                )}
            </div>

        </div>
    );
}
