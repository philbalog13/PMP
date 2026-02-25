'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../auth/useAuth';
import {
    BookOpen, Clock, ChevronRight, ArrowRight,
    CreditCard, Shield, Lock, Layers, Key, FileText, Sparkles,
    Search, RefreshCw, AlertCircle
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
    'credit-card': <CreditCard size={24} />,
    'shield': <Shield size={24} />,
    'lock': <Lock size={24} />,
    'layers': <Layers size={24} />,
    'key': <Key size={24} />,
    'file-text': <FileText size={24} />,
    'book-open': <BookOpen size={24} />,
};

const LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; glow: string }> = {
    DEBUTANT: {
        label: 'Débutant',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        glow: 'hover:shadow-emerald-500/10'
    },
    INTERMEDIAIRE: {
        label: 'Intermédiaire',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        glow: 'hover:shadow-amber-500/10'
    },
    AVANCE: {
        label: 'Avancé',
        color: 'text-rose-400',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20',
        glow: 'hover:shadow-rose-500/10'
    },
    EXPERT: {
        label: 'Expert',
        color: 'text-violet-400',
        bg: 'bg-violet-500/10',
        border: 'border-violet-500/20',
        glow: 'hover:shadow-violet-500/10'
    },
};

interface Cursus {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    level: string;
    estimated_hours: number;
    tags: string[];
    module_count: number;
    progress: { completed: number; total: number };
}

