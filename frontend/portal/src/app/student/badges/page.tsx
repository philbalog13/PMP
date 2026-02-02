'use client';

import { useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import Link from 'next/link';
import {
    Award,
    ArrowLeft,
    Lock,
    CheckCircle2,
    Star,
    Zap,
    Shield,
    BookOpen,
    Clock,
    Target,
    Flame,
    Trophy
} from 'lucide-react';

interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'learning' | 'performance' | 'streak' | 'special';
    earned: boolean;
    earnedAt?: string;
    progress?: number;
    requirement: string;
    xpReward: number;
}

const allBadges: Badge[] = [
    // Learning Badges
    { id: '1', name: 'Premier Pas', description: 'Complétez votre premier atelier', icon: '🎯', category: 'learning', earned: true, earnedAt: '2024-01-10', requirement: 'Terminer 1 atelier', xpReward: 50 },
    { id: '2', name: 'Explorateur', description: 'Complétez tous les ateliers d\'introduction', icon: '🧭', category: 'learning', earned: true, earnedAt: '2024-01-12', requirement: 'Terminer les 4 ateliers de base', xpReward: 150 },
    { id: '3', name: 'ISO Master', description: 'Maîtrisez le protocole ISO 8583', icon: '📋', category: 'learning', earned: true, earnedAt: '2024-01-14', requirement: 'Score 90%+ au quiz ISO 8583', xpReward: 200 },
    { id: '4', name: 'Crypto Expert', description: 'Maîtrisez la cryptographie HSM', icon: '🔐', category: 'learning', earned: false, progress: 65, requirement: 'Score 90%+ au quiz HSM', xpReward: 200 },
    { id: '5', name: '3DS Specialist', description: 'Expert en authentification 3D Secure', icon: '🛡️', category: 'learning', earned: false, progress: 40, requirement: 'Score 90%+ au quiz 3DS', xpReward: 200 },

    // Performance Badges
    { id: '6', name: 'Perfectionniste', description: 'Obtenez un score parfait à un quiz', icon: '💯', category: 'performance', earned: true, earnedAt: '2024-01-11', requirement: 'Score 100% à un quiz', xpReward: 100 },
    { id: '7', name: 'Speed Runner', description: 'Terminez un atelier en moins de 30 minutes', icon: '⚡', category: 'performance', earned: false, progress: 0, requirement: 'Temps < 30 min pour un atelier', xpReward: 75 },
    { id: '8', name: 'Top 3', description: 'Atteignez le top 3 du classement', icon: '🏆', category: 'performance', earned: false, progress: 80, requirement: 'Être dans le top 3', xpReward: 300 },
    { id: '9', name: 'Étoile Montante', description: 'Progressez de 500 XP en une semaine', icon: '🌟', category: 'performance', earned: true, earnedAt: '2024-01-13', requirement: '+500 XP en 7 jours', xpReward: 100 },

    // Streak Badges
    { id: '10', name: 'Régulier', description: 'Connectez-vous 7 jours consécutifs', icon: '🔥', category: 'streak', earned: true, earnedAt: '2024-01-14', requirement: '7 jours de connexion', xpReward: 70 },
    { id: '11', name: 'Assidu', description: 'Connectez-vous 30 jours consécutifs', icon: '📅', category: 'streak', earned: false, progress: 47, requirement: '30 jours de connexion', xpReward: 200 },
    { id: '12', name: 'Marathonien', description: 'Étudiez pendant 10 heures au total', icon: '⏱️', category: 'streak', earned: true, earnedAt: '2024-01-12', requirement: '10h de temps d\'étude', xpReward: 150 },

    // Special Badges
    { id: '13', name: 'Pionnier', description: 'Parmi les premiers à s\'inscrire', icon: '🚀', category: 'special', earned: true, earnedAt: '2024-01-01', requirement: 'Inscription avant le 15 janvier', xpReward: 100 },
    { id: '14', name: 'Mentor', description: 'Aidez 5 autres étudiants', icon: '🤝', category: 'special', earned: false, progress: 20, requirement: 'Aider 5 étudiants', xpReward: 250 },
    { id: '15', name: 'Finisher', description: 'Complétez 100% du programme', icon: '🎓', category: 'special', earned: false, progress: 60, requirement: 'Terminer tous les modules', xpReward: 500 },
];

const categoryLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    learning: { label: 'Apprentissage', icon: <BookOpen size={16} />, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    performance: { label: 'Performance', icon: <Target size={16} />, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    streak: { label: 'Régularité', icon: <Flame size={16} />, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    special: { label: 'Spécial', icon: <Star size={16} />, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
};

export default function StudentBadgesPage() {
    const { isLoading } = useAuth(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const earnedBadges = allBadges.filter(b => b.earned);
    const totalXpEarned = earnedBadges.reduce((acc, b) => acc + b.xpReward, 0);
    const filteredBadges = selectedCategory === 'all'
        ? allBadges
        : allBadges.filter(b => b.category === selectedCategory);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pt-24 pb-12">
            <div className="max-w-6xl mx-auto px-6">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/student"
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
                    >
                        <ArrowLeft size={18} />
                        Retour au dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-white mb-2">Mes Badges</h1>
                    <p className="text-slate-400">
                        Débloquez des badges en progressant dans votre apprentissage
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-2xl p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-amber-500/20 rounded-xl">
                                <Trophy size={28} className="text-amber-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Badges obtenus</p>
                                <p className="text-3xl font-bold text-white">
                                    {earnedBadges.length} <span className="text-lg text-slate-400">/ {allBadges.length}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-emerald-500/20 rounded-xl">
                                <Zap size={28} className="text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">XP gagnés via badges</p>
                                <p className="text-3xl font-bold text-emerald-400">{totalXpEarned.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-purple-500/20 rounded-xl">
                                <Target size={28} className="text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Progression globale</p>
                                <p className="text-3xl font-bold text-white">
                                    {Math.round((earnedBadges.length / allBadges.length) * 100)}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Category Filter */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                            selectedCategory === 'all'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                    >
                        Tous ({allBadges.length})
                    </button>
                    {Object.entries(categoryLabels).map(([key, { label, icon }]) => (
                        <button
                            key={key}
                            onClick={() => setSelectedCategory(key)}
                            className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                                selectedCategory === key
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                        >
                            {icon}
                            {label} ({allBadges.filter(b => b.category === key).length})
                        </button>
                    ))}
                </div>

                {/* Badges Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBadges.map((badge) => (
                        <div
                            key={badge.id}
                            className={`relative p-6 rounded-2xl border transition-all ${
                                badge.earned
                                    ? 'bg-slate-800/50 border-white/10 hover:border-emerald-500/30'
                                    : 'bg-slate-900/50 border-white/5 opacity-60 hover:opacity-80'
                            }`}
                        >
                            {/* Category Badge */}
                            <div className={`absolute top-4 right-4 px-2 py-1 rounded-full text-xs font-medium border ${categoryLabels[badge.category].color}`}>
                                {categoryLabels[badge.category].label}
                            </div>

                            {/* Badge Icon */}
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`text-5xl ${badge.earned ? '' : 'grayscale'}`}>
                                    {badge.icon}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        {badge.name}
                                        {badge.earned && (
                                            <CheckCircle2 size={16} className="text-emerald-400" />
                                        )}
                                    </h3>
                                    <p className="text-sm text-slate-400">{badge.description}</p>
                                </div>
                            </div>

                            {/* Requirement */}
                            <div className="mb-4 text-xs text-slate-500">
                                <span className="text-slate-400">Condition :</span> {badge.requirement}
                            </div>

                            {/* Progress or Date */}
                            {badge.earned ? (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500">
                                        Obtenu le {badge.earnedAt}
                                    </span>
                                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
                                        +{badge.xpReward} XP
                                    </span>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex justify-between text-xs mb-2">
                                        <span className="text-slate-400">Progression</span>
                                        <span className="text-white">{badge.progress}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                                            style={{ width: `${badge.progress}%` }}
                                        ></div>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <Lock size={12} /> Verrouillé
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            {badge.xpReward} XP à gagner
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
