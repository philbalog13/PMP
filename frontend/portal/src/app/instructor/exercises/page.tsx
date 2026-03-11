'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BarChart3,
  BookOpen,
  Clock,
  Edit,
  FileText,
  Plus,
  Search,
  Target,
  Trash2,
  Users,
} from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import {
  NotionBadge,
  NotionButton,
  NotionCard,
  NotionEmptyState,
  NotionPill,
  NotionSkeleton,
  NotionTabs,
} from '@shared/components/notion';

interface Exercise {
  id: string;
  title: string;
  description: string;
  type: string;
  difficulty: string;
  workshopId: string | null;
  points: number;
  timeLimitMinutes: number | null;
  isActive: boolean;
  createdAt: string;
  assignmentCount: number;
}

type DifficultyFilter = 'ALL' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
type TypeFilter = 'ALL' | 'QUIZ' | 'PRACTICAL' | 'SIMULATION' | 'CODE_REVIEW' | 'CASE_STUDY';

type UnknownRecord = Record<string, unknown>;

const toRecord = (value: unknown): UnknownRecord => (value !== null && typeof value === 'object' ? (value as UnknownRecord) : {});

const normalizeExercise = (raw: unknown): Exercise => {
  const record = toRecord(raw);
  return {
    id: String(record.id || ''),
    title: String(record.title ?? ''),
    description: String(record.description ?? ''),
    type: String(record.type ?? ''),
    difficulty: String(record.difficulty ?? ''),
    workshopId: (record.workshopId ?? record.workshop_id ?? null) as string | null,
    points: Number(record.points ?? 0),
    timeLimitMinutes: (record.timeLimitMinutes ?? record.time_limit_minutes ?? null) as number | null,
    isActive: Boolean(record.isActive ?? record.is_active),
    createdAt: String(record.createdAt ?? record.created_at ?? ''),
    assignmentCount: Number(record.assignmentCount ?? record.assignment_count ?? 0),
  };
};

const DIFFICULTY_LABELS: Record<string, string> = {
  BEGINNER: 'Debutant',
  INTERMEDIATE: 'Intermediaire',
  ADVANCED: 'Avance',
  EXPERT: 'Expert',
};

const TYPE_LABELS: Record<string, string> = {
  QUIZ: 'Quiz',
  PRACTICAL: 'Pratique',
  SIMULATION: 'Simulation',
  CODE_REVIEW: 'Revue de code',
  CASE_STUDY: 'Etude de cas',
};

const DIFFICULTY_BADGE: Record<string, 'beginner' | 'inter' | 'advanced' | 'expert' | 'default'> = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'inter',
  ADVANCED: 'advanced',
  EXPERT: 'expert',
};

