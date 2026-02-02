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
    Filter,
    CheckCircle2,
    AlertCircle,
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

const DIFFICULTY_COLORS: Record<string, string> = {
    'BEGINNER': 'bg-emerald-500/20 text-emerald-400',
    'INTERMEDIATE': 'bg-blue-500/20 text-blue-400',
    'ADVANCED': 'bg-amber-500/20 text-amber-400',
    'EXPERT': 'bg-red-500/20 text-red-400'
};

const TYPE_LABELS: Record<string, string> = {
    'QUIZ': 'Quiz',
    'PRACTICAL': 'Pratique',
    'SIMULATION': 'Simulation',
    'CODE_REVIEW': 'Revue de code',
    'CASE_STUDY': 'Étude de cas'
};

export default function ExercisesPage() {
    const { user, isLoading: authLoading } = useAuth(true);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('');
    const [filterDifficulty, setFilterDifficulty] = useState<string>('');

    useEffect(() => {
        fetchExercises();
    }, []);

    const fetchExercises = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/exercises', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setExercises(data.exercises || []);
            } else {
                // Mock data
                setExercises([
                    {
                        id: '1',
                        title: 'Analyse de message ISO 8583',
                        description: 'Décoder un message ISO 8583 et identifier les champs clés.',
                        type: 'PRACTICAL',
                        difficulty: 'INTERMEDIATE',
                        workshopId: 'iso8583',
                        points: 100,
                        timeLimitMinutes: 30,
                        isActive: true,
                        createdAt: '2024-01-10T10:00:00Z',
                        assignmentCount: 12
                    },
                    {
                        id: '2',
                        title: 'Configuration HSM',
                        description: 'Simuler la génération de clés cryptographiques avec un HSM.',
                        type: 'SIMULATION',
                        difficulty: 'ADVANCED',
                        workshopId: 'hsm-keys',
                        points: 150,
                        timeLimitMinutes: 45,
                        isActive: true,
                        createdAt: '2024-01-08T14:00:00Z',
                        assignmentCount: 8
                    },
                    {
                        id: '3',
                        title: 'Étude de cas: Fraude carte',
                        description: 'Analyser un cas de fraude et proposer des contre-mesures.',
                        type: 'CASE_STUDY',
                        difficulty: 'EXPERT',
                        workshopId: 'fraud-detection',
                        points: 200,
                        timeLimitMinutes: 60,
                        isActive: true,
                        createdAt: '2024-01-05T09:00:00Z',
                        assignmentCount: 5
                    },
                    {
                        id: '4',
                        title: 'Quiz Introduction',
                        description: 'Quiz de validation pour le module Introduction.',
                        type: 'QUIZ',
                        difficulty: 'BEGINNER',
                        workshopId: 'intro',
                        points: 50,
                        timeLimitMinutes: 15,
                        isActive: true,
                        createdAt: '2024-01-01T10:00:00Z',
                        assignmentCount: 25
                    }
                ]);
            }
        } catch (error) {
            console.error('Failed to fetch exercises:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteExercise = async (id: string) => {
        if (!confirm('Voulez-vous vraiment supprimer cet exercice ?')) return;

        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/exercises/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            setExercises(exercises.filter(ex => ex.id !== id));
        } catch (error) {
            console.error('Failed to delete exercise:', error);
        }
    };

    const filteredExercises = exercises.filter(ex => {
        const matchesSearch = ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ex.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = !filterType || ex.type === filterType;
        const matchesDifficulty = !filterDifficulty || ex.difficulty === filterDifficulty;
        return matchesSearch && matchesType && matchesDifficulty;
    });

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pt-24 pb-12">
            <div className="max-w-6xl mx-auto px-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                            <Link href="/instructor" className="hover:text-blue-400">Dashboard</Link>
                            <ChevronRight size={14} />
                            <span className="text-white">Exercices</span>
                        </div>
                        <h1 className="text-3xl font-bold text-white">Gestion des exercices</h1>
                        <p className="text-slate-400 mt-1">
                            {exercises.length} exercice{exercises.length > 1 ? 's' : ''} créé{exercises.length > 1 ? 's' : ''}
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

                {/* Filters */}
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
                        <option value="CASE_STUDY">Étude de cas</option>
                    </select>

                    <select
                        value={filterDifficulty}
                        onChange={(e) => setFilterDifficulty(e.target.value)}
                        className="px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Toutes difficultés</option>
                        <option value="BEGINNER">Débutant</option>
                        <option value="INTERMEDIATE">Intermédiaire</option>
                        <option value="ADVANCED">Avancé</option>
                        <option value="EXPERT">Expert</option>
                    </select>
                </div>

                {/* Exercises List */}
                <div className="space-y-4">
                    {filteredExercises.length === 0 ? (
                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-12 text-center">
                            <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Aucun exercice trouvé</h3>
                            <p className="text-slate-400 mb-6">
                                {searchQuery || filterType || filterDifficulty
                                    ? 'Essayez de modifier vos filtres.'
                                    : 'Commencez par créer votre premier exercice.'
                                }
                            </p>
                            {!searchQuery && !filterType && !filterDifficulty && (
                                <Link
                                    href="/instructor/exercises/create"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
                                >
                                    <Plus size={18} />
                                    Créer un exercice
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
                                                {exercise.difficulty === 'BEGINNER' && 'Débutant'}
                                                {exercise.difficulty === 'INTERMEDIATE' && 'Intermédiaire'}
                                                {exercise.difficulty === 'ADVANCED' && 'Avancé'}
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
                                                {exercise.assignmentCount} assigné{exercise.assignmentCount > 1 ? 's' : ''}
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

                {/* Stats Summary */}
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <p className="text-sm text-slate-400 mb-1">Quiz</p>
                        <p className="text-2xl font-bold text-white">
                            {exercises.filter(e => e.type === 'QUIZ').length}
                        </p>
                    </div>
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <p className="text-sm text-slate-400 mb-1">Exercices pratiques</p>
                        <p className="text-2xl font-bold text-white">
                            {exercises.filter(e => e.type === 'PRACTICAL').length}
                        </p>
                    </div>
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <p className="text-sm text-slate-400 mb-1">Simulations</p>
                        <p className="text-2xl font-bold text-white">
                            {exercises.filter(e => e.type === 'SIMULATION').length}
                        </p>
                    </div>
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <p className="text-sm text-slate-400 mb-1">Total assignements</p>
                        <p className="text-2xl font-bold text-white">
                            {exercises.reduce((sum, e) => sum + e.assignmentCount, 0)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
