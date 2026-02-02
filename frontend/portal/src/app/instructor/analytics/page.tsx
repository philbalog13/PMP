'use client';

import { useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import Link from 'next/link';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Users,
    Clock,
    CheckCircle2,
    XCircle,
    Award,
    BookOpen,
    ArrowLeft,
    Calendar,
    Download
} from 'lucide-react';

interface WorkshopStats {
    id: string;
    name: string;
    completionRate: number;
    averageScore: number;
    averageTime: number;
    attempts: number;
}

interface QuizStats {
    id: string;
    name: string;
    averageScore: number;
    passRate: number;
    attempts: number;
    hardestQuestion: string;
}

const mockWorkshopStats: WorkshopStats[] = [
    { id: '1', name: 'Introduction à la Monétique', completionRate: 92, averageScore: 85, averageTime: 45, attempts: 24 },
    { id: '2', name: 'Protocole ISO 8583', completionRate: 78, averageScore: 72, averageTime: 90, attempts: 22 },
    { id: '3', name: 'Gestion des Clés HSM', completionRate: 65, averageScore: 68, averageTime: 120, attempts: 18 },
    { id: '4', name: '3D Secure v2', completionRate: 45, averageScore: 74, averageTime: 75, attempts: 12 },
];

const mockQuizStats: QuizStats[] = [
    { id: '1', name: 'Quiz Module 1', averageScore: 82, passRate: 88, attempts: 24, hardestQuestion: 'Différence entre acquéreur et émetteur' },
    { id: '2', name: 'Quiz Module 2', averageScore: 71, passRate: 75, attempts: 22, hardestQuestion: 'Format du bitmap secondaire' },
    { id: '3', name: 'Quiz Module 3', averageScore: 65, passRate: 68, attempts: 18, hardestQuestion: 'Hiérarchie des clés KEK/ZMK/ZPK' },
];

