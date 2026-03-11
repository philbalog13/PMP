'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  ChevronRight,
  Filter,
  Flame,
  Lock,
  RefreshCw,
  Shield,
  Swords,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { APP_URLS } from '@shared/lib/app-urls';
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

interface Room {
  code: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  points: number;
  status: 'LOCKED' | 'UNLOCKED' | 'IN_PROGRESS' | 'COMPLETED';
  solveCount: number;
  totalSteps?: number;
  currentGuidedStep?: number;
}

interface ProgressSummary {
  totalPoints: number;
  solvedChallenges: number;
  totalChallenges: number;
}

interface LeaderboardEntry {
  student_id: string;
  rank: number;
  first_bloods: number;
}

type DifficultyFilter = 'ALL' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

const CATEGORY_LABELS: Record<string, string> = {
  HSM_ATTACK: 'HSM Attack',
  REPLAY_ATTACK: 'Replay Attack',
  '3DS_BYPASS': '3-D Secure Bypass',
  FRAUD_CNP: 'Fraud CNP',
  ISO8583_MANIPULATION: 'ISO 8583',
  PIN_CRACKING: 'PIN Cracking',
  MITM: 'Man-in-the-Middle',
  PRIVILEGE_ESCALATION: 'Privilege Escalation',
  CRYPTO_WEAKNESS: 'Crypto Weakness',
  EMV_CLONING: 'EMV Cloning',
  TOKEN_VAULT: 'Token Vault',
  NETWORK_ATTACK: 'Network Attack',
  KEY_MANAGEMENT: 'Key Management',
  ADVANCED_FRAUD: 'Advanced Fraud',
  SUPPLY_CHAIN: 'Supply Chain',
  BOSS: 'Boss Challenge',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  BEGINNER: 'Easy',
  INTERMEDIATE: 'Medium',
  ADVANCED: 'Hard',
  EXPERT: 'Expert',
};

const DIFFICULTY_BADGE: Record<string, 'beginner' | 'inter' | 'advanced' | 'expert' | 'default'> = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'inter',
  ADVANCED: 'advanced',
  EXPERT: 'expert',
};

export default function StudentCtfPage() {
  return (
    <Suspense
      fallback={
        <div className="n-page-container" style={{ maxWidth: '1200px' }}>
          <NotionSkeleton type="line" width="220px" height="28px" />
          <div style={{ marginTop: 'var(--n-space-2)' }}>
            <NotionSkeleton type="line" width="360px" height="14px" />
          </div>
          <div
            style={{
              marginTop: 'var(--n-space-6)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 'var(--n-space-3)',
            }}
          >
            {[...Array(6)].map((_, index) => (
              <NotionSkeleton key={index} type="card" />
            ))}
          </div>
        </div>
      }
    >
      <CtfRoomListPage />
    </Suspense>
  );
}

function CtfRoomListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth(true);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [summary, setSummary] = useState<ProgressSummary>({ totalPoints: 0, solvedChallenges: 0, totalChallenges: 0 });
  const [myEntry, setMyEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('ALL');

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };
    const [challengeRes, progressRes, leaderboardRes] = await Promise.all([
      fetch('/api/ctf/challenges', { headers }).catch(() => null),
      fetch('/api/ctf/progress', { headers }).catch(() => null),
      fetch('/api/ctf/leaderboard?limit=200', { headers }).catch(() => null),
    ]);

    if (challengeRes?.ok) {
      const payload = await challengeRes.json();
      setRooms(payload.challenges || []);
    }

    if (progressRes?.ok) {
      const payload = await progressRes.json();
      if (payload.summary) setSummary(payload.summary);
    }

    if (leaderboardRes?.ok) {
      const payload = await leaderboardRes.json();
      const entry = (payload.leaderboard || []).find((item: LeaderboardEntry) => item.student_id === user?.id);
      setMyEntry(entry || null);
    }
  }, [user?.id]);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setRefreshing(true);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement CTF');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchData]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  useEffect(() => {
    const category = searchParams.get('category') || 'ALL';
    const difficulty = (searchParams.get('difficulty') || 'ALL') as DifficultyFilter;
    setCategoryFilter(category);
    setDifficultyFilter(difficulty);
  }, [searchParams]);

  const updateFilters = useCallback(
    (category: string, difficulty: DifficultyFilter) => {
      const query = new URLSearchParams();
      if (category !== 'ALL') query.set('category', category);
      if (difficulty !== 'ALL') query.set('difficulty', difficulty);
      const queryString = query.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  const categories = useMemo(() => ['ALL', ...Array.from(new Set(rooms.map((room) => room.category)))], [rooms]);

  const filteredRooms = useMemo(
    () =>
      rooms.filter((room) => {
        const categoryOk = categoryFilter === 'ALL' || room.category === categoryFilter;
        const difficultyOk = difficultyFilter === 'ALL' || room.difficulty === difficultyFilter;
        return categoryOk && difficultyOk;
      }),
    [categoryFilter, difficultyFilter, rooms]
  );

  const metrics = useMemo(() => {
    const completed = rooms.filter((room) => room.status === 'COMPLETED').length;
    const inProgress = rooms.filter((room) => room.status === 'IN_PROGRESS').length;
    const unlocked = rooms.filter((room) => room.status === 'UNLOCKED').length;

    return { completed, inProgress, unlocked };
  }, [rooms]);

  const difficultyOptions = [
    { value: 'ALL' as DifficultyFilter, label: 'Toutes', count: rooms.length },
    {
      value: 'BEGINNER' as DifficultyFilter,
      label: 'Easy',
      count: rooms.filter((room) => room.difficulty === 'BEGINNER').length,
    },
    {
      value: 'INTERMEDIATE' as DifficultyFilter,
      label: 'Medium',
      count: rooms.filter((room) => room.difficulty === 'INTERMEDIATE').length,
    },
    {
      value: 'ADVANCED' as DifficultyFilter,
      label: 'Hard',
      count: rooms.filter((room) => room.difficulty === 'ADVANCED').length,
    },
    {
      value: 'EXPERT' as DifficultyFilter,
      label: 'Expert',
      count: rooms.filter((room) => room.difficulty === 'EXPERT').length,
    },
  ];

  if (authLoading || loading) {
    return (
      <div className="n-page-container" style={{ maxWidth: '1200px' }}>
        <NotionSkeleton type="line" width="220px" height="28px" />
        <div style={{ marginTop: 'var(--n-space-2)' }}>
          <NotionSkeleton type="line" width="360px" height="14px" />
        </div>
        <div
          style={{
            marginTop: 'var(--n-space-6)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--n-space-3)',
          }}
        >
          {[...Array(6)].map((_, index) => (
            <NotionSkeleton key={index} type="card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="n-page-container" style={{ maxWidth: '1200px' }}>
      <NotionCard padding="lg">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--n-space-5)',
            alignItems: 'center',
          }}
        >
          <div>
            <NotionPill variant="reward" icon={<Swords size={12} />}>
              Security labs CTF
            </NotionPill>
            <h1
              style={{
                margin: 'var(--n-space-3) 0 var(--n-space-2)',
                fontSize: 'var(--n-text-2xl)',
                color: 'var(--n-text-primary)',
                fontWeight: 'var(--n-weight-bold)',
              }}
            >
              Hack the Bank
            </h1>
            <p style={{ margin: 0, color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>
              Rooms offensives guidees pour entrainer reflexes attaque/defense en environnement monétique.
            </p>

            <div style={{ marginTop: 'var(--n-space-4)', display: 'flex', gap: 'var(--n-space-2)', flexWrap: 'wrap' }}>
              <Link href={APP_URLS.studentCtfLeaderboard} style={{ textDecoration: 'none' }}>
                <NotionButton variant="reward" leftIcon={<Trophy size={13} />}>
                  Leaderboard
                </NotionButton>
              </Link>
              <NotionButton variant="secondary" leftIcon={<RefreshCw size={13} />} loading={refreshing} onClick={() => void refresh()}>
                Actualiser
              </NotionButton>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(140px, 1fr))',
              gap: 'var(--n-space-3)',
            }}
          >
            {[
              { label: 'Points', value: summary.totalPoints, tone: 'var(--n-accent)' },
              { label: 'Resolus', value: `${metrics.completed}/${summary.totalChallenges || rooms.length || 0}`, tone: 'var(--n-success)' },
              { label: 'En cours', value: metrics.inProgress, tone: 'var(--n-warning)' },
              { label: 'Rank', value: myEntry ? `#${myEntry.rank}` : '--', tone: 'var(--n-reward)' },
            ].map((item) => (
              <NotionCard key={item.label} padding="md">
                <div style={{ color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)', textTransform: 'uppercase' }}>{item.label}</div>
                <div
                  style={{
                    marginTop: 'var(--n-space-2)',
                    color: item.tone,
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--n-space-1)' }}>
            {categories.map((category) => {
              const active = categoryFilter === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => updateFilters(category, difficultyFilter)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--n-radius-sm)',
                    border: active ? '1px solid var(--n-accent-border)' : '1px solid var(--n-border)',
                    background: active ? 'var(--n-accent-light)' : 'var(--n-bg-elevated)',
                    color: active ? 'var(--n-accent)' : 'var(--n-text-secondary)',
                    fontSize: 'var(--n-text-xs)',
                    cursor: 'pointer',
                  }}
                >
                  {category === 'ALL' ? 'Tous' : CATEGORY_LABELS[category] || category}
                </button>
              );
            })}
          </div>

          <NotionTabs<DifficultyFilter>
            value={difficultyFilter}
            options={difficultyOptions}
            onChange={(value) => updateFilters(categoryFilter, value)}
            ariaLabel="Filtrer par difficulte"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <NotionPill variant="default" icon={<Filter size={11} />}>
              {filteredRooms.length} rooms
            </NotionPill>
          </div>
        </div>
      </NotionCard>

      {filteredRooms.length === 0 ? (
        <div style={{ marginTop: 'var(--n-space-4)' }}>
          <NotionEmptyState
            icon={<Target size={24} />}
            title="Aucune room pour ces filtres"
            description="Ajustez vos filtres pour voir des challenges disponibles."
            action={
              <NotionButton variant="primary" onClick={() => updateFilters('ALL', 'ALL')}>
                Effacer les filtres
              </NotionButton>
            }
          />
        </div>
      ) : (
        <div
          style={{
            marginTop: 'var(--n-space-4)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--n-space-3)',
          }}
        >
          {filteredRooms.map((room) => (
            <RoomCard key={room.code} room={room} />
          ))}
        </div>
      )}
    </div>
  );
}

function RoomCard({ room }: { room: Room }) {
  const isLocked = room.status === 'LOCKED';
  const isCompleted = room.status === 'COMPLETED';
  const isInProgress = room.status === 'IN_PROGRESS';

  const totalSteps = Math.max(1, room.totalSteps || 1);
  const currentStep = Math.min(room.currentGuidedStep || 0, totalSteps);
  const progress = isCompleted ? 100 : isInProgress ? Math.round((currentStep / totalSteps) * 100) : 0;

  const content = (
    <NotionCard
      variant="hover"
      padding="md"
      style={{
        height: '100%',
        opacity: isLocked ? 0.62 : 1,
        borderColor: isCompleted ? 'var(--n-success-border)' : isInProgress ? 'var(--n-accent-border)' : undefined,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--n-space-2)' }}>
        <div>
          <p style={{ margin: 0, color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)', fontFamily: 'var(--n-font-mono)' }}>{room.code}</p>
          <h3 style={{ margin: '4px 0 0', color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)' }}>{room.title}</h3>
        </div>
        <div>
          {isCompleted && <CheckCircle2 size={16} style={{ color: 'var(--n-success)' }} />}
          {isInProgress && <Flame size={16} style={{ color: 'var(--n-accent)' }} />}
          {isLocked && <Lock size={16} style={{ color: 'var(--n-text-tertiary)' }} />}
          {!isCompleted && !isInProgress && !isLocked && <Zap size={16} style={{ color: 'var(--n-info)' }} />}
        </div>
      </div>

      <p style={{ margin: 'var(--n-space-3) 0', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', lineHeight: 'var(--n-leading-relaxed)' }}>
        {room.description}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-3)' }}>
        <NotionBadge variant={DIFFICULTY_BADGE[room.difficulty] || 'default'} size="sm">
          {DIFFICULTY_LABELS[room.difficulty] || room.difficulty}
        </NotionBadge>
        <NotionBadge variant="default" size="sm">
          {CATEGORY_LABELS[room.category] || room.category}
        </NotionBadge>
      </div>

      {(isInProgress || isCompleted) && (
        <div style={{ marginBottom: 'var(--n-space-3)' }}>
          <NotionProgress
            value={progress}
            variant={isCompleted ? 'success' : 'accent'}
            size="thin"
            showLabel
            label={isCompleted ? '100%' : `Step ${currentStep}/${totalSteps}`}
          />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <NotionPill variant="accent" icon={<Shield size={11} />}>
          {room.points} pts
        </NotionPill>
        <span style={{ color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)' }}>{room.solveCount} solves</span>
      </div>

      <div style={{ marginTop: 'var(--n-space-3)' }}>
        {isLocked ? (
          <NotionTooltip content="Terminez les rooms precedentes pour debloquer ce challenge.">
            <span style={{ display: 'block' }}>
              <NotionButton fullWidth variant="ghost" leftIcon={<Lock size={12} />} disabled>
                Room verrouillee
              </NotionButton>
            </span>
          </NotionTooltip>
        ) : (
          <Link href={`${APP_URLS.studentCtf}/${encodeURIComponent(room.code)}`} style={{ textDecoration: 'none' }}>
            <NotionButton fullWidth variant={isInProgress ? 'primary' : 'secondary'} rightIcon={<ChevronRight size={12} />}>
              {isCompleted ? 'Rejouer la room' : isInProgress ? 'Continuer' : 'Ouvrir la room'}
            </NotionButton>
          </Link>
        )}
      </div>
    </NotionCard>
  );

  return content;
}

