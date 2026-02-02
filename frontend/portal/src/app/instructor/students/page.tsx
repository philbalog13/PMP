'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, TrendingUp, Clock, CheckCircle, XCircle, Activity } from 'lucide-react';

interface StudentSession {
    id: string;
    name: string;
    currentApp: string;
    module: string;
    elapsedTime: number;
    status: 'active' | 'idle' | 'completed';
    progress: number;
}

export default function InstructorStudentsPage() {
    const [students, setStudents] = useState<StudentSession[]>([
        {
            id: '1',
            name: 'Student01',
            currentApp: 'TPE-Web',
            module: 'Module 5 - 3D Secure',
            elapsedTime: 15,
            status: 'active',
            progress: 65,
        },
        {
            id: '2',
            name: 'Student02',
            currentApp: 'HSM-Web',
            module: 'Module 6 - Cryptographie',
            elapsedTime: 8,
            status: 'active',
            progress: 40,
        },
        {
            id: '3',
            name: 'Student03',
            currentApp: 'Portal',
            module: 'Quiz Module 3',
            elapsedTime: 3,
            status: 'active',
            progress: 80,
        },
        {
            id: '4',
            name: 'Student04',
            currentApp: 'Offline',
            module: 'Dernière activité: Module 4',
            elapsedTime: 0,
            status: 'idle',
            progress: 50,
        },
    ]);

    // Simulate WebSocket updates
    useEffect(() => {
        const interval = setInterval(() => {
            setStudents((prev) =>
                prev.map((student) => {
                    if (student.status === 'active') {
                        return {
                            ...student,
                            elapsedTime: student.elapsedTime + 1,
                        };
                    }
                    return student;
                })
            );
        }, 60000); // Update every minute

        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'idle':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'completed':
                return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const getAppIcon = (app: string) => {
        switch (app) {
            case 'TPE-Web':
                return '💳';
            case 'HSM-Web':
                return '🔐';
            case 'Portal':
                return '📚';
            case 'User-Cards-Web':
                return '💰';
            default:
                return '⏸️';
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <Link
                        href="/instructor"
                        className="text-sm text-slate-400 hover:text-white transition"
                    >
                        ← Retour au hub
                    </Link>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-orange-500/20 rounded-2xl border border-orange-500/30">
                                <Users className="w-8 h-8 text-orange-400" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black">Suivi Étudiants</h1>
                                <p className="text-slate-400 mt-1">
                                    Monitoring temps réel des sessions actives
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link
                                href="/instructor/students/add"
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
                            >
                                <span className="text-xl">+</span>
                                Ajouter un étudiant
                            </Link>
                            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full">
                                <Activity className="w-4 h-4 text-green-400 animate-pulse" />
                                <span className="text-sm font-bold text-green-400">Live</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard
                        label="Étudiants Actifs"
                        value="3"
                        icon={<Users className="w-6 h-6" />}
                        color="green"
                    />
                    <StatCard
                        label="Taux de Complétion Moyen"
                        value="59%"
                        icon={<TrendingUp className="w-6 h-6" />}
                        color="blue"
                    />
                    <StatCard
                        label="Temps Moyen Session"
                        value="8.7 min"
                        icon={<Clock className="w-6 h-6" />}
                        color="purple"
                    />
                    <StatCard
                        label="Modules Validés Aujourd'hui"
                        value="5"
                        icon={<CheckCircle className="w-6 h-6" />}
                        color="emerald"
                    />
                </div>

                {/* Students Table */}
                <div className="bg-slate-900/60 border border-white/10 rounded-3xl overflow-hidden">
                    <div className="p-6 border-b border-white/10">
                        <h2 className="text-2xl font-black">Sessions en Cours</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-900/80">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Étudiant
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Application
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Module/Activité
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Temps Écoulé
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Progression
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Statut
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {students.map((student) => (
                                    <tr
                                        key={student.id}
                                        className="hover:bg-white/5 transition"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                                    {student.name[0]}
                                                </div>
                                                <div className="font-medium">{student.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">
                                                    {getAppIcon(student.currentApp)}
                                                </span>
                                                <span className="text-slate-300">
                                                    {student.currentApp}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-slate-300">{student.module}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="font-mono text-sm text-slate-400">
                                                {student.elapsedTime > 0
                                                    ? `${student.elapsedTime} min`
                                                    : '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                                                        style={{ width: `${student.progress}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-slate-400 min-w-[3rem]">
                                                    {student.progress}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase border ${getStatusColor(
                                                    student.status
                                                )}`}
                                            >
                                                {student.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <Link
                                                href={`/instructor/students/${student.id}`}
                                                className="text-sm font-bold text-blue-400 hover:text-blue-300 transition"
                                            >
                                                Détails →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
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
                        <h3 className="text-lg font-bold mb-2 group-hover:text-blue-400 transition">
                            📝 Gestion Exercices
                        </h3>
                        <p className="text-sm text-slate-400">
                            Créer et modifier les exercices pédagogiques
                        </p>
                    </Link>

                    <Link
                        href="/instructor/lab-control"
                        className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl hover:border-orange-500/30 transition group"
                    >
                        <h3 className="text-lg font-bold mb-2 group-hover:text-orange-400 transition">
                            🧪 Contrôle Lab
                        </h3>
                        <p className="text-sm text-slate-400">
                            Injecter des conditions d'erreur pour les exercices
                        </p>
                    </Link>

                    <a
                        href="http://localhost:3082"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl hover:border-emerald-500/30 transition group"
                    >
                        <h3 className="text-lg font-bold mb-2 group-hover:text-emerald-400 transition">
                            📊 Monitoring Complet
                        </h3>
                        <p className="text-sm text-slate-400">
                            Dashboard de supervision technique
                        </p>
                    </a>
                </div>
            </div>
        </div>
    );
}

function StatCard({
    label,
    value,
    icon,
    color,
}: {
    label: string;
    value: string;
    icon: React.ReactNode;
    color: string;
}) {
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
                <div className="text-3xl font-black">{value}</div>
                <div className="text-sm text-slate-400 mt-1">{label}</div>
            </div>
        </div>
    );
}
