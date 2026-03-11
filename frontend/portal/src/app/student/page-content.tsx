'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Clock,
  Flag,
  GraduationCap,
  Lock,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import {
  clearOnboardingDoneLocally,
  isOnboardingDoneLocally,
  markOnboardingDoneLocally,
} from '../../lib/onboarding';
import { FIRST_CTF_ROOM_CODE } from '../../lib/ctf-code-map';
import {
  NotionBadge,
  NotionButton,
  NotionCard,
  NotionPill,
  NotionProgressRing,
  NotionSkeleton,
  useNotionToast,
} from '@shared/components/notion';
import type { RoadmapItem } from '@/components/student/roadmap';

interface WorkshopProgress {
  workshop_id: string;
  title: string;
  description?: string;
  status: string;
  progress_percent: number;
  current_section: number;
  total_sections: number;
  time_spent_minutes: number;
  estimated_minutes?: number | null;
  sequence_status?: string;
}

interface Badge {
  type: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
  earned: boolean;
  earnedAt?: string;
}

interface Stats {
  workshops: { notStarted: number; inProgress: number; completed: number; total: number; totalTime: number };
  quizzes: { total: number; passed: number; attempts?: number; avgScore: number; bestScore: number };
  badges: { earned: number; total: number };
  totalXP: number;
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

interface CurrentStudentProfile {
  id: string;
  email: string;
  onboardingDone: boolean;
  learnerLevel: string | null;
  objective: string | null;
}

interface NextStep {
  action: string;
  label: string;
  href: string;
}

const WORKSHOP_ORDER = ['intro', 'iso8583', 'hsm-keys', '3ds-flow', 'fraud-detection', 'emv'];

const WORKSHOP_META: Record<string, { title: string; minutes: number; label: string }> = {
  intro: { title: 'Intro paiements', minutes: 45, label: 'Foundations' },
  iso8583: { title: 'ISO 8583', minutes: 90, label: 'Messaging' },
  'hsm-keys': { title: 'HSM and keys', minutes: 120, label: 'Crypto' },
  '3ds-flow': { title: '3D Secure', minutes: 60, label: 'Auth' },
  'fraud-detection': { title: 'Fraud detection', minutes: 75, label: 'Risk' },
  emv: { title: 'EMV advanced', minutes: 180, label: 'Card tech' },
};

function RoadmapSkeletonCard() {
  return (
    <NotionCard padding="lg">
      <div style={{ display: 'grid', gap: 'var(--n-space-3)' }}>
        <NotionSkeleton type="line" width="220px" height="22px" />
        <NotionSkeleton type="line" width="300px" height="14px" />
      </div>
      <div
        style={{
          border: '1px solid var(--n-border)',
          borderRadius: 'var(--n-radius-lg)',
          marginTop: 'var(--n-space-4)',
          minHeight: '760px',
          padding: 'var(--n-space-4)',
        }}
      >
        <div style={{ display: 'grid', gap: 'var(--n-space-3)' }}>
          {[...Array(6)].map((_, index) => (
            <NotionSkeleton key={`dashboard-roadmap-fallback-${index}`} type="card" />
          ))}
        </div>
      </div>
    </NotionCard>
  );
}

const StudentRoadmap = dynamic(() => import('@/components/student/roadmap').then((module) => module.Roadmap), {
  loading: () => <RoadmapSkeletonCard />,
  ssr: false,
});

function getWorkshopName(id: string, fallback: string): string {
  return WORKSHOP_META[id]?.title || fallback || id;
}

function formatEstimatedMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) {
    return 'Duree non renseignee';
  }
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
  }
  return `${minutes} min`;
}

