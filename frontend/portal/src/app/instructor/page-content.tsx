'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Award,
  BarChart3,
  Beaker,
  BookOpen,
  Flag,
  RefreshCw,
  Shield,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import {
  NotionBadge,
  NotionButton,
  NotionCard,
  NotionEmptyState,
  NotionPill,
  NotionProgress,
  NotionSkeleton,
  useNotionToast,
} from '@shared/components/notion';

interface Student {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  workshops_completed: number;
  total_xp: number;
  badge_count: number;
}

interface WorkshopProgress {
  workshopId: string;
  title: string;
  studentsStarted: number;
  studentsCompleted: number;
  avgProgress: number;
  avgTimeMinutes: number;
}

interface QuizPerformance {
  quizId: string;
  attempts: number;
  uniqueStudents: number;
  avgScore: number;
  passRate: number;
}

interface BadgeDistribution {
  badgeType: string;
  name: string;
  studentsEarned: number;
}

interface RecentActivity {
  username: string;
  first_name: string;
  last_name: string;
  activity_type: string;
  activity_target: string;
  activity_value: number;
  activity_time: string;
}

interface CohortAnalytics {
  totalStudents: number;
  workshopProgress: WorkshopProgress[];
  quizPerformance: QuizPerformance[];
  badgeDistribution: BadgeDistribution[];
  recentActivity: RecentActivity[];
}

interface LeaderboardEntry {
  rank: number;
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  total_xp: number;
  badge_count: number;
  workshops_completed: number;
}

interface LabConditions {
  latencyMs: number;
  authFailureRate: number;
  fraudInjection: boolean;
  hsmLatencyMs: number;
  networkErrors: boolean;
}

