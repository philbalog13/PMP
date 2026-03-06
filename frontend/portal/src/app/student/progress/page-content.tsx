'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  Lock,
  Play,
  RefreshCw,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import {
  NotionBadge,
  NotionButton,
  NotionCard,
  NotionEmptyState,
  NotionPill,
  NotionProgress,
  NotionProgressRing,
  NotionSkeleton,
  NotionTooltip,
} from '@shared/components/notion';

interface ProgressStats {
  workshops?: {
    completed?: number;
    total?: number;
    totalTime?: number;
  };
  quizzes?: {
    passed?: number;
  };
  totalXP?: number;
}

interface ProgressWorkshopEntry {
  title?: string;
  description?: string;
  status?: string;
  progress_percent?: number;
  current_section?: number;
  total_sections?: number;
  time_spent_minutes?: number;
  estimated_minutes?: number | null;
  quiz_id?: string | null;
  sequence_status?: string;
}

interface QuizSummary {
  score: number | null;
  passed: boolean | null;
  attempts: number;
}

interface WorkshopProgress {
  id: string;
  name: string;
  description: string;
  currentSection: number;
  totalSections: number;
  progressPercent: number;
  timeSpentMinutes: number;
  estimatedMinutes: number | null;
  quizId: string | null;
  quiz: QuizSummary;
  status: 'completed' | 'in_progress' | 'not_started' | 'locked';
}

const WORKSHOP_ORDER = ['intro', 'iso8583', 'hsm-keys', '3ds-flow', 'fraud-detection', 'emv'];

const WORKSHOP_DESCRIPTIONS: Record<string, string> = {
  intro: 'Decouvrez les fondamentaux du monde des paiements.',
  iso8583: 'Maitrisez le standard de communication bancaire.',
  'hsm-keys': 'Securisez les transactions avec la cryptographie.',
  '3ds-flow': 'Approfondissez l authentification forte en ligne.',
  'fraud-detection': 'Detectez et prevenez les transactions frauduleuses.',
  emv: 'Comprenez le protocole EMV et la carte a puce.',
};

const STATUS_LABEL: Record<WorkshopProgress['status'], string> = {
  completed: 'Termine',
  in_progress: 'En cours',
  not_started: 'Pret',
  locked: 'Verrouille',
};

const STATUS_BADGE: Record<WorkshopProgress['status'], 'success' | 'accent' | 'info' | 'default'> = {
  completed: 'success',
  in_progress: 'accent',
  not_started: 'info',
  locked: 'default',
};

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === 't' || normalized === '1';
  }
  return false;
}

function normalizeSequenceStatus(value: unknown): WorkshopProgress['status'] | null {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'COMPLETED') return 'completed';
  if (normalized === 'IN_PROGRESS') return 'in_progress';
  if (normalized === 'AVAILABLE') return 'not_started';
  if (normalized === 'LOCKED') return 'locked';
  return null;
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes)) return 'Non renseigne';
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
  }
  return `${minutes} min`;
}

