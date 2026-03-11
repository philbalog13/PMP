'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../auth/useAuth';
import { ArrowLeft, Crown, Medal, RefreshCw, Shield, Trophy, Zap } from 'lucide-react';
import { APP_URLS } from '@shared/lib/app-urls';

interface LeaderboardEntry {
    student_id: string;
    username: string;
    first_name: string;
    last_name: string;
    challenges_solved: number;
    total_points: number;
    first_bloods: number;
    rank: number;
}

const PODIUM_STYLES = [
    {
        bg: 'bg-gradient-to-b from-amber-500/30 to-amber-600/15',
        border: 'border-amber-400/35',
        iconColor: 'text-amber-200',
        nameColor: 'text-amber-100',
        order: 'order-first',
        height: 'pb-8',
    },
    {
        bg: 'bg-gradient-to-b from-slate-300/20 to-slate-500/10',
        border: 'border-slate-300/25',
        iconColor: 'text-slate-300',
        nameColor: 'text-slate-200',
        order: '',
        height: '',
    },
    {
        bg: 'bg-gradient-to-b from-orange-700/25 to-amber-700/10',
        border: 'border-orange-400/25',
        iconColor: 'text-orange-200',
        nameColor: 'text-orange-100',
        order: '',
        height: '',
    },
];

