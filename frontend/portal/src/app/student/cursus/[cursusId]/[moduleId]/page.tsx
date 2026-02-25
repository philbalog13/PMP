'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../../auth/useAuth';
import { CourseRichRenderer } from '../../../../../components/cursus/CourseRichRenderer';
import { CourseCard, CoursePageShell, CoursePill } from '@/components/course/CoursePageShell';
import {
    ArrowLeft, BookOpen, Clock, CheckCircle2, ChevronLeft, ChevronRight,
    FileQuestion, Lightbulb, Award, Sparkles, Code2, AlertCircle, RefreshCw, Beaker
} from 'lucide-react';

interface Chapter {
    id: string;
    title: string;
    content: string;
    key_points: string[];
    chapter_order: number;
    estimated_minutes: number;
}

interface QuizQuestion {
    id: string;
    question: string;
    options: string[];
    questionOrder: number;
}

interface Quiz {
    id: string;
    title: string;
    pass_percentage: number;
    // PostgreSQL json_agg with LEFT JOIN returns null when no rows match
    questions: QuizQuestion[] | null;
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

/* Maps module ID keywords to CTF category filter to create cross-links */
const MODULE_CTF_MAP: Record<string, { category: string; label: string }> = {
    'hsm': { category: 'HSM_ATTACK', label: 'HSM & Cryptographie' },
    'crypto': { category: 'CRYPTO_WEAKNESS', label: 'Crypto' },
    '3ds': { category: '3DS_BYPASS', label: '3-D Secure' },
    '3dsecure': { category: '3DS_BYPASS', label: '3-D Secure' },
    'iso8583': { category: 'ISO8583_MANIPULATION', label: 'ISO 8583' },
    'iso7816': { category: 'PIN_CRACKING', label: 'PIN & Smartcard' },
    'nfc': { category: 'REPLAY_ATTACK', label: 'Replay NFC' },
    'fraude': { category: 'FRAUD_CNP', label: 'Fraude CNP' },
    'antifraude': { category: 'FRAUD_CNP', label: 'Fraude CNP' },
    'audit': { category: 'PRIVILEGE_ESCALATION', label: 'Audit & Privesc' },
    'switch': { category: 'ISO8583_MANIPULATION', label: 'ISO 8583' },
    'token': { category: 'CRYPTO_WEAKNESS', label: 'Crypto & Tokens' },
    'pcipts': { category: 'PIN_CRACKING', label: 'PIN & PTS' },
    'pcidss': { category: 'PRIVILEGE_ESCALATION', label: 'PCI DSS' },
    'messaging': { category: 'ISO8583_MANIPULATION', label: 'ISO 8583' },
};

function getCtfCategory(moduleId: string): { category: string; label: string } | null {
    const lower = (moduleId || '').toLowerCase();
    for (const [keyword, val] of Object.entries(MODULE_CTF_MAP)) {
        if (lower.includes(keyword)) return val;
    }
    return null;
}

export default function ModuleContentPage() {
    const { isLoading: authLoading } = useAuth(true);
    const params = useParams();
    const cursusId = params?.cursusId as string;
    const moduleId = params?.moduleId as string;

    const [module_, setModule] = useState<ModuleInfo | null>(null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [activeExercise, setActiveExercise] = useState(0);
    const [completedIds, setCompletedIds] = useState<string[]>([]);
    const [activeChapter, setActiveChapter] = useState(0);
    const [activeTab, setActiveTab] = useState<'theory' | 'quiz' | 'exercise'>('theory');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Reader bar state
    const [scrollProgress, setScrollProgress] = useState(0);
    const hasAutoMarked = useRef(false);

    // Quiz state
    const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
    const [quizResult, setQuizResult] = useState<QuizSubmissionResult | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Exercise auto-correction state
    const [exerciseAnswer, setExerciseAnswer] = useState('');
    const [exerciseResult, setExerciseResult] = useState<{
        score: number; feedback: string; matchedConcepts: string[]; missingConcepts: string[];
        attemptCount: number; solutionEligible: boolean;
    } | null>(null);
    const [exerciseSolution, setExerciseSolution] = useState<string | null>(null);
    const [loadingSolution, setLoadingSolution] = useState(false);

    const markChapterComplete = useCallback(async (chapterId: string) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            await fetch(`/api/cursus/${cursusId}/progress`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ moduleId, chapterId }),
            });