function buildWorkshopStatus(workshops: WorkshopProgress[]) {
  const statuses: Record<string, 'completed' | 'in-progress' | 'not-started' | 'locked'> = {};
  let previousCompleted = true;

  for (const workshop of workshops) {
    const explicitStatus = String(workshop.sequence_status || '').toUpperCase();
    if (explicitStatus === 'COMPLETED') {
      statuses[workshop.workshop_id] = 'completed';
      previousCompleted = true;
      continue;
    }

    if (explicitStatus === 'IN_PROGRESS') {
      statuses[workshop.workshop_id] = 'in-progress';
      previousCompleted = false;
      continue;
    }

    if (explicitStatus === 'AVAILABLE') {
      statuses[workshop.workshop_id] = 'not-started';
      previousCompleted = false;
      continue;
    }

    if (explicitStatus === 'LOCKED') {
      statuses[workshop.workshop_id] = 'locked';
      previousCompleted = false;
      continue;
    }

    if (workshop.status === 'COMPLETED') {
      statuses[workshop.workshop_id] = 'completed';
      previousCompleted = true;
      continue;
    }

    if (workshop.status === 'IN_PROGRESS') {
      statuses[workshop.workshop_id] = 'in-progress';
      previousCompleted = false;
      continue;
    }

    if (previousCompleted) {
      statuses[workshop.workshop_id] = 'not-started';
      previousCompleted = false;
    } else {
      statuses[workshop.workshop_id] = 'locked';
    }
  }

  return statuses;
}

