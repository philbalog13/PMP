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
    ChevronRight,
    Search,
    BarChart3,
    BookOpen
} from 'lucide-react';
import Link from 'next/link';

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

const DIFFICULTY_COLORS: Record<string, string> = {
    BEGINNER: 'bg-emerald-500/20 text-emerald-400',
    INTERMEDIATE: 'bg-blue-500/20 text-blue-400',
    ADVANCED: 'bg-amber-500/20 text-amber-400',
    EXPERT: 'bg-red-500/20 text-red-400'
};

const TYPE_LABELS: Record<string, string> = {
    QUIZ: 'Quiz',
    PRACTICAL: 'Pratique',
    SIMULATION: 'Simulation',
    CODE_REVIEW: 'Revue de code',
    CASE_STUDY: 'Etude de cas'
};

export default function ExercisesPage() {
    const { isLoading: authLoading } = useAuth(true);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('');
    const [filterDifficulty, setFilterDifficulty] = useState<string>('');

    useEffect(() => {
        fetchExercises();
    }, []);

    const fetchExercises = async () => {
        try {
            setError(null);
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Session introuvable');
            }

            const response = await fetch('/api/exercises', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(`Impossible de charger les exercices (${response.status})`);
            }

            const data = await response.json();
            setExercises((data.exercises || []).map(normalizeExercise));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Impossible de charger les exercices';
            setError(message);
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
            if (!token) {
                throw new Error('Session introuvable');
            }

            const response = await fetch(`/api/exercises/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(`Suppression impossible (${response.status})`);
            }

            setExercises((prev) => prev.filter((exercise) => exercise.id !== id));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Suppression impossible';
            setError(message);
        }
    };

    const filteredExercises = exercises.filter((exercise) => {
        const matchesSearch = exercise.title.toLowerCase().includes(searchQuery.toLowerCase())
            || exercise.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = !filterType || exercise.type === filterType;
        const matchesDifficulty = !filterDifficulty || exercise.difficulty === filterDifficulty;
        return matchesSearch && matchesType && matchesDifficulty;
    });

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pt-24 pb-12">
            <div className="max-w-6xl mx-auto px-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                            <Link href="/instructor" className="hover:text-blue-400">Dashboard</Link>
                            <ChevronRight size={12} className="inline" />
                            <span className="text-blue-400">Exercices</span>
                        </div>
                        <h1 className="text-3xl font-bold text-white">Gestion des exercices</h1>
                        <p className="text-slate-400 mt-1">
                            {exercises.length} exercice{exercises.length > 1 ? 's' : ''} cree{exercises.length > 1 ? 's' : ''}
                        </p>
                    </div>
                    <Link
                        href="/instructor/exercises/create"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
                    >
                        <Plus size={18} />
                        Nouvel exercice
                    </Link>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
                        {error}
                    </div>
                )}

                <div className="flex flex-wrap gap-4 mb-6">
                    <div className="relative flex-1 min-w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Rechercher un exercice..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Tous les types</option>
                        <option value="QUIZ">Quiz</option>
                        <option value="PRACTICAL">Pratique</option>
                        <option value="SIMULATION">Simulation</option>
                        <option value="CODE_REVIEW">Revue de code</option>
                        <option value="CASE_STUDY">Etude de cas</option>
                    </select>

                    <select
                        value={filterDifficulty}
                        onChange={(e) => setFilterDifficulty(e.target.value)}
                        className="px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Toutes difficultes</option>
                        <option value="BEGINNER">Debutant</option>
                        <option value="INTERMEDIATE">Intermediaire</option>
                        <option value="ADVANCED">Avance</option>
                        <option value="EXPERT">Expert</option>
                    </select>
                </div>

                <div className="space-y-4">
                    {filteredExercises.length === 0 ? (
                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-12 text-center">
                            <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Aucun exercice trouve</h3>
                            <p className="text-slate-400 mb-6">
                                {searchQuery || filterType || filterDifficulty
                                    ? 'Essayez de modifier vos filtres.'
                                    : 'Commencez par creer votre premier exercice.'}
                            </p>
                            {!searchQuery && !filterType && !filterDifficulty && (
                                <Link
                                    href="/instructor/exercises/create"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
                                >
                                    <Plus size={18} />
                                    Creer un exercice
                                </Link>
                            )}
                        </div>
                    ) : (
                        filteredExercises.map((exercise) => (
                            <div
                                key={exercise.id}
                                className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 hover:bg-slate-800/70 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-white">{exercise.title}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${DIFFICULTY_COLORS[exercise.difficulty] || 'bg-slate-600 text-slate-300'}`}>
                                                {exercise.difficulty === 'BEGINNER' && 'Debutant'}
                                                {exercise.difficulty === 'INTERMEDIATE' && 'Intermediaire'}
                                                {exercise.difficulty === 'ADVANCED' && 'Avance'}
                                                {exercise.difficulty === 'EXPERT' && 'Expert'}
                                            </span>
                                            <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full text-xs">
                                                {TYPE_LABELS[exercise.type] || exercise.type}
                                            </span>
                                        </div>
                                        <p className="text-slate-400 text-sm mb-4">{exercise.description}</p>

                                        <div className="flex items-center gap-6 text-sm">
                                            <span className="flex items-center gap-2 text-slate-400">
                                                <Target size={16} className="text-amber-400" />
                                                {exercise.points} points
                                            </span>
                                            {exercise.timeLimitMinutes && (
                                                <span className="flex items-center gap-2 text-slate-400">
                                                    <Clock size={16} className="text-blue-400" />
                                                    {exercise.timeLimitMinutes} min
                                                </span>
                                            )}
                                            <span className="flex items-center gap-2 text-slate-400">
                                                <Users size={16} className="text-emerald-400" />
                                                {exercise.assignmentCount} assigne{exercise.assignmentCount > 1 ? 's' : ''}
                                            </span>
                                            {exercise.workshopId && (
                                                <span className="flex items-center gap-2 text-slate-400">
                                                    <BookOpen size={16} className="text-purple-400" />
                                                    {exercise.workshopId}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 ml-4">
                                        <Link
                                            href={`/instructor/exercises/${exercise.id}`}
                                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                            title="Voir les soumissions"
                                        >
                                            <BarChart3 size={20} />
                                        </Link>
                                        <Link
                                            href={`/instructor/exercises/${exercise.id}/edit`}
                                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                            title="Modifier"
                                        >
                                            <Edit size={20} />
                                        </Link>
                                        <button
                                            onClick={() => deleteExercise(exercise.id)}
                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Supprimer"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <p className="text-sm text-slate-400 mb-1">Quiz</p>
                        <p className="text-2xl font-bold text-white">{exercises.filter((e) => e.type === 'QUIZ').length}</p>
                    </div>
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <p className="text-sm text-slate-400 mb-1">Exercices pratiques</p>
                        <p className="text-2xl font-bold text-white">{exercises.filter((e) => e.type === 'PRACTICAL').length}</p>
                    </div>
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <p className="text-sm text-slate-400 mb-1">Simulations</p>
                        <p className="text-2xl font-bold text-white">{exercises.filter((e) => e.type === 'SIMULATION').length}</p>
                    </div>
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <p className="text-sm text-slate-400 mb-1">Total assignements</p>
                        <p className="text-2xl font-bold text-white">{exercises.reduce((sum, e) => sum + e.assignmentCount, 0)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