export default function StudentProgressPage() {
  const { isLoading } = useAuth(true);
  const [workshops, setWorkshops] = useState<WorkshopProgress[]>([]);
  const [expandedWorkshop, setExpandedWorkshop] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ProgressStats | null>(null);

  const fetchProgress = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setDataLoading(false);
      setWorkshops([]);
      return;
    }

    try {
      setDataLoading(true);
      setError(null);

      const headers = { Authorization: `Bearer ${token}` };
      const [progressRes, statsRes] = await Promise.all([
        fetch('/api/progress', { headers }).catch(() => null),
        fetch('/api/progress/stats', { headers }).catch(() => null),
      ]);

      const progressData = progressRes?.ok ? await progressRes.json() : null;
      const statsData = statsRes?.ok ? await statsRes.json() : null;

      const progressMap = (progressData?.progress || {}) as Record<string, ProgressWorkshopEntry>;
      setStats((statsData?.stats || null) as ProgressStats | null);

      let unlockCursor = true;
      const workshopDescriptors = WORKSHOP_ORDER.map((workshopId) => {
        const workshopProgress = progressMap[workshopId];
        const rawStatus = String(workshopProgress?.status || 'NOT_STARTED').toUpperCase();

        let status = normalizeSequenceStatus(workshopProgress?.sequence_status);
        if (!status) {
          if (rawStatus === 'COMPLETED') {
            status = 'completed';
            unlockCursor = true;
          } else if (rawStatus === 'IN_PROGRESS') {
            status = 'in_progress';
            unlockCursor = false;
          } else if (unlockCursor) {
            status = 'not_started';
            unlockCursor = false;
          } else {
            status = 'locked';
          }
        } else if (status === 'completed') {
          unlockCursor = true;
        } else {
          unlockCursor = false;
        }

        return {
          workshopId,
          quizId: workshopProgress?.quiz_id || null,
          status,
          progress: workshopProgress,
        };
      });

      const builtWorkshops = await Promise.all(
        workshopDescriptors.map(async ({ workshopId, quizId, status, progress }) => {
          let quizSummary: QuizSummary = {
            score: null,
            passed: null,
            attempts: 0,
          };

          if (quizId) {
            const resultsRes = await fetch(`/api/progress/quiz/${quizId}/results`, { headers }).catch(() => null);
            if (resultsRes?.ok) {
              const payload = await resultsRes.json();
              const results = Array.isArray(payload?.results) ? (payload.results as Array<Record<string, unknown>>) : [];
              quizSummary = {
                score: toNumber(payload?.bestScore, 0),
                passed: results.some((row) => toBoolean(row.passed)),
                attempts: results.length,
              };
            } else if (resultsRes?.status === 404) {
              quizSummary = { score: null, passed: null, attempts: 0 };
            }
          }

          return {
            id: workshopId,
            name: progress?.title || workshopId,
            description: progress?.description || WORKSHOP_DESCRIPTIONS[workshopId] || '',
            currentSection: toNumber(progress?.current_section),
            totalSections: toNumber(progress?.total_sections),
            progressPercent: toNumber(progress?.progress_percent),
            timeSpentMinutes: toNumber(progress?.time_spent_minutes),
            estimatedMinutes: progress?.estimated_minutes === null || progress?.estimated_minutes === undefined
              ? null
              : toNumber(progress?.estimated_minutes),
            quizId,
            quiz: quizSummary,
            status,
          } satisfies WorkshopProgress;
        })
      );

      const firstInProgress = builtWorkshops.find((workshop) => workshop.status === 'in_progress');
      if (firstInProgress) {
        setExpandedWorkshop((prev) => prev || firstInProgress.id);
      }

      setWorkshops(builtWorkshops);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement de la progression');
      setWorkshops([]);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    void fetchProgress();
  }, [isLoading, fetchProgress]);

  const metrics = useMemo(() => {
    const totalXpEarned = toNumber(stats?.totalXP);
    const totalTimeSpent = toNumber(stats?.workshops?.totalTime, workshops.reduce((acc, workshop) => acc + workshop.timeSpentMinutes, 0));
    const completedWorkshops = toNumber(stats?.workshops?.completed, workshops.filter((workshop) => workshop.status === 'completed').length);
    const totalWorkshops = toNumber(stats?.workshops?.total, workshops.length);
    const overallPercent =
      workshops.length > 0
        ? Math.round(workshops.reduce((acc, workshop) => acc + workshop.progressPercent, 0) / workshops.length)
        : 0;
    const nextWorkshop =
      workshops.find((workshop) => workshop.status === 'in_progress')
      || workshops.find((workshop) => workshop.status === 'not_started');
    const totalQuizTracked = workshops.filter((workshop) => workshop.quizId).length;
    const totalQuizPassed = workshops.filter((workshop) => workshop.quiz.passed === true).length;

    return {
      totalXpEarned,
      totalTimeSpent,
      completedWorkshops,
      totalWorkshops,
      overallPercent,
      nextWorkshop,
      totalQuizTracked,
      totalQuizPassed,
    };
  }, [stats, workshops]);

  const timeLabel = formatMinutes(metrics.totalTimeSpent);
  const showDataSkeleton = dataLoading && workshops.length === 0;

  if (isLoading) {
    return (
      <div className="n-page-container" style={{ maxWidth: '1200px' }}>
        <NotionSkeleton type="line" width="200px" height="28px" />
        <div style={{ marginTop: 'var(--n-space-2)', marginBottom: 'var(--n-space-6)' }}>
          <NotionSkeleton type="line" width="300px" height="14px" />
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 'var(--n-space-3)',
            marginBottom: 'var(--n-space-6)',
          }}
        >
          {[...Array(4)].map((_, index) => (
            <NotionSkeleton key={index} type="stat" />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--n-space-3)' }}>
          {[...Array(4)].map((_, index) => (
            <NotionSkeleton key={index} type="card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="n-page-container" style={{ maxWidth: '1200px' }}>
      <section>
        <NotionCard padding="lg">
          <div
            style={{
              display: 'grid',
              gap: 'var(--n-space-6)',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              alignItems: 'center',
            }}
          >
            <div>
              <NotionPill variant="accent" icon={<Zap size={12} />}>
                Timeline parcours
              </NotionPill>
              <h1
                style={{
                  margin: 'var(--n-space-3) 0 var(--n-space-2)',
                  fontSize: 'var(--n-text-2xl)',
                  color: 'var(--n-text-primary)',
                  fontWeight: 'var(--n-weight-bold)',
                }}
              >
                Ma progression globale
              </h1>
              <p style={{ margin: 0, color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>
                Les chiffres affiches ici proviennent des progressions, quiz et badges du backend.
              </p>

              {metrics.nextWorkshop && (
                <div
                  style={{
                    marginTop: 'var(--n-space-4)',
                    padding: 'var(--n-space-4)',
                    borderRadius: 'var(--n-radius-md)',
                    border: '1px solid var(--n-accent-border)',
                    background: 'linear-gradient(150deg, var(--n-accent-light), var(--n-bg-elevated))',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-2)' }}>
                    <Sparkles size={13} style={{ color: 'var(--n-accent)' }} />
                    <span style={{ color: 'var(--n-accent)', fontSize: 'var(--n-text-xs)', fontWeight: 'var(--n-weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Next best action
                    </span>
                  </div>
                  <h2 style={{ margin: 0, color: 'var(--n-text-primary)', fontSize: 'var(--n-text-lg)' }}>{metrics.nextWorkshop.name}</h2>
                  <p style={{ margin: 'var(--n-space-2) 0 var(--n-space-3)', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>
                    {metrics.nextWorkshop.status === 'in_progress'
                      ? `${metrics.nextWorkshop.progressPercent}% complete. Reprenez ce module.`
                      : metrics.nextWorkshop.estimatedMinutes !== null
                        ? `Duree prevue ${formatMinutes(metrics.nextWorkshop.estimatedMinutes)}. Demarrez ce module.`
                        : 'Module disponible a demarrer.'}
                  </p>
                  <Link prefetch={false} href={`/student/theory/${metrics.nextWorkshop.id}`} style={{ textDecoration: 'none' }}>
                    <NotionButton leftIcon={<Play size={13} />}>
                      {metrics.nextWorkshop.status === 'in_progress' ? 'Continuer le module' : 'Demarrer le module'}
                    </NotionButton>
                  </Link>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--n-space-3)' }}>
              <NotionProgressRing value={metrics.overallPercent} label={`${metrics.overallPercent}%`} />
              <NotionPill variant="reward" icon={<Trophy size={11} />}>
                {metrics.completedWorkshops}/{metrics.totalWorkshops} ateliers termines
              </NotionPill>
              <p style={{ margin: 0, fontSize: 'var(--n-text-xs)', color: 'var(--n-text-secondary)' }}>
                {metrics.totalXpEarned} XP valides
              </p>
            </div>
          </div>
        </NotionCard>
      </section>

      <section
        style={{
          marginTop: 'var(--n-space-4)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 'var(--n-space-3)',
        }}
      >
        {showDataSkeleton
          ? [...Array(4)].map((_, index) => <NotionSkeleton key={`progress-stat-skeleton-${index}`} type="stat" />)
          : [
              { label: 'XP valides', value: metrics.totalXpEarned.toLocaleString(), tone: 'var(--n-accent)' },
              { label: 'Ateliers termines', value: `${metrics.completedWorkshops}/${metrics.totalWorkshops}`, tone: 'var(--n-success)' },
              { label: 'Temps etude', value: timeLabel, tone: 'var(--n-info)' },
              { label: 'Quiz valides', value: `${metrics.totalQuizPassed}/${metrics.totalQuizTracked}`, tone: 'var(--n-warning)' },
            ].map((stat) => (
              <NotionCard key={stat.label} padding="md">
                <div style={{ color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)', textTransform: 'uppercase' }}>{stat.label}</div>
                <div
                  style={{
                    marginTop: 'var(--n-space-2)',
                    color: stat.tone,
                    fontFamily: 'var(--n-font-mono)',
                    fontSize: 'var(--n-text-lg)',
                    fontWeight: 'var(--n-weight-bold)',
                  }}
                >
                  {stat.value}
                </div>
              </NotionCard>
            ))}
      </section>

      <NotionCard padding="md" style={{ marginTop: 'var(--n-space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--n-space-3)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 'var(--n-text-lg)', color: 'var(--n-text-primary)' }}>Parcours modules</h2>
            <p style={{ margin: '4px 0 0', fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)' }}>
              Les details affichent uniquement des donnees reelles connues du backend.
            </p>
          </div>
          <NotionButton variant="secondary" leftIcon={<RefreshCw size={13} />} onClick={() => void fetchProgress()} loading={dataLoading}>
            Rafraichir
          </NotionButton>
        </div>
      </NotionCard>

      {error && (
        <div
          style={{
            marginTop: 'var(--n-space-4)',
            padding: 'var(--n-space-3) var(--n-space-4)',
            borderRadius: 'var(--n-radius-sm)',
            border: '1px solid var(--n-danger-border)',
            background: 'var(--n-danger-bg)',
            color: 'var(--n-danger)',
            fontSize: 'var(--n-text-sm)',
          }}
        >
          {error}
        </div>
      )}

      {showDataSkeleton ? (
        <div
          style={{
            marginTop: 'var(--n-space-4)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--n-space-3)',
          }}
        >
          {[...Array(4)].map((_, index) => (
            <NotionSkeleton key={`progress-card-skeleton-${index}`} type="card" />
          ))}
        </div>
      ) : workshops.length === 0 ? (
        <div style={{ marginTop: 'var(--n-space-4)' }}>
          <NotionEmptyState
            icon={<BookOpen size={24} />}
            title="Aucun atelier disponible"
            description="Les ateliers apparaitront ici des que votre formation sera activee."
          />
        </div>
      ) : (
        <div style={{ marginTop: 'var(--n-space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--n-space-3)' }}>
          {workshops.map((workshop) => {
            const isExpanded = expandedWorkshop === workshop.id;
            const isLocked = workshop.status === 'locked';

            return (
              <div key={workshop.id}>
                <NotionCard
                  padding="md"
                  variant="hover"
                  style={{
                    opacity: isLocked ? 0.62 : 1,
                    borderColor:
                      workshop.status === 'completed'
                        ? 'var(--n-success-border)'
                        : workshop.status === 'in_progress'
                          ? 'var(--n-accent-border)'
                          : undefined,
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: 'var(--n-space-3)',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--n-space-2)', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)' }}>{workshop.name}</h3>
                        <NotionBadge variant={STATUS_BADGE[workshop.status]} size="sm">
                          {isLocked && <Lock size={10} />} {STATUS_LABEL[workshop.status]}
                        </NotionBadge>
                      </div>
                      <p style={{ margin: '6px 0 0', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>{workshop.description}</p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-mono)', fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-bold)' }}>
                        {workshop.progressPercent}%
                      </div>
                      <div style={{ color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)' }}>
                        {workshop.currentSection}/{workshop.totalSections || 0} sections
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 'var(--n-space-3)',
                      marginTop: 'var(--n-space-3)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)' }}>Progression reelle</span>
                        <span style={{ color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-xs)' }}>{workshop.progressPercent}%</span>
                      </div>
                      <NotionProgress value={workshop.progressPercent} variant={workshop.status === 'completed' ? 'success' : 'accent'} size="thin" />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)' }}>Temps passe</span>
                        <span style={{ color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-xs)' }}>
                          {formatMinutes(workshop.timeSpentMinutes)}
                        </span>
                      </div>
                      <NotionProgress
                        value={
                          workshop.estimatedMinutes && workshop.estimatedMinutes > 0
                            ? Math.min(100, Math.round((workshop.timeSpentMinutes / workshop.estimatedMinutes) * 100))
                            : 0
                        }
                        variant={workshop.status === 'completed' ? 'success' : 'accent'}
                        size="thin"
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 'var(--n-space-3)', display: 'flex', flexWrap: 'wrap', gap: 'var(--n-space-2)', alignItems: 'center' }}>
                    {isLocked ? (
                      <NotionTooltip content="Terminez le module precedent pour debloquer ce parcours.">
                        <span>
                          <NotionButton variant="ghost" leftIcon={<Lock size={12} />} disabled>
                            Module verrouille
                          </NotionButton>
                        </span>
                      </NotionTooltip>
                    ) : (
                      <Link prefetch={false} href={`/student/theory/${workshop.id}`} style={{ textDecoration: 'none' }}>
                        <NotionButton variant={workshop.status === 'not_started' ? 'secondary' : 'primary'} leftIcon={<Play size={12} />}>
                          {workshop.status === 'in_progress' ? 'Continuer' : workshop.status === 'completed' ? 'Reviser' : 'Demarrer'}
                        </NotionButton>
                      </Link>
                    )}

                    <NotionButton
                      variant="ghost"
                      onClick={() => setExpandedWorkshop((prev) => (prev === workshop.id ? null : workshop.id))}
                      rightIcon={isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      disabled={isLocked}
                    >
                      Details
                    </NotionButton>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: 'var(--n-space-3)', paddingTop: 'var(--n-space-3)', borderTop: '1px solid var(--n-border)' }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: 'var(--n-space-3)',
                        }}
                      >
                        {[
                          { label: 'Sections valides', value: `${workshop.currentSection}/${workshop.totalSections || 0}` },
                          { label: 'Temps passe', value: formatMinutes(workshop.timeSpentMinutes) },
                          { label: 'Duree prevue', value: formatMinutes(workshop.estimatedMinutes) },
                          {
                            label: 'Quiz final',
                            value: workshop.quizId
                              ? workshop.quiz.score !== null
                                ? `${workshop.quiz.score}% (${workshop.quiz.attempts} tentative${workshop.quiz.attempts > 1 ? 's' : ''})`
                                : 'Non tente'
                              : 'Aucun quiz',
                          },
                        ].map((item) => (
                          <NotionCard key={`${workshop.id}-${item.label}`} padding="md">
                            <div style={{ color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)', textTransform: 'uppercase' }}>{item.label}</div>
                            <div
                              style={{
                                marginTop: 'var(--n-space-2)',
                                color: 'var(--n-text-primary)',
                                fontFamily: 'var(--n-font-mono)',
                                fontSize: 'var(--n-text-sm)',
                                fontWeight: 'var(--n-weight-bold)',
                              }}
                            >
                              {item.value}
                            </div>
                          </NotionCard>
                        ))}
                      </div>

                      {workshop.quizId && workshop.quiz.score !== null && (
                        <div
                          style={{
                            marginTop: 'var(--n-space-3)',
                            borderRadius: 'var(--n-radius-sm)',
                            border: `1px solid ${workshop.quiz.passed ? 'var(--n-success-border)' : 'var(--n-danger-border)'}`,
                            background: workshop.quiz.passed ? 'var(--n-success-bg)' : 'var(--n-danger-bg)',
                            padding: 'var(--n-space-3) var(--n-space-4)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)' }}>
                            <Star size={14} style={{ color: workshop.quiz.passed ? 'var(--n-success)' : 'var(--n-danger)' }} />
                            <span style={{ color: 'var(--n-text-primary)', fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' }}>
                              Quiz final
                            </span>
                          </div>
                          <span
                            style={{
                              color: workshop.quiz.passed ? 'var(--n-success)' : 'var(--n-danger)',
                              fontFamily: 'var(--n-font-mono)',
                              fontSize: 'var(--n-text-lg)',
                              fontWeight: 'var(--n-weight-bold)',
                            }}
                          >
                            {workshop.quiz.score}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </NotionCard>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
