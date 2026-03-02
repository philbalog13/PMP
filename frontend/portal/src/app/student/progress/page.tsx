'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import Link from 'next/link';
import {
    BookOpen, CheckCircle2, Clock, Trophy,
    ChevronRight, Play, Lock, Star, TrendingUp, RefreshCw
} from 'lucide-react';
import { NotionCard, NotionBadge, NotionProgress, NotionSkeleton, NotionEmptyState } from '@shared/components/notion';

/* ── Types ──────────────────────────────────────────────────────────────── */

interface SectionProgress {
    id: string; name: string; completed: boolean; timeSpent: number;
}

interface WorkshopProgress {
    id: string; name: string; description: string;
    sections: SectionProgress[];
    totalTime: number; completedTime: number;
    quizScore?: number; quizPassed?: boolean;
    status: 'completed' | 'in_progress' | 'not_started' | 'locked';
    xpEarned: number; xpTotal: number;
}

const WORKSHOP_ORDER = ['intro', 'iso8583', 'hsm-keys', '3ds-flow', 'fraud-detection', 'emv'];
const WORKSHOP_DESCRIPTIONS: Record<string, string> = {
    'intro':           'Découvrez les fondamentaux du monde des paiements',
    'iso8583':         'Maîtrisez le standard de communication bancaire',
    'hsm-keys':        'Sécurisez les transactions avec la cryptographie',
    '3ds-flow':        'Authentification forte pour les paiements en ligne',
    'fraud-detection': 'Détectez et prévenez les transactions frauduleuses',
    'emv':             'Comprenez les cartes à puce et le protocole EMV',
};

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

const STATUS_BADGE_VARIANT: Record<WorkshopProgress['status'], 'success' | 'accent' | 'default' | 'warning'> = {
    completed:   'success',
    in_progress: 'accent',
    not_started: 'default',
    locked:      'default',
};
const STATUS_LABEL: Record<WorkshopProgress['status'], string> = {
    completed:   'Terminé',
    in_progress: 'En cours',
    not_started: 'Non commencé',
    locked:      'Verrouillé',
};

/* ── Main Component ─────────────────────────────────────────────────────── */

