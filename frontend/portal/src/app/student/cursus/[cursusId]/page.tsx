'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../auth/useAuth';
import {
    BookOpen, Clock, ArrowLeft,
    Layers, Award, FileQuestion, Trophy, Play, RotateCcw,
    CheckCircle2,
} from 'lucide-react';
import { NotionCard, NotionBadge, NotionProgress, NotionSkeleton, NotionEmptyState } from '@shared/components/notion';

/* ── Types ──────────────────────────────────────────────────────────────── */

interface Module {
    id: string;
    title: string;
    description: string;
    module_order: number;
    estimated_minutes: number;
    difficulty: string;
    chapter_count: number;
    quiz: { id: string; title: string } | null;
    completedChapters?: number;
    quizBestScore?: number;
    masteryScore?: number;
}

interface CursusDetail {
    id: string;
    title: string;
    description: string;
    level: string;
    estimated_hours: number;
    tags: string[];
    module_count: number;
}

/* ── Constants ──────────────────────────────────────────────────────────── */

const LEVEL_VARIANT: Record<string, 'beginner' | 'inter' | 'advanced' | 'expert'> = {
    DEBUTANT:      'beginner',
    INTERMEDIAIRE: 'inter',
    AVANCE:        'advanced',
    EXPERT:        'expert',
};

const LEVEL_LABEL: Record<string, string> = {
    DEBUTANT:      'Débutant',
    INTERMEDIAIRE: 'Intermédiaire',
    AVANCE:        'Avancé',
    EXPERT:        'Expert',
};

const MODULE_ICONS = ['⚡', '🔐', '🛡️', '🔍', '💳', '🌐', '🔑', '📊', '🧩', '🏆'];

/* ── Component ──────────────────────────────────────────────────────────── */

