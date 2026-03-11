'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Lock,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import {
  NotionBadge,
  NotionButton,
  NotionCard,
  NotionEmptyState,
  NotionPill,
  NotionProgress,
  NotionSkeleton,
  NotionTabs,
  NotionTooltip,
} from '@shared/components/notion';

interface QuizAttempt {
  id: string;
  date: string;
  score: number;
  maxScore: number;
  passed: boolean;
  timeSpentSeconds: number | null;
  attemptNumber: number | null;
}

interface Quiz {
  id: string;
  quizId: string | null;
  name: string;
  workshopId: string;
  workshopName: string;
  questionCount: number | null;
  timeLimitMinutes: number | null;
  passPercentage: number | null;
  attempts: QuizAttempt[];
  bestScore: number | null;
  passed: boolean;
  available: boolean;
  sequenceStatus: 'COMPLETED' | 'IN_PROGRESS' | 'AVAILABLE' | 'LOCKED';
}

interface WorkshopCatalogEntry {
  id: string;
  title?: string;
  quizId?: string | null;
  moduleOrder?: number;
  quizPassPercentage?: number | null;
  quizTimeLimitMinutes?: number | null;
  quizQuestionCount?: number | null;
}

interface ProgressWorkshopEntry {
  title?: string;
  status?: string;
  quiz_id?: string | null;
  quiz_title?: string | null;
  quiz_pass_percentage?: number | null;
  quiz_time_limit_minutes?: number | null;
  quiz_question_count?: number | null;
  sequence_status?: string;
}

interface QuizDefinitionPayload {
  quiz?: {
    title?: string;
    questionCount?: number;
    timeLimitMinutes?: number | null;
    passPercentage?: number;
  };
}

interface QuizResultsPayload {
  results?: Array<Record<string, unknown>>;
  bestScore?: number;
}

type QuizFilter = 'all' | 'passed' | 'pending' | 'failed';

const WORKSHOP_ORDER = ['intro', 'iso8583', 'hsm-keys', '3ds-flow', 'fraud-detection', 'emv'];

const WORKSHOP_NAMES: Record<string, string> = {
  intro: 'Introduction aux paiements',
  iso8583: 'Protocole ISO 8583',
  'hsm-keys': 'Gestion des cles HSM',
  '3ds-flow': '3D Secure v2',
  'fraud-detection': 'Detection de fraude',
  emv: 'Cartes EMV',
};

function toNullableNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

function normalizeSequenceStatus(value: unknown): Quiz['sequenceStatus'] | null {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'COMPLETED' || normalized === 'IN_PROGRESS' || normalized === 'AVAILABLE' || normalized === 'LOCKED') {
    return normalized;
  }
  return null;
}

function formatQuizMeta(quiz: Quiz): string {
  const parts: string[] = [];
  if (quiz.questionCount !== null) parts.push(`${quiz.questionCount} questions`);
  if (quiz.timeLimitMinutes !== null) parts.push(`${quiz.timeLimitMinutes} min`);
  if (quiz.passPercentage !== null) parts.push(`seuil ${quiz.passPercentage}%`);
  return parts.join(', ');
}

