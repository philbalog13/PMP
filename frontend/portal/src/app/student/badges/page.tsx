'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import Link from 'next/link';
import {
    Award,
    ChevronRight,
    Loader2,
    Lock,
    RefreshCw,
    Trophy,
    Zap
} from 'lucide-react';

type BadgeRow = {
    type: string;
    name: string;
    description: string;
    icon: string;
    xp: number;
    earned: boolean;
    earnedAt?: string;
};

type BadgeResponse = {
    badges: BadgeRow[];
    earned: number;
    total: number;
    totalXP: number;
};

function getAuthHeaders(): HeadersInit | null {
    const token = localStorage.getItem('token');
    if (!token) {
        return null;
    }
    return { Authorization: `Bearer ${token}` };
}

const BADGE_EMOJI: Record<string, string> = {
    star: '\u{1F3AF}',
    'clipboard-check': '\u{1F4CB}',
    award: '\u{1F3C5}',
    trophy: '\u{1F3C6}',
    'book-open': '\u{1F4D6}',
    'graduation-cap': '\u{1F393}',
    zap: '\u26A1',
    flame: '\u{1F525}',
    flag: '\u{1F6A9}',
    droplet: '\u{1F4A7}',
    terminal: '\u{1F5A5}\uFE0F',
    crown: '\u{1F451}',
    layers: '\u{1F5C2}\uFE0F'
};

export default function StudentBadgesPage() {
    const { isLoading } = useAuth(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<BadgeResponse | null>(null);

    const loadBadges = useCallback(async () => {
        const headers = getAuthHeaders();
        if (!headers) {
            setError('Session invalide');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/progress/badges', { headers });
            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error || 'Impossible de charger les badges');
            }

            const payload = await response.json();
            setData({
                badges: payload.badges || [],
                earned: Number(payload.earned || 0),
                total: Number(payload.total || 0),
                totalXP: Number(payload.totalXP || 0)
            });
        } catch (loadError: unknown) {
            setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les badges');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isLoading) {
            return;
        }
        loadBadges();
    }, [isLoading, loadBadges]);

    const completionRate = useMemo(() => {
        if (!data || data.total === 0) {
            return 0;
        }
        return Math.round((data.earned / data.total) * 100);
    }, [data]);

    if (isLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
                <div className="flex items-center gap-3 text-slate-300">
                    <Loader2 className="animate-spin" />
                    Chargement des badges...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white pt-24 pb-12">
            <div className="max-w-6xl mx-auto px-6 space-y-8">
                <div className="text-xs text-slate-500">
                    <Link href="/student" className="hover:text-emerald-400">Mon Parcours</Link>
                    <ChevronRight size={12} className="inline mx-1" />
                    <span className="text-emerald-400">Mes Badges</span>
                </div>

                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Mes Badges</h1>
                        <p className="text-slate-400">Progression réelle basée sur vos quiz et ateliers.</p>
                    </div>
                    <button
                        onClick={loadBadges}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-white/10 text-white rounded-xl hover:bg-slate-700"
                    >
                        <RefreshCw size={18} />
                        Actualiser
                    </button>
                </header>

                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center justify-between">
                        <span>{error}</span>
                        <button onClick={loadBadges} className="text-red-400 hover:text-red-300 text-xs underline ml-4">
                            Réessayer
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-2 text-amber-400">
                            <Trophy size={20} />
                            <span className="text-sm text-slate-400">Badges obtenus</span>
                        </div>
                        <div className="text-3xl font-bold">
                            {data?.earned || 0}
                            <span className="text-lg text-slate-500"> / {data?.total || 0}</span>
                        </div>
                    </div>

                    <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-2 text-emerald-400">
                            <Zap size={20} />
                            <span className="text-sm text-slate-400">XP via badges</span>
                        </div>
                        <div className="text-3xl font-bold">{(data?.totalXP || 0).toLocaleString()}</div>
                    </div>

                    <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-2 text-blue-400">
                            <Award size={20} />
                            <span className="text-sm text-slate-400">Complétion</span>
                        </div>
                        <div className="text-3xl font-bold">{completionRate}%</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(data?.badges || []).map((badge) => (
                        <div
                            key={badge.type}
                            className={`p-5 rounded-2xl border ${
                                badge.earned
                                    ? 'bg-slate-900/70 border-emerald-500/30'
                                    : 'bg-slate-900/40 border-white/10 opacity-70'
                            }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="text-4xl">{BADGE_EMOJI[badge.icon] || '\u{1F396}\uFE0F'}</div>
                                {badge.earned ? (
                                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300">Débloqué</span>
                                ) : (
                                    <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-300 inline-flex items-center gap-1">
                                        <Lock size={12} />
                                        Verrouillé
                                    </span>
                                )}
                            </div>

                            <h3 className="font-semibold text-white mb-1">{badge.name}</h3>
                            <p className="text-sm text-slate-400 mb-3">{badge.description}</p>
                            <div className="text-xs text-amber-300">+{badge.xp} XP</div>
                            {badge.earnedAt && (
                                <div className="text-xs text-slate-500 mt-2">
                                    Obtenu le {new Date(badge.earnedAt).toLocaleDateString('fr-FR')}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