export default function StudentProgressPage() {
    const { isLoading } = useAuth(true);
    const [workshops, setWorkshops] = useState<WorkshopProgress[]>([]);
    const [expandedWorkshop, setExpandedWorkshop] = useState<string | null>(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProgress = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            setError(null);
            const headers = { Authorization: `Bearer ${token}` };
            const [progressRes, statsRes] = await Promise.all([
                fetch('/api/progress', { headers }).catch(() => null),
                fetch('/api/progress/stats', { headers }).catch(() => null),
            ]);
            const progressData = progressRes?.ok ? await progressRes.json() : null;
            const statsData    = statsRes?.ok    ? await statsRes.json()    : null;
            const progressMap  = progressData?.progress || {};
            const quizResults  = statsData?.stats?.quizResults || [];

            let previousCompleted = true;
            const builtWorkshops: WorkshopProgress[] = WORKSHOP_ORDER.map((workshopId) => {
                const wp             = progressMap[workshopId];
                const name           = wp?.title || workshopId;
                const description    = WORKSHOP_DESCRIPTIONS[workshopId] || '';
                const totalSections  = wp?.total_sections || 5;
                const currentSection = wp?.current_section || 0;
                const progressPercent= wp?.progress_percent || 0;
                const timeSpent      = wp?.time_spent_minutes || 0;
                const rawStatus      = wp?.status || 'NOT_STARTED';

                const sections: SectionProgress[] = [];
                for (let i = 1; i <= totalSections; i++) {
                    sections.push({
                        id: String(i), name: `Section ${i}`,
                        completed: i <= currentSection,
                        timeSpent: i <= currentSection ? Math.round(timeSpent / Math.max(1, currentSection)) : 0,
                    });
                }

                const matchingAttempts = quizResults.filter((q: Record<string, unknown>) => {
                    const byWorkshopId = q?.workshop_id === workshopId || q?.workshopId === workshopId;
                    const byQuizId = (wp?.quiz_id && (q?.quiz_id === wp.quiz_id || q?.quizId === wp.quiz_id)) || false;
                    return byWorkshopId || byQuizId;
                });

                let bestAttempt: Record<string, unknown> | null = null;
                for (const attempt of matchingAttempts) {
                    const cur = Number(attempt?.percentage ?? 0);
                    if (!Number.isFinite(cur)) continue;
                    const best = Number(bestAttempt?.percentage ?? -1);
                    if (!bestAttempt || cur > best) bestAttempt = attempt;
                }

                const quizScore  = bestAttempt ? Number(bestAttempt.percentage ?? 0) : undefined;
                const quizPassed = bestAttempt ? parseAttemptPassed(bestAttempt.passed, quizScore ?? 0) : undefined;

                let status: WorkshopProgress['status'] = 'not_started';
                if (rawStatus === 'COMPLETED')        { status = 'completed';    previousCompleted = true;  }
                else if (rawStatus === 'IN_PROGRESS') { status = 'in_progress'; previousCompleted = false; }
                else if (previousCompleted)           { status = 'not_started'; previousCompleted = false; }
                else                                  { status = 'locked'; }

                const xpTotal  = totalSections * 50 + 100;
                const xpEarned = Math.round((progressPercent / 100) * xpTotal);
                return {
                    id: workshopId, name, description, sections,
                    totalTime: totalSections * 15, completedTime: timeSpent,
                    quizScore, quizPassed, status, xpEarned, xpTotal,
                };
            });

            const inProgress = builtWorkshops.find(w => w.status === 'in_progress');
            if (inProgress) setExpandedWorkshop(prev => prev || inProgress.id);
            setWorkshops(builtWorkshops);
        } catch (e: any) {
            setError(e.message || 'Erreur lors du chargement');
        } finally {
            setDataLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isLoading) return;
        fetchProgress();
    }, [isLoading, fetchProgress]);

    /* ── Computed ─────────────────────────────────────────────────────── */
    const totalXpEarned    = workshops.reduce((a, w) => a + w.xpEarned, 0);
    const totalXpPossible  = workshops.reduce((a, w) => a + w.xpTotal, 0);
    const totalTimeSpent   = workshops.reduce((a, w) => a + w.completedTime, 0);
    const completedWorkshops = workshops.filter(w => w.status === 'completed').length;
    const overallPercent   = totalXpPossible > 0 ? Math.round((totalXpEarned / totalXpPossible) * 100) : 0;

    const getRank = (xp: number) => {
        if (xp >= 2000) return 'EXPERT';
        if (xp >= 1000) return 'AVANCÉ';
        if (xp >= 500)  return 'INTERMÉDIAIRE';
        return 'DÉBUTANT';
    };

    const timeLabel = totalTimeSpent >= 60
        ? `${Math.floor(totalTimeSpent / 60)}h ${totalTimeSpent % 60}m`
        : `${totalTimeSpent} min`;

    /* ── Loading ──────────────────────────────────────────────────────── */
    if (isLoading || dataLoading) {
        return (
            <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '860px', margin: '0 auto' }}>
                <NotionSkeleton type="line" width="200px" height="28px" />
                <div style={{ marginTop: 'var(--n-space-2)', marginBottom: 'var(--n-space-6)' }}>
                    <NotionSkeleton type="line" width="300px" height="14px" />
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
        <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '860px', margin: '0 auto' }}>

            {/* ── PAGE HEADER ───────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--n-space-4)', marginBottom: 'var(--n-space-7)' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)', letterSpacing: '-0.02em', marginBottom: 'var(--n-space-1)' }}>
                        Ma Progression
                    </h1>
                    <p style={{ color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)' }}>
                        Suivez votre avancement dans chaque atelier de formation
                    </p>
                </div>
                <button
                    onClick={() => { setDataLoading(true); fetchProgress(); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', padding: '6px 14px', borderRadius: 'var(--n-radius-sm)', border: '1px solid var(--n-border)', background: 'var(--n-bg-primary)', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)', cursor: 'pointer', flexShrink: 0 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--n-border-strong)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--n-border)'; }}
                >
                    <RefreshCw size={13} /> Actualiser
                </button>
            </div>

            {/* ── STAT CARDS ────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--n-space-3)', marginBottom: 'var(--n-space-7)' }}>
                {[
                    { label: 'XP Total',   value: totalXpEarned.toLocaleString(), sub: `/ ${totalXpPossible.toLocaleString()} possible` },
                    { label: 'Rang',       value: getRank(totalXpEarned),          sub: 'niveau actuel' },
                    { label: 'Ateliers',   value: `${completedWorkshops}/${workshops.length}`, sub: 'terminés' },
                    { label: 'Avancement', value: `${overallPercent}%`,             sub: 'progression globale' },
                ].map(({ label, value, sub }) => (
                    <NotionCard key={label} variant="default" padding="sm">
                        <div style={{ padding: 'var(--n-space-2)', textAlign: 'center' }}>
                            <div style={{ fontSize: '20px', fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'], fontFamily: 'var(--n-font-mono)', color: 'var(--n-text-primary)', lineHeight: 1, marginBottom: '3px' }}>{value}</div>
                            <div style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>{sub}</div>
                            <div style={{ fontSize: '10px', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                        </div>
                    </NotionCard>
                ))}
            </div>

            {/* Error */}
            {error && (
                <div style={{ marginBottom: 'var(--n-space-5)', padding: 'var(--n-space-3) var(--n-space-4)', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-danger-bg)', border: '1px solid var(--n-danger-border)', color: 'var(--n-danger)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)' }}>
                    {error}
                </div>
            )}

            {/* ── TIME + RANK BAR ───────────────────────────────────── */}
            <NotionCard variant="default" padding="md" style={{ marginBottom: 'var(--n-space-6)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-5)', flexWrap: 'wrap' }}>
                    <Clock size={18} style={{ color: 'var(--n-accent)', flexShrink: 0 }} />
                    <div>
                        <span style={{ fontSize: '22px', fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'], fontFamily: 'var(--n-font-mono)', color: 'var(--n-text-primary)' }}>
                            {timeLabel}
                        </span>
                        <span style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)', marginLeft: 'var(--n-space-3)' }}>
                            de temps d&apos;étude cumulé
                        </span>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', flexShrink: 0 }}>
                        <Trophy size={16} style={{ color: 'var(--n-accent)' }} />
                        <span style={{ fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-accent)', fontFamily: 'var(--n-font-sans)' }}>
                            {getRank(totalXpEarned)}
                        </span>
                    </div>
                </div>
                {/* Overall progress */}
                <div style={{ marginTop: 'var(--n-space-4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--n-space-1)' }}>
                        <span style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>Progression globale</span>
                        <span style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-mono)' }}>{overallPercent}%</span>
                    </div>
                    <NotionProgress value={overallPercent} variant="accent" size="default" />
                </div>
            </NotionCard>

            {/* ── WORKSHOP SECTION HEADER ────────────────────────────── */}
            <p style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], marginBottom: 'var(--n-space-3)' }}>
                Ateliers de formation
            </p>

            {/* ── WORKSHOP ACCORDION LIST ────────────────────────────── */}
            {workshops.length === 0 ? (
                <NotionEmptyState icon={<BookOpen size={28} />} title="Aucun atelier disponible" description="Les ateliers apparaîtront ici dès qu'ils seront disponibles." />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-2)' }}>
                    {workshops.map((workshop) => {
                        const pct = workshop.totalTime > 0 ? Math.min(100, Math.round((workshop.completedTime / workshop.totalTime) * 100)) : 0;
                        const completedSections = workshop.sections.filter(s => s.completed).length;
                        const isExpanded = expandedWorkshop === workshop.id;
                        const isLocked   = workshop.status === 'locked';
                        const accentLine = workshop.status === 'completed' ? 'var(--n-success)' : workshop.status === 'in_progress' ? 'var(--n-accent)' : 'var(--n-border)';

                        return (
                            <NotionCard key={workshop.id} variant="default" padding="none" style={{ opacity: isLocked ? 0.5 : 1, overflow: 'hidden' }}>
                                {/* Left accent stripe + collapsible header */}
                                <div style={{ display: 'flex' }}>
                                    <div style={{ width: '3px', flexShrink: 0, background: accentLine }} />
                                    <button
                                        onClick={() => !isLocked && setExpandedWorkshop(isExpanded ? null : workshop.id)}
                                        disabled={isLocked}
                                        style={{
                                            flex: 1, padding: 'var(--n-space-4) var(--n-space-5)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            textAlign: 'left', background: 'transparent', border: 'none', cursor: isLocked ? 'not-allowed' : 'pointer',
                                            transition: 'background var(--n-duration-xs)',
                                        }}
                                        onMouseEnter={e => { if (!isLocked) (e.currentTarget as HTMLElement).style.background = 'var(--n-bg-secondary)'; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-3)' }}>
                                            {/* Status icon */}
                                            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-bg-secondary)', border: '1px solid var(--n-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                {workshop.status === 'completed' ? (
                                                    <CheckCircle2 size={18} style={{ color: 'var(--n-success)' }} />
                                                ) : workshop.status === 'locked' ? (
                                                    <Lock size={16} style={{ color: 'var(--n-text-tertiary)' }} />
                                                ) : (
                                                    <BookOpen size={16} style={{ color: workshop.status === 'in_progress' ? 'var(--n-accent)' : 'var(--n-text-secondary)' }} />
                                                )}
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-1)', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: 'var(--n-text-base)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)' }}>
                                                        {workshop.name}
                                                    </span>
                                                    <NotionBadge variant={STATUS_BADGE_VARIANT[workshop.status]} size="sm">
                                                        {STATUS_LABEL[workshop.status]}
                                                    </NotionBadge>
                                                </div>
                                                <p style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)' }}>
                                                    {workshop.description}
                                                </p>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-4)', flexShrink: 0, marginLeft: 'var(--n-space-4)' }}>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-mono)' }}>
                                                    {workshop.xpEarned} XP
                                                </div>
                                                <div style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>
                                                    {completedSections}/{workshop.sections.length} sections
                                                </div>
                                            </div>
                                            {!isLocked && (
                                                <ChevronRight size={16} style={{ color: 'var(--n-text-tertiary)', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform var(--n-duration-sm)', flexShrink: 0 }} />
                                            )}
                                        </div>
                                    </button>
                                </div>

                                {/* Progress bar (always visible) */}
                                <div style={{ paddingLeft: '3px' }}>
                                    <div style={{ padding: '0 var(--n-space-5) var(--n-space-3)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--n-space-1)' }}>
                                            <span style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>{pct}% complété</span>
                                            <span style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>{workshop.completedTime} / {workshop.totalTime} min</span>
                                        </div>
                                        <NotionProgress value={pct} variant={workshop.status === 'completed' ? 'success' : 'accent'} size="thin" />
                                    </div>
                                </div>

                                {/* Expanded detail */}
                                {isExpanded && (
                                    <div style={{ borderTop: '1px solid var(--n-border)', padding: 'var(--n-space-4) var(--n-space-5) var(--n-space-5)' }}>
                                        <p style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], marginBottom: 'var(--n-space-3)' }}>
                                            Sections
                                        </p>

                                        {/* Section list */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-1)', marginBottom: 'var(--n-space-4)' }}>
                                            {workshop.sections.map((section, index) => (
                                                <div key={section.id} style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: 'var(--n-space-2) var(--n-space-3)',
                                                    borderRadius: 'var(--n-radius-xs)',
                                                    background: section.completed ? 'var(--n-success-bg)' : 'var(--n-bg-secondary)',
                                                    border: section.completed ? '1px solid var(--n-success-border)' : '1px solid var(--n-border)',
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)' }}>
                                                        <span style={{
                                                            width: '22px', height: '22px', borderRadius: '50%',
                                                            background: section.completed ? 'var(--n-success)' : 'var(--n-bg-tertiary)',
                                                            color: section.completed ? '#fff' : 'var(--n-text-tertiary)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: 'var(--n-text-xs)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'],
                                                            flexShrink: 0,
                                                        }}>
                                                            {section.completed ? <CheckCircle2 size={12} /> : index + 1}
                                                        </span>
                                                        <span style={{ fontSize: 'var(--n-text-sm)', color: section.completed ? 'var(--n-text-primary)' : 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)' }}>
                                                            {section.name}
                                                        </span>
                                                    </div>
                                                    {section.completed && section.timeSpent > 0 && (
                                                        <span style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>
                                                            {section.timeSpent} min
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Quiz score */}
                                        {workshop.quizScore !== undefined && (
                                            <div style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: 'var(--n-space-3) var(--n-space-4)',
                                                borderRadius: 'var(--n-radius-sm)',
                                                background: workshop.quizPassed ? 'var(--n-success-bg)' : 'var(--n-danger-bg)',
                                                border: workshop.quizPassed ? '1px solid var(--n-success-border)' : '1px solid var(--n-danger-border)',
                                                marginBottom: 'var(--n-space-4)',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)' }}>
                                                    <Star size={14} style={{ color: workshop.quizPassed ? 'var(--n-success)' : 'var(--n-danger)' }} />
                                                    <span style={{ fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)' }}>
                                                        Quiz final
                                                    </span>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '22px', fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'], fontFamily: 'var(--n-font-mono)', color: workshop.quizPassed ? 'var(--n-success)' : 'var(--n-danger)', lineHeight: 1 }}>
                                                        {workshop.quizScore}%
                                                    </div>
                                                    <div style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>
                                                        {workshop.quizPassed ? 'Réussi !' : 'À refaire (80% requis)'}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* CTA */}
                                        {workshop.status !== 'completed' && workshop.status !== 'locked' && (
                                            <Link href={`/student/theory/${workshop.id}`}
                                                  style={{
                                                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--n-space-2)',
                                                      padding: '8px', borderRadius: 'var(--n-radius-sm)',
                                                      background: 'var(--n-accent)', color: '#fff',
                                                      fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'],
                                                      fontFamily: 'var(--n-font-sans)', textDecoration: 'none',
                                                      transition: 'opacity var(--n-duration-xs)',
                                                  }}
                                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
                                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}>
                                                <Play size={13} />
                                                {workshop.status === 'in_progress' ? "Continuer l'atelier" : "Commencer l'atelier"}
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </NotionCard>
                        );
                    })}
                </div>
            )}

            {/* ── QUIZ STATS SECTION ────────────────────────────────── */}
            {workshops.some(w => w.quizScore !== undefined) && (
                <div style={{ marginTop: 'var(--n-space-10)' }}>
                    <p style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], marginBottom: 'var(--n-space-3)' }}>
                        Résultats des quiz
                    </p>
                    <NotionCard variant="default" padding="lg">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--n-space-5)' }}>
                            {[
                                { label: 'Quiz tentés',     value: workshops.filter(w => w.quizScore !== undefined).length },
                                { label: 'Quiz réussis',    value: workshops.filter(w => w.quizPassed === true).length },
                                { label: 'Meilleur score',  value: `${Math.max(0, ...workshops.filter(w => w.quizScore !== undefined).map(w => w.quizScore!))}%` },
                                { label: 'Taux de réussite', value: (() => { const att = workshops.filter(w => w.quizScore !== undefined).length; const pass = workshops.filter(w => w.quizPassed === true).length; return att > 0 ? `${Math.round((pass / att) * 100)}%` : 'N/A'; })() },
                            ].map(({ label, value }) => (
                                <div key={label}>
                                    <div style={{ fontSize: '24px', fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'], fontFamily: 'var(--n-font-mono)', color: 'var(--n-text-primary)', lineHeight: 1, marginBottom: 'var(--n-space-1)' }}>
                                        {value}
                                    </div>
                                    <div style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        {label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </NotionCard>
                </div>
            )}
        </div>
    );
}