export default function StudentQuizzesPage() {
  const { isLoading } = useAuth(true);
  const [filter, setFilter] = useState<QuizFilter>('all');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuizData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setDataLoading(false);
      setQuizzes([]);
      return;
    }

    try {
      setDataLoading(true);
      setError(null);

      const headers = { Authorization: `Bearer ${token}` };
      const [progressRes, workshopsRes] = await Promise.all([
        fetch('/api/progress', { headers }).catch(() => null),
        fetch('/api/progress/workshops', { headers }).catch(() => null),
      ]);

      const progressData = progressRes?.ok ? await progressRes.json() : null;
      const workshopsData = workshopsRes?.ok ? await workshopsRes.json() : null;

      const progressMap = (progressData?.progress || {}) as Record<string, ProgressWorkshopEntry>;
      const workshopCatalog = (workshopsData?.workshops || []) as WorkshopCatalogEntry[];

      const orderedWorkshopIds =
        workshopCatalog.length > 0
          ? [...workshopCatalog]
              .sort((a, b) => Number(a.moduleOrder || 0) - Number(b.moduleOrder || 0))
              .map((entry) => entry.id)
          : WORKSHOP_ORDER;

      const workshopCatalogMap = new Map(workshopCatalog.map((entry) => [entry.id, entry]));

      let unlockCursor = true;
      const quizDescriptors = orderedWorkshopIds.map((workshopId) => {
        const workshopProgress = progressMap[workshopId];
        const workshopMeta = workshopCatalogMap.get(workshopId);
        const rawStatus = String(workshopProgress?.status || 'NOT_STARTED').toUpperCase();

        let sequenceStatus = normalizeSequenceStatus(workshopProgress?.sequence_status);
        if (!sequenceStatus) {
          if (rawStatus === 'COMPLETED') {
            sequenceStatus = 'COMPLETED';
            unlockCursor = true;
          } else if (rawStatus === 'IN_PROGRESS') {
            sequenceStatus = 'IN_PROGRESS';
            unlockCursor = false;
          } else if (unlockCursor) {
            sequenceStatus = 'AVAILABLE';
            unlockCursor = false;
          } else {
            sequenceStatus = 'LOCKED';
          }
        } else if (sequenceStatus === 'COMPLETED') {
          unlockCursor = true;
        } else {
          unlockCursor = false;
        }

        return {
          workshopId,
          workshopName: workshopMeta?.title || workshopProgress?.title || WORKSHOP_NAMES[workshopId] || workshopId,
          quizId: workshopProgress?.quiz_id || workshopMeta?.quizId || null,
          quizTitle: workshopProgress?.quiz_title || null,
          questionCount: toNullableNumber(workshopProgress?.quiz_question_count ?? workshopMeta?.quizQuestionCount),
          timeLimitMinutes: toNullableNumber(workshopProgress?.quiz_time_limit_minutes ?? workshopMeta?.quizTimeLimitMinutes),
          passPercentage: toNullableNumber(workshopProgress?.quiz_pass_percentage ?? workshopMeta?.quizPassPercentage),
          sequenceStatus,
        };
      });

      const builtQuizzes = await Promise.all(
        quizDescriptors.map(async (descriptor) => {
          let definitionData: QuizDefinitionPayload | null = null;
          let resultsData: QuizResultsPayload | null = null;

          if (descriptor.quizId) {
            const [definitionRes, resultsRes] = await Promise.all([
              fetch(`/api/progress/quiz/${descriptor.quizId}`, { headers }).catch(() => null),
              fetch(`/api/progress/quiz/${descriptor.quizId}/results`, { headers }).catch(() => null),
            ]);

            definitionData = definitionRes?.ok ? await definitionRes.json() : null;
            if (resultsRes?.ok) {
              resultsData = await resultsRes.json();
            } else if (resultsRes?.status === 404) {
              resultsData = { results: [] };
            }
          }

          const attempts = Array.isArray(resultsData?.results)
            ? resultsData.results.map((row, index) => ({
                id: String(row.id ?? `${descriptor.workshopId}-attempt-${index}`),
                date: String(row.submitted_at ?? row.submittedAt ?? ''),
                score: Number(row.percentage ?? 0) || 0,
                maxScore: Number(row.max_score ?? row.maxScore ?? 0) || 0,
                passed: toBoolean(row.passed),
                timeSpentSeconds: toNullableNumber(row.time_taken_seconds ?? row.timeTakenSeconds),
                attemptNumber: toNullableNumber(row.attempt_number ?? row.attemptNumber),
              }))
            : [];

          const bestScoreFromResults = toNullableNumber(resultsData?.bestScore);
          const bestScore = bestScoreFromResults ?? (attempts.length > 0 ? Math.max(...attempts.map((attempt) => attempt.score)) : null);
          const passed = attempts.some((attempt) => attempt.passed);

          const questionCount =
            toNullableNumber(definitionData?.quiz?.questionCount)
            ?? descriptor.questionCount;
          const timeLimitMinutes =
            toNullableNumber(definitionData?.quiz?.timeLimitMinutes)
            ?? descriptor.timeLimitMinutes;
          const passPercentage =
            toNullableNumber(definitionData?.quiz?.passPercentage)
            ?? descriptor.passPercentage;
          const quizName = descriptor.quizTitle || definitionData?.quiz?.title || `Quiz ${descriptor.workshopName}`;

          return {
            id: `quiz-${descriptor.workshopId}`,
            quizId: descriptor.quizId,
            name: quizName,
            workshopId: descriptor.workshopId,
            workshopName: descriptor.workshopName,
            questionCount,
            timeLimitMinutes,
            passPercentage,
            attempts,
            bestScore,
            passed,
            available: descriptor.sequenceStatus !== 'LOCKED' && Boolean(descriptor.quizId),
            sequenceStatus: descriptor.sequenceStatus,
          } satisfies Quiz;
        })
      );

      setQuizzes(builtQuizzes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des quiz');
      setQuizzes([]);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    void fetchQuizData();
  }, [isLoading, fetchQuizData]);

  const metrics = useMemo(() => {
    const totalQuizzes = quizzes.length;
    const passedQuizzes = quizzes.filter((quiz) => quiz.passed).length;
    const totalAttempts = quizzes.reduce((acc, quiz) => acc + quiz.attempts.length, 0);
    const quizzesWithScore = quizzes.filter((quiz) => quiz.bestScore !== null);
    const averageScore =
      quizzesWithScore.length > 0
        ? quizzesWithScore.reduce((acc, quiz) => acc + (quiz.bestScore || 0), 0) / quizzesWithScore.length
        : 0;
    const successRate = totalQuizzes > 0 ? Math.round((passedQuizzes / totalQuizzes) * 100) : 0;
    const pendingQuizzes = quizzes.filter((quiz) => !quiz.passed && quiz.attempts.length === 0).length;
    const failedQuizzes = quizzes.filter((quiz) => !quiz.passed && quiz.attempts.length > 0).length;
    const nextQuiz = quizzes.find((quiz) => quiz.available && !quiz.passed) || quizzes.find((quiz) => quiz.available);

    return {
      totalQuizzes,
      passedQuizzes,
      totalAttempts,
      averageScore,
      successRate,
      pendingQuizzes,
      failedQuizzes,
      nextQuiz,
    };
  }, [quizzes]);

  const filteredQuizzes = useMemo(
    () =>
      quizzes.filter((quiz) => {
        if (filter === 'all') return true;
        if (filter === 'passed') return quiz.passed;
        if (filter === 'pending') return !quiz.passed && quiz.attempts.length === 0;
        if (filter === 'failed') return !quiz.passed && quiz.attempts.length > 0;
        return true;
      }),
    [filter, quizzes]
  );

  const tabOptions = [
    { value: 'all' as QuizFilter, label: 'Tous', count: metrics.totalQuizzes },
    { value: 'passed' as QuizFilter, label: 'Reussis', count: metrics.passedQuizzes },
    { value: 'pending' as QuizFilter, label: 'A faire', count: metrics.pendingQuizzes },
    { value: 'failed' as QuizFilter, label: 'A refaire', count: metrics.failedQuizzes },
  ];

  const showDataSkeleton = dataLoading && quizzes.length === 0;
  const nextQuizMeta = metrics.nextQuiz ? formatQuizMeta(metrics.nextQuiz) : '';

  if (isLoading) {
    return (
      <div className="n-page-container" style={{ maxWidth: '1200px' }}>
        <div style={{ marginBottom: 'var(--n-space-6)' }}>
          <NotionSkeleton type="line" width="160px" height="28px" />
          <div style={{ marginTop: 'var(--n-space-2)' }}>
            <NotionSkeleton type="line" width="260px" height="14px" />
          </div>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--n-space-3)' }}>
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
              gap: 'var(--n-space-5)',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              alignItems: 'center',
            }}
          >
            <div>
              <NotionPill variant="accent" icon={<Target size={12} />}>
                Quiz zone
              </NotionPill>
              <h1
                style={{
                  margin: 'var(--n-space-3) 0 var(--n-space-2)',
                  fontSize: 'var(--n-text-2xl)',
                  color: 'var(--n-text-primary)',
                  fontWeight: 'var(--n-weight-bold)',
                }}
              >
                Mes quizzes
              </h1>
              <p style={{ margin: 0, color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>
                Definitions, seuils et tentatives sont lus depuis l API de progression.
              </p>

              {metrics.nextQuiz && (
                <div
                  style={{
                    marginTop: 'var(--n-space-4)',
                    padding: 'var(--n-space-4)',
                    borderRadius: 'var(--n-radius-md)',
                    border: '1px solid var(--n-accent-border)',
                    background: 'linear-gradient(140deg, var(--n-accent-light), var(--n-bg-elevated))',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-2)' }}>
                    <Sparkles size={13} style={{ color: 'var(--n-accent)' }} />
                    <span style={{ color: 'var(--n-accent)', fontSize: 'var(--n-text-xs)', fontWeight: 'var(--n-weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Mission du jour
                    </span>
                  </div>
                  <h2 style={{ margin: 0, color: 'var(--n-text-primary)', fontSize: 'var(--n-text-lg)' }}>{metrics.nextQuiz.name}</h2>
                  <p style={{ margin: 'var(--n-space-2) 0 var(--n-space-3)', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>
                    {nextQuizMeta || 'Metadonnees quiz indisponibles pour le moment.'}
                  </p>
                  <Link prefetch={false} href={`/student/quiz/${metrics.nextQuiz.workshopId}`} style={{ textDecoration: 'none' }}>
                    <NotionButton leftIcon={<Play size={13} />}>Demarrer maintenant</NotionButton>
                  </Link>
                </div>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(130px, 1fr))',
                gap: 'var(--n-space-3)',
              }}
            >
              {showDataSkeleton
                ? [...Array(4)].map((_, index) => <NotionSkeleton key={`quiz-stat-skeleton-${index}`} type="stat" />)
                : [
                    { label: 'Quiz reussis', value: `${metrics.passedQuizzes}/${metrics.totalQuizzes}`, tone: 'var(--n-success)' },
                    { label: 'Score moyen', value: `${metrics.averageScore.toFixed(0)}%`, tone: 'var(--n-accent)' },
                    { label: 'Tentatives', value: `${metrics.totalAttempts}`, tone: 'var(--n-info)' },
                    { label: 'Taux de reussite', value: `${metrics.successRate}%`, tone: 'var(--n-warning)' },
                  ].map((stat) => (
                    <NotionCard key={stat.label} padding="md">
                      <div style={{ color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)', textTransform: 'uppercase' }}>{stat.label}</div>
                      <div
                        style={{
                          marginTop: 'var(--n-space-1)',
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
            </div>
          </div>
        </NotionCard>
      </section>

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

      <NotionCard padding="md" style={{ marginTop: 'var(--n-space-4)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'var(--n-space-3)',
            alignItems: 'center',
          }}
        >
          <NotionTabs<QuizFilter> value={filter} options={tabOptions} onChange={setFilter} ariaLabel="Filtrer les quizzes" />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <NotionButton variant="secondary" leftIcon={<RefreshCw size={13} />} onClick={() => void fetchQuizData()} loading={dataLoading}>
              Rafraichir
            </NotionButton>
          </div>
        </div>
      </NotionCard>

      <div
        style={{
          marginTop: 'var(--n-space-4)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: 'var(--n-space-3)',
        }}
      >
        {showDataSkeleton ? (
          [...Array(4)].map((_, index) => <NotionSkeleton key={`quiz-card-skeleton-${index}`} type="card" />)
        ) : filteredQuizzes.length === 0 ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <NotionEmptyState
              icon={<Trophy size={26} />}
              title="Aucun quiz dans ce filtre"
              description="Changez de categorie pour afficher plus de contenu."
            />
          </div>
        ) : (
          filteredQuizzes.map((quiz) => {
            const showRetry = quiz.attempts.length > 0;
            const stateVariant = quiz.passed ? 'success' : quiz.attempts.length > 0 ? 'warning' : 'default';
            const metadataSummary = formatQuizMeta(quiz);

            return (
              <div key={quiz.id}>
                <NotionCard
                  padding="md"
                  variant="hover"
                  style={{
                    opacity: quiz.available ? 1 : 0.62,
                    borderColor: quiz.passed ? 'var(--n-success-border)' : undefined,
                    height: '100%',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--n-space-3)', alignItems: 'flex-start' }}>
                    <div>
                      <h2 style={{ margin: 0, color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)' }}>{quiz.name}</h2>
                      <div style={{ marginTop: '6px', display: 'flex', gap: 'var(--n-space-2)', flexWrap: 'wrap' }}>
                        <NotionBadge variant={stateVariant as 'success' | 'warning' | 'default'} size="sm">
                          {quiz.passed ? 'Reussi' : showRetry ? 'A refaire' : 'A faire'}
                        </NotionBadge>
                        {!quiz.available && (
                          <NotionBadge variant="default" size="sm">
                            <Lock size={10} /> Verrouille
                          </NotionBadge>
                        )}
                      </div>
                    </div>
                    {quiz.bestScore !== null && (
                      <span
                        style={{
                          color: quiz.passed ? 'var(--n-success)' : 'var(--n-warning)',
                          fontFamily: 'var(--n-font-mono)',
                          fontSize: 'var(--n-text-lg)',
                          fontWeight: 'var(--n-weight-bold)',
                          lineHeight: 1,
                        }}
                      >
                        {quiz.bestScore}%
                      </span>
                    )}
                  </div>

                  <div style={{ marginTop: 'var(--n-space-3)', display: 'flex', flexWrap: 'wrap', gap: 'var(--n-space-2)' }}>
                    <NotionPill variant="default" icon={<BookOpen size={11} />}>
                      {quiz.workshopName}
                    </NotionPill>
                    {quiz.questionCount !== null && (
                      <NotionPill variant="default" icon={<Target size={11} />}>
                        {quiz.questionCount} questions
                      </NotionPill>
                    )}
                    {quiz.timeLimitMinutes !== null && (
                      <NotionPill variant="default" icon={<Clock size={11} />}>
                        {quiz.timeLimitMinutes} min
                      </NotionPill>
                    )}
                    {quiz.passPercentage !== null && (
                      <NotionPill variant="default">
                        Seuil {quiz.passPercentage}%
                      </NotionPill>
                    )}
                    {!metadataSummary && (
                      <NotionBadge variant="default" size="sm">
                        Metadonnees indisponibles
                      </NotionBadge>
                    )}
                  </div>

                  <div style={{ marginTop: 'var(--n-space-3)' }}>
                    <NotionProgress
                      value={quiz.bestScore ?? 0}
                      variant={quiz.passed ? 'success' : 'accent'}
                      size="thin"
                      showLabel
                      label={quiz.bestScore !== null ? `${quiz.bestScore}% meilleur score` : 'Aucun score'}
                    />
                  </div>

                  {quiz.attempts.length > 0 && (
                    <div style={{ marginTop: 'var(--n-space-3)', display: 'flex', flexWrap: 'wrap', gap: 'var(--n-space-2)' }}>
                      {quiz.attempts.slice(0, 3).map((attempt) => (
                        <NotionBadge key={attempt.id} variant={attempt.passed ? 'success' : 'danger'} size="sm">
                          {attempt.passed ? <CheckCircle2 size={10} /> : <XCircle size={10} />} {attempt.score}%
                        </NotionBadge>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: 'var(--n-space-3)' }}>
                    {quiz.available ? (
                      <Link prefetch={false} href={`/student/quiz/${quiz.workshopId}`} style={{ textDecoration: 'none' }}>
                        <NotionButton fullWidth variant={quiz.passed ? 'secondary' : 'primary'} leftIcon={quiz.passed || showRetry ? <RotateCcw size={12} /> : <Play size={12} />}>
                          {quiz.passed ? 'Refaire le quiz' : showRetry ? 'Reessayer' : 'Commencer le quiz'}
                        </NotionButton>
                      </Link>
                    ) : !quiz.quizId ? (
                      <NotionButton fullWidth variant="ghost" leftIcon={<Lock size={12} />} disabled>
                        Quiz indisponible
                      </NotionButton>
                    ) : (
                      <NotionTooltip content="Terminez le module precedent pour debloquer ce quiz.">
                        <span style={{ display: 'block' }}>
                          <NotionButton fullWidth variant="ghost" leftIcon={<Lock size={12} />} disabled>
                            Deblocage requis
                          </NotionButton>
                        </span>
                      </NotionTooltip>
                    )}
                  </div>
                </NotionCard>
              </div>
            );
          })
        )}
      </div>

      <NotionCard padding="md" style={{ marginTop: 'var(--n-space-4)' }}>
        <h2 style={{ margin: 0, color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)' }}>Regles de validation</h2>
        <ul
          style={{
            margin: 'var(--n-space-3) 0 0',
            paddingLeft: 'var(--n-space-4)',
            color: 'var(--n-text-secondary)',
            fontSize: 'var(--n-text-sm)',
            lineHeight: 'var(--n-leading-relaxed)',
          }}
        >
          <li>Le seuil affiche sur chaque carte provient de la definition quiz cote API.</li>
          <li>Les tentatives et le meilleur score viennent des resultats en base.</li>
          <li>Quand une metadonnee manque cote service, l interface l affiche comme indisponible au lieu de l estimer.</li>
        </ul>
      </NotionCard>
    </div>
  );
}