export default function ExercisesPage() {
  const { isLoading: authLoading } = useAuth(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TypeFilter>('ALL');
  const [filterDifficulty, setFilterDifficulty] = useState<DifficultyFilter>('ALL');

  const fetchExercises = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const token = localStorage.getItem('token');
      if (!token) throw new Error('Session introuvable');

      const response = await fetch('/api/exercises', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`Impossible de charger les exercices (${response.status})`);

      const data = await response.json();
      setExercises((data.exercises || []).map(normalizeExercise));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les exercices');
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    void fetchExercises();
  }, [authLoading, fetchExercises]);

  const deleteExercise = useCallback(async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cet exercice ?')) return;

    try {
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Session introuvable');

      const response = await fetch(`/api/exercises/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`Suppression impossible (${response.status})`);

      setExercises((previous) => previous.filter((exercise) => exercise.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Suppression impossible');
    }
  }, []);

  const filteredExercises = useMemo(
    () =>
      exercises.filter((exercise) => {
        const matchesSearch =
          exercise.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          exercise.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'ALL' || exercise.type === filterType;
        const matchesDifficulty = filterDifficulty === 'ALL' || exercise.difficulty === filterDifficulty;
        return matchesSearch && matchesType && matchesDifficulty;
      }),
    [exercises, filterDifficulty, filterType, searchQuery]
  );

  const metrics = useMemo(() => {
    const activeCount = exercises.filter((exercise) => exercise.isActive).length;
    const assignedCount = exercises.reduce((sum, exercise) => sum + exercise.assignmentCount, 0);
    const avgPoints = exercises.length > 0 ? Math.round(exercises.reduce((sum, exercise) => sum + exercise.points, 0) / exercises.length) : 0;
    const quizCount = exercises.filter((exercise) => exercise.type === 'QUIZ').length;

    return { activeCount, assignedCount, avgPoints, quizCount };
  }, [exercises]);

  if (authLoading || (loading && exercises.length === 0)) {
    return (
      <div className="n-page-container" style={{ maxWidth: '1200px' }}>
        <NotionSkeleton type="line" width="220px" height="28px" />
        <div style={{ marginTop: 'var(--n-space-2)' }}>
          <NotionSkeleton type="line" width="340px" height="14px" />
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

  const typeOptions = [
    { value: 'ALL' as TypeFilter, label: 'Tous', count: exercises.length },
    { value: 'QUIZ' as TypeFilter, label: 'Quiz', count: exercises.filter((exercise) => exercise.type === 'QUIZ').length },
    {
      value: 'PRACTICAL' as TypeFilter,
      label: 'Pratique',
      count: exercises.filter((exercise) => exercise.type === 'PRACTICAL').length,
    },
    {
      value: 'SIMULATION' as TypeFilter,
      label: 'Simulation',
      count: exercises.filter((exercise) => exercise.type === 'SIMULATION').length,
    },
  ];

  const difficultyOptions = [
    { value: 'ALL' as DifficultyFilter, label: 'Tous', count: exercises.length },
    {
      value: 'BEGINNER' as DifficultyFilter,
      label: 'Debutant',
      count: exercises.filter((exercise) => exercise.difficulty === 'BEGINNER').length,
    },
    {
      value: 'INTERMEDIATE' as DifficultyFilter,
      label: 'Intermediaire',
      count: exercises.filter((exercise) => exercise.difficulty === 'INTERMEDIATE').length,
    },
    {
      value: 'ADVANCED' as DifficultyFilter,
      label: 'Avance',
      count: exercises.filter((exercise) => exercise.difficulty === 'ADVANCED').length,
    },
    {
      value: 'EXPERT' as DifficultyFilter,
      label: 'Expert',
      count: exercises.filter((exercise) => exercise.difficulty === 'EXPERT').length,
    },
  ];

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
              <NotionPill variant="accent" icon={<FileText size={12} />}>
                Bibliotheque exercices
              </NotionPill>
              <h1
                style={{
                  margin: 'var(--n-space-3) 0 var(--n-space-2)',
                  color: 'var(--n-text-primary)',
                  fontSize: 'var(--n-text-2xl)',
                  fontWeight: 'var(--n-weight-bold)',
                }}
              >
                Gestion des exercices
              </h1>
              <p style={{ margin: 0, color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>
                Creez, filtrez et suivez vos exercices pedagogiques sur tout le parcours learning.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 'var(--n-space-2)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <NotionButton variant="secondary" onClick={() => void fetchExercises()}>
                Rafraichir
              </NotionButton>
              <Link href="/instructor/exercises/create" style={{ textDecoration: 'none' }}>
                <NotionButton variant="primary" leftIcon={<Plus size={13} />}>
                  Nouvel exercice
                </NotionButton>
              </Link>
            </div>
          </div>
        </NotionCard>
      </motion.section>

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
          { label: 'Exercices actifs', value: metrics.activeCount, icon: <BookOpen size={14} />, tone: 'var(--n-success)' },
          { label: 'Assignations', value: metrics.assignedCount, icon: <Users size={14} />, tone: 'var(--n-accent)' },
          { label: 'Points moyens', value: metrics.avgPoints, icon: <Target size={14} />, tone: 'var(--n-warning)' },
          { label: 'Quiz', value: metrics.quizCount, icon: <BarChart3 size={14} />, tone: 'var(--n-info)' },
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
              className="n-input"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Rechercher un exercice"
              style={{ paddingLeft: '32px' }}
              aria-label="Rechercher un exercice"
            />
          </div>
          <NotionTabs<TypeFilter> value={filterType} options={typeOptions} onChange={setFilterType} ariaLabel="Filtrer par type" />
          <NotionTabs<DifficultyFilter>
            value={filterDifficulty}
            options={difficultyOptions}
            onChange={setFilterDifficulty}
            ariaLabel="Filtrer par difficulte"
          />
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
        {loading ? (
          [...Array(4)].map((_, index) => <NotionSkeleton key={index} type="card" />)
        ) : filteredExercises.length === 0 ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <NotionEmptyState
              icon={<FileText size={26} />}
              title="Aucun exercice trouve"
              description={
                searchQuery || filterType !== 'ALL' || filterDifficulty !== 'ALL'
                  ? 'Ajustez vos filtres pour afficher plus de contenu.'
                  : 'Commencez par creer votre premier exercice.'
              }
              action={
                <Link href="/instructor/exercises/create" style={{ textDecoration: 'none' }}>
                  <NotionButton variant="primary" leftIcon={<Plus size={13} />}>
                    Creer un exercice
                  </NotionButton>
                </Link>
              }
            />
          </div>
        ) : (
          filteredExercises.map((exercise, index) => (
            <motion.div
              key={exercise.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.03 }}
            >
              <NotionCard variant="hover" padding="md" style={{ height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--n-space-2)' }}>
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)' }}>{exercise.title}</h3>
                    <div style={{ marginTop: '6px', display: 'flex', gap: 'var(--n-space-2)', flexWrap: 'wrap' }}>
                      <NotionBadge variant={DIFFICULTY_BADGE[exercise.difficulty] || 'default'} size="sm">
                        {DIFFICULTY_LABELS[exercise.difficulty] || exercise.difficulty}
                      </NotionBadge>
                      <NotionBadge variant="default" size="sm">
                        {TYPE_LABELS[exercise.type] || exercise.type}
                      </NotionBadge>
                    </div>
                  </div>
                  <NotionBadge variant={exercise.isActive ? 'success' : 'default'} size="sm">
                    {exercise.isActive ? 'Actif' : 'Archive'}
                  </NotionBadge>
                </div>

                <p style={{ margin: 'var(--n-space-3) 0', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', lineHeight: 'var(--n-leading-relaxed)' }}>
                  {exercise.description}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--n-space-2)' }}>
                  <NotionPill variant="default" icon={<Target size={11} />}>
                    {exercise.points} pts
                  </NotionPill>
                  {exercise.timeLimitMinutes && (
                    <NotionPill variant="default" icon={<Clock size={11} />}>
                      {exercise.timeLimitMinutes} min
                    </NotionPill>
                  )}
                  <NotionPill variant="accent" icon={<Users size={11} />}>
                    {exercise.assignmentCount} assignes
                  </NotionPill>
                </div>

                <div style={{ marginTop: 'var(--n-space-3)', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'var(--n-space-2)' }}>
                  <Link href={`/instructor/exercises/${exercise.id}`} style={{ textDecoration: 'none' }}>
                    <NotionButton variant="secondary" size="sm" fullWidth leftIcon={<BarChart3 size={12} />}>
                      Suivi
                    </NotionButton>
                  </Link>
                  <Link href={`/instructor/exercises/${exercise.id}/edit`} style={{ textDecoration: 'none' }}>
                    <NotionButton variant="secondary" size="sm" fullWidth leftIcon={<Edit size={12} />}>
                      Editer
                    </NotionButton>
                  </Link>
                  <NotionButton
                    variant="danger"
                    size="sm"
                    fullWidth
                    leftIcon={<Trash2 size={12} />}
                    onClick={() => void deleteExercise(exercise.id)}
                  >
                    Supprimer
                  </NotionButton>
                </div>
              </NotionCard>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

