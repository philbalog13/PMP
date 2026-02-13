'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../../auth/useAuth';
import {
    Users, TrendingUp, CheckCircle, Activity,
    ChevronRight, RefreshCw, Search, UserPlus, Beaker,
    BookOpen, BarChart3, GraduationCap
} from 'lucide-react';

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
            const res = await fetch('/api/users/students?limit=50', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setStudents(data.students || []);
            } else {
                throw new Error('Impossible de charger les étudiants');
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setDataLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isLoading) return;
        fetchStudents();
    }, [isLoading, fetchStudents]);

    // Computed stats
    const activeStudents = students.filter(s => s.status === 'ACTIVE').length;
    const avgCompletion = students.length > 0
        ? Math.round(students.reduce((acc, s) => acc + Math.min(100, Math.round((s.workshops_completed / 6) * 100)), 0) / students.length)
        : 0;
    const totalModulesValidated = students.reduce((acc, s) => acc + s.workshops_completed, 0);

    // Filter
    const filteredStudents = students.filter(s => {
        if (!searchQuery) return true;
        const name = `${s.first_name} ${s.last_name} ${s.username} ${s.email}`.toLowerCase();
        return name.includes(searchQuery.toLowerCase());
    });

    if (isLoading || dataLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Users className="animate-bounce w-12 h-12 text-blue-500" />
                    <span className="text-sm text-slate-500">Chargement des étudiants...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white pt-24 pb-12 px-6">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Breadcrumb */}
                <div className="text-xs text-slate-500">
                    <Link href="/instructor" className="hover:text-blue-400">Dashboard</Link>
                    <ChevronRight size={12} className="inline mx-1" />
                    <span className="text-blue-400">Étudiants</span>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
                            <Users className="w-7 h-7 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Suivi Étudiants</h1>
                            <p className="text-slate-400 mt-1">
                                {students.length} étudiant{students.length !== 1 ? 's' : ''} inscrit{students.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { setDataLoading(true); fetchStudents(); }}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-white/10 text-white rounded-xl hover:bg-slate-700"
                        >
                            <RefreshCw size={18} />
                            Actualiser
                        </button>
                        <Link
                            href="/instructor/students/add"
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
                        >
                            <UserPlus size={18} />
                            Ajouter
                        </Link>
                        <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-full">
                            <Activity className="w-4 h-4 text-green-400 animate-pulse" />
                            <span className="text-xs font-bold text-green-400">Live</span>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
                        {error}
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard
                        label="Étudiants Actifs"
                        value={String(activeStudents)}
                        icon={<Users className="w-6 h-6" />}
                        color="green"
                    />
                    <StatCard
                        label="Complétion Moyenne"
                        value={`${avgCompletion}%`}
                        icon={<TrendingUp className="w-6 h-6" />}
                        color="blue"
                    />
                    <StatCard
                        label="XP Total Cohorte"
                        value={students.reduce((acc, s) => acc + s.total_xp, 0).toLocaleString()}
                        icon={<GraduationCap className="w-6 h-6" />}
                        color="purple"
                    />
                    <StatCard
                        label="Modules Validés"
                        value={String(totalModulesValidated)}
                        icon={<CheckCircle className="w-6 h-6" />}
                        color="emerald"
                    />
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher un étudiant..."
                        className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                </div>

                {/* Students Table */}
                <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-900/80">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Étudiant</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Ateliers</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">XP</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Badges</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Progression</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Statut</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                            {searchQuery ? 'Aucun étudiant ne correspond à votre recherche' : 'Aucun étudiant inscrit'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudents.map((student) => {
                                        const name = [student.first_name, student.last_name].filter(Boolean).join(' ') || student.username;
                                        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                                        const progressPercent = Math.min(100, Math.round((student.workshops_completed / 6) * 100));
                                        const isStruggling = progressPercent < 20 && student.total_xp < 50;

                                        return (
                                            <tr key={student.id} className="hover:bg-white/5 transition">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                                                            {initials}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-white">{name}</div>
                                                            <div className="text-xs text-slate-500">{student.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-white font-medium">{student.workshops_completed}/6</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-emerald-400 font-bold">{student.total_xp}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium">
                                                        {student.badge_count}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden max-w-[120px]">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${isStruggling ? 'bg-amber-500' : 'bg-gradient-to-r from-blue-500 to-emerald-500'}`}
                                                                style={{ width: `${progressPercent}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-400 min-w-[3rem]">
                                                            {progressPercent}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                                                        student.status === 'ACTIVE'
                                                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                                            : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                                                    }`}>
                                                        {student.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <Link
                                                        href={`/instructor/students/${student.id}`}
                                                        className="text-sm font-bold text-blue-400 hover:text-blue-300 transition"
                                                    >
                                                        Détails
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link
                        href="/instructor/exercises"
                        className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl hover:border-blue-500/30 transition group"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <BookOpen size={20} className="text-blue-400" />
                            <h3 className="text-lg font-bold group-hover:text-blue-400 transition">
                                Gestion Exercices
                            </h3>
                        </div>
                        <p className="text-sm text-slate-400">
                            Créer et modifier les exercices pédagogiques
                        </p>
                    </Link>

                    <Link
                        href="/instructor/lab-control"
                        className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl hover:border-amber-500/30 transition group"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <Beaker size={20} className="text-amber-400" />
                            <h3 className="text-lg font-bold group-hover:text-amber-400 transition">
                                Contrôle Lab
                            </h3>
                        </div>
                        <p className="text-sm text-slate-400">
                            Injecter des conditions d&apos;erreur pour les exercices
                        </p>
                    </Link>

                    <Link
                        href="/instructor/analytics"
                        className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl hover:border-emerald-500/30 transition group"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <BarChart3 size={20} className="text-emerald-400" />
                            <h3 className="text-lg font-bold group-hover:text-emerald-400 transition">
                                Analytics
                            </h3>
                        </div>
                        <p className="text-sm text-slate-400">
                            Statistiques détaillées et classements
                        </p>
                    </Link>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
    const colors: Record<string, string> = {
        green: 'bg-green-500/20 border-green-500/30 text-green-400',
        blue: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
        purple: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
        emerald: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
    };

    return (
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-3">
            <div className={`inline-flex p-3 rounded-xl border ${colors[color]}`}>{icon}</div>
            <div>
                <div className="text-3xl font-bold">{value}</div>
                <div className="text-sm text-slate-400 mt-1">{label}</div>
            </div>
        </div>
    );
}

