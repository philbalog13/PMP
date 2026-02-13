'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@shared/context/AuthContext';
import { UserRole } from '@shared/types/user';
import { BarChart3, PieChart, RefreshCcw, TrendingUp } from 'lucide-react';
import { clientApi } from '@/lib/api-client';

type Tx = {
    amount: number;
    currency: string;
    status: string;
    type: string;
    timestamp: string;
};

const asObject = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) return error.message;
    const candidate = asObject(error);
    return typeof candidate.message === 'string' ? candidate.message : fallback;
};

const toNumber = (value: unknown): number => {
    const parsed = Number.parseFloat(String(value ?? ''));
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value: number, currency = 'EUR') =>
    new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2
    }).format(value);

export default function StatsPage() {
    const { isLoading, isAuthenticated, user } = useAuth();
    const [transactions, setTransactions] = useState<Tx[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isClient = user?.role === UserRole.CLIENT;

    const loadStatsData = async () => {
        setIsRefreshing(true);
        setError(null);

        try {
            const response = await clientApi.getTransactions('limit=500&page=1');
            const normalized: Tx[] = (response.transactions || []).map((rawTx) => {
                const tx = asObject(rawTx);
                return {
                    amount: toNumber(tx.amount),
                    currency: String(tx.currency || 'EUR'),
                    status: String(tx.status || ''),
                    type: String(tx.type || ''),
                    timestamp: String(tx.timestamp || '')
                };
            });
            setTransactions(normalized);
        } catch (loadError: unknown) {
            setError(getErrorMessage(loadError, 'Impossible de charger les statistiques'));
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated || !isClient) return;
        loadStatsData();
    }, [isAuthenticated, isClient]);

    const metrics = useMemo(() => {
        const approved = transactions.filter((tx) => tx.status === 'APPROVED');
        const approvedPurchases = approved.filter((tx) => tx.type === 'PURCHASE');
        const approvedRefunds = approved.filter((tx) => tx.type === 'REFUND');
        const currency = transactions[0]?.currency || 'EUR';

        const totalSpent = approvedPurchases.reduce((sum, tx) => sum + tx.amount, 0);
        const totalRefunded = approvedRefunds.reduce((sum, tx) => sum + tx.amount, 0);
        const approvalRate = transactions.length === 0
            ? 0
            : Math.round((approved.length / transactions.length) * 100);

        const dayMap = new Map<string, number>();
        for (const tx of approvedPurchases) {
            const dateKey = tx.timestamp ? tx.timestamp.slice(0, 10) : '';
            if (!dateKey) continue;
            dayMap.set(dateKey, (dayMap.get(dateKey) || 0) + tx.amount);
        }

        const lastDays = Array.from(dayMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-10)
            .map(([date, amount]) => ({ date, amount }));

        const maxDailyAmount = lastDays.reduce((max, day) => Math.max(max, day.amount), 0);

        const statusCounts = transactions.reduce<Record<string, number>>((acc, tx) => {
            const key = tx.status || 'UNKNOWN';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        const statusDistribution = Object.entries(statusCounts)
            .map(([status, count]) => ({
                status,
                count,
                percentage: transactions.length === 0 ? 0 : Math.round((count / transactions.length) * 100)
            }))
            .sort((a, b) => b.count - a.count);

        return {
            currency,
            totalSpent,
            totalRefunded,
            approvedCount: approved.length,
            totalCount: transactions.length,
            approvalRate,
            lastDays,
            maxDailyAmount,
            statusDistribution
        };
    }, [transactions]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
                <div className="max-w-md w-full rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center space-y-4">
                    <h1 className="text-2xl font-bold text-white">Session expirée</h1>
                    <p className="text-slate-400">Reconnectez-vous sur le portail pour accéder à votre espace client.</p>
                    <a
                        href={`${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}/login`}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 transition-colors"
                    >
                        Retour au login
                    </a>
                </div>
            </div>
        );
    }

    if (!isClient) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
                <div className="max-w-xl w-full rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center text-slate-300">
                    Les statistiques client sont réservées au rôle client.
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 md:p-10 max-w-[1400px] mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent font-heading">
                        Analyses & Statistiques
                    </h1>
                    <p className="text-slate-400 mt-2">Indicateurs réellement calculés depuis vos transactions.</p>
                </div>
                <button
                    onClick={loadStatsData}
                    disabled={isRefreshing}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-white hover:bg-slate-700 disabled:opacity-60"
                >
                    <RefreshCcw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                    Actualiser
                </button>
            </div>

            {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-5">
                    <p className="text-slate-400 text-sm">Montant achats approuvés</p>
                    <p className="text-2xl font-bold text-white">{formatMoney(metrics.totalSpent, metrics.currency)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-5">
                    <p className="text-slate-400 text-sm">Montant remboursé</p>
                    <p className="text-2xl font-bold text-emerald-300">{formatMoney(metrics.totalRefunded, metrics.currency)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-5">
                    <p className="text-slate-400 text-sm">Transactions approuvées</p>
                    <p className="text-2xl font-bold text-white">{metrics.approvedCount}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-5">
                    <p className="text-slate-400 text-sm">Taux d&apos;approbation</p>
                    <p className="text-2xl font-bold text-white">{metrics.approvalRate}%</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-slate-800/50 p-6">
                    <div className="flex items-center gap-2 text-white font-semibold mb-4">
                        <BarChart3 size={18} className="text-blue-400" />
                        Évolution journalière des achats approuvés
                    </div>
                    <div className="h-64 flex items-end gap-2">
                        {metrics.lastDays.map((day) => (
                            <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                                <div className="w-full rounded-t-lg bg-blue-500/30 hover:bg-blue-500/50 transition-all relative group" style={{ height: `${metrics.maxDailyAmount > 0 ? (day.amount / metrics.maxDailyAmount) * 100 : 0}%` }}>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-white text-black text-xs px-2 py-1 rounded transition-opacity whitespace-nowrap">
                                        {formatMoney(day.amount, metrics.currency)}
                                    </div>
                                </div>
                                <span className="text-[10px] text-slate-500">{day.date.slice(5)}</span>
                            </div>
                        ))}
                        {metrics.lastDays.length === 0 && (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
                                Pas assez de données sur les derniers jours.
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-6">
                    <div className="flex items-center gap-2 text-white font-semibold mb-4">
                        <PieChart size={18} className="text-purple-400" />
                        Répartition par statut
                    </div>
                    <div className="space-y-3">
                        {metrics.statusDistribution.map((row) => (
                            <div key={row.status} className="rounded-xl bg-slate-900/50 p-3 border border-white/5">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-200">{row.status}</span>
                                    <span className="text-slate-400">{row.percentage}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-700 mt-2 overflow-hidden">
                                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${row.percentage}%` }}></div>
                                </div>
                                <p className="text-xs text-slate-500 mt-2 inline-flex items-center gap-1">
                                    <TrendingUp size={12} />
                                    {row.count} transactions
                                </p>
                            </div>
                        ))}
                        {metrics.statusDistribution.length === 0 && (
                            <p className="text-sm text-slate-500">Aucune transaction disponible.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
