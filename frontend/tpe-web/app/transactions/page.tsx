'use client';

import Link from 'next/link';
import { ArrowLeft, Activity, DollarSign, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';
import { useTerminalStore } from '@/lib/store';
import { formatAmount } from '@/lib/utils';
import GlassCard from '@shared/components/GlassCard';

export default function TransactionsPage() {
    const { transactionHistory } = useTerminalStore();

    const stats = useMemo(() => {
        const total = transactionHistory.length;
        const approved = transactionHistory.filter((tx) => tx.status === 'APPROVED').length;
        const declined = total - approved;
        const volume = transactionHistory.reduce((sum, tx) => sum + tx.amount, 0);
        const successRate = total > 0 ? (approved / total) * 100 : 0;

        return { total, approved, declined, volume, successRate };
    }, [transactionHistory]);

    return (
        <div className="min-h-screen p-6">
            <header className="mb-8">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Retour au terminal
                </Link>
                <h1 className="text-3xl font-bold text-white">Journal des transactions</h1>
                <p className="text-slate-400 mt-2">
                    Historique en temps reel du terminal (session en cours)
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <GlassCard className="p-5 border border-white/10 bg-slate-900/50">
                    <div className="flex items-center justify-between mb-2">
                        <Activity className="w-5 h-5 text-blue-400" />
                        <span className="text-xs text-slate-500">Total</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{stats.total}</div>
                    <div className="text-sm text-slate-400">Transactions</div>
                </GlassCard>

                <GlassCard className="p-5 border border-emerald-500/20 bg-emerald-500/5">
                    <div className="flex items-center justify-between mb-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        <span className="text-xs text-slate-500">Acceptees</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-300">{stats.approved}</div>
                    <div className="text-sm text-slate-400">{stats.successRate.toFixed(1)}% taux de succes</div>
                </GlassCard>

                <GlassCard className="p-5 border border-red-500/20 bg-red-500/5">
                    <div className="flex items-center justify-between mb-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <span className="text-xs text-slate-500">Refusees</span>
                    </div>
                    <div className="text-2xl font-bold text-red-300">{stats.declined}</div>
                    <div className="text-sm text-slate-400">Codes ISO a verifier</div>
                </GlassCard>

                <GlassCard className="p-5 border border-blue-500/20 bg-blue-500/5">
                    <div className="flex items-center justify-between mb-2">
                        <DollarSign className="w-5 h-5 text-blue-300" />
                        <span className="text-xs text-slate-500">Volume</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{formatAmount(stats.volume)}</div>
                    <div className="text-sm text-slate-400">Montant cumule</div>
                </GlassCard>
            </div>

            <GlassCard className="overflow-hidden border border-white/10 bg-slate-900/50">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Dernieres transactions</h2>
                    <span className="text-xs text-slate-400">{stats.total} elements</span>
                </div>

                {transactionHistory.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">
                        Aucune transaction dans cette session. Revenez au terminal pour encaisser un paiement.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">STAN</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Carte</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Montant</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Type</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Statut</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Code</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {transactionHistory.map((tx) => {
                                    const createdAt = tx.timestamp instanceof Date ? tx.timestamp : new Date(tx.timestamp);
                                    const statusClass = tx.status === 'APPROVED'
                                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                        : 'bg-red-500/10 text-red-300 border border-red-500/20';

                                    return (
                                        <tr key={tx.id} className="hover:bg-white/5 transition">
                                            <td className="px-6 py-4 text-sm font-mono text-slate-300">{tx.id}</td>
                                            <td className="px-6 py-4 text-sm text-slate-300">{tx.maskedPan}</td>
                                            <td className="px-6 py-4 text-sm font-semibold text-white">
                                                {formatAmount(tx.amount)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-400">{tx.type}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                                                    {tx.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-mono text-slate-300">{tx.responseCode}</td>
                                            <td className="px-6 py-4 text-sm text-slate-400">
                                                {createdAt.toLocaleString('fr-FR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </GlassCard>
        </div>
    );
}
