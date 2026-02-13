'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import Link from 'next/link';
import {
    BookOpen,
    CheckCircle2,
    Clock,
    Trophy,
    ChevronRight,
    Play,
    Lock,
    Star,
    TrendingUp,
    RefreshCw
} from 'lucide-react';

interface SectionProgress {
    id: string;
    name: string;
    completed: boolean;
    timeSpent: number;
}

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

const WORKSHOP_ORDER = ['intro', 'iso8583', 'hsm-keys', '3ds-flow', 'fraud-detection', 'emv'];
const WORKSHOP_DESCRIPTIONS: Record<string, string> = {
    'intro': 'Découvrez les fondamentaux du monde des paiements',
    'iso8583': 'Maîtrisez le standard de communication bancaire',
    'hsm-keys': 'Sécurisez les transactions avec la cryptographie',
    '3ds-flow': 'Authentification forte pour les paiements en ligne',
    'fraud-detection': 'Détectez et prévenez les transactions frauduleuses',
    'emv': 'Comprenez les cartes à puce et le protocole EMV',
};

export default function StudentProgressPage() {
    const { isLoading } = useAuth(true);
    const [workshops, setWorkshops] = useState<WorkshopProgress[]>([]);
    const [expandedWorkshop, setExpandedWorkshop] = useState<string | null>(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProgress = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            setError(null);
            const headers = { Authorization: `Bearer ${token}` };
            const [progressRes, statsRes] = await Promise.all([
                fetch('/api/progress', { headers }).catch(() => null),
                fetch('/api/progress/stats', { headers }).catch(() => null),
            ]);

            const progressData = progressRes?.ok ? await progressRes.json() : null;
            const statsData = statsRes?.ok ? await statsRes.json() : null;
            const progressMap = progressData?.progress || {};
            const quizResults = statsData?.stats?.quizResults || [];

            let previousCompleted = true;
            const builtWorkshops: WorkshopProgress[] = WORKSHOP_ORDER.map((workshopId) => {
                const wp = progressMap[workshopId];
                const name = wp?.title || workshopId;
                const description = WORKSHOP_DESCRIPTIONS[workshopId] || '';
                const totalSections = wp?.total_sections || 5;
                const currentSection = wp?.current_section || 0;
                const progressPercent = wp?.progress_percent || 0;
                const timeSpent = wp?.time_spent_minutes || 0;
                const rawStatus = wp?.status || 'NOT_STARTED';

                // Build sections
                const sections: SectionProgress[] = [];
                for (let i = 1; i <= totalSections; i++) {
                    sections.push({
                        id: String(i),
                        name: `Section ${i}`,
                        completed: i <= currentSection,
                        timeSpent: i <= currentSection ? Math.round(timeSpent / Math.max(1, currentSection)) : 0,
                    });
                }

                // Quiz result (best attempt for this workshop)
                const matchingAttempts = quizResults.filter((q: Record<string, unknown>) => {
                    const byWorkshopId = q?.workshop_id === workshopId || q?.workshopId === workshopId;
                    const byQuizId =
                        (wp?.quiz_id && (q?.quiz_id === wp.quiz_id || q?.quizId === wp.quiz_id))
                        || false;
                    return byWorkshopId || byQuizId;
                });

                let bestAttempt: Record<string, unknown> | null = null;
                for (const attempt of matchingAttempts) {
                    const currentPercentage = Number(attempt?.percentage ?? 0);
                    if (!Number.isFinite(currentPercentage)) {
                        continue;
                    }

                    const bestPercentage = Number(bestAttempt?.percentage ?? -1);
                    if (!bestAttempt || currentPercentage > bestPercentage) {
                        bestAttempt = attempt;
                    }
                }

                const quizScore = bestAttempt ? Number(bestAttempt.percentage ?? 0) : undefined;
                const quizPassed = quizScore !== undefined ? quizScore >= 80 : undefined;

                // Status with sequential lock
                let status: WorkshopProgress['status'] = 'not_started';
                if (rawStatus === 'COMPLETED') {
                    status = 'completed';
                    previousCompleted = true;
                } else if (rawStatus === 'IN_PROGRESS') {
                    status = 'in_progress';
                    previousCompleted = false;
                } else if (previousCompleted) {
                    status = 'not_started';
                    previousCompleted = false;
                } else {
                    status = 'locked';
                }

                const xpTotal = totalSections * 50 + 100;
                const xpEarned = Math.round((progressPercent / 100) * xpTotal);

                return {
                    id: workshopId,
                    name,
                    description,
                    sections,
                    totalTime: totalSections * 15,
                    completedTime: timeSpent,
                    quizScore,
                    quizPassed,
                    status,
                    xpEarned,
                    xpTotal,
                };
            });

            // Auto-expand first in-progress workshop
            const inProgress = builtWorkshops.find(w => w.status === 'in_progress');
            if (inProgress) {
                setExpandedWorkshop(prev => prev || inProgress.id);
            }

            setWorkshops(builtWorkshops);
        } catch (e: any) {
            setError(e.message || 'Erreur lors du chargement');
        } finally {
            setDataLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isLoading) return;
        fetchProgress();
    }, [isLoading, fetchProgress]);

    const totalXpEarned = workshops.reduce((acc, w) => acc + w.xpEarned, 0);
    const totalXpPossible = workshops.reduce((acc, w) => acc + w.xpTotal, 0);
    const totalTimeSpent = workshops.reduce((acc, w) => acc + w.completedTime, 0);
    const completedWorkshops = workshops.filter(w => w.status === 'completed').length;

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

    if (isLoading || dataLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <TrendingUp className="animate-bounce w-12 h-12 text-emerald-500" />
                    <span className="text-sm text-slate-500">Chargement de votre progression...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pt-24 pb-12">
            <div className="max-w-4xl mx-auto px-6">
                {/* Breadcrumb */}
                <div className="text-xs text-slate-500 mb-6">
                    <Link href="/student" className="hover:text-emerald-400">Mon Parcours</Link>
                    <ChevronRight size={12} className="inline mx-1" />
                    <span className="text-emerald-400">Ma Progression</span>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Ma Progression</h1>
                        <p className="text-slate-400">
                            Suivez votre avancement dans chaque atelier
                        </p>
                    </div>
                    <button
                        onClick={() => { setDataLoading(true); fetchProgress(); }}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-white/10 text-white rounded-xl hover:bg-slate-700"
                    >
                        <RefreshCw size={18} />
                        Actualiser
                    </button>
                </div>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm mb-6">
                        {error}
                    </div>
                )}

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
                            <span className="text-sm text-slate-400">Temps d&apos;étude</span>
                        </div>
                        <p className="text-2xl font-bold text-white">
                            {totalTimeSpent >= 60 ? `${Math.floor(totalTimeSpent / 60)}h ${totalTimeSpent % 60}m` : `${totalTimeSpent} min`}
                        </p>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <BookOpen size={18} className="text-blue-400" />
                            </div>
                            <span className="text-sm text-slate-400">Ateliers</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{completedWorkshops}/{workshops.length}</p>
                        <p className="text-xs text-slate-500">terminés</p>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-500/20 rounded-lg">
                                <Trophy size={18} className="text-amber-400" />
                            </div>
                            <span className="text-sm text-slate-400">Progression</span>
                        </div>
                        <p className="text-2xl font-bold text-white">
                            {totalXpPossible > 0 ? Math.round((totalXpEarned / totalXpPossible) * 100) : 0}%
                        </p>
                    </div>
                </div>

                {/* Workshop List */}
                <div className="space-y-4">
                    {workshops.map((workshop) => {
                        const progress = workshop.totalTime > 0
                            ? Math.min(100, Math.round((workshop.completedTime / workshop.totalTime) * 100))
                            : 0;
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
                                        />
                                    </div>
                                </div>

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
                                                    {section.completed && section.timeSpent > 0 && (
                                                        <span className="text-xs text-slate-500">{section.timeSpent} min</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

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
                                                            {workshop.quizPassed ? 'Réussi !' : 'À refaire (80% requis)'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {workshop.status !== 'completed' && workshop.status !== 'locked' && (
                                            <Link
                                                href={`/student/theory/${workshop.id}`}
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

                    {workshops.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                            Aucun atelier disponible pour le moment.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