export default function StudentCtfLeaderboardPage() {
    const { user, isLoading } = useAuth(true);

    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchLeaderboard = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch('/api/ctf/leaderboard?limit=200', {
            headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Impossible de charger le leaderboard');
        setEntries(payload.leaderboard || []);
    }, []);

    const refresh = useCallback(async () => {
        try {
            setRefreshing(true);
            setError(null);
            await fetchLeaderboard();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Erreur de chargement');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [fetchLeaderboard]);

    useEffect(() => {
        if (isLoading) return;
        void refresh();
        const interval = window.setInterval(() => void fetchLeaderboard(), 30000);
        return () => window.clearInterval(interval);
    }, [fetchLeaderboard, isLoading, refresh]);

    const topThree = useMemo(() => entries.slice(0, 3), [entries]);
    const rest = useMemo(() => entries.slice(3), [entries]);
    const myRank = useMemo(() => entries.find((e) => e.student_id === user?.id), [entries, user?.id]);

    if (isLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Trophy className="h-10 w-10 animate-bounce text-amber-400" />
                    <p className="text-sm text-slate-400">Chargement du leaderboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white pt-24 pb-16">
            <div className="max-w-4xl mx-auto px-6">

                {/* Back nav */}
                <div className="mb-8">
                    <Link
                        href={APP_URLS.studentCtf}
                        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-orange-300 transition-colors"
                    >
                        <ArrowLeft size={14} />
                        Security Labs
                    </Link>
                </div>

                {/* Header */}
                <div className="mb-10">
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-500/25 px-3 py-1 text-xs text-amber-300 mb-3">
                        <Trophy size={12} /> Hall of Fame
                    </div>
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <h1 className="text-4xl font-black tracking-tight">Leaderboard</h1>
                            <p className="mt-1 text-sm text-slate-400">Mis à jour toutes les 30 secondes.</p>
                        </div>
                        <button
                            onClick={() => void refresh()}
                            disabled={refreshing}
                            className={`px-4 py-2 rounded-xl border border-white/15 bg-slate-800/60 hover:bg-slate-800 text-sm font-semibold inline-flex items-center gap-2 transition-colors ${refreshing ? 'opacity-60' : ''}`}
                        >
                            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* My rank banner */}
                {myRank && (
                    <div className="mb-6 rounded-2xl border border-orange-500/25 bg-orange-500/8 p-4 flex items-center gap-4">
                        <div className="h-9 w-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                            <Shield size={16} className="text-orange-300" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white">Votre classement</p>
                            <p className="text-xs text-slate-400">
                                Rang <span className="text-orange-200 font-mono font-bold">#{myRank.rank}</span>
                                {' · '}
                                <span className="text-amber-300 font-semibold">{myRank.total_points} pts</span>
                                {' · '}
                                {myRank.challenges_solved} rooms complétées
                                {myRank.first_bloods > 0 && (
                                    <> · <span className="text-red-300"><Zap size={11} className="inline" /> {myRank.first_bloods} first blood{myRank.first_bloods > 1 ? 's' : ''}</span></>
                                )}
                            </p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/8 text-red-200 text-sm p-4">{error}</div>
                )}

                {/* Top 3 podium */}
                {topThree.length > 0 && (
                    <div className="mb-8 grid grid-cols-3 gap-3 items-end">
                        {topThree.map((entry, idx) => {
                            const name = [entry.first_name, entry.last_name].filter(Boolean).join(' ') || entry.username;
                            const isMe = entry.student_id === user?.id;
                            const style = PODIUM_STYLES[idx];

                            return (
                                <div
                                    key={entry.student_id}
                                    className={`rounded-2xl border ${style.bg} ${style.border} p-5 backdrop-blur text-center ${style.order} ${style.height}`}
                                >
                                    <div className="flex justify-center mb-2">
                                        {idx === 0
                                            ? <Crown size={20} className={style.iconColor} />
                                            : <Medal size={20} className={style.iconColor} />
                                        }
                                    </div>
                                    <p className="text-xs font-mono text-white/50 mb-1">#{entry.rank}</p>
                                    <p className={`font-bold text-sm truncate ${isMe ? 'text-orange-100' : style.nameColor}`}>
                                        {isMe ? 'Vous' : name}
                                    </p>
                                    <p className="text-xs text-white/60 mt-0.5">{entry.challenges_solved} rooms</p>
                                    <p className="text-xl font-extrabold mt-2 text-white">{entry.total_points}</p>
                                    <p className="text-xs text-white/40">pts</p>
                                    {entry.first_bloods > 0 && (
                                        <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-red-300 bg-red-500/15 border border-red-500/20 px-2 py-0.5 rounded-full">
                                            <Zap size={10} /> {entry.first_bloods} FB
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Full table */}
                <div className="rounded-2xl border border-white/8 bg-slate-900/60 overflow-hidden">
                    <div className="grid grid-cols-[3rem_1fr_6rem_7rem_6rem] px-4 py-3 bg-slate-950/60 border-b border-white/8 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <span>#</span>
                        <span>Player</span>
                        <span className="text-center">Rooms</span>
                        <span className="text-center">Points</span>
                        <span className="text-center">First Blood</span>
                    </div>
                    <div className="divide-y divide-white/5">
                        {entries.map((entry, idx) => {
                            const isMe = entry.student_id === user?.id;
                            const name = [entry.first_name, entry.last_name].filter(Boolean).join(' ') || entry.username;

                            return (
                                <div
                                    key={entry.student_id}
                                    className={`grid grid-cols-[3rem_1fr_6rem_7rem_6rem] px-4 py-3 items-center text-sm transition-colors ${
                                        isMe ? 'bg-orange-500/10' : 'hover:bg-white/3'
                                    }`}
                                    style={{ animationDelay: `${Math.min(idx * 0.04, 1.2)}s` }}
                                >
                                    <span className="font-mono text-slate-500 text-xs">#{entry.rank}</span>
                                    <span className={`font-medium truncate ${isMe ? 'text-orange-200 font-semibold' : 'text-white'}`}>
                                        {isMe ? `${name} (vous)` : name}
                                    </span>
                                    <span className="text-center text-slate-300">{entry.challenges_solved}</span>
                                    <span className="text-center font-semibold text-amber-300">{entry.total_points}</span>
                                    <span className="text-center text-slate-400">
                                        {entry.first_bloods > 0
                                            ? <span className="inline-flex items-center gap-1 text-red-300"><Zap size={11} />{entry.first_bloods}</span>
                                            : <span className="text-slate-700">—</span>
                                        }
                                    </span>
                                </div>
                            );
                        })}

                        {entries.length === 0 && (
                            <div className="py-12 text-center text-slate-500 text-sm">
                                Aucun joueur pour l&apos;instant.
                            </div>
                        )}
                    </div>
                </div>

                {rest.length > 0 && (
                    <p className="mt-4 text-center text-xs text-slate-600">
                        {entries.length} joueurs classés
                    </p>
                )}
            </div>
        </div>
    );
}