function normalizeLabConditions(raw: Record<string, unknown> | null | undefined): LabConditions {
  return {
    latencyMs: Number(raw?.latencyMs ?? raw?.latency ?? 0) || 0,
    authFailureRate: Number(raw?.authFailureRate ?? raw?.authFailRate ?? 0) || 0,
    fraudInjection: Boolean(raw?.fraudInjection),
    hsmLatencyMs: Number(raw?.hsmLatencyMs ?? raw?.hsmLatency ?? 0) || 0,
    networkErrors: Boolean(raw?.networkErrors),
  };
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'A l instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}

export default function InstructorPage() {
  const { user, isLoading } = useAuth(true);
  const { pushToast } = useNotionToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [analytics, setAnalytics] = useState<CohortAnalytics | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isApplyingLabConditions, setIsApplyingLabConditions] = useState(false);

  const [labConditions, setLabConditions] = useState<LabConditions>({
    latencyMs: 0,
    authFailureRate: 0,
    fraudInjection: false,
    hsmLatencyMs: 0,
    networkErrors: false,
  });

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };
    const [studentsRes, analyticsRes, leaderboardRes, labConditionsRes] = await Promise.all([
      fetch('/api/users/students?limit=50', { headers }).catch(() => null),
      fetch('/api/progress/cohort', { headers }).catch(() => null),
      fetch('/api/progress/leaderboard?limit=10', { headers }).catch(() => null),
      fetch('/api/progress/lab/conditions', { headers }).catch(() => null),
    ]);

    if (studentsRes?.ok) {
      const data = await studentsRes.json();
      setStudents(data.students || []);
    }

    if (analyticsRes?.ok) {
      const data = await analyticsRes.json();
      setAnalytics(data.analytics || null);
    }

    if (leaderboardRes?.ok) {
      const data = await leaderboardRes.json();
      setLeaderboard(data.leaderboard || []);
    }

    if (labConditionsRes?.ok) {
      const data = await labConditionsRes.json();
      setLabConditions(normalizeLabConditions(data.conditions || {}));
    }
  }, []);

  const applyLabConditions = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Session introuvable');
      return;
    }

    try {
      setError(null);
      setIsApplyingLabConditions(true);

      const response = await fetch('/api/progress/lab/conditions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(labConditions),
      });

      if (!response.ok) {
        throw new Error(`Erreur API (${response.status})`);
      }

      const data = await response.json();
      setLabConditions(normalizeLabConditions(data.conditions || {}));
      pushToast({ variant: 'success', title: 'Conditions appliquees', message: 'Le lab a ete mis a jour.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Impossible de mettre a jour les conditions du lab';
      setError(message);
      pushToast({ variant: 'error', title: 'Echec de mise a jour', message });
    } finally {
      setIsApplyingLabConditions(false);
    }
  }, [labConditions, pushToast]);

  const refreshData = useCallback(async () => {
    try {
      setError(null);
      setIsRefreshing(true);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setDataLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchData]);

  useEffect(() => {
    if (isLoading) return;
    void refreshData();
  }, [isLoading, refreshData]);

  const metrics = useMemo(() => {
    const totalStudents = analytics?.totalStudents ?? students.length;
    const avgProgress = analytics?.workshopProgress?.length
      ? Math.round(analytics.workshopProgress.reduce((sum, item) => sum + item.avgProgress, 0) / analytics.workshopProgress.length)
      : 0;
    const avgQuizScore = analytics?.quizPerformance?.length
      ? Math.round(analytics.quizPerformance.reduce((sum, item) => sum + item.avgScore, 0) / analytics.quizPerformance.length)
      : 0;
    const totalBadges = analytics?.badgeDistribution?.reduce((sum, item) => sum + item.studentsEarned, 0) ?? 0;
    const activeStudents = students.filter((student) => student.status === 'ACTIVE').length;

    const mission =
      avgProgress < 50
        ? { label: 'Relancer la cohorte', desc: 'Progression moyenne encore basse. Priorisez les modules introductifs.', href: '/instructor/students' }
        : avgQuizScore < 70
          ? { label: 'Renforcer les quiz', desc: 'Le score moyen quiz reste fragile. Analysez les points bloquants.', href: '/instructor/analytics' }
          : { label: 'Lancer un nouveau challenge', desc: 'Bonne dynamique globale. Augmentez le niveau avec un exercice pratique.', href: '/instructor/exercises/create' };

    return { totalStudents, avgProgress, avgQuizScore, totalBadges, activeStudents, mission };
  }, [analytics, students]);
  const showDataSkeleton = dataLoading && students.length === 0 && !analytics && leaderboard.length === 0;

  if (isLoading) {
    return (
      <div className="n-page-container" style={{ maxWidth: '1200px' }}>
        <NotionSkeleton type="line" width="220px" height="28px" />
        <div style={{ marginTop: 'var(--n-space-2)' }}>
          <NotionSkeleton type="line" width="380px" height="14px" />
        </div>
        <div
          style={{
            marginTop: 'var(--n-space-6)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 'var(--n-space-3)',
          }}
        >
          {[...Array(4)].map((_, index) => (
            <NotionSkeleton key={index} type="stat" />
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
              <NotionPill variant="accent" icon={<Shield size={12} />}>
                Poste de commande learning
              </NotionPill>
              <h1
                style={{
                  margin: 'var(--n-space-3) 0 var(--n-space-2)',
                  fontSize: 'var(--n-text-2xl)',
                  color: 'var(--n-text-primary)',
                  fontWeight: 'var(--n-weight-bold)',
                }}
              >
                Bonjour, {user?.firstName || 'Formateur'}
              </h1>
              <p style={{ margin: 0, color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>
                Pilotez votre cohorte, monitorer la progression et orchestrez les conditions de lab en temps reel.
              </p>

              <div
                style={{
                  marginTop: 'var(--n-space-4)',
                  padding: 'var(--n-space-4)',
                  borderRadius: 'var(--n-radius-md)',
                  border: '1px solid var(--n-accent-border)',
                  background: 'linear-gradient(145deg, var(--n-accent-light), var(--n-bg-elevated))',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-2)' }}>
                  <Zap size={13} style={{ color: 'var(--n-accent)' }} />
                  <span style={{ color: 'var(--n-accent)', fontSize: 'var(--n-text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'var(--n-weight-semibold)' }}>
                    Mission du jour
                  </span>
                </div>
                <h2 style={{ margin: 0, color: 'var(--n-text-primary)', fontSize: 'var(--n-text-lg)' }}>{metrics.mission.label}</h2>
                <p style={{ margin: 'var(--n-space-2) 0 var(--n-space-3)', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>
                  {metrics.mission.desc}
                </p>
                <Link prefetch={false} href={metrics.mission.href} style={{ textDecoration: 'none' }}>
                  <NotionButton rightIcon={<ArrowRight size={13} />}>Ouvrir l action recommandee</NotionButton>
                </Link>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(140px, 1fr))', gap: 'var(--n-space-3)' }}>
              {showDataSkeleton
                ? [...Array(4)].map((_, index) => <NotionSkeleton key={`instructor-stat-skeleton-${index}`} type="stat" />)
                : [
                    { label: 'Etudiants actifs', value: metrics.activeStudents, icon: <Users size={14} />, tone: 'var(--n-success)' },
                    { label: 'Progression moyenne', value: `${metrics.avgProgress}%`, icon: <Target size={14} />, tone: 'var(--n-accent)' },
                    { label: 'Score quiz moyen', value: `${metrics.avgQuizScore}%`, icon: <BarChart3 size={14} />, tone: 'var(--n-warning)' },
                    { label: 'Badges attribues', value: metrics.totalBadges, icon: <Award size={14} />, tone: 'var(--n-reward)' },
                  ].map((item) => (
                    <NotionCard key={item.label} padding="md">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)', textTransform: 'uppercase' }}>{item.label}</span>
                        <span style={{ color: item.tone }}>{item.icon}</span>
                      </div>
                      <div
                        style={{
                          marginTop: 'var(--n-space-2)',
                          color: 'var(--n-text-primary)',
                          fontFamily: 'var(--n-font-mono)',
                          fontSize: 'var(--n-text-lg)',
                          fontWeight: 'var(--n-weight-bold)',
                        }}
                      >
                        {item.value}
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
        <div style={{ display: 'flex', gap: 'var(--n-space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <NotionButton
            variant="secondary"
            leftIcon={<RefreshCw size={13} />}
            onClick={() => void refreshData()}
            loading={isRefreshing || dataLoading}
          >
            Rafraichir les donnees
          </NotionButton>
          <Link prefetch={false} href="/instructor/students/add" style={{ textDecoration: 'none' }}>
            <NotionButton variant="primary" leftIcon={<UserPlus size={13} />}>
              Ajouter un etudiant
            </NotionButton>
          </Link>
          <Link prefetch={false} href="/instructor/exercises/create" style={{ textDecoration: 'none' }}>
            <NotionButton variant="reward" leftIcon={<BookOpen size={13} />}>
              Nouvel exercice
            </NotionButton>
          </Link>
        </div>
      </NotionCard>

      <div
        style={{
          marginTop: 'var(--n-space-4)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'var(--n-space-3)',
        }}
      >
        <NotionCard padding="md">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--n-space-3)' }}>
            <h3 style={{ margin: 0, color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)' }}>Cohorte recente</h3>
            <Link prefetch={false} href="/instructor/students" style={{ textDecoration: 'none' }}>
              <NotionButton variant="ghost" size="sm" rightIcon={<ArrowRight size={12} />}>
                Voir tout
              </NotionButton>
            </Link>
          </div>

          {students.length === 0 ? (
            showDataSkeleton ? (
              <div style={{ display: 'grid', gap: 'var(--n-space-2)' }}>
                {[...Array(4)].map((_, index) => (
                  <NotionSkeleton key={`cohort-skeleton-${index}`} type="line" height="56px" />
                ))}
              </div>
            ) : (
              <NotionEmptyState
                icon={<Users size={22} />}
                title="Aucun etudiant"
                description="Ajoutez vos premiers etudiants pour initialiser le suivi de cohorte."
                size="sm"
              />
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-2)' }}>
              {students.slice(0, 6).map((student) => {
                const name = [student.first_name, student.last_name].filter(Boolean).join(' ') || student.username;
                const progressPercent = Math.min(100, Math.round((student.workshops_completed / 6) * 100));
                return (
                  <Link
                    prefetch={false}
                    key={student.id}
                    href={`/instructor/students/${student.id}`}
                    style={{
                      display: 'block',
                      textDecoration: 'none',
                      border: '1px solid var(--n-border)',
                      borderRadius: 'var(--n-radius-sm)',
                      padding: 'var(--n-space-3)',
                      background: 'var(--n-bg-elevated)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--n-space-3)' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: 'var(--n-text-primary)', fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {name}
                        </div>
                        <div style={{ color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)' }}>{student.total_xp} XP</div>
                      </div>
                      <NotionBadge variant={progressPercent >= 70 ? 'success' : progressPercent >= 40 ? 'warning' : 'danger'} size="sm">
                        {progressPercent}%
                      </NotionBadge>
                    </div>
                    <div style={{ marginTop: 'var(--n-space-2)' }}>
                      <NotionProgress value={progressPercent} variant={progressPercent >= 70 ? 'success' : 'accent'} size="thin" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </NotionCard>

        <NotionCard padding="md">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--n-space-3)' }}>
            <h3 style={{ margin: 0, color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)' }}>Performance ateliers</h3>
            <Link prefetch={false} href="/instructor/analytics" style={{ textDecoration: 'none' }}>
              <NotionButton variant="ghost" size="sm" rightIcon={<ArrowRight size={12} />}>
                Analytics
              </NotionButton>
            </Link>
          </div>

          {showDataSkeleton ? (
            <div style={{ display: 'grid', gap: 'var(--n-space-2)' }}>
              {[...Array(4)].map((_, index) => (
                <NotionSkeleton key={`workshop-skeleton-${index}`} type="line" height="72px" />
              ))}
            </div>
          ) : analytics?.workshopProgress?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-2)' }}>
              {analytics.workshopProgress.slice(0, 6).map((workshop) => (
                <div
                  key={workshop.workshopId}
                  style={{
                    border: '1px solid var(--n-border)',
                    borderRadius: 'var(--n-radius-sm)',
                    background: 'var(--n-bg-elevated)',
                    padding: 'var(--n-space-3)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--n-text-primary)', fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-medium)' }}>{workshop.title}</span>
                    <span style={{ color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)' }}>{workshop.avgProgress}%</span>
                  </div>
                  <NotionProgress value={workshop.avgProgress} variant={workshop.avgProgress > 65 ? 'success' : 'accent'} size="thin" />
                  <p style={{ margin: '6px 0 0', color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)' }}>
                    {workshop.studentsCompleted}/{workshop.studentsStarted} termines
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <NotionEmptyState
              icon={<Activity size={22} />}
              title="Aucune donnee atelier"
              description="Les indicateurs apparaitront lorsque les etudiants auront progresse."
              size="sm"
            />
          )}
        </NotionCard>

        <NotionCard padding="md">
          <h3 style={{ margin: '0 0 var(--n-space-3)', color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)' }}>
            Commande lab rapide
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-3)' }}>
            <RangeControl
              label="Latence reseau"
              value={labConditions.latencyMs}
              min={0}
              max={500}
              step={10}
              suffix="ms"
              onChange={(value) => setLabConditions((prev) => ({ ...prev, latencyMs: value }))}
            />
            <RangeControl
              label="Echec authentification"
              value={labConditions.authFailureRate}
              min={0}
              max={100}
              step={5}
              suffix="%"
              onChange={(value) => setLabConditions((prev) => ({ ...prev, authFailureRate: value }))}
            />
            <RangeControl
              label="Latence HSM"
              value={labConditions.hsmLatencyMs}
              min={0}
              max={800}
              step={20}
              suffix="ms"
              onChange={(value) => setLabConditions((prev) => ({ ...prev, hsmLatencyMs: value }))}
            />

            <ToggleControl
              label="Injection de fraude"
              checked={labConditions.fraudInjection}
              onToggle={() => setLabConditions((prev) => ({ ...prev, fraudInjection: !prev.fraudInjection }))}
            />
            <ToggleControl
              label="Erreurs reseau"
              checked={labConditions.networkErrors}
              onToggle={() => setLabConditions((prev) => ({ ...prev, networkErrors: !prev.networkErrors }))}
            />

            <NotionButton variant="primary" leftIcon={<Beaker size={13} />} loading={isApplyingLabConditions} onClick={() => void applyLabConditions()}>
              Appliquer les conditions
            </NotionButton>
          </div>
        </NotionCard>

        <NotionCard padding="md">
          <h3 style={{ margin: '0 0 var(--n-space-3)', color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)' }}>Top leaderboard</h3>
          {leaderboard.length === 0 ? (
            showDataSkeleton ? (
              <div style={{ display: 'grid', gap: 'var(--n-space-2)' }}>
                {[...Array(4)].map((_, index) => (
                  <NotionSkeleton key={`leaderboard-skeleton-${index}`} type="line" height="44px" />
                ))}
              </div>
            ) : (
              <NotionEmptyState
                icon={<TrendingUp size={22} />}
                title="Pas de classement"
                description="Le leaderboard apparaitra avec les premiers scores XP."
                size="sm"
              />
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-2)' }}>
              {leaderboard.slice(0, 6).map((entry) => {
                const name = [entry.first_name, entry.last_name].filter(Boolean).join(' ') || entry.username;
                return (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: '1px solid var(--n-border)',
                      borderRadius: 'var(--n-radius-sm)',
                      padding: 'var(--n-space-2) var(--n-space-3)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', minWidth: 0 }}>
                      <NotionBadge variant={entry.rank <= 3 ? 'warning' : 'default'} size="sm">
                        #{entry.rank}
                      </NotionBadge>
                      <span style={{ color: 'var(--n-text-primary)', fontSize: 'var(--n-text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                      </span>
                    </div>
                    <span style={{ color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-mono)', fontSize: 'var(--n-text-xs)' }}>
                      {entry.total_xp} XP
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </NotionCard>
      </div>

      {showDataSkeleton ? (
        <NotionCard padding="md" style={{ marginTop: 'var(--n-space-4)' }}>
          <h3 style={{ margin: '0 0 var(--n-space-3)', color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)' }}>
            Activite recente
          </h3>
          <div style={{ display: 'grid', gap: 'var(--n-space-2)' }}>
            {[...Array(3)].map((_, index) => (
              <NotionSkeleton key={`activity-skeleton-${index}`} type="line" height="52px" />
            ))}
          </div>
        </NotionCard>
      ) : analytics?.recentActivity?.length ? (
        <NotionCard padding="md" style={{ marginTop: 'var(--n-space-4)' }}>
          <h3 style={{ margin: '0 0 var(--n-space-3)', color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)' }}>
            Activite recente
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--n-space-2)' }}>
            {analytics.recentActivity.slice(0, 6).map((activity, index) => {
              const name = [activity.first_name, activity.last_name].filter(Boolean).join(' ') || activity.username;
              return (
                <div
                  key={`${activity.username}-${activity.activity_time}-${index}`}
                  style={{
                    border: '1px solid var(--n-border)',
                    borderRadius: 'var(--n-radius-sm)',
                    padding: 'var(--n-space-3)',
                    background: 'var(--n-bg-elevated)',
                  }}
                >
                  <p style={{ margin: 0, color: 'var(--n-text-primary)', fontSize: 'var(--n-text-sm)' }}>
                    <strong>{name}</strong> a soumis <strong>{activity.activity_target}</strong>
                  </p>
                  <p style={{ margin: '4px 0 0', color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)' }}>
                    Score {Math.round(activity.activity_value)}% - {formatTimeAgo(activity.activity_time)}
                  </p>
                </div>
              );
            })}
          </div>
        </NotionCard>
      ) : null}

      <NotionCard padding="md" style={{ marginTop: 'var(--n-space-4)' }}>
        <h3 style={{ margin: '0 0 var(--n-space-3)', color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)' }}>Acces rapides</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--n-space-2)' }}>
          {[
            { href: '/instructor/analytics', label: 'Analytics', icon: <BarChart3 size={14} /> },
            { href: '/instructor/transactions', label: 'Transactions', icon: <Activity size={14} /> },
            { href: '/instructor/ctf', label: 'CTF Console', icon: <Flag size={14} /> },
            { href: '/instructor/lab-control', label: 'Lab control', icon: <Beaker size={14} /> },
          ].map((item) => (
            <Link prefetch={false} key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <NotionButton variant="secondary" fullWidth leftIcon={item.icon} rightIcon={<ArrowRight size={12} />}>
                {item.label}
              </NotionButton>
            </Link>
          ))}
        </div>
      </NotionCard>
    </div>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  const inputId = useId();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <label htmlFor={inputId} style={{ color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>
          {label}
        </label>
        <span style={{ color: 'var(--n-text-primary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-mono)' }}>
          {value} {suffix}
        </span>
      </div>
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        style={{ width: '100%', accentColor: 'var(--n-accent)' }}
      />
    </div>
  );
}

function ToggleControl({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: '100%',
        border: '1px solid var(--n-border)',
        borderRadius: 'var(--n-radius-sm)',
        background: 'var(--n-bg-elevated)',
        padding: 'var(--n-space-2) var(--n-space-3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
      }}
      aria-pressed={checked}
      aria-label={label}
    >
      <span style={{ color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>{label}</span>
      <span
        style={{
          width: '36px',
          height: '20px',
          borderRadius: '999px',
          background: checked ? 'var(--n-accent)' : 'var(--n-border-strong)',
          position: 'relative',
          transition: 'background var(--n-duration-sm) var(--n-ease)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '2px',
            left: checked ? '18px' : '2px',
            width: '16px',
            height: '16px',
            borderRadius: '999px',
            background: 'white',
            transition: 'left var(--n-duration-sm) var(--n-ease)',
          }}
        />
      </span>
    </button>
  );
}


