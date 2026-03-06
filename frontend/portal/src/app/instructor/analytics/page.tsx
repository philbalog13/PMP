'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Award,
  BarChart3,
  BookOpen,
  RefreshCw,
  TrendingUp,
  Users,
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
} from '@shared/components/notion';

interface WorkshopStats {
  workshopId: string;
  title: string;
  studentsStarted: number;
  studentsCompleted: number;
  avgProgress: number;
  avgTimeMinutes: number;
}

interface QuizStats {
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

export default function InstructorAnalyticsPage() {
  const { isLoading } = useAuth(true);

  const [workshopStats, setWorkshopStats] = useState<WorkshopStats[]>([]);
  const [quizStats, setQuizStats] = useState<QuizStats[]>([]);
  const [badgeStats, setBadgeStats] = useState<BadgeDistribution[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setError(null);

      const headers = { Authorization: `Bearer ${token}` };
      const [cohortRes, leaderboardRes, studentsRes] = await Promise.all([
        fetch('/api/progress/cohort', { headers }).catch(() => null),
        fetch('/api/progress/leaderboard?limit=10', { headers }).catch(() => null),
        fetch('/api/users/students?limit=50', { headers }).catch(() => null),
      ]);

      if (cohortRes?.ok) {
        const payload = await cohortRes.json();
        const analytics = payload.analytics || {};
        setWorkshopStats(analytics.workshopProgress || []);
        setQuizStats(analytics.quizPerformance || []);
        setBadgeStats(analytics.badgeDistribution || []);
        setTotalStudents(analytics.totalStudents || 0);
      }

      if (leaderboardRes?.ok) {
        const payload = await leaderboardRes.json();
        setLeaderboard(payload.leaderboard || []);
      }

      if (studentsRes?.ok) {
        const payload = await studentsRes.json();
        const students = payload.students || [];
        if (totalStudents === 0) setTotalStudents(students.length);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement analytics');
    } finally {
      setDataLoading(false);
    }
  }, [totalStudents]);

  useEffect(() => {
    if (isLoading) return;
    void fetchAnalytics();
  }, [isLoading, fetchAnalytics]);

  const metrics = useMemo(() => {
    const avgProgress =
      workshopStats.length > 0
        ? Math.round(workshopStats.reduce((sum, item) => sum + item.avgProgress, 0) / workshopStats.length)
        : 0;

    const avgQuizScore =
      quizStats.length > 0 ? Math.round(quizStats.reduce((sum, item) => sum + item.avgScore, 0) / quizStats.length) : 0;

    const totalBadges = badgeStats.reduce((sum, item) => sum + item.studentsEarned, 0);

    return { avgProgress, avgQuizScore, totalBadges };
  }, [badgeStats, quizStats, workshopStats]);

