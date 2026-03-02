'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../../auth/useAuth';
import { CourseRichRenderer } from '../../../../../components/cursus/CourseRichRenderer';
import {
    ArrowLeft, BookOpen, Clock, CheckCircle2, ChevronRight, ChevronDown, ChevronUp,
    FileQuestion, Lightbulb, Award, Sparkles, Code2, AlertCircle, RefreshCw,
    Check, Terminal, Star
} from 'lucide-react';
import { NotionCard, NotionBadge, NotionProgress, NotionSkeleton, NotionEmptyState } from '@shared/components/notion';

/* ── Interfaces ─────────────────────────────────────────────────────────── */

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

/* ── CTF cross-link map ──────────────────────────────────────────────────── */

const MODULE_CTF_MAP: Record<string, { category: string; label: string }> = {
    'hsm':       { category: 'HSM_ATTACK',           label: 'HSM & Cryptographie' },
    'crypto':    { category: 'CRYPTO_WEAKNESS',      label: 'Crypto' },
    '3ds':       { category: '3DS_BYPASS',           label: '3-D Secure' },
    '3dsecure':  { category: '3DS_BYPASS',           label: '3-D Secure' },
    'iso8583':   { category: 'ISO8583_MANIPULATION', label: 'ISO 8583' },
    'iso7816':   { category: 'PIN_CRACKING',         label: 'PIN & Smartcard' },
    'nfc':       { category: 'REPLAY_ATTACK',        label: 'Replay NFC' },
    'fraude':    { category: 'FRAUD_CNP',            label: 'Fraude CNP' },
    'antifraude':{ category: 'FRAUD_CNP',            label: 'Fraude CNP' },
    'audit':     { category: 'PRIVILEGE_ESCALATION', label: 'Audit & Privesc' },
    'switch':    { category: 'ISO8583_MANIPULATION', label: 'ISO 8583' },
    'token':     { category: 'CRYPTO_WEAKNESS',      label: 'Crypto & Tokens' },
    'pcipts':    { category: 'PIN_CRACKING',         label: 'PIN & PTS' },
    'pcidss':    { category: 'PRIVILEGE_ESCALATION', label: 'PCI DSS' },
    'messaging': { category: 'ISO8583_MANIPULATION', label: 'ISO 8583' },
};

function getCtfCategory(moduleId: string) {
    const lower = (moduleId || '').toLowerCase();
    for (const [kw, val] of Object.entries(MODULE_CTF_MAP)) {
        if (lower.includes(kw)) return val;
    }
    return null;
}

const MODULE_EMOJIS = ['💳', '🔐', '🛡️', '🔍', '⚡', '🌐', '🔑', '📊', '🧩', '🏆'];

/* ── TaskAccordion Component ────────────────────────────────────────────── */

type AccordionType = 'chapter' | 'quiz' | 'exercise';

function getAccordionColors(type: AccordionType) {
    if (type === 'quiz')     return { accent: 'var(--n-info)',    accentBorder: 'var(--n-info-border)',    accentBg: 'var(--n-info-bg)' };
    if (type === 'exercise') return { accent: 'var(--n-text-secondary)', accentBorder: 'var(--n-border-strong)', accentBg: 'var(--n-bg-elevated)' };
    return { accent: 'var(--n-accent)', accentBorder: 'var(--n-accent-border)', accentBg: 'var(--n-accent-light)' };
}

