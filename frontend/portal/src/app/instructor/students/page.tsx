'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  RefreshCw,
  Search,
  TrendingUp,
  UserPlus,
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

export default function InstructorStudentsPage() {
  const { isLoading } = useAuth(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStudents = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setError(null);
      const response = await fetch('/api/users/students?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Impossible de charger les etudiants');

      const data = await response.json();
      setStudents(data.students || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      setStudents([]);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    void fetchStudents();
  }, [isLoading, fetchStudents]);

  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        if (!searchQuery) return true;
        const haystack = `${student.first_name} ${student.last_name} ${student.username} ${student.email}`.toLowerCase();
        return haystack.includes(searchQuery.toLowerCase());
      }),
    [searchQuery, students]
  );

  const metrics = useMemo(() => {
    const activeStudents = students.filter((student) => student.status === 'ACTIVE').length;
    const averageCompletion =
      students.length > 0
        ? Math.round(
            students.reduce((sum, student) => sum + Math.min(100, Math.round((student.workshops_completed / 6) * 100)), 0) /
              students.length
          )
        : 0;

    const totalXp = students.reduce((sum, student) => sum + student.total_xp, 0);
    const totalModules = students.reduce((sum, student) => sum + student.workshops_completed, 0);

    return { activeStudents, averageCompletion, totalXp, totalModules };
  }, [students]);

  if (isLoading || dataLoading) {
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
              <NotionPill variant="accent" icon={<Users size={12} />}>
                Gestion cohorte
              </NotionPill>
              <h1
                style={{
                  margin: 'var(--n-space-3) 0 var(--n-space-2)',
                  color: 'var(--n-text-primary)',
                  fontSize: 'var(--n-text-2xl)',
                  fontWeight: 'var(--n-weight-bold)',
                }}
              >
                Suivi etudiants
              </h1>
              <p style={{ margin: 0, color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>
                {students.length} etudiant{students.length > 1 ? 's' : ''} inscrit{students.length > 1 ? 's' : ''}. Identifiez les blocages et activez les bonnes actions.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 'var(--n-space-2)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <NotionButton variant="secondary" leftIcon={<RefreshCw size={13} />} onClick={() => void fetchStudents()}>
                Rafraichir
              </NotionButton>
              <Link href="/instructor/students/add" style={{ textDecoration: 'none' }}>
                <NotionButton variant="primary" leftIcon={<UserPlus size={13} />}>
                  Ajouter
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
          { label: 'Actifs', value: metrics.activeStudents, icon: <Activity size={14} />, tone: 'var(--n-success)' },
          { label: 'Completion moyenne', value: `${metrics.averageCompletion}%`, icon: <TrendingUp size={14} />, tone: 'var(--n-accent)' },
          { label: 'XP total cohorte', value: metrics.totalXp.toLocaleString(), icon: <BarChart3 size={14} />, tone: 'var(--n-reward)' },
          { label: 'Modules valides', value: metrics.totalModules, icon: <BookOpen size={14} />, tone: 'var(--n-warning)' },
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
                fontSize: 'var(--n-text-lg)',
                fontFamily: 'var(--n-font-mono)',
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
        <div style={{ position: 'relative', maxWidth: '420px' }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--n-text-tertiary)' }}
          />
          <input
            className="n-input"
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Rechercher un etudiant"
            style={{ paddingLeft: '32px' }}
            aria-label="Rechercher un etudiant"
          />
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
        {filteredStudents.length === 0 ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <NotionEmptyState
              icon={<Users size={24} />}
              title={searchQuery ? 'Aucun etudiant trouve' : 'Aucun etudiant inscrit'}
              description={searchQuery ? 'Essayez un autre mot cle.' : 'Ajoutez votre premiere promotion pour commencer le suivi.'}
            />
          </div>
        ) : (
          filteredStudents.map((student, index) => {
            const fullName = [student.first_name, student.last_name].filter(Boolean).join(' ') || student.username;
            const progressPercent = Math.min(100, Math.round((student.workshops_completed / 6) * 100));
            const struggling = progressPercent < 20 && student.total_xp < 50;

            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.03 }}
              >
                <NotionCard
                  variant="hover"
                  padding="md"
                  style={{
                    height: '100%',
                    borderColor: struggling ? 'var(--n-warning-border)' : undefined,
                    background: struggling ? 'var(--n-warning-bg)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--n-space-2)', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ margin: 0, color: 'var(--n-text-primary)', fontSize: 'var(--n-text-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fullName}
                      </h3>
                      <p style={{ margin: '4px 0 0', color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {student.email}
                      </p>
                    </div>
                    <NotionBadge variant={student.status === 'ACTIVE' ? 'success' : 'default'} size="sm">
                      {student.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                    </NotionBadge>
                  </div>

                  <div style={{ marginTop: 'var(--n-space-3)', display: 'flex', flexWrap: 'wrap', gap: 'var(--n-space-2)' }}>
                    <NotionPill variant="default">{student.workshops_completed}/6 ateliers</NotionPill>
                    <NotionPill variant="accent">{student.total_xp} XP</NotionPill>
                    <NotionPill variant="reward">{student.badge_count} badges</NotionPill>
                  </div>

                  <div style={{ marginTop: 'var(--n-space-3)' }}>
                    <NotionProgress
                      value={progressPercent}
                      variant={progressPercent >= 70 ? 'success' : progressPercent >= 40 ? 'warning' : 'danger'}
                      size="thin"
                      showLabel
                      label={`${progressPercent}%`}
                    />
                  </div>

                  <div style={{ marginTop: 'var(--n-space-3)' }}>
                    <Link href={`/instructor/students/${student.id}`} style={{ textDecoration: 'none' }}>
                      <NotionButton fullWidth variant="secondary" rightIcon={<ArrowRight size={12} />}>
                        Voir le detail etudiant
                      </NotionButton>
                    </Link>
                  </div>
                </NotionCard>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