export default function CursusDetailPage() {
    const { isLoading: authLoading } = useAuth(true);
    const params   = useParams();
    const cursusId = params?.cursusId as string;

    const [cursus,         setCursus]         = useState<CursusDetail | null>(null);
    const [modules,        setModules]         = useState<Module[]>([]);
    const [finalQuiz,      setFinalQuiz]       = useState<any>(null);
    const [completedCount, setCompletedCount]  = useState(0);
    const [loading,        setLoading]         = useState(true);
    const [error,          setError]           = useState<string | null>(null);

    const fetchDetail = useCallback(async () => {
        if (!cursusId) return;
        try {
            setError(null);
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await fetch(`/api/cursus/${cursusId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Impossible de charger le cursus');
            const data = await res.json();
            if (data.success) {
                setCursus(data.cursus);
                setModules(data.modules || []);
                setFinalQuiz(data.finalQuiz);
                setCompletedCount(data.progress?.completed || 0);
            }
        } catch (err: any) {
            setError(err.message || 'Erreur de chargement');
        } finally {
            setLoading(false);
        }
    }, [cursusId]);

    useEffect(() => {
        if (authLoading) return;
        fetchDetail();
    }, [authLoading, fetchDetail]);

    const totalChapters = modules.reduce((sum, m) => sum + m.chapter_count, 0);
    const progressPct   = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;

    /* ── Resume target ── */
    const firstInProgress = modules.find(m => (m.completedChapters ?? 0) > 0 && (m.completedChapters ?? 0) < m.chapter_count);
    const firstUnstarted  = modules.find(m => (m.completedChapters ?? 0) === 0);
    const resumeTarget    = firstInProgress || firstUnstarted;

    /* ── Loading skeleton ────────────────────────────────────────────── */
    if (authLoading || loading) {
        return (
            <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '860px', margin: '0 auto' }}>
                <div style={{ marginBottom: 'var(--n-space-4)' }}>
                    <NotionSkeleton type="line" width="120px" height="14px" />
                </div>
                <NotionSkeleton type="card" />
                <div style={{ marginTop: 'var(--n-space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--n-space-4)' }}>
                    {[...Array(3)].map((_, i) => <NotionSkeleton key={i} type="card" />)}
                </div>
            </div>
        );
    }

    /* ── Error / not found ───────────────────────────────────────────── */
    if (!cursus) {
        return (
            <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '860px', margin: '0 auto' }}>
                <NotionEmptyState
                    icon={<BookOpen size={28} />}
                    title={error || 'Cursus non trouvé.'}
                    description="Vérifiez l'URL ou retournez à la liste des cursus."
                    action={
                        <div style={{ display: 'flex', gap: 'var(--n-space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {error && (
                                <button onClick={fetchDetail} style={{ display: 'inline-flex', alignItems: 'center', padding: '7px 16px', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-accent)', color: '#fff', fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], fontFamily: 'var(--n-font-sans)', border: 'none', cursor: 'pointer' }}>
                                    Réessayer
                                </button>
                            )}
                            <Link href="/student/cursus" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: 'var(--n-radius-sm)', border: '1px solid var(--n-border)', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)', textDecoration: 'none' }}>
                                <ArrowLeft size={14} /> Retour aux cursus
                            </Link>
                        </div>
                    }
                />
            </div>
        );
    }

    /* ── Render ──────────────────────────────────────────────────────── */
    return (
        <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '860px', margin: '0 auto' }}>

            {/* Back link */}
            <Link
                href="/student/cursus"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--n-space-2)', fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)', textDecoration: 'none', marginBottom: 'var(--n-space-5)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--n-text-primary)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--n-text-secondary)'}
            >
                <ArrowLeft size={15} /> Retour aux cursus
            </Link>

            {/* ══ HERO HEADER ════════════════════════════════════════════ */}
            <NotionCard variant="default" padding="md" style={{ marginBottom: 'var(--n-space-7)' }}>
                {/* Top accent bar */}
                <div style={{ height: '3px', borderRadius: '3px 3px 0 0', background: 'var(--n-accent)', margin: 'calc(-1 * var(--n-space-4)) calc(-1 * var(--n-space-4)) var(--n-space-5)' }} />

                {/* Level badge */}
                <div style={{ marginBottom: 'var(--n-space-4)' }}>
                    <NotionBadge variant={LEVEL_VARIANT[cursus.level] || 'beginner'}>
                        {LEVEL_LABEL[cursus.level] || cursus.level}
                    </NotionBadge>
                </div>

                <h1 style={{ fontSize: '24px', fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)', letterSpacing: '-0.02em', marginBottom: 'var(--n-space-3)' }}>
                    {cursus.title}
                </h1>
                <p style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)', lineHeight: 'var(--n-leading-relaxed)', marginBottom: 'var(--n-space-5)', maxWidth: '640px' }}>
                    {cursus.description}
                </p>

                {/* Stat chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-5)', flexWrap: 'wrap', marginBottom: 'var(--n-space-5)' }}>
                    {[
                        { Icon: Layers,   label: `${cursus.module_count} modules`,           color: 'var(--n-accent)' },
                        { Icon: Clock,    label: `${cursus.estimated_hours}h estimées`,       color: 'var(--n-info)' },
                        { Icon: BookOpen, label: `${totalChapters} UA`,                color: 'var(--n-text-tertiary)' },
                    ].map(({ Icon, label, color }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)' }}>
                            <div style={{ padding: '5px', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icon size={13} style={{ color }} />
                            </div>
                            {label}
                        </div>
                    ))}
                </div>

                {/* Progress + Resume button */}
                <div style={{ paddingTop: 'var(--n-space-5)', borderTop: '1px solid var(--n-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--n-space-5)', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', marginBottom: 'var(--n-space-2)' }}>
                            <span>Progression globale</span>
                            <span style={{ color: progressPct >= 100 ? 'var(--n-success)' : 'var(--n-text-secondary)' }}>
                                {completedCount}/{totalChapters} UA ({progressPct}%)
                            </span>
                        </div>
                        <NotionProgress value={progressPct} variant={progressPct >= 100 ? 'success' : 'accent'} size="thick" />
                    </div>

                    {resumeTarget && progressPct < 100 && (
                        <Link
                            href={`/student/cursus/${cursusId}/${resumeTarget.id}`}
                            style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 'var(--n-space-2)', padding: '8px 18px', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-accent)', color: '#fff', fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], fontFamily: 'var(--n-font-sans)', textDecoration: 'none' }}
                        >
                            <Play size={14} fill="white" />
                            {firstInProgress ? "Continuer l'apprentissage" : 'Commencer le cursus'}
                        </Link>
                    )}
                    {progressPct >= 100 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--n-space-2)', fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-success)', fontFamily: 'var(--n-font-sans)' }}>
                            <Trophy size={15} /> Cursus complété !
                        </span>
                    )}
                </div>

                {/* Tags */}
                {cursus.tags && cursus.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 'var(--n-space-2)', marginTop: 'var(--n-space-4)', flexWrap: 'wrap' }}>
                        {cursus.tags.map((tag) => (
                            <NotionBadge key={tag} variant="default" size="sm">{tag}</NotionBadge>
                        ))}
                    </div>
                )}
            </NotionCard>

            {/* ══ MODULE LIST ════════════════════════════════════════════ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-5)' }}>
                <Layers size={16} style={{ color: 'var(--n-accent)' }} />
                <h2 style={{ fontSize: 'var(--n-text-base)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)' }}>
                    Modules ({modules.length})
                </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-4)' }}>
                {modules.map((mod, idx) => {
                    const chaptersDone  = mod.completedChapters ?? 0;
                    const completedPct  = mod.chapter_count > 0 ? Math.round((chaptersDone / mod.chapter_count) * 100) : 0;
                    const isFullyDone   = completedPct >= 100;
                    const hasStarted    = chaptersDone > 0 || (mod.masteryScore ?? 0) > 0;
                    const quizDone      = (mod.quizBestScore ?? -1) >= 0;
                    const icon          = MODULE_ICONS[idx % MODULE_ICONS.length];

                    return (
                        <NotionCard
                            key={mod.id}
                            variant="hover"
                            padding="none"
                            style={{ borderColor: isFullyDone ? 'var(--n-success-border)' : undefined, overflow: 'hidden' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'stretch' }}>
                                {/* Left accent stripe */}
                                <div style={{ width: '3px', flexShrink: 0, background: isFullyDone ? 'var(--n-success)' : hasStarted ? 'var(--n-accent)' : 'var(--n-border)' }} />

                                {/* Content */}
                                <div style={{ flex: 1, padding: 'var(--n-space-5)', minWidth: 0 }}>
                                    {/* Module N label */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-2)', fontSize: 'var(--n-text-xs)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], fontFamily: 'var(--n-font-sans)', color: isFullyDone ? 'var(--n-success)' : 'var(--n-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {isFullyDone
                                            ? <CheckCircle2 size={11} />
                                            : <span style={{ width: '10px', height: '10px', borderRadius: '50%', border: '1.5px solid var(--n-border)', display: 'inline-block' }} />
                                        }
                                        Module {mod.module_order}
                                    </div>

                                    <h3 style={{ fontSize: 'var(--n-text-base)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)', marginBottom: 'var(--n-space-1)', lineHeight: 1.3 }}>
                                        {mod.title}
                                    </h3>

                                    {mod.description && (
                                        <p style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)', lineHeight: 'var(--n-leading-relaxed)', marginBottom: 'var(--n-space-4)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                            {mod.description}
                                        </p>
                                    )}

                                    {/* Stats */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-4)', fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', marginBottom: 'var(--n-space-4)', flexWrap: 'wrap' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <BookOpen size={11} /> {mod.chapter_count} UA
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={11} />
                                            {mod.estimated_minutes >= 60
                                                ? `${Math.floor(mod.estimated_minutes / 60)}h${mod.estimated_minutes % 60 > 0 ? ` ${mod.estimated_minutes % 60}min` : ''}`
                                                : `${mod.estimated_minutes}min`}
                                        </span>
                                        {mod.quiz && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: quizDone ? 'var(--n-accent)' : 'var(--n-text-tertiary)' }}>
                                                <FileQuestion size={11} />
                                                {quizDone ? `Quiz ${mod.quizBestScore}%` : 'Quiz inclus'}
                                            </span>
                                        )}
                                    </div>

                                    {/* Progress bar — only if started */}
                                    {hasStarted && (
                                        <div style={{ marginBottom: 'var(--n-space-4)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', marginBottom: 'var(--n-space-1)' }}>
                                                <span>{chaptersDone}/{mod.chapter_count} UA validées</span>
                                                <span style={{ color: isFullyDone ? 'var(--n-success)' : 'var(--n-text-secondary)' }}>{completedPct}%</span>
                                            </div>
                                            <NotionProgress value={completedPct} variant={isFullyDone ? 'success' : 'accent'} size="default" />
                                        </div>
                                    )}

                                    {/* CTA */}
                                    <Link
                                        href={`/student/cursus/${cursusId}/${mod.id}`}
                                        style={
                                            isFullyDone
                                                ? { display: 'inline-flex', alignItems: 'center', gap: 'var(--n-space-2)', padding: '6px 14px', borderRadius: 'var(--n-radius-sm)', border: '1px solid var(--n-border)', background: 'var(--n-bg-primary)', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)', textDecoration: 'none' }
                                                : hasStarted
                                                    ? { display: 'inline-flex', alignItems: 'center', gap: 'var(--n-space-2)', padding: '6px 14px', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-accent)', color: '#fff', fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], fontFamily: 'var(--n-font-sans)', textDecoration: 'none' }
                                                    : { display: 'inline-flex', alignItems: 'center', gap: 'var(--n-space-2)', padding: '6px 14px', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-success-bg)', border: '1px solid var(--n-success-border)', color: 'var(--n-success)', fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], fontFamily: 'var(--n-font-sans)', textDecoration: 'none' }
                                        }
                                    >
                                        {isFullyDone
                                            ? <><RotateCcw size={13} /> Revoir</>
                                            : hasStarted
                                                ? <><Play size={13} fill="white" /> Continuer</>
                                                : <><Play size={13} fill="currentColor" /> Démarrer</>
                                        }
                                    </Link>
                                </div>

                                {/* Icon panel */}
                                <div style={{ width: '72px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid var(--n-border)', background: isFullyDone ? 'var(--n-success-bg)' : 'var(--n-bg-elevated)' }}>
                                    <span style={{ fontSize: '2rem', userSelect: 'none', filter: isFullyDone ? 'none' : 'grayscale(0.3)' }}>{icon}</span>
                                </div>
                            </div>
                        </NotionCard>
                    );
                })}
            </div>

            {/* ══ FINAL QUIZ / CERTIFICATION ═════════════════════════════ */}
            {finalQuiz && (
                <NotionCard variant="default" padding="md" style={{ marginTop: 'var(--n-space-7)', borderColor: 'var(--n-accent-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-4)' }}>
                        <div style={{ padding: 'var(--n-space-3)', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-accent-light)', border: '1px solid var(--n-accent-border)', flexShrink: 0 }}>
                            <Trophy size={22} style={{ color: 'var(--n-accent)' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{ fontSize: 'var(--n-text-base)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)', marginBottom: 'var(--n-space-1)' }}>
                                {finalQuiz.title}
                            </h3>
                            <p style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)' }}>
                                Complétez tous les modules pour débloquer l&apos;évaluation finale et obtenir votre certificat.
                            </p>
                        </div>
                        <Award size={18} style={{ color: 'var(--n-accent)', flexShrink: 0 }} />
                    </div>
                </NotionCard>
            )}
        </div>
    );
}