export default function InstructorAnalyticsPage() {
    const { isLoading } = useAuth(true);
    const [dateRange, setDateRange] = useState('week');

    // Calculate overall stats
    const totalStudents = 24;
    const activeStudents = 18;
    const avgProgress = 67;
    const avgSessionTime = 52;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pt-24 pb-12">
            <div className="max-w-7xl mx-auto px-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link
                            href="/instructor"
                            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
                        >
                            <ArrowLeft size={18} />
                            Retour au hub
                        </Link>
                        <h1 className="text-3xl font-bold text-white mb-2">Analytics & Statistiques</h1>
                        <p className="text-slate-400">
                            Vue d'ensemble des performances de la cohorte
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                            <option value="today">Aujourd'hui</option>
                            <option value="week">7 derniers jours</option>
                            <option value="month">30 derniers jours</option>
                            <option value="all">Tout</option>
                        </select>
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors">
                            <Download size={18} />
                            Exporter
                        </button>
                    </div>
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/30 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-500/20 rounded-xl">
                                <Users className="w-6 h-6 text-blue-400" />
                            </div>
                            <span className="text-emerald-400 text-sm flex items-center gap-1">
                                <TrendingUp size={14} /> +3
                            </span>
                        </div>
                        <p className="text-sm text-slate-400 mb-1">Étudiants actifs</p>
                        <p className="text-2xl font-bold text-white">{activeStudents} / {totalStudents}</p>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="p-3 bg-emerald-500/20 rounded-xl w-fit mb-4">
                            <TrendingUp className="w-6 h-6 text-emerald-400" />
                        </div>
                        <p className="text-sm text-slate-400 mb-1">Progression moyenne</p>
                        <p className="text-2xl font-bold text-white">{avgProgress}%</p>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="p-3 bg-purple-500/20 rounded-xl w-fit mb-4">
                            <Clock className="w-6 h-6 text-purple-400" />
                        </div>
                        <p className="text-sm text-slate-400 mb-1">Temps moyen / session</p>
                        <p className="text-2xl font-bold text-white">{avgSessionTime} min</p>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="p-3 bg-amber-500/20 rounded-xl w-fit mb-4">
                            <Award className="w-6 h-6 text-amber-400" />
                        </div>
                        <p className="text-sm text-slate-400 mb-1">Badges délivrés</p>
                        <p className="text-2xl font-bold text-white">47</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Workshop Performance */}
                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/10">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <BookOpen size={20} className="text-blue-400" />
                                Performance par Atelier
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            {mockWorkshopStats.map((workshop) => (
                                <div key={workshop.id} className="p-4 bg-slate-900/50 rounded-xl">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-medium text-white">{workshop.name}</h3>
                                        <span className="text-sm text-slate-400">{workshop.attempts} participants</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <p className="text-slate-400 mb-1">Complétion</p>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${
                                                            workshop.completionRate >= 80 ? 'bg-emerald-500' :
                                                            workshop.completionRate >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                                        }`}
                                                        style={{ width: `${workshop.completionRate}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-white font-medium">{workshop.completionRate}%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 mb-1">Score moyen</p>
                                            <p className={`font-bold ${
                                                workshop.averageScore >= 80 ? 'text-emerald-400' :
                                                workshop.averageScore >= 60 ? 'text-amber-400' : 'text-red-400'
                                            }`}>
                                                {workshop.averageScore}%
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 mb-1">Temps moyen</p>
                                            <p className="text-white font-medium">{workshop.averageTime} min</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quiz Performance */}
                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/10">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <BarChart3 size={20} className="text-purple-400" />
                                Performance aux Quiz
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            {mockQuizStats.map((quiz) => (
                                <div key={quiz.id} className="p-4 bg-slate-900/50 rounded-xl">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-medium text-white">{quiz.name}</h3>
                                        <span className="text-sm text-slate-400">{quiz.attempts} tentatives</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                        <div>
                                            <p className="text-slate-400 mb-1">Score moyen</p>
                                            <p className={`text-xl font-bold ${
                                                quiz.averageScore >= 80 ? 'text-emerald-400' :
                                                quiz.averageScore >= 60 ? 'text-amber-400' : 'text-red-400'
                                            }`}>
                                                {quiz.averageScore}%
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 mb-1">Taux de réussite</p>
                                            <p className="text-xl font-bold text-white flex items-center gap-2">
                                                {quiz.passRate}%
                                                {quiz.passRate >= 80 ? (
                                                    <CheckCircle2 size={16} className="text-emerald-400" />
                                                ) : quiz.passRate < 60 ? (
                                                    <XCircle size={16} className="text-red-400" />
                                                ) : null}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        <span className="text-slate-500">Question la plus difficile :</span>{' '}
                                        <span className="text-amber-400">{quiz.hardestQuestion}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Student Rankings */}
                <div className="bg-slate-800/50 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/10">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Award size={20} className="text-amber-400" />
                            Classement des Étudiants
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-900/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Rang</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Étudiant</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">XP Total</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Ateliers</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Quiz</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Badges</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Temps total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {[
                                    { rank: 1, name: 'Alice Martin', xp: 2450, workshops: '4/4', quizAvg: 92, badges: 8, time: '12h 30m' },
                                    { rank: 2, name: 'Bob Dupont', xp: 2280, workshops: '4/4', quizAvg: 88, badges: 7, time: '14h 15m' },
                                    { rank: 3, name: 'Claire Durand', xp: 2150, workshops: '3/4', quizAvg: 85, badges: 6, time: '10h 45m' },
                                    { rank: 4, name: 'David Bernard', xp: 1980, workshops: '3/4', quizAvg: 79, badges: 5, time: '11h 20m' },
                                    { rank: 5, name: 'Emma Petit', xp: 1850, workshops: '3/4', quizAvg: 82, badges: 5, time: '9h 50m' },
                                ].map((student) => (
                                    <tr key={student.rank} className="hover:bg-white/5 transition">
                                        <td className="px-6 py-4">
                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                                student.rank === 1 ? 'bg-amber-500/20 text-amber-400' :
                                                student.rank === 2 ? 'bg-slate-400/20 text-slate-300' :
                                                student.rank === 3 ? 'bg-orange-500/20 text-orange-400' :
                                                'bg-slate-700 text-slate-400'
                                            }`}>
                                                {student.rank}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                                    {student.name.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <span className="font-medium text-white">{student.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-emerald-400">{student.xp.toLocaleString()} XP</td>
                                        <td className="px-6 py-4 text-slate-300">{student.workshops}</td>
                                        <td className="px-6 py-4">
                                            <span className={`font-medium ${
                                                student.quizAvg >= 80 ? 'text-emerald-400' :
                                                student.quizAvg >= 60 ? 'text-amber-400' : 'text-red-400'
                                            }`}>
                                                {student.quizAvg}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm">
                                                {student.badges}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400">{student.time}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
