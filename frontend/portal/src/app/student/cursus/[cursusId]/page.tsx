'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../auth/useAuth';
import {
    BookOpen, Clock, ChevronRight, ArrowLeft, CheckCircle2,
    Lock, Layers, Award, FileQuestion, Sparkles, Trophy, AlertCircle
} from 'lucide-react';

interface Module {
    id: string;
    title: string;
    description: string;
    module_order: number;
    estimated_minutes: number;
    difficulty: string;
    chapter_count: number;
    quiz: { id: string; title: string } | null;
    completedChapters?: number;
    quizBestScore?: number;
    masteryScore?: number;
}

interface CursusDetail {
    id: string;
    title: string;
    description: string;
    level: string;
    estimated_hours: number;
    tags: string[];
    module_count: number;
}

const LEVEL_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
    DEBUTANT: { label: 'Débutant', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    INTERMEDIAIRE: { label: 'Intermédiaire', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    AVANCE: { label: 'Avancé', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    EXPERT: { label: 'Expert', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
};

const DIFF_COLORS: Record<string, { text: string; bg: string }> = {
    '1': { text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    '2': { text: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    '3': { text: 'text-amber-400', bg: 'bg-amber-500/10' },
    '4': { text: 'text-orange-400', bg: 'bg-orange-500/10' },
    '5': { text: 'text-rose-400', bg: 'bg-rose-500/10' },
};

export default function CursusDetailPage() {
    const { isLoading: authLoading } = useAuth(true);
    const params = useParams();
    const cursusId = params?.cursusId as string;

    const [cursus, setCursus] = useState<CursusDetail | null>(null);
    const [modules, setModules] = useState<Module[]>([]);
    const [finalQuiz, setFinalQuiz] = useState<any>(null);
    const [completedCount, setCompletedCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDetail = useCallback(async () => {
        if (!cursusId) return;
        try {
            setError(null);
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await fetch(`/api/cursus/${cursusId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                throw new Error('Impossible de charger le cursus');
            }
            const data = await res.json();
            if (data.success) {
                setCursus(data.cursus);
                setModules(data.modules || []);
                setFinalQuiz(data.finalQuiz);
                setCompletedCount(data.progress?.completed || 0);
            }
        } catch (err: any) {
            setError(err.message || 'Erreur de chargement');
        } finally {
            setLoading(false);
        }
    }, [cursusId]);

    useEffect(() => {
        if (authLoading) return;
        fetchDetail();
    }, [authLoading, fetchDetail]);

    const totalChapters = modules.reduce((sum, m) => sum + m.chapter_count, 0);
    const progressPct = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;

    const getDiffStars = (d: string) => {
        const n = parseInt(d) || 1;
        return '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-white pt-24 pb-16">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="animate-pulse space-y-6">
                        <div className="h-4 w-32 bg-slate-800 rounded" />
                        <div className="h-48 bg-slate-900/50 rounded-2xl border border-white/5" />
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-20 bg-slate-900/50 rounded-xl border border-white/5" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!cursus) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-400">
                <BookOpen size={48} className="text-slate-700" />
                <p>{error || 'Cursus non trouvé.'}</p>
                {error && (
                    <button onClick={fetchDetail} className="text-emerald-400 text-sm hover:underline">
                        Réessayer
                    </button>
                )}
                <Link href="/student/cursus" className="text-emerald-400 text-sm hover:underline flex items-center gap-1">
                    <ArrowLeft size={14} /> Retour aux cursus
                </Link>
            </div>
        );
    }

    const levelInfo = LEVEL_LABELS[cursus.level] || LEVEL_LABELS.DEBUTANT;

    return (
        <div className="min-h-screen bg-slate-950 text-white pt-24 pb-16">
            <div className="max-w-4xl mx-auto px-6">
                {/* Breadcrumb */}
                <div className="text-xs text-slate-500 mb-6 flex items-center gap-1.5">
                    <Link href="/" className="hover:text-emerald-400 transition-colors">Accueil</Link>
                    <ChevronRight size={12} />
                    <Link href="/student" className="hover:text-emerald-400 transition-colors">Espace Étudiant</Link>
                    <ChevronRight size={12} />
                    <Link href="/student/cursus" className="hover:text-emerald-400 transition-colors">Cursus</Link>
                    <ChevronRight size={12} />
                    <span className="text-emerald-400 truncate max-w-[200px]">{cursus.title}</span>
                </div>

                {/* Back */}
                <Link href="/student/cursus" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
                    <ArrowLeft size={16} /> Retour aux cursus
                </Link>

                {/* Header card */}
                <div className="relative overflow-hidden rounded-2xl bg-slate-900/50 border border-white/5 p-8 mb-8">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(16,185,129,0.08),_transparent_60%)]" />
                    <div className="relative z-10">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide ${levelInfo.bg} ${levelInfo.color} ${levelInfo.border} border`}>
                                        {levelInfo.label}
                                    </span>
                                </div>
                                <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
                                    {cursus.title}
                                </h1>
                                <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
                                    {cursus.description}
                                </p>
                            </div>
                        </div>

                        {/* Stats chips */}
                        <div className="flex items-center gap-6 mt-6 flex-wrap">
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                                    <Layers size={14} className="text-emerald-400" />
                                </div>
                                <span>{cursus.module_count} modules</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <div className="p-1.5 rounded-lg bg-cyan-500/10">
                                    <Clock size={14} className="text-cyan-400" />
                                </div>
                                <span>{cursus.estimated_hours}h estimées</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <div className="p-1.5 rounded-lg bg-blue-500/10">
                                    <BookOpen size={14} className="text-blue-400" />
                                </div>
                                <span>{totalChapters} chapitres</span>
                            </div>
                        </div>

                        {/* Progress */}
                        <div className="mt-6 pt-6 border-t border-white/5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-400">Progression</span>
                                <span className="text-sm font-semibold">
                                    {completedCount}/{totalChapters} chapitres ({progressPct}%)
                                </span>
                            </div>
                            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${progressPct >= 100
                                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                        : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                                        }`}
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                        </div>

                        {/* Tags */}
                        {cursus.tags && cursus.tags.length > 0 && (
                            <div className="flex gap-2 mt-4 flex-wrap">
                                {cursus.tags.map((tag) => (
                                    <span key={tag} className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-500 text-[10px] border border-white/5">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Modules list */}
                <h2 className="flex items-center gap-2 text-lg font-bold text-white mb-5">
                    <Layers size={18} className="text-emerald-400" />
                    Modules ({modules.length})
                </h2>

                <div className="space-y-3">
                    {modules.map((mod, idx) => {
                        const diffColor = DIFF_COLORS[mod.difficulty] || DIFF_COLORS['1'];
                        const mastery = mod.masteryScore ?? 0;
                        const hasStarted = (mod.completedChapters ?? 0) > 0;
                        const masteryColor = mastery >= 80
                            ? 'bg-emerald-500'
                            : mastery >= 60
                            ? 'bg-amber-500'
                            : 'bg-rose-500';
                        const masteryLabel = mastery >= 80
                            ? 'Maîtrisé'
                            : mastery >= 60
                            ? 'En cours'
                            : hasStarted
                            ? 'Débuté'
                            : '';
                        const masteryTextColor = mastery >= 80
                            ? 'text-emerald-400'
                            : mastery >= 60
                            ? 'text-amber-400'
                            : 'text-rose-400';
                        return (
                            <Link key={mod.id} href={`/student/cursus/${cursusId}/${mod.id}`} className="group block">
                                <div className="p-5 rounded-xl bg-slate-900/50 border border-white/5 transition-all duration-200 hover:border-emerald-500/20 hover:bg-slate-800/50 hover:translate-x-1">
                                    <div className="flex items-center gap-4">
                                        {/* Number badge */}
                                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center flex-shrink-0">
                                            <span className="text-emerald-400 font-bold text-sm">{mod.module_order}</span>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <h3 className="text-white font-semibold text-sm group-hover:text-emerald-300 transition-colors truncate">
                                                    {mod.title}
                                                </h3>
                                                {hasStarted && (
                                                    <span className={`shrink-0 text-[10px] font-semibold ${masteryTextColor}`}>
                                                        {masteryLabel} {mastery > 0 ? `${mastery}%` : ''}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                    <BookOpen size={11} /> {mod.completedChapters ?? 0}/{mod.chapter_count} chap.
                                                </span>
                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Clock size={11} /> {mod.estimated_minutes >= 60 ? `${Math.floor(mod.estimated_minutes / 60)}h${mod.estimated_minutes % 60 > 0 ? ` ${mod.estimated_minutes % 60}min` : ''}` : `${mod.estimated_minutes}min`}
                                                </span>
                                                <span className={`text-xs ${diffColor.text}`}>
                                                    {getDiffStars(mod.difficulty)}
                                                </span>
                                                {mod.quiz && (
                                                    <span className={`text-xs flex items-center gap-1 ${(mod.quizBestScore ?? -1) >= 0 ? 'text-violet-300' : 'text-slate-500'}`}>
                                                        <FileQuestion size={11} />
                                                        {(mod.quizBestScore ?? -1) >= 0 ? `Quiz ${mod.quizBestScore}%` : 'Quiz'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <ChevronRight size={16} className="text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                                    </div>

                                    {/* Mastery bar — shown only if started */}
                                    {hasStarted && (
                                        <div className="mt-3 ml-16">
                                            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${masteryColor}`}
                                                    style={{ width: `${mastery}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Final evaluation */}
                {finalQuiz && (
                    <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-violet-600/15 to-blue-600/5 border border-violet-500/15 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-violet-500/15 border border-violet-500/20 flex-shrink-0">
                            <Trophy size={24} className="text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-white font-bold text-base mb-1">{finalQuiz.title}</h3>
                            <p className="text-slate-400 text-xs">
                                Complétez tous les modules pour débloquer l&apos;évaluation finale et obtenir votre certificat.
                            </p>
                        </div>
                        <Award size={20} className="text-violet-300 flex-shrink-0" />
                    </div>
                )}
            </div>
        </div>
    );
}