function TaskAccordion({
    taskN, title, isOpen, isCompleted, type = 'chapter',
    onToggle, children, estimatedMinutes
}: {
    taskN: number;
    title: string;
    isOpen: boolean;
    isCompleted?: boolean;
    type?: AccordionType;
    onToggle: () => void;
    children: React.ReactNode;
    estimatedMinutes?: number;
}) {
    const colors   = getAccordionColors(type);
    const labelMap = { chapter: `UA ${taskN}`, quiz: 'ÉVALUATION', exercise: 'EXERCICE' };

    return (
        <div style={{
            borderRadius: 'var(--n-radius)',
            overflow: 'hidden',
            border: isCompleted
                ? '1px solid var(--n-success-border)'
                : isOpen
                    ? `2px solid ${colors.accentBorder}`
                    : '1px solid var(--n-border)',
            background: isOpen ? 'var(--n-bg-primary)' : 'var(--n-bg-primary)',
            transition: 'border-color 0.2s',
        }}>
            {/* Header */}
            <button
                onClick={onToggle}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--n-space-4)', padding: 'var(--n-space-4) var(--n-space-5)', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--n-bg-elevated)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
            >
                {/* Status circle */}
                <div style={{ flexShrink: 0 }}>
                    {isCompleted ? (
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--n-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check style={{ width: '12px', height: '12px', color: '#fff' }} strokeWidth={3} />
                        </div>
                    ) : isOpen ? (
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${colors.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.accent }} />
                        </div>
                    ) : (
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid var(--n-border)' }} />
                    )}
                </div>

                {/* Label + title */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: isCompleted ? 'var(--n-success)' : colors.accent, marginBottom: '2px', fontFamily: 'var(--n-font-sans)' }}>
                        {labelMap[type]}
                    </div>
                    <div style={{ fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: isCompleted ? 'var(--n-text-tertiary)' : 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)', textDecoration: isCompleted ? 'line-through' : 'none', lineHeight: 1.3 }}>
                        {title}
                    </div>
                </div>

                {/* Time + status + chevron */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-3)', flexShrink: 0 }}>
                    {estimatedMinutes && !isCompleted && (
                        <span style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>~{estimatedMinutes} min</span>
                    )}
                    {isCompleted && (
                        <NotionBadge variant="success" size="sm">Terminé</NotionBadge>
                    )}
                    <div style={{ color: 'var(--n-text-tertiary)' }}>
                        {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                </div>
            </button>

            {/* Content panel */}
            {isOpen && (
                <div style={{ borderTop: `1px solid ${colors.accentBorder}`, borderLeft: `3px solid ${colors.accent}` }}>
                    <div style={{ padding: 'var(--n-space-5) var(--n-space-5) var(--n-space-6)' }}>
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Main Page ──────────────────────────────────────────────────────────── */

export default function ModuleContentPage() {
    const { isLoading: authLoading } = useAuth(true);
    const params   = useParams();
    const cursusId = params?.cursusId as string;
    const moduleId = params?.moduleId as string;

    const [module_,   setModule]   = useState<ModuleInfo | null>(null);
    const [chapters,  setChapters] = useState<Chapter[]>([]);
    const [quiz,      setQuiz]     = useState<Quiz | null>(null);
    const [exercises, setExercises]= useState<Exercise[]>([]);
    const [completedIds, setCompletedIds] = useState<string[]>([]);
    const [loading,   setLoading]  = useState(true);
    const [error,     setError]    = useState<string | null>(null);

    const [openTask,       setOpenTask]       = useState<number>(0);
    const [showStickyBar,  setShowStickyBar]  = useState(false);
    const heroRef = useRef<HTMLDivElement>(null);

    const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
    const [quizResult,  setQuizResult]  = useState<QuizSubmissionResult | null>(null);
    const [submitting,  setSubmitting]  = useState(false);

    const [activeExercise,    setActiveExercise]    = useState(0);
    const [exerciseAnswer,    setExerciseAnswer]    = useState('');
    const [exerciseResult,    setExerciseResult]    = useState<{
        score: number; feedback: string; matchedConcepts: string[]; missingConcepts: string[];
        attemptCount: number; solutionEligible: boolean;
    } | null>(null);
    const [exerciseSolution,  setExerciseSolution]  = useState<string | null>(null);
    const [loadingSolution,   setLoadingSolution]   = useState(false);

    /* ── Computed ── */
    const totalMinutes    = chapters.reduce((s, c) => s + (c.estimated_minutes || 0), 0);
    const validQuestions  = (quiz?.questions ?? []).filter((q): q is QuizQuestion => q !== null);
    const ctfCategory     = getCtfCategory(moduleId);
    const emoji           = MODULE_EMOJIS[(module_?.module_order ?? 1) % MODULE_EMOJIS.length];
    const totalTasks      = chapters.length + (validQuestions.length > 0 ? 1 : 0) + exercises.length;
    const completedTasks  = completedIds.length + (quizResult?.passed ? 1 : 0);
    const moduleProgress  = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    /* ── API calls ── */
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
        } catch (err) { console.error(err); }
    }, [cursusId, moduleId]);

    useEffect(() => {
        const fetchModule = async () => {
            try {
                setError(null);
                setLoading(true);
                const token = localStorage.getItem('token');
                if (!token) { setError('Session expirée.'); return; }
                const res = await fetch(`/api/cursus/${cursusId}/module/${moduleId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) {
                    const payload = await res.json().catch(() => ({}));
                    throw new Error(payload.error || 'Impossible de charger le module.');
                }
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Impossible de charger le module.');
                const nextChapters: Chapter[] = Array.isArray(data.units)
                    ? data.units
                    : (data.chapters || []);
                const nextExercises: Exercise[] = Array.isArray(data.exercises)
                    ? data.exercises : (data.exercise ? [data.exercise] : []);
                setModule(data.module || null);
                setChapters(nextChapters);
                setQuiz(data.quiz || null);
                setExercises(nextExercises);
                setActiveExercise(0);
                setCompletedIds(data.completedChapterIds || []);
                setOpenTask(0);
                setQuizResult(null);
                setQuizAnswers({});
                if (!data.module || (nextChapters.length === 0 && !data.quiz && nextExercises.length === 0)) {
                    setError('Ce module ne contient pas encore d’UA publiable.');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erreur de chargement du module.');
            } finally { setLoading(false); }
        };
        if (authLoading) return;
        if (cursusId && moduleId) fetchModule();
    }, [authLoading, cursusId, moduleId]);

    useEffect(() => {
        const handleScroll = () => {
            if (heroRef.current) {
                const heroBottom = heroRef.current.getBoundingClientRect().bottom;
                setShowStickyBar(heroBottom < 0);
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setExerciseAnswer('');
        setExerciseResult(null);
        setExerciseSolution(null);
    }, [activeExercise]);

    const submitQuiz = async () => {
        if (!quiz) return;
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) { setError('Session expirée.'); return; }
            const answers = validQuestions.map((_, i) => quizAnswers[i] ?? -1);
            const res = await fetch(`/api/cursus/${cursusId}/quiz/${quiz.id}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers }),
            });
            if (!res.ok) { const p = await res.json().catch(() => ({})); throw new Error(p.error || 'Erreur submit quiz.'); }
            const data = await res.json();
            if (data.success) setQuizResult(data);
            else throw new Error(data.error || 'Erreur submit quiz.');
        } catch (err) { setError(err instanceof Error ? err.message : 'Erreur quiz.'); }
        finally { setSubmitting(false); }
    };

    const submitExercise = async () => {
        const ex = exercises[activeExercise];
        if (!ex || !exerciseAnswer.trim()) return;
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await fetch(`/api/cursus/${cursusId}/exercise/${ex.id}/submit`, {
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
        const ex = exercises[activeExercise];
        if (!ex) return;
        setLoadingSolution(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await fetch(`/api/cursus/${cursusId}/exercise/${ex.id}/solution`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Not eligible');
            const data = await res.json();
            if (data.success) setExerciseSolution(data.solution);
        } catch { /* not eligible yet */ }
        finally { setLoadingSolution(false); }
    };

    const handleTaskComplete = (chapterId: string, chapterIndex: number) => {
        markChapterComplete(chapterId);
        setTimeout(() => {
            if (chapterIndex < chapters.length - 1) {
                setOpenTask(chapterIndex + 1);
            } else if (validQuestions.length > 0) {
                setOpenTask(chapters.length);
            } else if (exercises.length > 0) {
                setOpenTask(chapters.length + 1);
            }
        }, 400);
    };

    /* ── Loading ── */
    if (authLoading || loading) {
        return (
            <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '1120px', margin: '0 auto' }}>
                <div style={{ marginBottom: 'var(--n-space-5)' }}>
                    <NotionSkeleton type="line" width="200px" height="28px" />
                    <div style={{ marginTop: 'var(--n-space-2)' }}><NotionSkeleton type="line" width="280px" height="14px" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 'var(--n-space-6)' }}>
                    <NotionSkeleton type="card" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-3)' }}>
                        {[...Array(4)].map((_, i) => <NotionSkeleton key={i} type="list" />)}
                    </div>
                </div>
            </div>
        );
    }

    if (error && !chapters.length && !quiz) {
        return (
            <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '600px', margin: '0 auto' }}>
                <NotionEmptyState
                    icon={<AlertCircle size={28} />}
                    title="Module indisponible"
                    description={error}
                    action={
                        <Link
                            href={`/student/cursus/${cursusId}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--n-space-2)', padding: '7px 16px', borderRadius: 'var(--n-radius-sm)', border: '1px solid var(--n-border)', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)', textDecoration: 'none' }}
                        >
                            <ArrowLeft size={14} /> Retour au cursus
                        </Link>
                    }
                />
            </div>
        );
    }

    /* ── Render ── */
    return (
        <div>
            {/* ── STICKY PROGRESS BAR ─────────────────────────────────── */}
            <div style={{
                position: 'fixed', top: '48px', left: 0, right: 0, zIndex: 40,
                transition: 'transform 0.25s ease',
                transform: showStickyBar ? 'translateY(0)' : 'translateY(-110%)',
            }}>
                <div style={{ height: '2px', background: 'var(--n-border)' }}>
                    <div style={{ height: '100%', background: 'var(--n-accent)', width: `${moduleProgress}%`, transition: 'width 0.5s' }} />
                </div>
                <div style={{ padding: '6px var(--n-space-5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--n-bg-primary)', borderBottom: '1px solid var(--n-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-4)' }}>
                        <Link href={`/student/cursus/${cursusId}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)', textDecoration: 'none' }}>
                            <ArrowLeft size={13} /> Retour
                        </Link>
                        <span style={{ color: 'var(--n-border)', fontSize: '12px' }}>|</span>
                        <span style={{ color: 'var(--n-text-primary)', fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], fontFamily: 'var(--n-font-sans)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {module_?.title}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-3)' }}>
                        <span style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>
                            {completedTasks}/{totalTasks} tâches
                        </span>
                        <NotionBadge variant="accent" size="sm">{moduleProgress}%</NotionBadge>
                    </div>
                </div>
            </div>

            {/* ── MODULE HEADER ────────────────────────────────────────── */}
            <div ref={heroRef} style={{ padding: 'var(--n-space-8) var(--n-space-6) var(--n-space-5)', borderBottom: '1px solid var(--n-border)', background: 'var(--n-bg-primary)', position: 'relative', overflow: 'hidden' }}>
                {/* Decorative emoji */}
                <div style={{ position: 'absolute', right: '32px', top: '50%', transform: 'translateY(-50%)', fontSize: '5rem', opacity: 0.06, userSelect: 'none', pointerEvents: 'none' }}>
                    {emoji}
                </div>

                <div style={{ maxWidth: '1120px', margin: '0 auto', position: 'relative' }}>
                    {/* Back link */}
                    <Link
                        href={`/student/cursus/${cursusId}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--n-space-2)', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)', textDecoration: 'none', marginBottom: 'var(--n-space-4)' }}
                    >
                        <ArrowLeft size={14} />
                        {module_?.cursus_title || 'Retour au cursus'}
                    </Link>

                    {/* Module label */}
                    <div style={{ marginBottom: 'var(--n-space-3)' }}>
                        <NotionBadge variant="accent" size="sm">MODULE {module_?.module_order}</NotionBadge>
                    </div>

                    <h1 style={{ fontSize: '28px', fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)', letterSpacing: '-0.02em', marginBottom: 'var(--n-space-4)', maxWidth: '680px', lineHeight: 1.2 }}>
                        {module_?.title || 'Module'}
                    </h1>

                    {/* Stats row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--n-space-5)', fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)', marginBottom: 'var(--n-space-5)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Clock size={13} style={{ color: 'var(--n-accent)' }} />
                            {totalMinutes > 0 ? `~${totalMinutes} min` : 'Durée variable'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <BookOpen size={13} style={{ color: 'var(--n-accent)' }} />
                            {chapters.length} UA
                        </span>
                        {validQuestions.length > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <FileQuestion size={13} style={{ color: 'var(--n-info)' }} />
                                {validQuestions.length} questions
                            </span>
                        )}
                        {exercises.length > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Code2 size={13} style={{ color: 'var(--n-text-tertiary)' }} />
                                {exercises.length} exercice{exercises.length > 1 ? 's' : ''}
                            </span>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <CheckCircle2 size={13} style={{ color: 'var(--n-success)' }} />
                            {completedIds.length}/{chapters.length} validées
                        </span>
                    </div>

                    {/* Progress bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-4)' }}>
                        <span style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', flexShrink: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Progression
                        </span>
                        <div style={{ flex: 1 }}>
                            <NotionProgress value={moduleProgress} variant={moduleProgress === 100 ? 'success' : 'accent'} size="thick" />
                        </div>
                        <span style={{ fontSize: 'var(--n-text-xs)', fontFamily: 'var(--n-font-mono)', fontWeight: 600, color: moduleProgress === 100 ? 'var(--n-success)' : 'var(--n-accent)', flexShrink: 0 }}>
                            {moduleProgress}%
                        </span>
                    </div>
                </div>
            </div>

            {/* ── 2-COLUMN LAYOUT ──────────────────────────────────────── */}
            <div style={{ maxWidth: '1120px', margin: '0 auto', padding: 'var(--n-space-7) var(--n-space-6)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 'var(--n-space-6)', alignItems: 'start' }}>

                    {/* ── LEFT SIDEBAR ─────────────────────────────────── */}
                    <aside style={{ position: 'sticky', top: '80px', height: 'fit-content', display: 'flex', flexDirection: 'column', gap: 'var(--n-space-4)' }}>

                        {/* Task navigator */}
                        <NotionCard variant="default" padding="none">
                            <div style={{ padding: 'var(--n-space-3) var(--n-space-4)', borderBottom: '1px solid var(--n-border)' }}>
                                <h3 style={{ fontSize: 'var(--n-text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', margin: 0 }}>
                                    Contenu du module
                                </h3>
                            </div>
                            <div style={{ padding: 'var(--n-space-1) 0' }}>
                                {chapters.map((ch, i) => {
                                    const isDone   = completedIds.includes(ch.id);
                                    const isActive = openTask === i;
                                    return (
                                        <button
                                            key={ch.id}
                                            onClick={() => setOpenTask(isActive ? -1 : i)}
                                            style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 'var(--n-space-3)', padding: 'var(--n-space-2) var(--n-space-4)', textAlign: 'left', background: isActive ? 'var(--n-accent-light)' : 'transparent', border: 'none', cursor: 'pointer' }}
                                            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--n-bg-elevated)'; }}
                                            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                        >
                                            <div style={{ flexShrink: 0, marginTop: '2px' }}>
                                                {isDone ? (
                                                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--n-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Check style={{ width: '10px', height: '10px', color: '#fff' }} strokeWidth={3} />
                                                    </div>
                                                ) : (
                                                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${isActive ? 'var(--n-accent)' : 'var(--n-border)'}` }} />
                                                )}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: isActive ? 'var(--n-accent)' : 'var(--n-text-tertiary)', marginBottom: '1px', fontFamily: 'var(--n-font-sans)' }}>
                                                    TÂCHE {i + 1}
                                                </div>
                                                <div style={{ fontSize: 'var(--n-text-xs)', color: isActive ? 'var(--n-text-primary)' : isDone ? 'var(--n-text-tertiary)' : 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)', lineHeight: 1.3, textDecoration: isDone ? 'line-through' : 'none' }}>
                                                    {ch.title}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}

                                {validQuestions.length > 0 && (
                                    <button
                                        onClick={() => setOpenTask(openTask === chapters.length ? -1 : chapters.length)}
                                        style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 'var(--n-space-3)', padding: 'var(--n-space-2) var(--n-space-4)', textAlign: 'left', background: openTask === chapters.length ? 'var(--n-info-bg)' : 'transparent', border: 'none', cursor: 'pointer' }}
                                        onMouseEnter={e => { if (openTask !== chapters.length) (e.currentTarget as HTMLElement).style.background = 'var(--n-bg-elevated)'; }}
                                        onMouseLeave={e => { if (openTask !== chapters.length) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                    >
                                        <div style={{ flexShrink: 0, marginTop: '2px' }}>
                                            {quizResult?.passed ? (
                                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--n-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Check style={{ width: '10px', height: '10px', color: '#fff' }} strokeWidth={3} />
                                                </div>
                                            ) : (
                                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${openTask === chapters.length ? 'var(--n-info)' : 'var(--n-border)'}` }} />
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: openTask === chapters.length ? 'var(--n-info)' : 'var(--n-text-tertiary)', marginBottom: '1px', fontFamily: 'var(--n-font-sans)' }}>ÉVALUATION</div>
                                            <div style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)' }}>{quiz?.title || 'Quiz final'}</div>
                                        </div>
                                    </button>
                                )}

                                {exercises.map((ex, i) => {
                                    const taskIdx  = chapters.length + (validQuestions.length > 0 ? 1 : 0) + i;
                                    const isActive = openTask === taskIdx;
                                    return (
                                        <button
                                            key={ex.id}
                                            onClick={() => setOpenTask(isActive ? -1 : taskIdx)}
                                            style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 'var(--n-space-3)', padding: 'var(--n-space-2) var(--n-space-4)', textAlign: 'left', background: isActive ? 'var(--n-bg-elevated)' : 'transparent', border: 'none', cursor: 'pointer' }}
                                            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--n-bg-elevated)'; }}
                                            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                        >
                                            <div style={{ flexShrink: 0, marginTop: '2px' }}>
                                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${isActive ? 'var(--n-border-strong)' : 'var(--n-border)'}` }} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--n-text-tertiary)', marginBottom: '1px', fontFamily: 'var(--n-font-sans)' }}>EXERCICE</div>
                                                <div style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{ex.title}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </NotionCard>

                        {/* Progress summary */}
                        <NotionCard variant="default" padding="md">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--n-space-2)' }}>
                                <span style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)' }}>Progression</span>
                                <span style={{ fontSize: 'var(--n-text-xs)', fontWeight: 700, color: 'var(--n-accent)', fontFamily: 'var(--n-font-mono)' }}>{moduleProgress}%</span>
                            </div>
                            <NotionProgress value={moduleProgress} variant={moduleProgress === 100 ? 'success' : 'accent'} size="default" />
                            <div style={{ marginTop: 'var(--n-space-2)', fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>
                                {completedTasks} / {totalTasks} tâches terminées
                            </div>
                        </NotionCard>

                        {/* CTF cross-link */}
                        {ctfCategory && (
                            <Link
                                href={`/student/ctf?category=${ctfCategory.category}`}
                                style={{ display: 'block', textDecoration: 'none', borderRadius: 'var(--n-radius)', padding: 'var(--n-space-4)', background: 'var(--n-info-bg)', border: '1px solid var(--n-info-border)', transition: 'border-color 0.15s' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--n-info)'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--n-info-border)'}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-1)' }}>
                                    <Terminal size={13} style={{ color: 'var(--n-info)' }} />
                                    <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--n-info)', fontFamily: 'var(--n-font-sans)' }}>Lab CTF</span>
                                </div>
                                <div style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)', marginBottom: 'var(--n-space-2)' }}>{ctfCategory.label}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--n-text-xs)', color: 'var(--n-info)', fontFamily: 'var(--n-font-sans)' }}>
                                    Accéder au défi <ChevronRight size={12} />
                                </div>
                            </Link>
                        )}
                    </aside>

                    {/* ── TASK ACCORDIONS ──────────────────────────────── */}
                    <main style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-3)', minWidth: 0 }}>

                        {/* Error banner */}
                        {error && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-3)', padding: 'var(--n-space-3) var(--n-space-4)', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-danger-bg)', border: '1px solid var(--n-danger-border)', marginBottom: 'var(--n-space-2)' }}>
                                <AlertCircle size={15} style={{ color: 'var(--n-danger)', flexShrink: 0 }} />
                                <p style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-danger)', fontFamily: 'var(--n-font-sans)', margin: 0 }}>{error}</p>
                            </div>
                        )}

                        {/* Empty state */}
                        {chapters.length === 0 && !quiz && exercises.length === 0 && !loading && (
                            <NotionEmptyState
                                icon={<BookOpen size={28} />}
                                title="Ce module ne contient pas encore de contenu."
                                description=""
                            />
                        )}

                        {/* ── CHAPTER TASKS ─────────────────────────── */}
                        {chapters.map((ch, i) => (
                            <TaskAccordion
                                key={ch.id}
                                taskN={i + 1}
                                title={ch.title}
                                isOpen={openTask === i}
                                isCompleted={completedIds.includes(ch.id)}
                                type="chapter"
                                onToggle={() => setOpenTask(openTask === i ? -1 : i)}
                                estimatedMinutes={ch.estimated_minutes}
                            >
                                {/* Chapter content */}
                                <div className="prose prose-sm max-w-none mb-6">
                                    <CourseRichRenderer content={ch.content} />
                                </div>

                                {/* Key points */}
                                {ch.key_points?.length > 0 && (
                                    <div style={{ borderRadius: 'var(--n-radius-sm)', padding: 'var(--n-space-4)', marginBottom: 'var(--n-space-5)', background: 'var(--n-accent-light)', border: '1px solid var(--n-accent-border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-3)' }}>
                                            <Lightbulb size={14} style={{ color: 'var(--n-accent)' }} />
                                            <span style={{ fontSize: 'var(--n-text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--n-accent)', fontFamily: 'var(--n-font-sans)' }}>Points clés</span>
                                        </div>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--n-space-1)' }}>
                                            {ch.key_points.map((pt, j) => (
                                                <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--n-space-2)', fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)' }}>
                                                    <span style={{ color: 'var(--n-accent)', marginTop: '2px', flexShrink: 0 }}>▸</span>
                                                    {pt}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Complete task */}
                                <div style={{ marginTop: 'var(--n-space-5)', paddingTop: 'var(--n-space-4)', borderTop: '1px solid var(--n-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--n-space-4)' }}>
                                    <div>
                                        {completedIds.includes(ch.id) ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', color: 'var(--n-success)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)' }}>
                                                <Check size={14} />
                                                <span>Tâche terminée</span>
                                            </div>
                                        ) : (
                                            <p style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', margin: 0 }}>
                                                Marque cette tâche comme terminée pour progresser
                                            </p>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-3)' }}>
                                        {!completedIds.includes(ch.id) && (
                                            <button
                                                onClick={() => handleTaskComplete(ch.id, i)}
                                                style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', padding: '7px 14px', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-accent)', color: '#fff', fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], fontFamily: 'var(--n-font-sans)', border: 'none', cursor: 'pointer' }}
                                            >
                                                <Check size={14} /> Terminer cette tâche
                                            </button>
                                        )}
                                        {i < chapters.length - 1 && (
                                            <button
                                                onClick={() => { setOpenTask(i + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', padding: '7px 14px', borderRadius: 'var(--n-radius-sm)', border: '1px solid var(--n-border)', background: 'var(--n-bg-primary)', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)', cursor: 'pointer' }}
                                            >
                                                Suivant <ChevronRight size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </TaskAccordion>
                        ))}

                        {/* ── QUIZ TASK ──────────────────────────────── */}
                        {quiz && validQuestions.length > 0 && (
                            <TaskAccordion
                                taskN={chapters.length + 1}
                                title={quiz.title || 'Évaluation finale'}
                                isOpen={openTask === chapters.length}
                                isCompleted={quizResult?.passed === true}
                                type="quiz"
                                onToggle={() => setOpenTask(openTask === chapters.length ? -1 : chapters.length)}
                            >
                                {/* Separator */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-4)', marginBottom: 'var(--n-space-5)' }}>
                                    <span style={{ fontSize: 'var(--n-text-sm)', fontStyle: 'italic', color: 'var(--n-info)', fontFamily: 'var(--n-font-sans)' }}>
                                        Répondez aux questions ci-dessous
                                    </span>
                                    <div style={{ flex: 1, height: '1px', background: 'var(--n-info-border)' }} />
                                </div>

                                {/* Quiz result */}
                                {quizResult && (
                                    <div style={{ borderRadius: 'var(--n-radius-sm)', padding: 'var(--n-space-5)', marginBottom: 'var(--n-space-5)', background: quizResult.passed ? 'var(--n-success-bg)' : 'var(--n-danger-bg)', border: `1px solid ${quizResult.passed ? 'var(--n-success-border)' : 'var(--n-danger-border)'}` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-3)', marginBottom: 'var(--n-space-4)' }}>
                                            {quizResult.passed
                                                ? <Award size={22} style={{ color: 'var(--n-success)' }} />
                                                : <AlertCircle size={22} style={{ color: 'var(--n-danger)' }} />
                                            }
                                            <div>
                                                <div style={{ fontSize: 'var(--n-text-base)', fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'], color: quizResult.passed ? 'var(--n-success)' : 'var(--n-danger)', fontFamily: 'var(--n-font-sans)' }}>
                                                    {quizResult.passed ? 'Réussi ! 🎉' : 'Pas encore…'}
                                                </div>
                                                <div style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)' }}>
                                                    Score : {quizResult.score}/{quizResult.maxScore} ({quizResult.percentage}%) — Seuil : {quizResult.passPercentage}%
                                                </div>
                                            </div>
                                        </div>

                                        {/* Per-question review */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-2)' }}>
                                            {quizResult.results.map((r, j) => (
                                                <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--n-space-3)', padding: 'var(--n-space-3)', borderRadius: 'var(--n-radius-sm)', background: r.correct ? 'var(--n-success-bg)' : 'var(--n-danger-bg)' }}>
                                                    {r.correct
                                                        ? <Check size={14} style={{ color: 'var(--n-success)', flexShrink: 0, marginTop: '2px' }} />
                                                        : <AlertCircle size={14} style={{ color: 'var(--n-danger)', flexShrink: 0, marginTop: '2px' }} />
                                                    }
                                                    <div style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)' }}>
                                                        <span style={{ fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)' }}>Q{j + 1} : </span>
                                                        {validQuestions[j]?.question}
                                                        {r.explanation && (
                                                            <p style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', marginTop: '4px', fontStyle: 'italic', margin: '4px 0 0' }}>{r.explanation}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {!quizResult.passed && (
                                            <button
                                                onClick={() => { setQuizResult(null); setQuizAnswers({}); }}
                                                style={{ marginTop: 'var(--n-space-4)', display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', padding: '7px 14px', borderRadius: 'var(--n-radius-sm)', border: '1px solid var(--n-border)', background: 'var(--n-bg-primary)', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)', cursor: 'pointer' }}
                                            >
                                                <RefreshCw size={14} /> Réessayer
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Quiz questions */}
                                {!quizResult && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-6)' }}>
                                        {validQuestions.map((q, qi) => (
                                            <div key={q.id}>
                                                <p style={{ fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)', marginBottom: 'var(--n-space-3)' }}>
                                                    <span style={{ color: 'var(--n-info)', fontWeight: 700, marginRight: '6px' }}>Q{qi + 1}.</span>
                                                    {q.question}
                                                </p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-2)' }}>
                                                    {q.options.map((opt, oi) => {
                                                        const isSelected = quizAnswers[qi] === oi;
                                                        return (
                                                            <button
                                                                key={oi}
                                                                onClick={() => setQuizAnswers((prev) => ({ ...prev, [qi]: oi }))}
                                                                style={{
                                                                    width: '100%', textAlign: 'left',
                                                                    padding: 'var(--n-space-3) var(--n-space-4)',
                                                                    borderRadius: 'var(--n-radius-sm)',
                                                                    fontSize: 'var(--n-text-sm)',
                                                                    fontFamily: 'var(--n-font-sans)',
                                                                    cursor: 'pointer',
                                                                    background: isSelected ? 'var(--n-accent-light)' : 'var(--n-bg-primary)',
                                                                    border: `${isSelected ? '2px' : '1px'} solid ${isSelected ? 'var(--n-accent-border)' : 'var(--n-border)'}`,
                                                                    color: isSelected ? 'var(--n-text-primary)' : 'var(--n-text-secondary)',
                                                                    transition: 'all 0.1s',
                                                                }}
                                                            >
                                                                <span style={{ fontFamily: 'var(--n-font-mono)', marginRight: '8px', fontSize: 'var(--n-text-xs)', color: isSelected ? 'var(--n-accent)' : 'var(--n-text-tertiary)', fontWeight: 700 }}>
                                                                    {String.fromCharCode(65 + oi)}.
                                                                </span>
                                                                {opt}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}

                                        <button
                                            onClick={submitQuiz}
                                            disabled={submitting || validQuestions.some((_, i) => quizAnswers[i] === undefined)}
                                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', padding: '9px 20px', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-accent)', color: '#fff', fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], fontFamily: 'var(--n-font-sans)', border: 'none', cursor: (submitting || validQuestions.some((_, i) => quizAnswers[i] === undefined)) ? 'not-allowed' : 'pointer', opacity: (submitting || validQuestions.some((_, i) => quizAnswers[i] === undefined)) ? 0.45 : 1 }}
                                        >
                                            {submitting
                                                ? <><RefreshCw size={14} /> Soumission…</>
                                                : <><Sparkles size={14} /> Soumettre le quiz</>
                                            }
                                        </button>
                                    </div>
                                )}
                            </TaskAccordion>
                        )}

                        {/* ── EXERCISE TASKS ────────────────────────── */}
                        {exercises.map((ex, i) => {
                            const taskIdx = chapters.length + (validQuestions.length > 0 ? 1 : 0) + i;
                            return (
                                <TaskAccordion
                                    key={ex.id}
                                    taskN={taskIdx + 1}
                                    title={ex.title}
                                    isOpen={openTask === taskIdx}
                                    type="exercise"
                                    onToggle={() => {
                                        setOpenTask(openTask === taskIdx ? -1 : taskIdx);
                                        setActiveExercise(i);
                                    }}
                                    estimatedMinutes={ex.estimated_minutes}
                                >
                                    {/* Type badge */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-3)', marginBottom: 'var(--n-space-5)' }}>
                                        <NotionBadge variant="default">{ex.type || 'Pratique'}</NotionBadge>
                                        {ex.estimated_minutes > 0 && (
                                            <span style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={11} /> ~{ex.estimated_minutes} min
                                            </span>
                                        )}
                                    </div>

                                    <p style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)', marginBottom: 'var(--n-space-5)', lineHeight: 'var(--n-leading-relaxed)' }}>{ex.description}</p>

                                    {/* Instructions */}
                                    {ex.instructions?.length > 0 && (
                                        <div style={{ marginBottom: 'var(--n-space-5)' }}>
                                            <div style={{ fontSize: 'var(--n-text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', marginBottom: 'var(--n-space-3)' }}>Instructions</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-2)' }}>
                                                {ex.instructions.map((instr, j) => (
                                                    <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--n-space-3)', padding: 'var(--n-space-3)', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-bg-elevated)', border: '1px solid var(--n-border)' }}>
                                                        <span style={{ flexShrink: 0, width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, background: 'var(--n-border)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)' }}>
                                                            {j + 1}
                                                        </span>
                                                        <p style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)', margin: 0, lineHeight: 'var(--n-leading-relaxed)' }}>{instr}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Hints */}
                                    {ex.hints?.length > 0 && (
                                        <div style={{ padding: 'var(--n-space-4)', borderRadius: 'var(--n-radius-sm)', marginBottom: 'var(--n-space-5)', background: 'var(--n-accent-light)', border: '1px solid var(--n-accent-border)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-2)' }}>
                                                <Lightbulb size={13} style={{ color: 'var(--n-accent)' }} />
                                                <span style={{ fontSize: 'var(--n-text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--n-accent)', fontFamily: 'var(--n-font-sans)' }}>Indices</span>
                                            </div>
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {ex.hints.map((h, j) => (
                                                    <li key={j} style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)', display: 'flex', alignItems: 'flex-start', gap: 'var(--n-space-2)' }}>
                                                        <span style={{ color: 'var(--n-accent)', marginTop: '2px', flexShrink: 0 }}>▸</span>{h}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Answer textarea */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-3)' }}>
                                        <div style={{ fontSize: 'var(--n-text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>
                                            Votre réponse
                                        </div>
                                        <textarea
                                            value={exerciseAnswer}
                                            onChange={(e) => setExerciseAnswer(e.target.value)}
                                            rows={5}
                                            placeholder="Rédigez votre analyse ici…"
                                            style={{ width: '100%', resize: 'vertical', fontSize: 'var(--n-text-sm)', color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)', background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: 'var(--n-radius-sm)', padding: 'var(--n-space-3) var(--n-space-4)', outline: 'none', boxSizing: 'border-box' }}
                                            onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = 'var(--n-border-strong)'}
                                            onBlur={e  => (e.target as HTMLTextAreaElement).style.borderColor = 'var(--n-border)'}
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-3)' }}>
                                            <button
                                                onClick={submitExercise}
                                                disabled={submitting || !exerciseAnswer.trim()}
                                                style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', padding: '7px 18px', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-accent)', color: '#fff', fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], fontFamily: 'var(--n-font-sans)', border: 'none', cursor: (submitting || !exerciseAnswer.trim()) ? 'not-allowed' : 'pointer', opacity: (submitting || !exerciseAnswer.trim()) ? 0.45 : 1 }}
                                            >
                                                {submitting ? <RefreshCw size={14} /> : <Sparkles size={14} />}
                                                Soumettre
                                            </button>
                                            {exerciseResult?.solutionEligible && !exerciseSolution && (
                                                <button
                                                    onClick={loadExerciseSolution}
                                                    disabled={loadingSolution}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', padding: '7px 14px', borderRadius: 'var(--n-radius-sm)', border: '1px solid var(--n-border)', background: 'var(--n-bg-primary)', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)', cursor: loadingSolution ? 'default' : 'pointer' }}
                                                >
                                                    {loadingSolution ? <RefreshCw size={13} /> : <Lightbulb size={13} />}
                                                    Voir la solution
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Exercise result */}
                                    {exerciseResult && (
                                        <div style={{ marginTop: 'var(--n-space-5)', borderRadius: 'var(--n-radius-sm)', padding: 'var(--n-space-5)', background: 'var(--n-bg-elevated)', border: '1px solid var(--n-border)', display: 'flex', flexDirection: 'column', gap: 'var(--n-space-3)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-3)' }}>
                                                <div style={{ fontSize: '22px', fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-mono)' }}>{exerciseResult.score}/100</div>
                                                <div>
                                                    <div style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'] }}>{exerciseResult.feedback}</div>
                                                    <div style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>{exerciseResult.attemptCount} tentative(s)</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--n-space-2)' }}>
                                                {exerciseResult.matchedConcepts?.map((c, j) => (
                                                    <NotionBadge key={j} variant="success" size="sm">✓ {c}</NotionBadge>
                                                ))}
                                                {exerciseResult.missingConcepts?.map((c, j) => (
                                                    <NotionBadge key={j} variant="danger" size="sm">✗ {c}</NotionBadge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Solution */}
                                    {exerciseSolution && (
                                        <div style={{ marginTop: 'var(--n-space-4)', borderRadius: 'var(--n-radius-sm)', padding: 'var(--n-space-5)', background: 'var(--n-success-bg)', border: '1px solid var(--n-success-border)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', fontSize: 'var(--n-text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--n-success)', fontFamily: 'var(--n-font-sans)', marginBottom: 'var(--n-space-3)' }}>
                                                <Star size={13} /> Correction officielle
                                            </div>
                                            <p style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)', whiteSpace: 'pre-wrap', lineHeight: 'var(--n-leading-relaxed)', margin: 0 }}>{exerciseSolution}</p>
                                        </div>
                                    )}
                                </TaskAccordion>
                            );
                        })}

                        {/* ── COMPLETION BANNER ─────────────────────── */}
                        {moduleProgress === 100 && (
                            <div style={{ borderRadius: 'var(--n-radius)', padding: 'var(--n-space-8)', textAlign: 'center', background: 'var(--n-success-bg)', border: '1px solid var(--n-success-border)' }}>
                                <div style={{ fontSize: '3rem', marginBottom: 'var(--n-space-3)' }}>🏆</div>
                                <h3 style={{ fontSize: 'var(--n-text-lg)', fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--n-success)', fontFamily: 'var(--n-font-sans)', marginBottom: 'var(--n-space-2)' }}>
                                    Module complété !
                                </h3>
                                <p style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)', marginBottom: 'var(--n-space-5)' }}>
                                    Félicitations, tu as terminé toutes les UA et l&apos;évaluation.
                                </p>
                                <Link
                                    href={`/student/cursus/${cursusId}`}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--n-space-2)', padding: '9px 20px', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-success)', color: '#fff', fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], fontFamily: 'var(--n-font-sans)', textDecoration: 'none' }}
                                >
                                    Module suivant <ChevronRight size={14} />
                                </Link>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