            setCompletedIds((prev) => (prev.includes(chapterId) ? prev : [...prev, chapterId]));
        } catch (err) {
            console.error(err);
        }
    }, [cursusId, moduleId]);

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
                const nextExercises: Exercise[] = Array.isArray(data.exercises)
                    ? data.exercises
                    : (data.exercise ? [data.exercise] : []);

                setModule(data.module || null);
                setChapters(nextChapters);
                setQuiz(nextQuiz);
                setExercises(nextExercises);
                setActiveExercise(0);
                setCompletedIds(data.completedChapterIds || []);
                setActiveChapter(0);
                setQuizResult(null);
                setQuizAnswers({});

                if (nextChapters.length === 0) {
                    if (nextQuiz) {
                        setActiveTab('quiz');
                    } else if (nextExercises.length > 0) {
                        setActiveTab('exercise');
                    }
                }

                if (!data.module || (nextChapters.length === 0 && !nextQuiz && nextExercises.length === 0)) {
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

    // Scroll progress tracking
    useEffect(() => {
        const handleScroll = () => {
            const scrolled = window.scrollY;
            const total = document.documentElement.scrollHeight - window.innerHeight;
            setScrollProgress(total > 0 ? Math.min(100, Math.round((scrolled / total) * 100)) : 0);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Reset auto-mark flag when chapter changes
    useEffect(() => {
        hasAutoMarked.current = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [activeChapter]);

    // Auto-mark chapter complete at 90% scroll
    useEffect(() => {
        if (
            activeTab === 'theory' &&
            scrollProgress >= 90 &&
            chapters[activeChapter] &&
            !completedIds.includes(chapters[activeChapter].id) &&
            !hasAutoMarked.current
        ) {
            hasAutoMarked.current = true;
            void markChapterComplete(chapters[activeChapter].id);
        }
    }, [scrollProgress, activeChapter, activeTab, chapters, completedIds, markChapterComplete]);

    useEffect(() => {
        setExerciseAnswer('');
        setExerciseResult(null);
        setExerciseSolution(null);
    }, [activeExercise, exercises.length]);

    const submitQuiz = async () => {
        if (!quiz) return;
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Session expirée. Merci de vous reconnecter.');
                return;
            }

            const answers = (quiz.questions ?? []).filter((q): q is QuizQuestion => q !== null).map((_, i) => quizAnswers[i] ?? -1);
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

    const submitExercise = async () => {
        const currentExercise = exercises[activeExercise];
        if (!currentExercise || !exerciseAnswer.trim()) return;
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await fetch(`/api/cursus/${cursusId}/exercise/${currentExercise.id}/submit`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ answerText: exerciseAnswer }),
            });
            if (!res.ok) throw new Error('Submit failed');
            const data = await res.json();
            if (data.success) setExerciseResult(data);
        } catch (err) { console.error(err); }
        finally { setSubmitting(false); }
    };

    const loadExerciseSolution = async () => {
        const currentExercise = exercises[activeExercise];
        if (!currentExercise) return;
        setLoadingSolution(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await fetch(`/api/cursus/${cursusId}/exercise/${currentExercise.id}/solution`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Not eligible');
            const data = await res.json();
            if (data.success) setExerciseSolution(data.solution);
        } catch { /* not eligible yet */ }
        finally { setLoadingSolution(false); }
    };

    if (authLoading || loading) {
        return (
            <CoursePageShell
                title="Chargement du module…"
                description="Récupération du contenu et de votre progression."
                icon={<BookOpen className="h-8 w-8 text-emerald-300" />}
                crumbs={[
                    { label: 'Mon Parcours', href: '/student' },
                    { label: 'Cursus', href: '/student/cursus' },
                    { label: 'Module' },
                ]}
                backHref="/student/cursus"
                backLabel="Retour aux cursus"
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

    if (!module_) {
        return (
            <CoursePageShell
                title="Module indisponible"
                description={error || 'Le module demandé est introuvable ou non publié.'}
                icon={<AlertCircle className="h-8 w-8 text-red-200" />}
                crumbs={[
                    { label: 'Mon Parcours', href: '/student' },
                    { label: 'Cursus', href: '/student/cursus' },
                    { label: 'Erreur' },
                ]}
                backHref="/student/cursus"
                backLabel="Retour aux cursus"
            >
                <CourseCard className="border border-red-500/20 bg-red-500/5">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 text-red-300" />
                        <div className="min-w-0">
                            <h2 className="text-lg font-semibold text-white">Impossible de charger le module</h2>
                            <p className="mt-1 text-sm text-red-100/90">
                                {error || 'Le module demandé est introuvable ou non publié.'}
                            </p>
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <Link
                                    href={`/student/cursus/${cursusId}`}
                                    className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 text-sm font-semibold hover:bg-slate-900/60"
                                >
                                    Retour au cursus
                                </Link>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500"
                                >
                                    Réessayer
                                </button>
                            </div>
                        </div>
                    </div>
                </CourseCard>
            </CoursePageShell>
        );
    }

    const currentChapter = chapters[activeChapter];
    const currentExercise = exercises[activeExercise] || null;
    const completedPercent = chapters.length > 0
        ? Math.round((completedIds.length / chapters.length) * 100)
        : 0;
    const totalMinutes = Math.round(chapters.reduce((sum, chapter) => sum + (chapter.estimated_minutes || 0), 0));
    const aside = (
        <div className="space-y-4">
            <CourseCard className="p-2">
                <p className="px-3 pt-3 pb-2 text-[11px] text-slate-500 font-semibold uppercase tracking-[0.2em]">
                    Mode
                </p>
                <div className="space-y-1 px-2 pb-2">
                    {[
                        { key: 'theory' as const, label: 'Théorie', icon: <BookOpen size={16} /> },
                        ...(quiz ? [{ key: 'quiz' as const, label: 'Quiz', icon: <FileQuestion size={16} /> }] : []),
                        ...(exercises.length > 0 ? [{ key: 'exercise' as const, label: 'Exercice', icon: <Code2 size={16} /> }] : []),
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${activeTab === tab.key
                                    ? 'bg-white text-slate-950 border-white/10'
                                    : 'bg-transparent border-transparent text-slate-300 hover:bg-white/5 hover:border-white/10'
                                }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
            </CourseCard>

            {activeTab === 'theory' && chapters.length > 0 && (
                <CourseCard className="p-4">
                    <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-[0.2em] mb-3">
                        Chapitres
                    </p>
                    <div className="lg:hidden">
                        <select
                            value={activeChapter}
                            onChange={(e) => setActiveChapter(Number(e.target.value))}
                            className="w-full rounded-xl bg-slate-950/40 border border-white/10 px-3 py-2 text-sm text-slate-200"
                        >
                            {chapters.map((ch, idx) => (
                                <option key={ch.id} value={idx}>
                                    {idx + 1}. {ch.title}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="hidden lg:block space-y-1">
                        {chapters.map((ch, idx) => (
                            <button
                                key={ch.id}
                                onClick={() => setActiveChapter(idx)}
                                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm transition-colors border ${idx === activeChapter
                                        ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20'
                                        : 'bg-transparent text-slate-300 border-transparent hover:bg-white/5 hover:border-white/10'
                                    }`}
                            >
                                {completedIds.includes(ch.id) ? (
                                    <CheckCircle2 size={16} className="text-emerald-300 flex-shrink-0" />
                                ) : (
                                    <span className="h-3.5 w-3.5 rounded-full border border-slate-600 flex-shrink-0" />
                                )}
                                <span className="truncate">{ch.title}</span>
                            </button>
                        ))}
                    </div>
                </CourseCard>
            )}

            {/* CTF Cross-link */}
            {(() => {
                const ctfInfo = getCtfCategory(moduleId);
                return ctfInfo ? (
                    <CourseCard className="p-4">
                        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-[0.2em] mb-3">
                            Pratique
                        </p>
                        <Link
                            href={`/student/ctf?category=${encodeURIComponent(ctfInfo.category)}`}
                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/15 hover:border-emerald-500/30 transition"
                        >
                            <Beaker className="h-4 w-4 text-emerald-300" />
                            Challenges CTF – {ctfInfo.label}
                        </Link>
                        <p className="mt-2 text-xs text-slate-500">
                            Mettez en pratique ces concepts dans des labs interactifs.
                        </p>
                    </CourseCard>
                ) : null;
            })()}
        </div>
    );

    return (
        <CoursePageShell
            title={module_?.title || 'Module'}
            description={module_?.cursus_title || 'Cursus'}
            icon={<BookOpen className="h-8 w-8 text-emerald-300" />}
            crumbs={[
                { label: 'Mon Parcours', href: '/student' },
                { label: 'Cursus', href: '/student/cursus' },
                { label: module_?.cursus_title || 'Cursus', href: `/student/cursus/${cursusId}` },
                { label: `Module ${module_?.module_order ?? ''} — ${module_?.title || ''}`.replace(/—\s*$/, '').trim() },
            ]}
            backHref={`/student/cursus/${cursusId}`}
            backLabel="Retour au cursus"
            meta={
                <>
                    <CoursePill tone="emerald">Module {module_?.module_order}</CoursePill>
                    <CoursePill tone="slate">
                        <BookOpen className="h-4 w-4 text-slate-300" />
                        {chapters.length} chapitres
                    </CoursePill>
                    <CoursePill tone="slate">
                        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                        {completedIds.length}/{chapters.length} lus
                    </CoursePill>
                    <CoursePill tone="slate">
                        <Clock className="h-4 w-4 text-slate-300" />
                        ~{totalMinutes} min
                    </CoursePill>
                </>
            }
            headerFooter={
                chapters.length > 0 ? (
                    <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 bg-slate-800/70 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-700"
                                style={{ width: `${completedPercent}%` }}
                            />
                        </div>
                        <span className="text-xs font-mono text-emerald-200">{completedPercent}%</span>
                    </div>
                ) : null
            }
            actions={
                <Link
                    href={`/student/cursus/${cursusId}`}
                    className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 text-sm font-semibold inline-flex items-center gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Cursus
                </Link>
            }
            aside={aside}
        >
            <div className="space-y-6">
                {error && (
                    <CourseCard className="border border-red-500/20 bg-red-500/5 p-4 md:p-5">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 h-5 w-5 text-red-300" />
                            <p className="text-sm text-red-100/90">{error}</p>
                        </div>
                    </CourseCard>
                )}

                {/* ===== THEORY TAB ===== */}
                {activeTab === 'theory' && currentChapter && (() => {
                    const wordCount = (currentChapter.content || '').split(/\s+/).filter(Boolean).length;
                    const minutesRemaining = Math.max(1, Math.ceil((wordCount * Math.max(0, 100 - scrollProgress) / 100) / 200));
                    return (
                    <div className="min-w-0">
                        {/* Fixed reading progress bar */}
                        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-slate-900/50">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-200"
                                style={{ width: `${scrollProgress}%` }}
                            />
                        </div>

                        <CourseCard className="p-6 md:p-8 mb-5">
                            <div className="flex items-start justify-between gap-4 mb-1">
                                <h2 className="text-lg md:text-xl font-bold text-white">
                                    {currentChapter.title}
                                </h2>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                        <Clock size={11} /> ~{minutesRemaining} min restantes
                                    </span>
                                    <div className="w-20 h-1 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${scrollProgress}%` }} />
                                    </div>
                                </div>
                            </div>
                            <div className="h-px bg-white/5 my-4" />

                            {/* Rendered Markdown */}
                            <CourseRichRenderer content={currentChapter.content} />
                        </CourseCard>

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
                    );
                })()}

                {activeTab === 'theory' && !currentChapter && (
                    <CourseCard className="p-6 md:p-8">
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
                                    {exercises.length > 0 && (
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
                    </CourseCard>
                )}

                {/* ===== QUIZ TAB ===== */}
                {activeTab === 'quiz' && quiz && (
                    <CourseCard className="p-6 md:p-8">
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
                                    {quizResult.results.map((r, i) => {
                                        const validQuestions = (quiz.questions ?? []).filter((q): q is QuizQuestion => q !== null);
                                        return (
                                            <div key={i} className={`rounded-lg p-4 border ${r.correct ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
                                                <p className="text-sm text-white mb-1">
                                                    {r.correct ? '\u2705' : '\u274C'} {validQuestions[i]?.question}
                                                </p>
                                                {r.explanation && (
                                                    <p className="text-xs text-slate-500 italic flex items-start gap-1">
                                                        <Lightbulb size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
                                                        {r.explanation}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <button onClick={() => { setQuizResult(null); setQuizAnswers({}); }}
                                    className="mt-6 px-4 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/15 transition-colors">
                                    Retenter le quiz
                                </button>
                            </div>
                        ) : (
                            <div>
                                {(() => {
                                    const validQuestions = (quiz.questions ?? []).filter((q): q is QuizQuestion => q !== null);
                                    return (
                                        <>
                                            {validQuestions.length === 0 && (
                                                <div className="rounded-lg p-4 border border-amber-500/20 bg-amber-500/5 mb-6">
                                                    <p className="text-sm text-amber-300">Aucune question disponible pour ce quiz.</p>
                                                </div>
                                            )}
                                            {validQuestions.map((q, qIdx) => (
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
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </CourseCard>
                )}

                {activeTab === 'quiz' && !quiz && (
                    <CourseCard className="p-6 md:p-8">
                        <p className="text-sm text-slate-400">Aucun quiz n&apos;est disponible pour ce module.</p>
                    </CourseCard>
                )}

                {/* ===== EXERCISE TAB ===== */}
                {activeTab === 'exercise' && currentExercise && (
                    <CourseCard className="p-6 md:p-8">
                        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                            <Code2 size={20} className="text-cyan-400" /> {currentExercise.title}
                        </h2>
                        {exercises.length > 1 && (
                            <div className="mb-4 flex flex-wrap items-center gap-2">
                                {exercises.map((ex, idx) => (
                                    <button
                                        key={ex.id}
                                        onClick={() => setActiveExercise(idx)}
                                        className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                                            idx === activeExercise
                                                ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-200'
                                                : 'bg-slate-900/50 border-white/10 text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        Exercice {idx + 1}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="flex gap-3 mb-5 flex-wrap">
                            <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 text-xs font-medium border border-cyan-500/15">
                                {currentExercise.type}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock size={11} /> ~{currentExercise.estimated_minutes} min
                            </span>
                        </div>

                        <p className="text-slate-300 text-sm leading-relaxed mb-6">
                            {currentExercise.description}
                        </p>

                        {/* Instructions */}
                        <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                            <Sparkles size={14} className="text-amber-400" /> Instructions
                        </h3>
                        <div className="space-y-2 mb-6">
                            {currentExercise.instructions.map((inst, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30 border border-white/5 text-sm text-slate-300">
                                    <span className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 font-semibold flex items-center justify-center flex-shrink-0 text-xs">
                                        {i + 1}
                                    </span>
                                    <span className="leading-relaxed">{inst}</span>
                                </div>
                            ))}
                        </div>

                        {/* Hints */}
                        {currentExercise.hints && currentExercise.hints.length > 0 && (
                            <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-5 mb-5">
                                <p className="text-amber-400 text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Lightbulb size={15} /> Indices
                                </p>
                                <ul className="space-y-1.5 text-sm text-slate-400 leading-relaxed">
                                    {currentExercise.hints.map((h, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-amber-500 mt-1.5">&#8226;</span>
                                            <span>{h}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Answer submission form */}
                        <div className="mt-4">
                            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                                <Award size={14} className="text-violet-400" /> Votre réponse
                            </h3>
                            <textarea
                                value={exerciseAnswer}
                                onChange={(e) => setExerciseAnswer(e.target.value)}
                                placeholder="Rédigez votre analyse ici…"
                                rows={6}
                                className="w-full px-4 py-3 rounded-xl bg-slate-950/40 border border-white/10 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 resize-y"
                            />
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                                <button
                                    onClick={() => void submitExercise()}
                                    disabled={submitting || !exerciseAnswer.trim()}
                                    className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-2"
                                >
                                    {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    {submitting ? 'Correction…' : 'Soumettre'}
                                </button>
                                {(exerciseResult?.solutionEligible) && (
                                    <button
                                        onClick={() => void loadExerciseSolution()}
                                        disabled={loadingSolution}
                                        className="px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm font-semibold hover:bg-amber-500/15 inline-flex items-center gap-2"
                                    >
                                        <Lightbulb size={14} />
                                        {loadingSolution ? 'Chargement…' : 'Voir le corrigé'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Auto-correction result */}
                        {exerciseResult && (
                            <div className={`mt-5 rounded-2xl border p-5 ${exerciseResult.score >= 80 ? 'bg-emerald-500/10 border-emerald-500/20' : exerciseResult.score >= 50 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="font-bold text-white">Score : {exerciseResult.score}/100</span>
                                    <span className="text-xs text-slate-400">{exerciseResult.attemptCount} tentative{exerciseResult.attemptCount > 1 ? 's' : ''}</span>
                                </div>
                                <p className="text-sm text-slate-200 mb-3">{exerciseResult.feedback}</p>
                                {exerciseResult.matchedConcepts.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        <span className="text-xs text-emerald-400 font-semibold">✓</span>
                                        {exerciseResult.matchedConcepts.map((kw) => (
                                            <span key={kw} className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs">{kw}</span>
                                        ))}
                                    </div>
                                )}
                                {exerciseResult.missingConcepts.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="text-xs text-rose-400 font-semibold">À approfondir :</span>
                                        {exerciseResult.missingConcepts.map((kw) => (
                                            <span key={kw} className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 text-xs">{kw}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Sample solution */}
                        {exerciseSolution && (
                            <div className="mt-5 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
                                <p className="text-violet-400 text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Lightbulb size={14} /> Corrigé
                                </p>
                                <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{exerciseSolution}</div>
                            </div>
                        )}
                    </CourseCard>
                )}

                {activeTab === 'exercise' && !currentExercise && (
                    <CourseCard className="p-6 md:p-8">
                        <p className="text-sm text-slate-400">Aucun exercice n&apos;est disponible pour ce module.</p>
                    </CourseCard>
                )}
            </div>
        </CoursePageShell>
    );
}
