'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import {
    FileText,
    Plus,
    Edit,
    Trash2,
    Users,
    Clock,
    Target,
    Search,
    BarChart3,
    BookOpen
} from 'lucide-react';
import Link from 'next/link';
import { NotionSkeleton } from '@shared/components/notion';

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

type UnknownRecord = Record<string, unknown>;

const toRecord = (value: unknown): UnknownRecord => (
    value !== null && typeof value === 'object' ? (value as UnknownRecord) : {}
);

const normalizeExercise = (raw: unknown): Exercise => {
    const r = toRecord(raw);
    return {
        id: String(r.id || ''),
        title: String(r.title ?? ''),
        description: String(r.description ?? ''),
        type: String(r.type ?? ''),
        difficulty: String(r.difficulty ?? ''),
        workshopId: (r.workshopId ?? r.workshop_id ?? null) as string | null,
        points: Number(r.points ?? 0),
        timeLimitMinutes: (r.timeLimitMinutes ?? r.time_limit_minutes ?? null) as number | null,
        isActive: Boolean(r.isActive ?? r.is_active),
        createdAt: String(r.createdAt ?? r.created_at ?? ''),
        assignmentCount: Number(r.assignmentCount ?? r.assignment_count ?? 0)
    };
};

const DIFFICULTY_STYLES: Record<string, { bg: string; color: string }> = {
    BEGINNER: { bg: 'var(--n-success-bg)', color: 'var(--n-success)' },
    INTERMEDIATE: { bg: 'var(--n-accent-light)', color: 'var(--n-accent)' },
    ADVANCED: { bg: 'var(--n-warning-bg)', color: 'var(--n-warning)' },
    EXPERT: { bg: 'var(--n-danger-bg)', color: 'var(--n-danger)' },
};

const DIFFICULTY_LABELS: Record<string, string> = {
    BEGINNER: 'Débutant', INTERMEDIATE: 'Intermédiaire', ADVANCED: 'Avancé', EXPERT: 'Expert'
};

const TYPE_LABELS: Record<string, string> = {
    QUIZ: 'Quiz', PRACTICAL: 'Pratique', SIMULATION: 'Simulation',
    CODE_REVIEW: 'Revue de code', CASE_STUDY: 'Étude de cas'
};