  if (isLoading || dataLoading) {
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
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
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <NotionCard padding="lg">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 'var(--n-space-4)',
              alignItems: 'center',
            }}
          >
            <div>
              <NotionPill variant="accent" icon={<BarChart3 size={12} />}>
                Cohorte analytics
              </NotionPill>
              <h1
                style={{
                  margin: 'var(--n-space-3) 0 var(--n-space-2)',
                  color: 'var(--n-text-primary)',
                  fontSize: 'var(--n-text-2xl)',
                  fontWeight: 'var(--n-weight-bold)',
                }}
              >
                Analytics formateur
              </h1>
              <p style={{ margin: 0, color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>
                Vue d ensemble sur progression, quiz, badges et ranking etudiants.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <NotionButton variant="secondary" leftIcon={<RefreshCw size={13} />} onClick={() => void fetchAnalytics()}>
                Rafraichir
              </NotionButton>
            </div>
          </div>
        </NotionCard>
      </motion.section>

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

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        style={{
          marginTop: 'var(--n-space-4)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 'var(--n-space-3)',
        }}
      >
        {[
          { label: 'Etudiants', value: totalStudents, icon: <Users size={14} />, tone: 'var(--n-accent)' },
          { label: 'Progression moyenne', value: `${metrics.avgProgress}%`, icon: <TrendingUp size={14} />, tone: 'var(--n-success)' },
          { label: 'Quiz moyen', value: `${metrics.avgQuizScore}%`, icon: <BarChart3 size={14} />, tone: 'var(--n-warning)' },
          { label: 'Badges delivres', value: metrics.totalBadges, icon: <Award size={14} />, tone: 'var(--n-reward)' },
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
      </motion.section>

      <div
        style={{
          marginTop: 'var(--n-space-4)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'var(--n-space-3)',
        }}
      >
        <NotionCard padding="md">
          <h2 style={{ margin: '0 0 var(--n-space-3)', color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)' }}>Performance ateliers</h2>
          {workshopStats.length === 0 ? (
            <NotionEmptyState
              icon={<BookOpen size={22} />}
              title="Aucune donnee atelier"
              description="La progression ateliers apparaitra ici des premieres activites."
              size="sm"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-2)' }}>
              {workshopStats.map((workshop) => (
                <div
                  key={workshop.workshopId}
                  style={{
                    border: '1px solid var(--n-border)',
                    borderRadius: 'var(--n-radius-sm)',
                    background: 'var(--n-bg-elevated)',
                    padding: 'var(--n-space-3)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--n-space-2)', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--n-text-primary)', fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-medium)' }}>{workshop.title}</span>
                    <span style={{ color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)' }}>{workshop.avgProgress}%</span>
                  </div>
                  <NotionProgress value={workshop.avgProgress} variant={workshop.avgProgress >= 80 ? 'success' : workshop.avgProgress >= 60 ? 'warning' : 'danger'} size="thin" />
                  <div style={{ marginTop: '6px', display: 'flex', gap: 'var(--n-space-2)', flexWrap: 'wrap' }}>
                    <NotionPill variant="default">{workshop.studentsCompleted}/{workshop.studentsStarted} termines</NotionPill>
                    <NotionPill variant="default">{workshop.avgTimeMinutes} min moyen</NotionPill>
                  </div>
                </div>
              ))}
            </div>
          )}
        </NotionCard>

        <NotionCard padding="md">
          <h2 style={{ margin: '0 0 var(--n-space-3)', color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)' }}>Performance quizzes</h2>
          {quizStats.length === 0 ? (
            <NotionEmptyState
              icon={<BarChart3 size={22} />}
              title="Aucun quiz soumis"
              description="Les statistiques quiz apparaitront apres les premieres soumissions."
              size="sm"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-2)' }}>
              {quizStats.map((quiz) => (
                <div
                  key={quiz.quizId}
                  style={{
                    border: '1px solid var(--n-border)',
                    borderRadius: 'var(--n-radius-sm)',
                    background: 'var(--n-bg-elevated)',
                    padding: 'var(--n-space-3)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--n-text-primary)', fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-medium)' }}>{quiz.quizId}</span>
                    <span style={{ color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)' }}>{quiz.attempts} tentatives</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--n-space-2)' }}>
                    <NotionPill variant="accent">Score {quiz.avgScore}%</NotionPill>
                    <NotionPill variant={quiz.passRate >= 80 ? 'success' : 'warning'}>
                      Reussite {quiz.passRate}%
                    </NotionPill>
                  </div>
                  <div style={{ marginTop: '6px', color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)' }}>
                    {quiz.uniqueStudents} etudiants uniques
                  </div>
                </div>
              ))}
            </div>
          )}
        </NotionCard>
      </div>

      {badgeStats.length > 0 && (
        <NotionCard padding="md" style={{ marginTop: 'var(--n-space-4)' }}>
          <h2 style={{ margin: '0 0 var(--n-space-3)', color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)' }}>Distribution badges</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 'var(--n-space-2)' }}>
            {badgeStats.map((badge) => (
              <div
                key={badge.badgeType}
                style={{
                  border: '1px solid var(--n-warning-border)',
                  borderRadius: 'var(--n-radius-sm)',
                  background: 'var(--n-warning-bg)',
                  padding: 'var(--n-space-3)',
                }}
              >
                <div style={{ color: 'var(--n-text-primary)', fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-medium)' }}>{badge.name}</div>
                <div style={{ color: 'var(--n-warning)', fontFamily: 'var(--n-font-mono)', fontSize: 'var(--n-text-sm)', marginTop: '4px' }}>
                  {badge.studentsEarned}
                </div>
              </div>
            ))}
          </div>
        </NotionCard>
      )}

      <NotionCard padding="md" style={{ marginTop: 'var(--n-space-4)' }}>
        <h2 style={{ margin: '0 0 var(--n-space-3)', color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)' }}>Classement etudiants</h2>

        {leaderboard.length === 0 ? (
          <NotionEmptyState
            icon={<Users size={22} />}
            title="Pas de classement"
            description="Le leaderboard apparaitra avec les premiers scores de la cohorte."
            size="sm"
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--n-space-2)' }}>
            {leaderboard.map((student) => {
              const name = [student.first_name, student.last_name].filter(Boolean).join(' ') || student.username;
              return (
                <Link key={student.id} href={`/instructor/students/${student.id}`} style={{ textDecoration: 'none' }}>
                  <NotionCard variant="hover" padding="md" style={{ height: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--n-space-2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', minWidth: 0 }}>
                        <NotionBadge variant={student.rank <= 3 ? 'warning' : 'default'} size="sm">
                          #{student.rank}
                        </NotionBadge>
                        <span style={{ color: 'var(--n-text-primary)', fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-medium)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {name}
                        </span>
                      </div>
                      <span style={{ color: 'var(--n-success)', fontFamily: 'var(--n-font-mono)', fontSize: 'var(--n-text-xs)' }}>
                        {student.total_xp} XP
                      </span>
                    </div>
                    <div style={{ marginTop: 'var(--n-space-2)', display: 'flex', gap: 'var(--n-space-2)' }}>
                      <NotionPill variant="default">{student.workshops_completed}/6 ateliers</NotionPill>
                      <NotionPill variant="warning">{student.badge_count} badges</NotionPill>
                    </div>
                  </NotionCard>
                </Link>
              );
            })}
          </div>
        )}
      </NotionCard>
    </div>
  );
}