export default function StudentDashboard() {
  const { user, isLoading } = useAuth(true);
  const router = useRouter();
  const { pushToast } = useNotionToast();

  const [workshops, setWorkshops] = useState<WorkshopProgress[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [ctfPoints, setCtfPoints] = useState(0);
  const [ctfSolved, setCtfSolved] = useState(0);
  const [nextStep, setNextStep] = useState<NextStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const previousXPRef = useRef<number | null>(null);

  const fetchCurrentProfile = useCallback(async (token: string): Promise<CurrentStudentProfile> => {
    const response = await fetch('/api/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.user) {
      throw new Error(payload?.error || 'Unable to verify onboarding status.');
    }

    return payload.user as CurrentStudentProfile;
  }, []);

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    const [progressRes, statsRes, badgesRes, leaderboardRes, ctfProgressRes, nextStepRes] = await Promise.all([
      fetch('/api/progress', { headers }).catch(() => null),
      fetch('/api/progress/stats', { headers }).catch(() => null),
      fetch('/api/progress/badges', { headers }).catch(() => null),
      fetch('/api/progress/leaderboard?limit=10', { headers }).catch(() => null),
      fetch('/api/ctf/progress', { headers }).catch(() => null),
      fetch('/api/progress/next-step', { headers }).catch(() => null),
    ]);

    if (progressRes?.ok) {
      const data = await progressRes.json();
      const progressMap = data.progress || {};
      const workshopList: WorkshopProgress[] = Object.entries(progressMap as Record<string, Partial<WorkshopProgress>>).map(
        ([id, progress]) => ({
          workshop_id: id,
          title: progress.title || id,
          description: progress.description || '',
          status: progress.status || 'NOT_STARTED',
          progress_percent: Number(progress.progress_percent || 0),
          current_section: Number(progress.current_section || 0),
          total_sections: Number(progress.total_sections || 0),
          time_spent_minutes: Number(progress.time_spent_minutes || 0),
          estimated_minutes: progress.estimated_minutes === null || progress.estimated_minutes === undefined
            ? null
            : Number(progress.estimated_minutes || 0),
          sequence_status: typeof progress.sequence_status === 'string' ? progress.sequence_status : undefined,
        })
      );

      workshopList.sort((a, b) => {
        const ai = WORKSHOP_ORDER.indexOf(a.workshop_id);
        const bi = WORKSHOP_ORDER.indexOf(b.workshop_id);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });

      setWorkshops(workshopList);
    }

    if (statsRes?.ok) {
      const data = await statsRes.json();
      setStats(data.stats || null);
    }

    if (badgesRes?.ok) {
      const data = await badgesRes.json();
      setBadges(data.badges || []);
    }

    if (leaderboardRes?.ok) {
      const data = await leaderboardRes.json();
      setLeaderboard(data.leaderboard || []);
    }

    if (ctfProgressRes?.ok) {
      const data = await ctfProgressRes.json();
      setCtfPoints(Number(data.summary?.totalPoints || 0));
      setCtfSolved(Number(data.summary?.solvedChallenges || 0));
    }

    if (nextStepRes?.ok) {
      const data = await nextStepRes.json();
      setNextStep((data?.nextStep || null) as NextStep | null);
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Loading error');
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchData]);

  useEffect(() => {
    if (isLoading) return;

    let cancelled = false;

    const boot = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      const hasLocalOnboarding = isOnboardingDoneLocally(user);

      try {
        const profile = await fetchCurrentProfile(token);
        if (cancelled) {
          return;
        }

        if (profile.onboardingDone === true) {
          markOnboardingDoneLocally({ id: profile.id, email: profile.email });
          await refreshData();
          return;
        }

        clearOnboardingDoneLocally(user);
        router.push('/student/onboarding');
      } catch (err: unknown) {
        if (cancelled) {
          return;
        }

        if (hasLocalOnboarding) {
          await refreshData();
          return;
        }

        setError(err instanceof Error ? err.message : 'Unable to verify onboarding status.');
      }
    };

    void boot();

    return () => {
      cancelled = true;
    };
  }, [fetchCurrentProfile, isLoading, refreshData, router, user]);

  useEffect(() => {
    const totalXP = stats?.totalXP;
    if (typeof totalXP !== 'number') return;

    if (previousXPRef.current !== null && totalXP > previousXPRef.current) {
      pushToast({
        variant: 'xp',
        title: `+${totalXP - previousXPRef.current} XP`,
        message: 'Great progression. Keep the streak alive.',
      });
    }

    previousXPRef.current = totalXP;
  }, [stats?.totalXP, pushToast]);

  const computed = useMemo(() => {
    const totalXP = stats?.totalXP ?? 0;
    const completedCount = stats?.workshops.completed ?? 0;
    const totalWorkshops = stats?.workshops.total ?? workshops.length;
    const avgScore = Math.round(stats?.quizzes.avgScore ?? 0);
    const badgesEarned = stats?.badges.earned ?? 0;
    const overallProgress =
      totalWorkshops > 0
        ? Math.round(workshops.reduce((acc, workshop) => acc + (workshop.progress_percent || 0), 0) / totalWorkshops)
        : 0;
    const currentUserId = user?.id || '';
    const myRank = currentUserId ? leaderboard.find((entry) => entry.id === currentUserId) : undefined;

    return {
      totalXP,
      completedCount,
      totalWorkshops,
      avgScore,
      badgesEarned,
      overallProgress,
      myRank,
    };
  }, [leaderboard, stats, user?.id, workshops]);

  const workshopStatuses = useMemo(() => buildWorkshopStatus(workshops), [workshops]);

  const roadmapItems = useMemo<RoadmapItem[]>(() => {
    const workshopMap = new Map(workshops.map((workshop) => [workshop.workshop_id, workshop]));
    const orderedIds = [...new Set([...WORKSHOP_ORDER, ...workshops.map((workshop) => workshop.workshop_id)])];

    return orderedIds.map((workshopId, index) => {
      const workshop = workshopMap.get(workshopId);
      const statusFromApi = workshopStatuses[workshopId] || (index === 0 ? 'not-started' : 'locked');
      const status =
        statusFromApi === 'completed'
          ? 'completed'
          : statusFromApi === 'in-progress'
            ? 'current'
            : statusFromApi === 'not-started'
              ? 'available'
              : 'locked';

      const subtitle =
        status === 'completed'
          ? 'Module termine'
          : status === 'current'
            ? `${workshop?.progress_percent || 0}% complete`
            : status === 'available'
              ? workshop?.estimated_minutes !== null && workshop?.estimated_minutes !== undefined
                ? formatEstimatedMinutes(workshop.estimated_minutes)
                : 'Module disponible'
              : 'Terminez l etape precedente pour debloquer';

      const icon =
        workshopId === 'intro' ? (
          <BookOpen size={14} />
        ) : workshopId === 'iso8583' ? (
          <TrendingUp size={14} />
        ) : workshopId === 'hsm-keys' ? (
          <Lock size={14} />
        ) : workshopId === '3ds-flow' ? (
          <GraduationCap size={14} />
        ) : workshopId === 'fraud-detection' ? (
          <Flag size={14} />
        ) : (
          <Zap size={14} />
        );

      return {
        id: workshopId,
        title: getWorkshopName(workshopId, workshop?.title || workshopId),
        subtitle,
        status,
        href: status === 'locked' ? undefined : `/student/theory/${workshopId}`,
        icon,
      };
    });
  }, [workshops, workshopStatuses]);

  const mission = useMemo(() => {
    if (nextStep?.href) {
      const actionLabel =
        nextStep.action === 'RESUME_MODULE'
          ? 'Continuer le module'
          : nextStep.action === 'START_MODULE'
            ? 'Demarrer le module'
            : nextStep.action === 'RESUME_CTF'
              ? 'Continuer le lab'
              : 'Ouvrir';

      return {
        title: nextStep.label,
        description: 'Recommandation calculee par le backend a partir de votre progression reelle.',
        href: nextStep.href,
        cta: actionLabel,
      };
    }

    const inProgress = workshops.find((workshop) => workshopStatuses[workshop.workshop_id] === 'in-progress');
    if (inProgress) {
      return {
        title: `Continue ${getWorkshopName(inProgress.workshop_id, inProgress.title)}`,
        description: `${inProgress.progress_percent}% completed. Finish this module to unlock the next challenge.`,
        href: `/student/theory/${inProgress.workshop_id}`,
        cta: 'Continue now',
      };
    }

    const nextWorkshop = workshops.find((workshop) => workshopStatuses[workshop.workshop_id] === 'not-started');
    if (nextWorkshop) {
      return {
        title: `Start ${getWorkshopName(nextWorkshop.workshop_id, nextWorkshop.title)}`,
        description: `${formatEstimatedMinutes(nextWorkshop.estimated_minutes)}. Module disponible a demarrer.`,
        href: `/student/theory/${nextWorkshop.workshop_id}`,
        cta: 'Start module',
      };
    }

    return {
      title: 'Launch your next CTF room',
      description: 'Apply your learning in guided offensive labs and secure more points.',
      href: `/student/ctf/${encodeURIComponent(FIRST_CTF_ROOM_CODE)}`,
      cta: 'Open CTF room',
    };
  }, [nextStep, workshopStatuses, workshops]);

  const quickActions = [
    { href: '/student/cursus', label: 'Cursus', icon: <BookOpen size={14} /> },
    { href: '/student/quizzes', label: 'Quizzes', icon: <GraduationCap size={14} /> },
    { href: '/student/progress', label: 'Parcours timeline', icon: <TrendingUp size={14} /> },
    { href: '/student/ctf', label: 'CTF labs', icon: <Flag size={14} /> },
  ];

  const earnedBadges = badges.filter((badge) => badge.earned).slice(0, 3);
  const showRoadmapSkeleton = isRefreshing && workshops.length === 0;

  if (isLoading) {
    return (
      <div className="n-page-container" style={{ maxWidth: '1200px' }}>
        <NotionSkeleton type="line" width="180px" height="20px" />
        <div style={{ marginTop: 'var(--n-space-3)' }}>
          <NotionSkeleton type="line" width="360px" height="32px" />
        </div>
        <div
          style={{
            display: 'grid',
            gap: 'var(--n-space-3)',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            marginTop: 'var(--n-space-6)',
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
    <div className="n-page-container" style={{ maxWidth: '1200px', position: 'relative' }}>
      <section>
        <NotionCard padding="lg" style={{ overflow: 'hidden', position: 'relative' }}>
          <div
            style={{
              display: 'grid',
              gap: 'var(--n-space-6)',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            }}
          >
            <div>
              <NotionPill variant="accent" icon={<Sparkles size={12} />}>
                Learning mission
              </NotionPill>
              <h1
                style={{
                  color: 'var(--n-text-primary)',
                  fontFamily: 'var(--n-font-sans)',
                  fontSize: 'var(--n-text-2xl)',
                  fontWeight: 'var(--n-weight-bold)',
                  letterSpacing: 'var(--n-tracking-tight)',
                  margin: 'var(--n-space-3) 0 var(--n-space-2)',
                }}
              >
                Bonjour, {user?.firstName || 'Etudiant'}
              </h1>
              <p style={{ color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', margin: 0 }}>
                Premium cyber learning flow: progression, quizzes, labs, and rewards.
              </p>

              <div
                style={{
                  border: '1px solid var(--n-accent-border)',
                  borderRadius: 'var(--n-radius-md)',
                  marginTop: 'var(--n-space-5)',
                  padding: 'var(--n-space-4)',
                  background:
                    'linear-gradient(135deg, var(--n-accent-light), color-mix(in oklab, var(--n-bg-elevated) 76%, transparent))',
                }}
              >
                <div
                  style={{
                    alignItems: 'center',
                    display: 'flex',
                    gap: 'var(--n-space-2)',
                    marginBottom: 'var(--n-space-1)',
                  }}
                >
                  <Zap size={14} style={{ color: 'var(--n-accent)' }} />
                  <span
                    style={{
                      color: 'var(--n-accent)',
                      fontSize: 'var(--n-text-xs)',
                      fontWeight: 'var(--n-weight-semibold)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Mission du jour
                  </span>
                </div>
                <h2 style={{ color: 'var(--n-text-primary)', fontSize: 'var(--n-text-lg)', margin: 0 }}>{mission.title}</h2>
                <p
                  style={{
                    color: 'var(--n-text-secondary)',
                    fontSize: 'var(--n-text-sm)',
                    margin: 'var(--n-space-2) 0 var(--n-space-4)',
                  }}
                >
                  {mission.description}
                </p>
                <Link prefetch={false} href={mission.href} style={{ textDecoration: 'none' }}>
                  <NotionButton rightIcon={<ArrowRight size={14} />}>{mission.cta}</NotionButton>
                </Link>
              </div>
            </div>

            <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <NotionProgressRing value={computed.overallProgress} label={`${computed.overallProgress}%`} />
              <div style={{ marginTop: 'var(--n-space-4)', textAlign: 'center' }}>
                <NotionPill variant="reward">
                  {computed.completedCount}/{computed.totalWorkshops} modules termines
                </NotionPill>
                <p style={{ color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-xs)', marginTop: 'var(--n-space-2)' }}>
                  {computed.totalXP} XP valides
                </p>
              </div>
              <NotionButton
                variant="secondary"
                leftIcon={<RefreshCw size={14} />}
                onClick={() => void refreshData()}
                loading={isRefreshing}
              >
                Refresh
              </NotionButton>
            </div>
          </div>
        </NotionCard>
      </section>

      <section
        style={{
          display: 'grid',
          gap: 'var(--n-space-3)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          marginTop: 'var(--n-space-4)',
        }}
      >
        {[
          { label: 'Total XP', value: computed.totalXP.toLocaleString(), tone: 'var(--n-accent)' },
          {
            label: 'Completed modules',
            value: `${computed.completedCount}/${computed.totalWorkshops}`,
            tone: 'var(--n-success)',
          },
          { label: 'Quiz average', value: `${computed.avgScore}%`, tone: 'var(--n-info)' },
          { label: 'Badges earned', value: `${computed.badgesEarned}`, tone: 'var(--n-reward)' },
        ].map((stat) => (
          <NotionCard key={stat.label} padding="md">
            <div
              style={{
                color: 'var(--n-text-tertiary)',
                fontSize: 'var(--n-text-xs)',
                marginBottom: 'var(--n-space-1)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                color: stat.tone,
                fontFamily: 'var(--n-font-mono)',
                fontSize: 'var(--n-text-xl)',
                fontWeight: 'var(--n-weight-bold)',
              }}
            >
              {stat.value}
            </div>
          </NotionCard>
        ))}
      </section>

      {error && (
        <div
          style={{
            background: 'var(--n-danger-bg)',
            border: '1px solid var(--n-danger-border)',
            borderRadius: 'var(--n-radius-sm)',
            color: 'var(--n-danger)',
            fontSize: 'var(--n-text-sm)',
            marginTop: 'var(--n-space-4)',
            padding: 'var(--n-space-3) var(--n-space-4)',
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gap: 'var(--n-space-4)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          marginTop: 'var(--n-space-4)',
        }}
      >
        <section>
          <StudentRoadmap items={roadmapItems} loading={showRoadmapSkeleton} viewPathHref="/student/progress" />
        </section>

        <aside>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-3)' }}>
            <NotionCard padding="md">
              <h3 style={{ color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)', margin: '0 0 var(--n-space-3)' }}>
                Quick access
              </h3>
              <div style={{ display: 'grid', gap: 'var(--n-space-2)' }}>
                {quickActions.map((action) => (
                  <Link prefetch={false} key={action.href} href={action.href} style={{ textDecoration: 'none' }}>
                    <NotionButton
                      variant="secondary"
                      size="sm"
                      fullWidth
                      leftIcon={action.icon}
                      rightIcon={<ChevronRight size={12} />}
                    >
                      {action.label}
                    </NotionButton>
                  </Link>
                ))}
              </div>
            </NotionCard>

            <NotionCard padding="md">
              <h3 style={{ color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)', margin: '0 0 var(--n-space-3)' }}>
                Game status
              </h3>
              <div style={{ display: 'grid', gap: 'var(--n-space-2)' }}>
                <NotionPill variant="reward" icon={<Trophy size={12} />}>
                  Rank #{computed.myRank?.rank || '--'}
                </NotionPill>
                <NotionPill variant="accent" icon={<Flag size={12} />}>
                  {ctfPoints} CTF points
                </NotionPill>
                <NotionPill variant="success" icon={<Clock size={12} />}>
                  {ctfSolved} solved labs
                </NotionPill>
              </div>
            </NotionCard>

            <NotionCard padding="md">
              <h3 style={{ color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)', margin: '0 0 var(--n-space-3)' }}>
                Top leaderboard
              </h3>
              {leaderboard.length === 0 ? (
                <span style={{ color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-sm)' }}>No ranking data yet.</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-2)' }}>
                  {leaderboard.slice(0, 5).map((entry) => (
                    <div key={entry.id} style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>
                        #{entry.rank} {entry.first_name || entry.username}
                      </span>
                      <span
                        style={{
                          color: 'var(--n-text-primary)',
                          fontFamily: 'var(--n-font-mono)',
                          fontSize: 'var(--n-text-xs)',
                        }}
                      >
                        {entry.total_xp} XP
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </NotionCard>

            <NotionCard padding="md">
              <h3 style={{ color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)', margin: '0 0 var(--n-space-3)' }}>
                Latest badges
              </h3>
              {earnedBadges.length === 0 ? (
                <span style={{ color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-sm)' }}>No badges unlocked yet.</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-2)' }}>
                  {earnedBadges.map((badge) => (
                    <div key={badge.type} style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>{badge.name}</span>
                      <NotionBadge variant="accent" size="sm">
                        +{badge.xp} XP
                      </NotionBadge>
                    </div>
                  ))}
                </div>
              )}
            </NotionCard>
          </div>
        </aside>
      </div>
    </div>
  );
}


