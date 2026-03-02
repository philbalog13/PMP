'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import Link from 'next/link';
import {
    CheckCircle2, XCircle, Clock, Play, RotateCcw,
    Target, BookOpen, Lock, RefreshCw,
} from 'lucide-react';
import { NotionCard, NotionBadge, NotionEmptyState, NotionSkeleton } from '@shared/components/notion';

/* ── Types ──────────────────────────────────────────────────────────────── */

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
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number')  return value === 1;
    if (typeof value === 'string') {
        const n = value.trim().toLowerCase();
        if (n === 'true' || n === 't' || n === '1') return true;
        if (n === 'false' || n === 'f' || n === '0') return false;
    }
    return percentage >= fallbackThreshold;
}

const WORKSHOP_NAMES: Record<string, string> = {
    'intro':           'Introduction aux Paiements',
    'iso8583':         'Protocole ISO 8583',
    'hsm-keys':        'Gestion des Clés HSM',
    '3ds-flow':        '3D Secure v2',
    'fraud-detection': 'Détection de Fraude',
    'emv':             'Cartes EMV',
};

/* ── Main Component ─────────────────────────────────────────────────────── */

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
            const progressData  = progressRes?.ok  ? await progressRes.json()  : null;
            const statsData     = statsRes?.ok      ? await statsRes.json()     : null;
            const workshopsData = workshopsRes?.ok  ? await workshopsRes.json() : null;

            const progressMap    = progressData?.progress || {};
            const quizResults    = statsData?.stats?.quizResults || [];
            const workshopCatalog: WorkshopCatalogEntry[] = workshopsData?.workshops || [];
            const orderedWorkshopIds = workshopCatalog.length > 0
                ? [...workshopCatalog].sort((a, b) => (a.moduleOrder || 0) - (b.moduleOrder || 0)).map(e => e.id)
                : WORKSHOP_ORDER;
            const workshopCatalogMap = new Map(workshopCatalog.map(e => [e.id, e]));

            let previousCompleted = true;
            const builtQuizzes: Quiz[] = orderedWorkshopIds.map((workshopId, index) => {
                const wp          = progressMap[workshopId];
                const workshopMeta = workshopCatalogMap.get(workshopId);
                const workshopName = workshopMeta?.title || wp?.title || WORKSHOP_NAMES[workshopId] || workshopId;
                const totalSections = wp?.total_sections || workshopMeta?.sections || 5;
                const status       = wp?.status || 'NOT_STARTED';
                const quizId       = wp?.quiz_id || workshopMeta?.quizId || null;

                const matchingResults = quizResults.filter((q: Record<string, unknown>) => {
                    const byWorkshopId = q?.workshop_id === workshopId || q?.workshopId === workshopId;
                    const byQuizId = (quizId && (q?.quiz_id === quizId || q?.quizId === quizId)) || false;
                    return byWorkshopId || byQuizId;
                });
                const attempts: QuizAttempt[] = matchingResults.map((result: Record<string, unknown>) => {
                    const score = Number(result?.percentage ?? 0);
                    return {
                        date:      String(result?.submitted_at || result?.date || new Date().toISOString()),
                        score:     Number.isFinite(score) ? score : 0,
                        passed:    parseAttemptPassed(result?.passed, score),
                        timeSpent: Number(result?.time_taken_seconds ?? result?.timeSpent ?? 0),
                    };
                });
                const bestScore = attempts.length > 0 ? Math.max(...attempts.map(a => a.score)) : undefined;
                const passed    = attempts.some(a => a.passed);
                const available = Boolean(quizId) && (index === 0 || previousCompleted || status === 'IN_PROGRESS' || status === 'COMPLETED');
                if (status === 'COMPLETED') previousCompleted = true;
                else previousCompleted = false;
                return {
                    id: `quiz-${workshopId}`, quizId, name: `Quiz ${workshopName}`,
                    workshopId, workshopName,
                    questions: Math.max(5, totalSections * 2),
                    timeLimit: Math.max(10, totalSections * 3),
                    attempts, bestScore, passed, available,
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

    /* ── Stats ────────────────────────────────────────────────────────── */
    const totalQuizzes   = quizzes.length;
    const passedQuizzes  = quizzes.filter(q => q.passed).length;
    const totalAttempts  = quizzes.reduce((acc, q) => acc + q.attempts.length, 0);
    const quizzesWithScore = quizzes.filter(q => q.bestScore !== undefined);
    const averageScore   = quizzesWithScore.length > 0
        ? quizzesWithScore.reduce((acc, q) => acc + (q.bestScore || 0), 0) / quizzesWithScore.length
        : 0;

    const filteredQuizzes = quizzes.filter(quiz => {
        if (filter === 'all')     return true;
        if (filter === 'passed')  return quiz.passed;
        if (filter === 'pending') return !quiz.passed && quiz.attempts.length === 0;
        if (filter === 'failed')  return !quiz.passed && quiz.attempts.length > 0;
        return true;
    });

    /* ── Loading ──────────────────────────────────────────────────────── */
    if (isLoading || dataLoading) {
        return (
            <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ marginBottom: 'var(--n-space-6)' }}>
                    <NotionSkeleton type="line" width="160px" height="28px" />
                    <div style={{ marginTop: 'var(--n-space-2)' }}>
                        <NotionSkeleton type="line" width="260px" height="14px" />
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--n-space-3)', marginBottom: 'var(--n-space-6)' }}>
                    {[...Array(4)].map((_, i) => <NotionSkeleton key={i} type="stat" />)}
                </div>
                <NotionSkeleton type="list" rows={6} />
            </div>
        );
    }

    /* ── Render ───────────────────────────────────────────────────────── */
    return (
        <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '800px', margin: '0 auto' }}>

            {/* ── PAGE HEADER ───────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--n-space-4)', marginBottom: 'var(--n-space-7)' }}>
                <div>
                    <h1 style={{
                        fontSize: '26px',
                        fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'],
                        color: 'var(--n-text-primary)',
                        fontFamily: 'var(--n-font-sans)',
                        letterSpacing: '-0.02em',
                        marginBottom: 'var(--n-space-1)',
                    }}>
                        Mes Quiz
                    </h1>
                    <p style={{ color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)' }}>
                        Testez vos connaissances et validez vos acquis
                    </p>
                </div>
                <button
                    onClick={() => { setDataLoading(true); fetchQuizData(); }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)',
                        padding: '6px 14px',
                        borderRadius: 'var(--n-radius-sm)',
                        border: '1px solid var(--n-border)',
                        background: 'var(--n-bg-primary)',
                        color: 'var(--n-text-secondary)',
                        fontSize: 'var(--n-text-sm)',
                        fontFamily: 'var(--n-font-sans)',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'border-color var(--n-duration-xs)',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--n-border-strong)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--n-border)'; }}
                >
                    <RefreshCw size={13} /> Actualiser
                </button>
            </div>

            {/* ── STAT GRID ─────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--n-space-3)', marginBottom: 'var(--n-space-6)' }}>
                {[
                    { label: 'Réussis',       value: `${passedQuizzes}/${totalQuizzes}`, variant: 'success'  },
                    { label: 'Score moyen',   value: `${averageScore.toFixed(0)}%`,      variant: 'accent'   },
                    { label: 'Tentatives',    value: `${totalAttempts}`,                 variant: 'info'     },
                    { label: 'Taux réussite', value: `${totalQuizzes > 0 ? Math.round((passedQuizzes / totalQuizzes) * 100) : 0}%`, variant: 'warning' },
                ].map(({ label, value, variant }) => (
                    <NotionCard key={label} variant="default" padding="sm">
                        <div style={{ padding: 'var(--n-space-2)', textAlign: 'center' }}>
                            <div style={{
                                fontSize: '22px',
                                fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'],
                                fontFamily: 'var(--n-font-mono)',
                                color: 'var(--n-text-primary)',
                                marginBottom: '2px',
                            }}>{value}</div>
                            <div style={{
                                fontSize: 'var(--n-text-xs)',
                                color: 'var(--n-text-tertiary)',
                                fontFamily: 'var(--n-font-sans)',
                            }}>{label}</div>
                        </div>
                    </NotionCard>
                ))}
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    marginBottom: 'var(--n-space-5)',
                    padding: 'var(--n-space-3) var(--n-space-4)',
                    borderRadius: 'var(--n-radius-sm)',
                    background: 'var(--n-danger-bg)',
                    border: '1px solid var(--n-danger-border)',
                    color: 'var(--n-danger)',
                    fontSize: 'var(--n-text-sm)',
                    fontFamily: 'var(--n-font-sans)',
                }}>
                    {error}
                </div>
            )}

            {/* ── FILTER TABS ───────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '2px', padding: '3px', borderRadius: 'var(--n-radius-sm)', border: '1px solid var(--n-border)', background: 'var(--n-bg-secondary)', marginBottom: 'var(--n-space-5)', width: 'fit-content' }}>
                {[
                    { value: 'all',     label: 'Tous',      count: quizzes.length },
                    { value: 'passed',  label: 'Réussis',   count: quizzes.filter(q => q.passed).length },
                    { value: 'pending', label: 'À faire',   count: quizzes.filter(q => !q.passed && q.attempts.length === 0).length },
                    { value: 'failed',  label: 'À refaire', count: quizzes.filter(q => !q.passed && q.attempts.length > 0).length },
                ].map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => setFilter(tab.value as typeof filter)}
                        style={{
                            padding: '5px 12px',
                            borderRadius: '5px',
                            border: filter === tab.value ? '1px solid var(--n-accent-border)' : '1px solid transparent',
                            background: filter === tab.value ? 'var(--n-bg-primary)' : 'transparent',
                            color: filter === tab.value ? 'var(--n-accent)' : 'var(--n-text-secondary)',
                            fontSize: 'var(--n-text-sm)',
                            fontWeight: filter === tab.value ? ('var(--n-weight-semibold)' as React.CSSProperties['fontWeight']) : undefined,
                            fontFamily: 'var(--n-font-sans)',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all var(--n-duration-xs)',
                        }}
                    >
                        {tab.label} ({tab.count})
                    </button>
                ))}
            </div>

            {/* ── QUIZ LIST ─────────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-3)' }}>
                {filteredQuizzes.map((quiz) => (
                    <NotionCard
                        key={quiz.id}
                        variant="default"
                        padding="md"
                        style={{
                            opacity: !quiz.available ? 0.55 : 1,
                            borderColor: quiz.passed
                                ? 'var(--n-success-border)'
                                : quiz.attempts.length > 0
                                    ? 'var(--n-warning-border)'
                                    : undefined,
                        }}
                    >
                        {/* Header row */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--n-space-3)' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-1)' }}>
                                    <h3 style={{
                                        fontSize: 'var(--n-text-base)',
                                        fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'],
                                        color: 'var(--n-text-primary)',
                                        fontFamily: 'var(--n-font-sans)',
                                    }}>
                                        {quiz.name}
                                    </h3>
                                    {quiz.passed && <NotionBadge variant="success" dot>Réussi</NotionBadge>}
                                    {!quiz.available && <NotionBadge variant="default"><Lock size={9} /> Verrouillé</NotionBadge>}
                                </div>
                                <Link href={`/student/theory/${quiz.workshopId}`}
                                      style={{
                                          display: 'inline-flex', alignItems: 'center', gap: 'var(--n-space-1)',
                                          fontSize: 'var(--n-text-sm)',
                                          color: 'var(--n-text-secondary)',
                                          textDecoration: 'none',
                                          fontFamily: 'var(--n-font-sans)',
                                          transition: 'color var(--n-duration-xs)',
                                      }}
                                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--n-accent)'; }}
                                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--n-text-secondary)'; }}>
                                    <BookOpen size={12} />
                                    {quiz.workshopName}
                                </Link>
                            </div>

                            {quiz.bestScore !== undefined && (
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{
                                        fontSize: '22px',
                                        fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'],
                                        fontFamily: 'var(--n-font-mono)',
                                        color: quiz.passed ? 'var(--n-success)' : 'var(--n-warning)',
                                        lineHeight: 1,
                                    }}>
                                        {quiz.bestScore}%
                                    </div>
                                    <div style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>
                                        Meilleur score
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Meta row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-4)', marginBottom: 'var(--n-space-3)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-1)', fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)' }}>
                                <Target size={12} style={{ color: 'var(--n-text-tertiary)' }} />
                                {quiz.questions} questions
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-1)', fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)' }}>
                                <Clock size={12} style={{ color: 'var(--n-text-tertiary)' }} />
                                {quiz.timeLimit} min max
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-1)', fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)' }}>
                                <RotateCcw size={12} style={{ color: 'var(--n-text-tertiary)' }} />
                                {quiz.attempts.length} tentative{quiz.attempts.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {/* Attempt history */}
                        {quiz.attempts.length > 0 && (
                            <div style={{ marginBottom: 'var(--n-space-3)' }}>
                                <p style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', marginBottom: 'var(--n-space-2)', fontWeight: 'var(--n-weight-medium)' as React.CSSProperties['fontWeight'] }}>
                                    Historique des tentatives
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--n-space-2)' }}>
                                    {quiz.attempts.map((attempt, index) => (
                                        <NotionBadge key={index} variant={attempt.passed ? 'success' : 'danger'}>
                                            {attempt.passed ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                            {attempt.score}%
                                            <span style={{ color: 'var(--n-text-tertiary)', fontWeight: 'normal' as React.CSSProperties['fontWeight'] }}>
                                                {new Date(attempt.date).toLocaleDateString('fr-FR')}
                                            </span>
                                        </NotionBadge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Separator */}
                        <div style={{ height: '1px', background: 'var(--n-border)', margin: '0 0 var(--n-space-3)' }} />

                        {/* Action */}
                        {quiz.available ? (
                            <Link href={`/student/quiz/${quiz.workshopId}`}
                                  style={{
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--n-space-2)',
                                      padding: '8px',
                                      borderRadius: 'var(--n-radius-sm)',
                                      textDecoration: 'none',
                                      fontSize: 'var(--n-text-sm)',
                                      fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'],
                                      fontFamily: 'var(--n-font-sans)',
                                      background: quiz.passed ? 'var(--n-bg-secondary)' : 'var(--n-accent)',
                                      color: quiz.passed ? 'var(--n-text-primary)' : '#fff',
                                      border: quiz.passed ? '1px solid var(--n-border)' : 'none',
                                      transition: 'opacity var(--n-duration-xs)',
                                  }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}>
                                {quiz.passed
                                    ? <><RotateCcw size={13} /> Refaire le quiz</>
                                    : quiz.attempts.length > 0
                                        ? <><RotateCcw size={13} /> Réessayer</>
                                        : <><Play size={13} /> Commencer le quiz</>}
                            </Link>
                        ) : !quiz.quizId ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--n-space-2)', padding: '8px', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-bg-secondary)', color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)', border: '1px solid var(--n-border)' }}>
                                <Lock size={13} /> Quiz indisponible pour cet atelier
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--n-space-2)', padding: '8px', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-bg-secondary)', color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)', border: '1px solid var(--n-border)' }}>
                                <Lock size={13} /> Terminez l&apos;atelier précédent pour débloquer
                            </div>
                        )}
                    </NotionCard>
                ))}
            </div>

            {/* Empty state */}
            {filteredQuizzes.length === 0 && (
                <NotionEmptyState
                    icon={<Target size={28} />}
                    title="Aucun quiz dans cette catégorie"
                    description="Modifiez votre filtre pour voir d'autres quiz."
                    size="sm"
                />
            )}

            {/* Info callout */}
            <div style={{
                marginTop: 'var(--n-space-8)',
                padding: 'var(--n-space-4)',
                borderRadius: 'var(--n-radius-md)',
                background: 'var(--n-info-bg)',
                border: '1px solid var(--n-info-border)',
            }}>
                <h3 style={{ fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-info)', fontFamily: 'var(--n-font-sans)', marginBottom: 'var(--n-space-2)' }}>
                    Comment valider un quiz ?
                </h3>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-1)', paddingLeft: 'var(--n-space-4)', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)' }}>
                    <li>Score minimum de <strong style={{ color: 'var(--n-info)' }}>80%</strong> requis pour valider</li>
                    <li>Retentatives illimitées — seul le meilleur score est conservé</li>
                    <li>Chaque quiz validé donne des XP et peut débloquer des badges</li>
                </ul>
            </div>
        </div>
    );
}
