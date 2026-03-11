'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Award, Lock, RefreshCw, Sparkles, Trophy } from 'lucide-react';
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
} from '@shared/components/notion';

type BadgeRow = {
  type: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
  earned: boolean;
  earnedAt?: string;
};

type BadgeResponse = {
  badges: BadgeRow[];
  earned: number;
  total: number;
  totalXP: number;
};

const BADGE_EMOJI: Record<string, string> = {
  star: '??',
  'clipboard-check': '??',
  award: '??',
  trophy: '??',
  'book-open': '??',
  'graduation-cap': '??',
  zap: '?',
  flame: '??',
  flag: '??',
  droplet: '??',
  terminal: '???',
  crown: '??',
  layers: '???',
};

function getAuthHeaders(): HeadersInit | null {
  const token = localStorage.getItem('token');
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

export default function StudentBadgesPage() {
  const { isLoading } = useAuth(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BadgeResponse | null>(null);

  const loadBadges = useCallback(async () => {
    const headers = getAuthHeaders();
    if (!headers) {
      setError('Session invalide');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/progress/badges', { headers });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Impossible de charger les badges');
      }

      const payload = await response.json();
      setData({
        badges: payload.badges || [],
        earned: Number(payload.earned || 0),
        total: Number(payload.total || 0),
        totalXP: Number(payload.totalXP || 0),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les badges');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    void loadBadges();
  }, [isLoading, loadBadges]);

  const completionRate = useMemo(() => {
    if (!data || data.total === 0) return 0;
    return Math.round((data.earned / data.total) * 100);
  }, [data]);

  const earned = data?.badges.filter((badge) => badge.earned) || [];
  const locked = data?.badges.filter((badge) => !badge.earned) || [];

  if (isLoading || loading) {
    return (
      <div className="n-page-container" style={{ maxWidth: '1200px' }}>
        <NotionSkeleton type="line" width="180px" height="28px" />
        <div style={{ marginTop: 'var(--n-space-2)' }}>
          <NotionSkeleton type="line" width="320px" height="14px" />
        </div>
        <div
          style={{
            marginTop: 'var(--n-space-6)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 'var(--n-space-3)',
          }}
        >
          {[...Array(4)].map((_, i) => (
            <NotionSkeleton key={i} type="stat" />
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
              gap: 'var(--n-space-5)',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              alignItems: 'center',
            }}
          >
            <div>
              <NotionPill variant="accent" icon={<Award size={12} />}>
                Badge collection
              </NotionPill>
              <h1
                style={{
                  margin: 'var(--n-space-3) 0 var(--n-space-2)',
                  fontSize: 'var(--n-text-2xl)',
                  color: 'var(--n-text-primary)',
                  fontWeight: 'var(--n-weight-bold)',
                }}
              >
                Mes badges
              </h1>
              <p style={{ margin: 0, color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>
                Debloquez des recompenses en validant les parcours, quiz et labs CTF.
              </p>

              <div
                style={{
                  marginTop: 'var(--n-space-4)',
                  padding: 'var(--n-space-4)',
                  borderRadius: 'var(--n-radius-md)',
                  border: '1px solid var(--n-reward-border)',
                  background: 'linear-gradient(145deg, var(--n-reward-bg), var(--n-bg-elevated))',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-2)' }}>
                  <Sparkles size={13} style={{ color: 'var(--n-reward)' }} />
                  <span style={{ color: 'var(--n-reward)', fontSize: 'var(--n-text-xs)', fontWeight: 'var(--n-weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Progression badges
                  </span>
                </div>
                <p style={{ margin: 0, color: 'var(--n-text-primary)', fontSize: 'var(--n-text-sm)' }}>
                  {data?.earned || 0}/{data?.total || 0} badges debloques - {data?.totalXP || 0} XP collectes
                </p>
                <div style={{ marginTop: 'var(--n-space-3)' }}>
                  <NotionProgress value={completionRate} variant="accent" size="thin" showLabel label={`${completionRate}%`} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--n-space-3)' }}>
              <NotionProgressRing value={completionRate} label={`${completionRate}%`} />
              <NotionPill variant="reward" icon={<Trophy size={11} />}>
                {earned.length} badges actifs
              </NotionPill>
              <NotionButton variant="secondary" leftIcon={<RefreshCw size={13} />} onClick={() => void loadBadges()}>
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

      {!data?.badges?.length ? (
        <div style={{ marginTop: 'var(--n-space-4)' }}>
          <NotionEmptyState
            icon={<Award size={28} />}
            title="Aucun badge disponible"
            description="Completez des ateliers et quiz pour debloquer vos premiers badges."
            action={
              <Link href="/student" style={{ textDecoration: 'none' }}>
                <NotionButton variant="primary">Retour au parcours</NotionButton>
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <NotionCard padding="md" style={{ marginTop: 'var(--n-space-4)' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: 'var(--n-space-3)',
              }}
            >
              {[
                { label: 'Debloques', value: `${data?.earned || 0}/${data?.total || 0}`, tone: 'var(--n-success)' },
                { label: 'Verrouilles', value: `${locked.length}`, tone: 'var(--n-text-secondary)' },
                { label: 'XP badges', value: `${data?.totalXP || 0}`, tone: 'var(--n-reward)' },
                { label: 'Completion', value: `${completionRate}%`, tone: 'var(--n-accent)' },
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
          </NotionCard>

          {earned.length > 0 && (
            <section style={{ marginTop: 'var(--n-space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-3)' }}>
                <h2 style={{ margin: 0, fontSize: 'var(--n-text-base)', color: 'var(--n-text-primary)' }}>Badges debloques</h2>
                <NotionBadge variant="success" size="sm">
                  {earned.length}
                </NotionBadge>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 'var(--n-space-3)',
                }}
              >
                {earned.map((badge, index) => (
                  <motion.div
                    key={badge.type}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.03 }}
                  >
                    <NotionCard variant="hover" padding="md" style={{ height: '100%', borderColor: 'var(--n-success-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '34px' }} aria-hidden="true">
                          {BADGE_EMOJI[badge.icon] || '??'}
                        </span>
                        <NotionBadge variant="success" size="sm">
                          Actif
                        </NotionBadge>
                      </div>
                      <h3 style={{ margin: 'var(--n-space-3) 0 var(--n-space-1)', color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)' }}>{badge.name}</h3>
                      <p style={{ margin: 0, color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', lineHeight: 'var(--n-leading-relaxed)' }}>
                        {badge.description}
                      </p>
                      <div style={{ marginTop: 'var(--n-space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <NotionPill variant="reward">+{badge.xp} XP</NotionPill>
                        <span style={{ color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)' }}>
                          {badge.earnedAt ? new Date(badge.earnedAt).toLocaleDateString('fr-FR') : ''}
                        </span>
                      </div>
                    </NotionCard>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {locked.length > 0 && (
            <section style={{ marginTop: 'var(--n-space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-3)' }}>
                <h2 style={{ margin: 0, fontSize: 'var(--n-text-base)', color: 'var(--n-text-primary)' }}>Badges a debloquer</h2>
                <NotionBadge variant="default" size="sm">
                  {locked.length}
                </NotionBadge>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 'var(--n-space-3)',
                }}
              >
                {locked.map((badge, index) => (
                  <motion.div
                    key={badge.type}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.03 }}
                  >
                    <NotionCard padding="md" style={{ height: '100%', opacity: 0.68 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '34px', filter: 'grayscale(1)' }} aria-hidden="true">
                          {BADGE_EMOJI[badge.icon] || '??'}
                        </span>
                        <NotionBadge variant="default" size="sm">
                          <Lock size={10} /> Lock
                        </NotionBadge>
                      </div>
                      <h3 style={{ margin: 'var(--n-space-3) 0 var(--n-space-1)', color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)' }}>{badge.name}</h3>
                      <p style={{ margin: 0, color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', lineHeight: 'var(--n-leading-relaxed)' }}>
                        {badge.description}
                      </p>
                      <div style={{ marginTop: 'var(--n-space-3)' }}>
                        <NotionPill variant="default">+{badge.xp} XP</NotionPill>
                      </div>
                    </NotionCard>
                  </motion.div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

