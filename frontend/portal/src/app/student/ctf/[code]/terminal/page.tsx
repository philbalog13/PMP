'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../../auth/useAuth';
import { ChevronRight, Crown, Medal, RefreshCw, Trophy } from 'lucide-react';

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

export default function StudentCtfLeaderboardPage() {
    const { user, isLoading } = useAuth(true);

    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchLeaderboard = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            return;
        }

        const response = await fetch('/api/ctf/leaderboard?limit=200', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const payload = await response.json();
        if (!response.ok) {
            throw new Error(payload.error || 'Impossible de charger le leaderboard');
        }

        setEntries(payload.leaderboard || []);
    }, []);

    const refresh = useCallback(async () => {
        try {
            setRefreshing(true);
            setError(null);
            await fetchLeaderboard();
        } catch (fetchError: any) {
            setError(fetchError.message || 'Erreur de chargement');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [fetchLeaderboard]);

    useEffect(() => {
        if (isLoading) {
            return;
        }

        refresh();

        const interval = window.setInterval(() => {
            void fetchLeaderboard();
        }, 30000);

        return () => window.clearInterval(interval);
    }, [fetchLeaderboard, isLoading, refresh]);

    const topThree = useMemo(() => entries.slice(0, 3), [entries]);

    if (isLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <Trophy className="h-12 w-12 animate-bounce text-amber-400" />
                    <p className="text-sm text-slate-400">Chargement du classement CTF...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white pt-24 pb-12">
            <div className="max-w-6xl mx-auto px-6">
                <div className="text-xs text-slate-500 mb-6">
                    <Link href="/student/ctf" className="hover:text-orange-300">Security Labs</Link>
                    <ChevronRight size={12} className="inline mx-1" />
                    <span className="text-orange-300">Leaderboard</span>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-black">CTF Leaderboard</h1>
                        <p className="text-sm text-slate-400 mt-1">Mise a jour automatique toutes les 30 secondes.</p>
                    </div>
                    <button
                        onClick={refresh}
                        className={`px-3 py-2 rounded-lg border border-white/20 bg-slate-900/60 text-xs flex items-center gap-2 ${refreshing ? 'animate-pulse' : ''}`}
                    >
                        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>

                {error && (
                    <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 text-red-200 text-sm p-4">
                        {error}
                    </div>
                )}

                <div className="grid md:grid-cols-3 gap-4 mb-8">
                    {topThree.map((entry, index) => {
                        const name = [entry.first_name, entry.last_name].filter(Boolean).join(' ') || entry.username;
                        const isMe = entry.student_id === user?.id;
                        const style = index === 0
                            ? 'from-amber-500/35 to-yellow-500/20 border-amber-300/40'
                            : index === 1
                                ? 'from-slate-300/25 to-slate-500/20 border-slate-300/30'
                                : 'from-orange-700/30 to-amber-700/20 border-orange-400/30';

                        return (
                            <div key={entry.student_id} className={`rounded-2xl border bg-gradient-to-br ${style} p-5 backdrop-blur`}>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-mono text-white/80">#{entry.rank}</span>
                                    {index === 0 ? <Crown size={18} className="text-amber-200" /> : <Medal size={18} className="text-white/80" />}
                                </div>
                                <p className={`font-bold ${isMe ? 'text-orange-100' : 'text-white'}`}>{isMe ? 'Vous' : name}</p>
                                <p className="text-xs text-white/75 mt-1">{entry.challenges_solved} challenges resolus</p>
                                <p className="text-lg font-extrabold mt-3">{entry.total_points} pts</p>
                            </div>
                        );
                    })}
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-800/50 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-900/70 text-xs uppercase text-slate-400 tracking-wide">
                            <tr>
                                <th className="text-left px-4 py-3">Rank</th>
                                <th className="text-left px-4 py-3">Username</th>
                                <th className="text-left px-4 py-3">Challenges</th>
                                <th className="text-left px-4 py-3">Points</th>
                                <th className="text-left px-4 py-3">First Bloods</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry) => {
                                const isMe = entry.student_id === user?.id;
                                const name = [entry.first_name, entry.last_name].filter(Boolean).join(' ') || entry.username;

                                return (
                                    <tr key={entry.student_id} className={`${isMe ? 'bg-orange-500/15' : 'hover:bg-white/5'} border-t border-white/5`}>
                                        <td className="px-4 py-3 font-mono text-slate-300">#{entry.rank}</td>
                                        <td className={`px-4 py-3 ${isMe ? 'text-orange-200 font-bold' : 'text-white'}`}>{isMe ? `Vous (${name})` : name}</td>
                                        <td className="px-4 py-3 text-slate-300">{entry.challenges_solved}</td>
                                        <td className="px-4 py-3 text-amber-300 font-semibold">{entry.total_points}</td>
                                        <td className="px-4 py-3 text-slate-300">{entry.first_bloods}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