export default function ExercisesPage() {
    const { isLoading: authLoading } = useAuth(true);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('');
    const [filterDifficulty, setFilterDifficulty] = useState<string>('');

    useEffect(() => { fetchExercises(); }, []);

    const fetchExercises = async () => {
        try {
            setError(null);
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Session introuvable');
            const response = await fetch('/api/exercises', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`Impossible de charger les exercices (${response.status})`);
            const data = await response.json();
            setExercises((data.exercises || []).map(normalizeExercise));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Impossible de charger les exercices');
            setExercises([]);
        } finally {
            setLoading(false);
        }
    };

    const deleteExercise = async (id: string) => {
        if (!confirm('Voulez-vous vraiment supprimer cet exercice ?')) return;
        try {
            setError(null);
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Session introuvable');
            const response = await fetch(`/api/exercises/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`Suppression impossible (${response.status})`);
            setExercises((prev) => prev.filter((e) => e.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Suppression impossible');
        }
    };

    const filteredExercises = exercises.filter((e) => {
        const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase())
            || e.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch
            && (!filterType || e.type === filterType)
            && (!filterDifficulty || e.difficulty === filterDifficulty);
    });

    if (authLoading || loading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)', padding: '32px 24px' }}>
                <NotionSkeleton type="list" />
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)', padding: '32px 24px' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--n-text-primary)', margin: 0 }}>
                            Gestion des exercices
                        </h1>
                        <p style={{ color: 'var(--n-text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                            {exercises.length} exercice{exercises.length > 1 ? 's' : ''} créé{exercises.length > 1 ? 's' : ''}
                        </p>
                    </div>
                    <Link
                        href="/instructor/exercises/create"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 16px', background: 'var(--n-accent)',
                            color: '#fff', borderRadius: '6px', fontWeight: 500,
                            fontSize: '14px', textDecoration: 'none'
                        }}
                    >
                        <Plus size={16} />
                        Nouvel exercice
                    </Link>
                </div>

                {/* Error */}
                {error && (
                    <div style={{
                        marginBottom: '20px', padding: '12px 16px',
                        background: 'var(--n-danger-bg)', border: '1px solid var(--n-danger)',
                        borderRadius: '6px', color: 'var(--n-danger)', fontSize: '14px'
                    }}>
                        {error}
                    </div>
                )}

                {/* Filtres */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--n-text-tertiary)' }} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Rechercher un exercice..."
                            style={{
                                width: '100%', paddingLeft: '40px', paddingRight: '12px',
                                paddingTop: '9px', paddingBottom: '9px',
                                background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)',
                                borderRadius: '6px', color: 'var(--n-text-primary)', fontSize: '14px',
                                outline: 'none', boxSizing: 'border-box'
                            }}
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        style={{
                            padding: '9px 12px', background: 'var(--n-bg-primary)',
                            border: '1px solid var(--n-border)', borderRadius: '6px',
                            color: 'var(--n-text-primary)', fontSize: '14px', outline: 'none'
                        }}
                    >
                        <option value="">Tous les types</option>
                        <option value="QUIZ">Quiz</option>
                        <option value="PRACTICAL">Pratique</option>
                        <option value="SIMULATION">Simulation</option>
                        <option value="CODE_REVIEW">Revue de code</option>
                        <option value="CASE_STUDY">Étude de cas</option>
                    </select>
                    <select
                        value={filterDifficulty}
                        onChange={(e) => setFilterDifficulty(e.target.value)}
                        style={{
                            padding: '9px 12px', background: 'var(--n-bg-primary)',
                            border: '1px solid var(--n-border)', borderRadius: '6px',
                            color: 'var(--n-text-primary)', fontSize: '14px', outline: 'none'
                        }}
                    >
                        <option value="">Toutes difficultés</option>
                        <option value="BEGINNER">Débutant</option>
                        <option value="INTERMEDIATE">Intermédiaire</option>
                        <option value="ADVANCED">Avancé</option>
                        <option value="EXPERT">Expert</option>
                    </select>
                </div>

                {/* Liste exercices */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {filteredExercises.length === 0 ? (
                        <div style={{
                            background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)',
                            borderRadius: '8px', padding: '48px 24px', textAlign: 'center'
                        }}>
                            <FileText style={{ width: '40px', height: '40px', color: 'var(--n-text-tertiary)', margin: '0 auto 16px' }} />
                            <h3 style={{ color: 'var(--n-text-primary)', fontWeight: 600, marginBottom: '8px' }}>
                                Aucun exercice trouvé
                            </h3>
                            <p style={{ color: 'var(--n-text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                                {searchQuery || filterType || filterDifficulty
                                    ? 'Essayez de modifier vos filtres.'
                                    : 'Commencez par créer votre premier exercice.'}
                            </p>
                            {!searchQuery && !filterType && !filterDifficulty && (
                                <Link
                                    href="/instructor/exercises/create"
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                                        padding: '8px 16px', background: 'var(--n-accent)',
                                        color: '#fff', borderRadius: '6px', fontWeight: 500,
                                        fontSize: '14px', textDecoration: 'none'
                                    }}
                                >
                                    <Plus size={16} /> Créer un exercice
                                </Link>
                            )}
                        </div>
                    ) : (
                        filteredExercises.map((exercise) => {
                            const diffStyle = DIFFICULTY_STYLES[exercise.difficulty] || { bg: 'var(--n-bg-secondary)', color: 'var(--n-text-secondary)' };
                            return (
                                <div
                                    key={exercise.id}
                                    style={{
                                        background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)',
                                        borderRadius: '8px', padding: '16px 20px',
                                        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                                        gap: '16px'
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--n-text-primary)', margin: 0 }}>
                                                {exercise.title}
                                            </h3>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500,
                                                background: diffStyle.bg, color: diffStyle.color
                                            }}>
                                                {DIFFICULTY_LABELS[exercise.difficulty] || exercise.difficulty}
                                            </span>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                                                background: 'var(--n-bg-secondary)', color: 'var(--n-text-secondary)'
                                            }}>
                                                {TYPE_LABELS[exercise.type] || exercise.type}
                                            </span>
                                        </div>
                                        <p style={{ color: 'var(--n-text-secondary)', fontSize: '13px', marginBottom: '12px', lineHeight: '1.5' }}>
                                            {exercise.description}
                                        </p>
                                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--n-text-secondary)' }}>
                                                <Target size={14} style={{ color: 'var(--n-warning)' }} />
                                                {exercise.points} pts
                                            </span>
                                            {exercise.timeLimitMinutes && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--n-text-secondary)' }}>
                                                    <Clock size={14} style={{ color: 'var(--n-accent)' }} />
                                                    {exercise.timeLimitMinutes} min
                                                </span>
                                            )}
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--n-text-secondary)' }}>
                                                <Users size={14} style={{ color: 'var(--n-success)' }} />
                                                {exercise.assignmentCount} assigné{exercise.assignmentCount > 1 ? 's' : ''}
                                            </span>
                                            {exercise.workshopId && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--n-text-secondary)' }}>
                                                    <BookOpen size={14} />
                                                    {exercise.workshopId}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                        <Link
                                            href={`/instructor/exercises/${exercise.id}`}
                                            style={{
                                                padding: '7px', borderRadius: '6px', display: 'flex',
                                                color: 'var(--n-text-tertiary)',
                                                transition: 'background 0.15s'
                                            }}
                                            title="Voir les soumissions"
                                        >
                                            <BarChart3 size={18} />
                                        </Link>
                                        <Link
                                            href={`/instructor/exercises/${exercise.id}/edit`}
                                            style={{
                                                padding: '7px', borderRadius: '6px', display: 'flex',
                                                color: 'var(--n-accent)',
                                            }}
                                            title="Modifier"
                                        >
                                            <Edit size={18} />
                                        </Link>
                                        <button
                                            onClick={() => deleteExercise(exercise.id)}
                                            style={{
                                                padding: '7px', borderRadius: '6px', display: 'flex',
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                color: 'var(--n-danger)',
                                            }}
                                            title="Supprimer"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Stats bas de page */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '28px' }}>
                    {[
                        { label: 'Quiz', count: exercises.filter((e) => e.type === 'QUIZ').length },
                        { label: 'Pratiques', count: exercises.filter((e) => e.type === 'PRACTICAL').length },
                        { label: 'Simulations', count: exercises.filter((e) => e.type === 'SIMULATION').length },
                        { label: 'Assignements', count: exercises.reduce((s, e) => s + e.assignmentCount, 0) },
                    ].map(({ label, count }) => (
                        <div key={label} style={{
                            background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)',
                            borderRadius: '8px', padding: '14px 16px'
                        }}>
                            <p style={{ fontSize: '12px', color: 'var(--n-text-secondary)', margin: '0 0 4px' }}>{label}</p>
                            <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--n-text-primary)', margin: 0 }}>{count}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