export default function CursusListPage() {
    const { isLoading: authLoading } = useAuth(true);
    const [cursusList, setCursusList] = useState<Cursus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterLevel, setFilterLevel] = useState<string>('ALL');

    const fetchCursus = useCallback(async () => {
        try {
            setError(null);
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await fetch('/api/cursus', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                throw new Error('Impossible de charger les cursus');
            }
            const data = await res.json();
            if (data.success) setCursusList(data.cursus || []);
        } catch (err: any) {
            setError(err.message || 'Erreur de chargement');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (authLoading) return;
        fetchCursus();
    }, [authLoading, fetchCursus]);

    const getProgressPercent = (c: Cursus) => {
        if (!c.progress || c.progress.total === 0) return 0;
        return Math.round((c.progress.completed / c.progress.total) * 100);
    };

    const filteredCursus = cursusList.filter(c => {
        const matchesSearch = !searchQuery ||
            c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesLevel = filterLevel === 'ALL' || c.level === filterLevel;
        return matchesSearch && matchesLevel;
    });

    const totalCompleted = cursusList.reduce((sum, c) => sum + (c.progress?.completed || 0), 0);
    const totalChapters = cursusList.reduce((sum, c) => sum + (c.progress?.total || 0), 0);
    const totalProgress = totalChapters > 0 ? Math.round((totalCompleted / totalChapters) * 100) : 0;

    return (
        <div className="min-h-screen bg-slate-950 text-white pt-24 pb-16">
            <div className="relative z-10 max-w-7xl mx-auto px-6">
                {/* Breadcrumb */}
                <div className="text-xs text-slate-500 mb-6">
                    <Link href="/" className="hover:text-emerald-400 transition-colors">Accueil</Link>
                    <ChevronRight size={12} className="inline mx-1" />
                    <Link href="/student" className="hover:text-emerald-400 transition-colors">Espace Étudiant</Link>
                    <ChevronRight size={12} className="inline mx-1" />
                    <span className="text-emerald-400">Cursus</span>
                </div>

                {/* Hero Header */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600/20 via-teal-600/10 to-slate-900/50 border border-emerald-500/10 p-8 md:p-12 mb-10">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(16,185,129,0.15),_transparent_60%)]" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="shrink-0 animate-pulse-slow">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                                    <BookOpen size={32} className="text-emerald-400" />
                                </div>
                            </div>
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-semibold mb-4">
                                    <Sparkles size={14} />
                                    Parcours d&apos;apprentissage
                                </div>
                                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                                    Mes Cursus
                                </h1>
                                <p className="text-slate-400 text-sm md:text-base max-w-lg">
                                    Progressez à travers des parcours structurés couvrant tous les aspects de la monétique,
                                    des fondamentaux aux techniques expertes.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            {/* Overall progress ring */}
                            <div className="relative flex flex-col items-center">
                                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="6"
                                        className="text-slate-800" />
                                    <circle cx="50" cy="50" r="40" fill="none" stroke="url(#progressGrad)" strokeWidth="6"
                                        strokeLinecap="round"
                                        strokeDasharray={`${totalProgress * 2.51} ${251 - totalProgress * 2.51}`} />
                                    <defs>
                                        <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#10b981" />
                                            <stop offset="100%" stopColor="#06b6d4" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xl font-bold text-white">{totalProgress}%</span>
                                </div>
                                <span className="text-xs text-slate-500 mt-2">Progression</span>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <BookOpen size={14} className="text-emerald-400" />
                                    <span>{cursusList.length} cursus</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Layers size={14} className="text-cyan-400" />
                                    <span>{cursusList.reduce((s, c) => s + c.module_count, 0)} modules</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Clock size={14} className="text-amber-400" />
                                    <span>{cursusList.reduce((s, c) => s + c.estimated_hours, 0)}h de contenu</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                        <button onClick={fetchCursus} className="text-red-400 hover:text-red-300 text-xs underline">
                            Réessayer
                        </button>
                    </div>
                )}

                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Rechercher un cursus..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                        />
                    </div>
                    <div className="flex gap-2">
                        {['ALL', 'DEBUTANT', 'INTERMEDIAIRE', 'AVANCE', 'EXPERT'].map((lvl) => {
                            const config = lvl === 'ALL'
                                ? { label: 'Tous', color: 'text-slate-400', bg: 'bg-slate-800/60', border: 'border-white/10' }
                                : LEVEL_CONFIG[lvl];
                            const isActive = filterLevel === lvl;
                            return (
                                <button
                                    key={lvl}
                                    onClick={() => setFilterLevel(lvl)}
                                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${isActive
                                        ? `${lvl === 'ALL' ? 'bg-white/10 border-white/20 text-white' : `${config.bg} ${config.border} ${config.color}`}`
                                        : 'bg-slate-900/40 border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/10'
                                        }`}
                                >
                                    {lvl === 'ALL' ? 'Tous' : LEVEL_CONFIG[lvl].label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="bg-slate-900/50 rounded-2xl border border-white/5 p-6 animate-pulse">
                                <div className="h-12 w-12 bg-slate-800 rounded-xl mb-4" />
                                <div className="h-5 w-3/4 bg-slate-800 rounded mb-3" />
                                <div className="h-4 w-full bg-slate-800/50 rounded mb-2" />
                                <div className="h-4 w-2/3 bg-slate-800/50 rounded mb-6" />
                                <div className="h-2 w-full bg-slate-800 rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : filteredCursus.length === 0 ? (
                    <div className="text-center py-20">
                        <BookOpen size={48} className="mx-auto text-slate-700 mb-4" />
                        <p className="text-slate-500 text-lg mb-2">
                            {searchQuery || filterLevel !== 'ALL' ? 'Aucun cursus trouvé' : 'Aucun cursus disponible'}
                        </p>
                        <p className="text-slate-600 text-sm">
                            {searchQuery || filterLevel !== 'ALL'
                                ? 'Essayez de modifier vos critères de recherche.'
                                : 'Les cursus seront bientôt disponibles.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCursus.map((cursus) => {
                            const pct = getProgressPercent(cursus);
                            const levelInfo = LEVEL_CONFIG[cursus.level] || LEVEL_CONFIG.DEBUTANT;
                            return (
                                <Link key={cursus.id} href={`/student/cursus/${cursus.id}`} className="group block">
                                    <div className={`relative bg-slate-900/50 rounded-2xl border border-white/5 p-6 transition-all duration-300 hover:border-white/15 hover:bg-slate-800/50 hover:-translate-y-1 hover:shadow-xl ${levelInfo.glow}`}>
                                        {/* Top row: icon + level badge */}
                                        <div className="flex items-start justify-between gap-4 mb-5">
                                            <div className={`p-3 rounded-xl ${levelInfo.bg} ${levelInfo.border} border ${levelInfo.color}`}>
                                                {ICON_MAP[cursus.icon] || <BookOpen size={24} />}
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide ${levelInfo.bg} ${levelInfo.color} ${levelInfo.border} border`}>
                                                {levelInfo.label}
                                            </span>
                                        </div>

                                        {/* Title + description */}
                                        <h3 className="text-white font-bold text-lg mb-2 group-hover:text-emerald-300 transition-colors line-clamp-1">
                                            {cursus.title}
                                        </h3>
                                        <p className="text-slate-400 text-sm leading-relaxed mb-5 line-clamp-2">
                                            {cursus.description}
                                        </p>

                                        {/* Meta chips */}
                                        <div className="flex items-center gap-4 mb-4 flex-wrap">
                                            <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <Layers size={12} className="text-slate-600" />
                                                {cursus.module_count} modules
                                            </span>
                                            <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <Clock size={12} className="text-slate-600" />
                                                {cursus.estimated_hours}h
                                            </span>
                                        </div>

                                        {/* Tags */}
                                        {cursus.tags && cursus.tags.length > 0 && (
                                            <div className="flex gap-1.5 flex-wrap mb-5">
                                                {cursus.tags.slice(0, 4).map((tag) => (
                                                    <span key={tag} className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-500 text-[10px] border border-white/5">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Progress bar */}
                                        <div className="space-y-2">
                                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${pct >= 100
                                                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                                        : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                                                        }`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] text-slate-500">
                                                    {pct >= 100 ? '✅ Terminé' : `${pct}% complété`}
                                                </span>
                                                <ArrowRight size={14} className="text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
