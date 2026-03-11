'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Clock, Layers, Play, Search, Sparkles, TrendingUp } from 'lucide-react';
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
  NotionTabs,
} from '@shared/components/notion';

type Level = 'DEBUTANT' | 'INTERMEDIAIRE' | 'AVANCE' | 'EXPERT';
type LevelFilter = 'ALL' | Level;

interface Cursus {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  level: Level;
  estimated_hours: number;
  tags: string[];
  module_count: number;
  progress: { completed: number; total: number };
}

const LEVEL_LABEL: Record<Level, string> = {
  DEBUTANT: 'Debutant',
  INTERMEDIAIRE: 'Intermediaire',
  AVANCE: 'Avance',
  EXPERT: 'Expert',
};

const LEVEL_VARIANT: Record<Level, 'beginner' | 'inter' | 'advanced' | 'expert'> = {
  DEBUTANT: 'beginner',
  INTERMEDIAIRE: 'inter',
  AVANCE: 'advanced',
  EXPERT: 'expert',
};

const ICON_EMOJI: Record<string, string> = {
  'credit-card': '??',
  shield: '???',
  lock: '??',
  layers: '??',
  key: '??',
  'file-text': '??',
  'book-open': '??',
};

function getCursusProgress(cursus: Cursus) {
  if (!cursus.progress?.total) return 0;
  return Math.round((cursus.progress.completed / cursus.progress.total) * 100);
}

