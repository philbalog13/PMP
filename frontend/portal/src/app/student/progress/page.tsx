'use client';

import { useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import Link from 'next/link';
import {
    ArrowLeft,
    BookOpen,
    CheckCircle2,
    Clock,
    Trophy,
    ChevronRight,
    Play,
    Lock,
    Star,
    TrendingUp
} from 'lucide-react';

interface WorkshopProgress {
    id: string;
    name: string;
    description: string;
    sections: SectionProgress[];
    totalTime: number;
    completedTime: number;
    quizScore?: number;
    quizPassed?: boolean;
    status: 'completed' | 'in_progress' | 'not_started' | 'locked';
    xpEarned: number;
    xpTotal: number;
}

interface SectionProgress {
    id: string;
    name: string;
    completed: boolean;
    timeSpent: number;
}

const mockProgress: WorkshopProgress[] = [
    {
        id: 'intro',
        name: 'Introduction à la Monétique',
        description: 'Découvrez les fondamentaux du monde des paiements',
        sections: [
            { id: '1', name: 'Les acteurs de la monétique', completed: true, timeSpent: 12 },
            { id: '2', name: 'Types de cartes bancaires', completed: true, timeSpent: 8 },
            { id: '3', name: 'Flux de transaction simplifié', completed: true, timeSpent: 15 },
            { id: '4', name: 'Vocabulaire essentiel', completed: true, timeSpent: 10 },
        ],
        totalTime: 60,
        completedTime: 45,
        quizScore: 92,
        quizPassed: true,
        status: 'completed',
        xpEarned: 350,
        xpTotal: 350
    },
    {
        id: 'iso8583',
        name: 'Protocole ISO 8583',
        description: 'Maîtrisez le standard de communication bancaire',
        sections: [
            { id: '1', name: 'Structure du message', completed: true, timeSpent: 20 },
            { id: '2', name: 'MTI - Message Type Indicator', completed: true, timeSpent: 15 },
            { id: '3', name: 'Bitmap et Data Elements', completed: true, timeSpent: 25 },
            { id: '4', name: 'Codes de réponse', completed: false, timeSpent: 0 },
            { id: '5', name: 'Exercices pratiques', completed: false, timeSpent: 0 },
        ],
        totalTime: 90,
        completedTime: 60,
        status: 'in_progress',
        xpEarned: 280,
        xpTotal: 450
    },
    {
        id: 'hsm-keys',
        name: 'Gestion des Clés HSM',
        description: 'Sécurisez les transactions avec la cryptographie',
        sections: [
            { id: '1', name: 'Introduction au HSM', completed: true, timeSpent: 10 },
            { id: '2', name: 'Hiérarchie des clés', completed: false, timeSpent: 0 },
            { id: '3', name: 'Opérations PIN', completed: false, timeSpent: 0 },
            { id: '4', name: 'ARQC/ARPC', completed: false, timeSpent: 0 },
            { id: '5', name: 'Lab pratique', completed: false, timeSpent: 0 },
        ],
        totalTime: 120,
        completedTime: 10,
        status: 'in_progress',
        xpEarned: 50,
        xpTotal: 500
    },
    {
        id: '3ds-flow',
        name: '3D Secure v2',
        description: 'Authentification forte pour les paiements en ligne',
        sections: [
            { id: '1', name: 'Les acteurs du 3DS', completed: false, timeSpent: 0 },
            { id: '2', name: 'Flux d\'authentification', completed: false, timeSpent: 0 },
            { id: '3', name: 'Challenge vs Frictionless', completed: false, timeSpent: 0 },
            { id: '4', name: 'Exemptions SCA', completed: false, timeSpent: 0 },
        ],
        totalTime: 75,
        completedTime: 0,
        status: 'not_started',
        xpEarned: 0,
        xpTotal: 400
    },
];

export default function StudentProgressPage() {
    const { isLoading } = useAuth(true);
    const [expandedWorkshop, setExpandedWorkshop] = useState<string | null>('iso8583');

    // Calculate totals
    const totalXpEarned = mockProgress.reduce((acc, w) => acc + w.xpEarned, 0);
    const totalXpPossible = mockProgress.reduce((acc, w) => acc + w.xpTotal, 0);
    const totalTimeSpent = mockProgress.reduce((acc, w) => acc + w.completedTime, 0);
    const completedWorkshops = mockProgress.filter(w => w.status === 'completed').length;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return (
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium flex items-center gap-1">
                        <CheckCircle2 size={12} /> Terminé
                    </span>
                );
            case 'in_progress':
                return (
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium flex items-center gap-1">
                        <Play size={12} /> En cours
                    </span>
                );
            case 'not_started':
                return (
                    <span className="px-3 py-1 bg-slate-500/20 text-slate-400 rounded-full text-xs font-medium">
                        Non commencé
                    </span>
                );
            case 'locked':
                return (
                    <span className="px-3 py-1 bg-slate-700 text-slate-500 rounded-full text-xs font-medium flex items-center gap-1">
                        <Lock size={12} /> Verrouillé
                    </span>
                );
            default:
                return null;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pt-24 pb-12">
            <div className="max-w-4xl mx-auto px-6">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/student"
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
                    >
                        <ArrowLeft size={18} />
                        Retour au dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-white mb-2">Ma Progression</h1>
                    <p className="text-slate-400">
                        Suivez votre avancement dans chaque atelier
                    </p>
                </div>

                {/* Overall Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-500/20 rounded-lg">
                                <TrendingUp size={18} className="text-emerald-400" />
                            </div>
                            <span className="text-sm text-slate-400">XP Total</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{totalXpEarned.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">/ {totalXpPossible.toLocaleString()} possible</p>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                <Clock size={18} className="text-purple-400" />
                            </div>
                            <span className="text-sm text-slate-400">Temps d'étude</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{Math.floor(totalTimeSpent / 60)}h {totalTimeSpent % 60}m</p>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <BookOpen size={18} className="text-blue-400" />
                            </div>
                            <span className="text-sm text-slate-400">Ateliers</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{completedWorkshops}/{mockProgress.length}</p>
                        <p className="text-xs text-slate-500">terminés</p>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-500/20 rounded-lg">
                                <Trophy size={18} className="text-amber-400" />
                            </div>
                            <span className="text-sm text-slate-400">Progression</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{Math.round((totalXpEarned / totalXpPossible) * 100)}%</p>
                    </div>
                </div>

                {/* Workshop List */}
                <div className="space-y-4">
                    {mockProgress.map((workshop) => {
                        const progress = Math.round((workshop.completedTime / workshop.totalTime) * 100);
                        const completedSections = workshop.sections.filter(s => s.completed).length;
                        const isExpanded = expandedWorkshop === workshop.id;

                        return (
                            <div
                                key={workshop.id}
                                className={`bg-slate-800/50 border rounded-2xl overflow-hidden transition-all ${
                                    workshop.status === 'completed'
                                        ? 'border-emerald-500/30'
                                        : workshop.status === 'in_progress'
                                        ? 'border-blue-500/30'
                                        : 'border-white/10'
                                }`}
                            >
                                {/* Workshop Header */}
                                <button
                                    onClick={() => setExpandedWorkshop(isExpanded ? null : workshop.id)}
                                    className="w-full p-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                            workshop.status === 'completed'
                                                ? 'bg-emerald-500/20'
                                                : workshop.status === 'in_progress'
                                                ? 'bg-blue-500/20'
                                                : 'bg-slate-700'
                                        }`}>
                                            {workshop.status === 'completed' ? (
                                                <CheckCircle2 size={24} className="text-emerald-400" />
                                            ) : (
                                                <BookOpen size={24} className={
                                                    workshop.status === 'in_progress' ? 'text-blue-400' : 'text-slate-500'
                                                } />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-white">{workshop.name}</h3>
                                            <p className="text-sm text-slate-400">{workshop.description}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        {getStatusBadge(workshop.status)}

                                        <div className="text-right hidden md:block">
                                            <p className="text-sm text-white font-medium">{workshop.xpEarned} XP</p>
                                            <p className="text-xs text-slate-500">{completedSections}/{workshop.sections.length} sections</p>
                                        </div>

                                        <ChevronRight
                                            size={20}
                                            className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                        />
                                    </div>
                                </button>

                                {/* Progress Bar */}
                                <div className="px-6 pb-4">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-400">{progress}% complété</span>
                                        <span className="text-slate-500">{workshop.completedTime} / {workshop.totalTime} min</span>
                                    </div>
                                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${
                                                workshop.status === 'completed'
                                                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                                    : 'bg-gradient-to-r from-blue-500 to-blue-400'
                                            }`}
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Expanded Sections */}
                                {isExpanded && (
                                    <div className="border-t border-white/5 px-6 py-4">
                                        <h4 className="text-sm font-medium text-slate-400 mb-3">Sections</h4>
                                        <div className="space-y-2">
                                            {workshop.sections.map((section, index) => (
                                                <div
                                                    key={section.id}
                                                    className={`flex items-center justify-between p-3 rounded-lg ${
                                                        section.completed ? 'bg-emerald-500/10' : 'bg-slate-900/50'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                                            section.completed
                                                                ? 'bg-emerald-500 text-white'
                                                                : 'bg-slate-700 text-slate-400'
                                                        }`}>
                                                            {section.completed ? <CheckCircle2 size={14} /> : index + 1}
                                                        </span>
                                                        <span className={section.completed ? 'text-white' : 'text-slate-400'}>
                                                            {section.name}
                                                        </span>
                                                    </div>
                                                    {section.completed && (
                                                        <span className="text-xs text-slate-500">{section.timeSpent} min</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Quiz Result */}
                                        {workshop.quizScore !== undefined && (
                                            <div className={`mt-4 p-4 rounded-xl ${
                                                workshop.quizPassed
                                                    ? 'bg-emerald-500/10 border border-emerald-500/30'
                                                    : 'bg-red-500/10 border border-red-500/30'
                                            }`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Star size={18} className={workshop.quizPassed ? 'text-emerald-400' : 'text-red-400'} />
                                                        <span className="text-white font-medium">Quiz final</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`text-2xl font-bold ${
                                                            workshop.quizPassed ? 'text-emerald-400' : 'text-red-400'
                                                        }`}>
                                                            {workshop.quizScore}%
                                                        </span>
                                                        <p className="text-xs text-slate-400">
                                                            {workshop.quizPassed ? 'Réussi !' : 'À refaire'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Continue Button */}
                                        {workshop.status !== 'completed' && workshop.status !== 'locked' && (
                                            <Link
                                                href={`/workshops/${workshop.id}`}
                                                className="mt-4 w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                            >
                                                <Play size={18} />
                                                {workshop.status === 'in_progress' ? 'Continuer' : 'Commencer'}
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
