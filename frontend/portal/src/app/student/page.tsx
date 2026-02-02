'use client';

import { useState, useEffect } from 'react';
import {
    Book, CheckCircle, ArrowRight, Zap, Target, Award, Play, History, Shield,
    GraduationCap, ChevronRight, BookOpen, Code, Terminal, Beaker, Lock,
    Clock, TrendingUp, Star, Trophy, Flame, BarChart3
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../auth/useAuth';

// Workshop data linked to curriculum
const workshops = [
    {
        id: 'intro',
        number: '01',
        title: 'Introduction à la Monétique',
        desc: 'Comprendre le cycle de vie d\'une transaction carte.',
        icon: BookOpen,
        color: 'blue',
        duration: '45 min',
        difficulty: 'Débutant',
        xp: 100,
        status: 'completed',
        progress: 100,
        quizScore: 85,
    },
    {
        id: 'iso8583',
        number: '02',
        title: 'Protocole ISO 8583',
        desc: 'Maîtrisez le format standard des messages financiers.',
        icon: Code,
        color: 'purple',
        duration: '1h 30min',
        difficulty: 'Intermédiaire',
        xp: 200,
        status: 'completed',
        progress: 100,
        quizScore: 92,
    },
    {
        id: 'hsm-keys',
        number: '03',
        title: 'Gestion des Clés HSM',
        desc: 'Manipulation des composants de clés et cryptographie.',
        icon: Terminal,
        color: 'amber',
        duration: '2h',
        difficulty: 'Avancé',
        xp: 300,
        status: 'in-progress',
        progress: 65,
        quizScore: null,
    },
    {
        id: '3ds-flow',
        number: '04',
        title: '3D Secure v2',
        desc: 'Analyse du flux Directory Server, ACS et challenge.',
        icon: Zap,
        color: 'emerald',
        duration: '1h',
        difficulty: 'Avancé',
        xp: 250,
        status: 'locked',
        progress: 0,
        quizScore: null,
    },
    {
        id: 'fraud-lab',
        number: '05',
        title: 'Simulation de Fraude',
        desc: 'Détection de patterns suspects et scoring.',
        icon: Shield,
        color: 'red',
        duration: '1h 15min',
        difficulty: 'Intermédiaire',
        xp: 200,
        status: 'locked',
        progress: 0,
        quizScore: null,
    },
    {
        id: 'kernel-emv',
        number: '06',
        title: 'Kernels EMV & L2',
        desc: 'Interaction entre la puce et le lecteur (APDU).',
        icon: Beaker,
        color: 'indigo',
        duration: '3h',
        difficulty: 'Expert',
        xp: 500,
        status: 'locked',
        progress: 0,
        quizScore: null,
    },
];

const achievements = [
    { id: 1, name: 'Premier Pas', icon: '🎯', desc: 'Compléter le premier atelier', unlocked: true, date: '15 Jan' },
    { id: 2, name: 'ISO Master', icon: '📜', desc: 'Score parfait au quiz ISO 8583', unlocked: true, date: '20 Jan' },
    { id: 3, name: 'Crypto Ninja', icon: '🔐', desc: 'Compléter l\'atelier HSM', unlocked: false },
    { id: 4, name: 'Speed Runner', icon: '⚡', desc: 'Finir un atelier en moins de 30 min', unlocked: true, date: '18 Jan' },
    { id: 5, name: 'Perfectionist', icon: '💎', desc: '3 quiz consécutifs à 100%', unlocked: false },
    { id: 6, name: 'Expert PMP', icon: '🏆', desc: 'Compléter tous les ateliers', unlocked: false },
];

export default function StudentDashboard() {
    const { isLoading } = useAuth(true);
    const [activeTab, setActiveTab] = useState<'ateliers' | 'progression' | 'badges'>('ateliers');
    const [dailyStreak, setDailyStreak] = useState(7);

    // Calculate stats
    const completedWorkshops = workshops.filter(w => w.status === 'completed').length;
    const totalXP = workshops.filter(w => w.status === 'completed').reduce((acc, w) => acc + w.xp, 0);
    const averageScore = workshops.filter(w => w.quizScore !== null).reduce((acc, w, _, arr) => acc + (w.quizScore || 0) / arr.length, 0);
    const overallProgress = Math.round(workshops.reduce((acc, w) => acc + w.progress, 0) / workshops.length);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <GraduationCap className="animate-bounce w-12 h-12 text-emerald-500" />
                    <span className="text-sm text-slate-500">Chargement de votre espace...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Background */}
            <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
            <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[150px]" />
            <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px]" />

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
                {/* Header Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatCard icon={<Trophy className="text-amber-400" />} label="XP Total" value={totalXP} suffix="pts" color="amber" />
                    <StatCard icon={<Target className="text-emerald-400" />} label="Ateliers" value={`${completedWorkshops}/${workshops.length}`} color="emerald" />
                    <StatCard icon={<Star className="text-blue-400" />} label="Score Moyen" value={Math.round(averageScore)} suffix="%" color="blue" />
                    <StatCard icon={<Flame className="text-orange-400" />} label="Série" value={dailyStreak} suffix="jours" color="orange" />
                </div>

                {/* Main Content */}
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Column - Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Tabs */}
                        <div className="flex gap-2 p-1 bg-slate-900/50 rounded-2xl border border-white/5">
                            <TabButton active={activeTab === 'ateliers'} onClick={() => setActiveTab('ateliers')} icon={<Book size={16} />} label="Mes Ateliers" />
                            <TabButton active={activeTab === 'progression'} onClick={() => setActiveTab('progression')} icon={<BarChart3 size={16} />} label="Progression" />
                            <TabButton active={activeTab === 'badges'} onClick={() => setActiveTab('badges')} icon={<Award size={16} />} label="Badges" />
                        </div>

                        {/* Tab Content */}
                        {activeTab === 'ateliers' && (
                            <div className="space-y-4">
                                {workshops.map((workshop) => (
                                    <WorkshopCard key={workshop.id} workshop={workshop} />
                                ))}
                            </div>
                        )}

                        {activeTab === 'progression' && (
                            <div className="space-y-6">
                                <div className="bg-slate-900/50 rounded-3xl border border-white/5 p-8">
                                    <h3 className="text-xl font-bold mb-6">Progression Globale</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400">Parcours Complet</span>
                                            <span className="font-mono font-bold">{overallProgress}%</span>
                                        </div>
                                        <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-1000"
                                                style={{ width: `${overallProgress}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 mt-8">
                                        {workshops.map((w) => (
                                            <div key={w.id} className="text-center p-4 bg-slate-800/50 rounded-xl">
                                                <div className={`text-2xl font-bold mb-1 ${
                                                    w.status === 'completed' ? 'text-emerald-400' :
                                                    w.status === 'in-progress' ? 'text-amber-400' : 'text-slate-600'
                                                }`}>
                                                    {w.progress}%
                                                </div>
                                                <div className="text-xs text-slate-500 truncate">{w.title}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Quiz Scores */}
                                <div className="bg-slate-900/50 rounded-3xl border border-white/5 p-8">
                                    <h3 className="text-xl font-bold mb-6">Scores des Quiz</h3>
                                    <div className="space-y-4">
                                        {workshops.filter(w => w.quizScore !== null).map((w) => (
                                            <div key={w.id} className="flex items-center gap-4">
                                                <div className="w-40 text-sm text-slate-400 truncate">{w.title}</div>
                                                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${w.quizScore! >= 80 ? 'bg-emerald-500' : w.quizScore! >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                        style={{ width: `${w.quizScore}%` }}
                                                    />
                                                </div>
                                                <div className="w-12 text-right font-mono font-bold">{w.quizScore}%</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'badges' && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {achievements.map((achievement) => (
                                    <div
                                        key={achievement.id}
                                        className={`p-6 rounded-2xl border transition-all ${
                                            achievement.unlocked
                                                ? 'bg-slate-900/50 border-amber-500/20 hover:border-amber-500/40'
                                                : 'bg-slate-900/30 border-white/5 opacity-50'
                                        }`}
                                    >
                                        <div className="text-4xl mb-3">{achievement.icon}</div>
                                        <h4 className="font-bold mb-1">{achievement.name}</h4>
                                        <p className="text-xs text-slate-500 mb-2">{achievement.desc}</p>
                                        {achievement.unlocked && achievement.date && (
                                            <div className="text-xs text-emerald-400">Débloqué le {achievement.date}</div>
                                        )}
                                        {!achievement.unlocked && (
                                            <div className="flex items-center gap-1 text-xs text-slate-600">
                                                <Lock size={12} /> Verrouillé
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Column - Sidebar */}
                    <div className="space-y-6">
                        {/* Continue Learning */}
                        <div className="bg-gradient-to-br from-emerald-600/20 to-teal-600/10 rounded-3xl border border-emerald-500/20 p-6">
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
                                <Play size={14} /> Continuer
                            </div>
                            <h3 className="text-xl font-bold mb-2">Gestion des Clés HSM</h3>
                            <p className="text-sm text-slate-400 mb-4">Vous êtes à 65% - Continuez là où vous vous êtes arrêté.</p>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
                                <div className="h-full bg-emerald-500 w-[65%]" />
                            </div>
                            <Link
                                href="/workshops/hsm-keys"
                                className="block w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-center font-bold transition-colors"
                            >
                                Reprendre l'atelier
                            </Link>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-slate-900/50 rounded-3xl border border-white/5 p-6">
                            <h3 className="font-bold mb-4">Actions Rapides</h3>
                            <div className="space-y-2">
                                <QuickAction href="/workshops" icon={<BookOpen size={18} />} label="Tous les ateliers" />
                                <QuickAction href="/student/quiz/03" icon={<CheckCircle size={18} />} label="Passer un quiz" />
                                <QuickAction href="/lab" icon={<Beaker size={18} />} label="Laboratoire" />
                                <QuickAction href="/tools" icon={<Terminal size={18} />} label="Outils Crypto" />
                            </div>
                        </div>

                        {/* Leaderboard Preview */}
                        <div className="bg-slate-900/50 rounded-3xl border border-white/5 p-6">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <TrendingUp size={18} className="text-amber-400" />
                                Classement
                            </h3>
                            <div className="space-y-3">
                                <LeaderboardRow rank={1} name="Sophie M." xp={2450} isYou={false} />
                                <LeaderboardRow rank={2} name="Marc D." xp={1890} isYou={false} />
                                <LeaderboardRow rank={3} name="Vous" xp={totalXP} isYou={true} />
                                <LeaderboardRow rank={4} name="Julie P." xp={580} isYou={false} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, suffix, color }: any) {
    const colors: Record<string, string> = {
        amber: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
        emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
        blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
        orange: 'from-orange-500/10 to-orange-600/5 border-orange-500/20',
    };

    return (
        <div className={`p-5 rounded-2xl bg-gradient-to-br ${colors[color]} border`}>
            <div className="flex items-center gap-3 mb-2">
                {icon}
                <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-2xl font-bold font-mono">
                {value}{suffix && <span className="text-sm text-slate-500 ml-1">{suffix}</span>}
            </div>
        </div>
    );
}

function TabButton({ active, onClick, icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                active
                    ? 'bg-white text-slate-950'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
        >
            {icon}
            {label}
        </button>
    );
}

function WorkshopCard({ workshop }: { workshop: typeof workshops[0] }) {
    const Icon = workshop.icon;
    const colors: Record<string, { bg: string; text: string; border: string }> = {
        blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
        purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
        amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
        emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
        red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
        indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
    };

    const colorScheme = colors[workshop.color];
    const isLocked = workshop.status === 'locked';

    return (
        <div className={`p-6 rounded-2xl border transition-all ${
            isLocked
                ? 'bg-slate-900/30 border-white/5 opacity-60'
                : 'bg-slate-900/50 border-white/5 hover:border-white/10'
        }`}>
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${colorScheme.bg} ${colorScheme.border} border`}>
                    <Icon className={colorScheme.text} size={24} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-slate-500 font-mono">#{workshop.number}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    workshop.difficulty === 'Débutant' ? 'bg-green-500/10 text-green-400' :
                                    workshop.difficulty === 'Intermédiaire' ? 'bg-blue-500/10 text-blue-400' :
                                    workshop.difficulty === 'Avancé' ? 'bg-amber-500/10 text-amber-400' :
                                    'bg-purple-500/10 text-purple-400'
                                }`}>
                                    {workshop.difficulty}
                                </span>
                            </div>
                            <h3 className="font-bold text-lg">{workshop.title}</h3>
                            <p className="text-sm text-slate-400 mt-1">{workshop.desc}</p>
                        </div>

                        <div className="text-right">
                            <div className="text-xs text-slate-500 flex items-center gap-1 justify-end">
                                <Clock size={12} />
                                {workshop.duration}
                            </div>
                            <div className="text-xs text-amber-400 font-bold mt-1">+{workshop.xp} XP</div>
                        </div>
                    </div>

                    {/* Progress bar */}
                    {!isLocked && (
                        <div className="mt-4">
                            <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-slate-500">Progression</span>
                                <span className={workshop.status === 'completed' ? 'text-emerald-400' : 'text-slate-400'}>
                                    {workshop.progress}%
                                </span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all ${
                                        workshop.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'
                                    }`}
                                    style={{ width: `${workshop.progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-4">
                        {isLocked ? (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Lock size={14} />
                                Complétez l'atelier précédent pour débloquer
                            </div>
                        ) : (
                            <>
                                <Link
                                    href={`/workshops/${workshop.id}`}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                                        workshop.status === 'completed'
                                            ? 'bg-slate-800 hover:bg-slate-700 text-white'
                                            : `${colorScheme.bg} ${colorScheme.text} hover:opacity-80`
                                    }`}
                                >
                                    {workshop.status === 'completed' ? 'Revoir' : workshop.status === 'in-progress' ? 'Continuer' : 'Commencer'}
                                </Link>
                                {workshop.status !== 'locked' && (
                                    <Link
                                        href={`/student/quiz/${workshop.number}`}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-bold transition-colors"
                                    >
                                        Quiz {workshop.quizScore !== null && `(${workshop.quizScore}%)`}
                                    </Link>
                                )}
                                {workshop.status === 'completed' && (
                                    <CheckCircle size={20} className="text-emerald-500" />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
        >
            <div className="text-slate-400 group-hover:text-white transition-colors">{icon}</div>
            <span className="text-sm">{label}</span>
            <ChevronRight size={14} className="ml-auto text-slate-600 group-hover:text-slate-400 transition-colors" />
        </Link>
    );
}

function LeaderboardRow({ rank, name, xp, isYou }: { rank: number; name: string; xp: number; isYou: boolean }) {
    return (
        <div className={`flex items-center gap-3 p-2 rounded-lg ${isYou ? 'bg-emerald-500/10' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                rank === 1 ? 'bg-amber-500 text-slate-950' :
                rank === 2 ? 'bg-slate-400 text-slate-950' :
                rank === 3 ? 'bg-amber-700 text-white' :
                'bg-slate-800 text-slate-400'
            }`}>
                {rank}
            </div>
            <span className={`flex-1 text-sm ${isYou ? 'font-bold text-emerald-400' : ''}`}>{name}</span>
            <span className="text-xs font-mono text-slate-500">{xp} XP</span>
        </div>
    );
}