export default function CursusListPage() {
  const { isLoading: authLoading } = useAuth(true);
  const [cursusList, setCursusList] = useState<Cursus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<LevelFilter>('ALL');

  const fetchCursus = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('/api/cursus', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Impossible de charger les cursus');

      const data = await res.json();
      if (data.success) {
        setCursusList(data.cursus || []);
      } else {
        setCursusList([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      setCursusList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    void fetchCursus();
  }, [authLoading, fetchCursus]);

  const filteredCursus = useMemo(
    () =>
      cursusList.filter((cursus) => {
        const matchesSearch =
          !searchQuery ||
          cursus.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cursus.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesLevel = filterLevel === 'ALL' || cursus.level === filterLevel;
        return matchesSearch && matchesLevel;
      }),
    [cursusList, filterLevel, searchQuery]
  );

  const metrics = useMemo(() => {
    const totalCompleted = cursusList.reduce((sum, c) => sum + (c.progress?.completed || 0), 0);
    const totalUnits = cursusList.reduce((sum, c) => sum + (c.progress?.total || 0), 0);
    const overall = totalUnits > 0 ? Math.round((totalCompleted / totalUnits) * 100) : 0;
    const totalHours = cursusList.reduce((sum, c) => sum + c.estimated_hours, 0);
    const totalModules = cursusList.reduce((sum, c) => sum + c.module_count, 0);

    const inProgress = cursusList.find((c) => {
      const p = getCursusProgress(c);
      return p > 0 && p < 100;
    });
    const notStarted = cursusList.find((c) => getCursusProgress(c) === 0);
    const mission = inProgress || notStarted || cursusList[0];

    return {
      totalCompleted,
      totalUnits,
      overall,
      totalHours,
      totalModules,
      mission,
    };
  }, [cursusList]);

  const levelOptions = [
    { value: 'ALL' as LevelFilter, label: 'Tous', count: cursusList.length },
    {
      value: 'DEBUTANT' as LevelFilter,
      label: LEVEL_LABEL.DEBUTANT,
      count: cursusList.filter((c) => c.level === 'DEBUTANT').length,
    },
    {
      value: 'INTERMEDIAIRE' as LevelFilter,
      label: LEVEL_LABEL.INTERMEDIAIRE,
      count: cursusList.filter((c) => c.level === 'INTERMEDIAIRE').length,
    },
    {
      value: 'AVANCE' as LevelFilter,
      label: LEVEL_LABEL.AVANCE,
      count: cursusList.filter((c) => c.level === 'AVANCE').length,
    },
    {
      value: 'EXPERT' as LevelFilter,
      label: LEVEL_LABEL.EXPERT,
      count: cursusList.filter((c) => c.level === 'EXPERT').length,
    },
  ];

  if (authLoading) {
    return (
      <div className="n-page-container" style={{ maxWidth: '1200px' }}>
        <div style={{ marginBottom: 'var(--n-space-6)' }}>
          <NotionSkeleton type="line" width="200px" height="28px" />
          <div style={{ marginTop: 'var(--n-space-2)' }}>
            <NotionSkeleton type="line" width="340px" height="14px" />
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 'var(--n-space-3)',
            marginBottom: 'var(--n-space-6)',
          }}
        >
          {[...Array(4)].map((_, i) => (
            <NotionSkeleton key={i} type="stat" />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--n-space-3)' }}>
          {[...Array(4)].map((_, i) => (
            <NotionSkeleton key={i} type="card" />
          ))}
        </div>
      </div>
    );
  }

  const missionProgress = metrics.mission ? getCursusProgress(metrics.mission) : 0;

  return (
    <div className="n-page-container" style={{ maxWidth: '1200px' }}>
      <section>
        <NotionCard padding="lg">
          <div
            style={{
              display: 'grid',
              gap: 'var(--n-space-6)',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            }}
          >
            <div>
              <NotionPill variant="accent" icon={<BookOpen size={12} />}>
                Academie MoneTIC
              </NotionPill>
              <h1
                style={{
                  margin: 'var(--n-space-3) 0 var(--n-space-2)',
                  fontSize: 'var(--n-text-2xl)',
                  color: 'var(--n-text-primary)',
                  fontWeight: 'var(--n-weight-bold)',
                }}
              >
                Cursus learning premium
              </h1>
              <p style={{ margin: 0, color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>
                Filtrez vos parcours, visualisez votre progression et lancez la prochaine etape en un clic.
              </p>

              {metrics.mission && (
                <div
                  style={{
                    marginTop: 'var(--n-space-5)',
                    padding: 'var(--n-space-4)',
                    borderRadius: 'var(--n-radius-md)',
                    border: '1px solid var(--n-reward-border)',
                    background:
                      'linear-gradient(145deg, color-mix(in oklab, var(--n-reward-bg) 86%, var(--n-bg-elevated)), var(--n-bg-elevated))',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-2)' }}>
                    <Sparkles size={14} style={{ color: 'var(--n-reward)' }} />
                    <span style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-reward)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'var(--n-weight-semibold)' }}>
                      Next best action
                    </span>
                  </div>
                  <h2 style={{ margin: 0, color: 'var(--n-text-primary)', fontSize: 'var(--n-text-lg)' }}>{metrics.mission.title}</h2>
                  <p style={{ margin: 'var(--n-space-2) 0 var(--n-space-3)', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>
                    {missionProgress}% complete, {metrics.mission.module_count} modules, {metrics.mission.estimated_hours}h estimate.
                  </p>
                  <Link prefetch={false} href={`/student/cursus/${metrics.mission.id}`} style={{ textDecoration: 'none' }}>
                    <NotionButton leftIcon={<Play size={13} />}>{missionProgress > 0 ? 'Continuer ce cursus' : 'Demarrer ce cursus'}</NotionButton>
                  </Link>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--n-space-3)' }}>
              <NotionProgressRing value={metrics.overall} label={`${metrics.overall}%`} />
              <div style={{ textAlign: 'center' }}>
                <NotionPill variant="reward">{metrics.totalCompleted}/{metrics.totalUnits || 0} unites completees</NotionPill>
                <p style={{ margin: 'var(--n-space-2) 0 0', fontSize: 'var(--n-text-xs)', color: 'var(--n-text-secondary)' }}>
                  {metrics.totalModules} modules et {metrics.totalHours}h de contenu
                </p>
              </div>
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
        {[
          { label: 'Cursus', value: cursusList.length, icon: <BookOpen size={14} />, tone: 'var(--n-accent)' },
          { label: 'Modules', value: metrics.totalModules, icon: <Layers size={14} />, tone: 'var(--n-info)' },
          { label: 'Heures', value: `${metrics.totalHours}h`, icon: <Clock size={14} />, tone: 'var(--n-warning)' },
          { label: 'Progression', value: `${metrics.overall}%`, icon: <TrendingUp size={14} />, tone: 'var(--n-success)' },
        ].map((item) => (
          <NotionCard key={item.label} padding="md">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)', textTransform: 'uppercase' }}>{item.label}</span>
              <span style={{ color: item.tone }}>{item.icon}</span>
            </div>
            <div style={{ marginTop: 'var(--n-space-2)', color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-mono)', fontSize: 'var(--n-text-xl)', fontWeight: 'var(--n-weight-bold)' }}>
              {item.value}
            </div>
          </NotionCard>
        ))}
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
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--n-text-tertiary)' }}
            />
            <input
              type="text"
              className="n-input"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Rechercher un cursus"
              style={{ paddingLeft: '32px' }}
              aria-label="Rechercher un cursus"
            />
          </div>

          <NotionTabs<LevelFilter>
            value={filterLevel}
            options={levelOptions}
            onChange={setFilterLevel}
            ariaLabel="Filtrer par niveau"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <NotionButton variant="secondary" onClick={() => void fetchCursus()} loading={loading}>
              Rafraichir
            </NotionButton>
          </div>
        </div>
      </NotionCard>

      <div
        style={{
          marginTop: 'var(--n-space-4)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--n-space-3)',
        }}
      >
        {loading ? (
          [...Array(4)].map((_, i) => <NotionSkeleton key={i} type="card" />)
        ) : filteredCursus.length === 0 ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <NotionEmptyState
              icon={<BookOpen size={28} />}
              title={searchQuery || filterLevel !== 'ALL' ? 'Aucun resultat' : 'Aucun cursus disponible'}
              description={
                searchQuery || filterLevel !== 'ALL'
                  ? 'Essayez une autre recherche ou un autre filtre de niveau.'
                  : 'Vos cursus apparaitront ici des leur publication.'
              }
            />
          </div>
        ) : (
          filteredCursus.map((cursus) => {
            const progress = getCursusProgress(cursus);
            const started = progress > 0;
            const completed = progress >= 100;

            return (
              <div key={cursus.id}>
                <NotionCard variant="hover" padding="md" style={{ height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--n-space-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: 'var(--n-radius-sm)',
                          border: '1px solid var(--n-border)',
                          background: 'var(--n-bg-secondary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                        }}
                        aria-hidden="true"
                      >
                        {ICON_EMOJI[cursus.icon] || '??'}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)' }}>{cursus.title}</h3>
                        <div style={{ marginTop: '4px' }}>
                          <NotionBadge variant={LEVEL_VARIANT[cursus.level]} size="sm">
                            {LEVEL_LABEL[cursus.level]}
                          </NotionBadge>
                        </div>
                      </div>
                    </div>
                    {completed && (
                      <NotionBadge variant="success" size="sm">
                        Termine
                      </NotionBadge>
                    )}
                  </div>

                  <p style={{ margin: 'var(--n-space-3) 0', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', lineHeight: 'var(--n-leading-relaxed)' }}>
                    {cursus.description}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-3)' }}>
                    <NotionPill variant="default" icon={<Layers size={11} />}>
                      {cursus.module_count} modules
                    </NotionPill>
                    <NotionPill variant="default" icon={<Clock size={11} />}>
                      {cursus.estimated_hours}h
                    </NotionPill>
                  </div>

                  <NotionProgress
                    value={progress}
                    variant={completed ? 'success' : 'accent'}
                    size="thin"
                    showLabel
                    label={`${progress}%`}
                    aria-label={`Progression ${cursus.title}`}
                  />

                  <div style={{ marginTop: 'var(--n-space-3)' }}>
                    <Link prefetch={false} href={`/student/cursus/${cursus.id}`} style={{ textDecoration: 'none' }}>
                      <NotionButton
                        fullWidth
                        variant={completed ? 'secondary' : started ? 'primary' : 'reward'}
                        leftIcon={<Play size={12} />}
                      >
                        {completed ? 'Reviser le cursus' : started ? 'Continuer le cursus' : 'Demarrer le cursus'}
                      </NotionButton>
                    </Link>
                  </div>
                </NotionCard>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


