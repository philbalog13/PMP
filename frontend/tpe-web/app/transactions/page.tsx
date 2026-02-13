'use client';

import Link from 'next/link';
import { ArrowLeft, Activity, DollarSign, ShieldCheck, AlertTriangle, RefreshCw, Search } from 'lucide-react';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '@shared/context/AuthContext';
import { UserRole } from '@shared/types/user';
import { normalizeRole } from '@shared/utils/roleUtils';
import { getMerchantTransactions } from '@/lib/api-client';
import { formatAmount } from '@/lib/utils';
import GlassCard from '@shared/components/GlassCard';

interface Transaction {
    id: string;
    transaction_id: string;
    stan: string;
    masked_pan: string;
    amount: number;
    currency: string;
    type: string;
    status: string;
    response_code: string;
    authorization_code: string;
    merchant_name: string;
    terminal_id: string;
    fraud_score: number | null;
    threeds_status: string | null;
    eci: string | null;
    timestamp: string;
    processing_steps: unknown[] | null;
}

const normalizeTransaction = (raw: Record<string, unknown>): Transaction => ({
    id: String(raw.id || ''),
    transaction_id: String(raw.transaction_id || raw.transactionId || raw.stan || ''),
    stan: String(raw.stan || ''),
    masked_pan: String(raw.masked_pan || raw.maskedPan || ''),
    amount: Number(raw.amount || 0),
    currency: String(raw.currency || 'EUR'),
    type: String(raw.type || 'PURCHASE'),
    status: String(raw.status || 'UNKNOWN'),
    response_code: String(raw.response_code || raw.responseCode || ''),
    authorization_code: String(raw.authorization_code || raw.authorizationCode || ''),
    merchant_name: String(raw.merchant_name || raw.merchantName || ''),
    terminal_id: String(raw.terminal_id || raw.terminalId || ''),
    fraud_score: typeof raw.fraud_score === 'number' ? raw.fraud_score : null,
    threeds_status: typeof raw.threeds_status === 'string' ? raw.threeds_status : null,
    eci: typeof raw.eci === 'string' ? raw.eci : null,
    timestamp: String(raw.timestamp || raw.created_at || new Date().toISOString()),
    processing_steps: Array.isArray(raw.processing_steps) ? raw.processing_steps : null,
});

const getErrorMessage = (error: unknown): string => {
    if (typeof error === 'object' && error !== null) {
        const maybeError = error as {
            response?: { data?: { error?: string } };
            message?: string;
        };
        if (maybeError.response?.data?.error) {
            return maybeError.response.data.error;
        }
        if (maybeError.message) {
            return maybeError.message;
        }
    }
    return 'Erreur de chargement';
};

export default function TransactionsPage() {
    const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');

    const isMerchant = normalizeRole(user?.role) === UserRole.MARCHAND;

    const fetchTransactions = useCallback(async () => {
        try {
            setIsRefreshing(true);
            setError(null);
            const data = await getMerchantTransactions({ limit: 200 });
            const txRows = Array.isArray(data.transactions) ? data.transactions : [];
            setTransactions(txRows.filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null).map(normalizeTransaction));
        } catch (err: unknown) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated || !isMerchant) {
            return;
        }
        fetchTransactions();
    }, [fetchTransactions, isAuthenticated, isMerchant]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const matchesSearch = !searchQuery || [
                tx.transaction_id, tx.masked_pan, tx.merchant_name, tx.response_code, tx.authorization_code
            ].some(field => field?.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;
            const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;
            return matchesSearch && matchesStatus && matchesType;
        });
    }, [transactions, searchQuery, statusFilter, typeFilter]);

    const stats = useMemo(() => {
        const total = transactions.length;
        const approved = transactions.filter((tx) => tx.status === 'APPROVED').length;
        const declined = transactions.filter((tx) => tx.status === 'DECLINED').length;
        const refunded = transactions.filter((tx) => tx.status === 'REFUNDED' || tx.status === 'REVERSED').length;
        const volume = transactions
            .filter((tx) => tx.status === 'APPROVED' || tx.status === 'REFUNDED')
            .reduce((sum, tx) => sum + Number(tx.amount), 0);
        const successRate = total > 0 ? (approved / total) * 100 : 0;

        return { total, approved, declined, refunded, volume, successRate };
    }, [transactions]);

    const statusColors: Record<string, string> = {
        APPROVED: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
        DECLINED: 'bg-red-500/10 text-red-300 border border-red-500/20',
        PENDING: 'bg-amber-500/10 text-amber-300 border border-amber-500/20',
        REFUNDED: 'bg-blue-500/10 text-blue-300 border border-blue-500/20',
        REVERSED: 'bg-purple-500/10 text-purple-300 border border-purple-500/20',
        CANCELLED: 'bg-slate-500/10 text-slate-300 border border-slate-500/20',
    };

    if (isAuthLoading) {
        return (
            <main className="min-h-screen p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </main>
        );
    }

    if (!isAuthenticated) {
        return (
            <main className="min-h-screen p-8 flex items-center justify-center">
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center max-w-lg">
                    <p className="text-white mb-4">Session expirée.</p>
                    <a href={`${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}/login`} className="text-blue-400 hover:text-blue-300">
                        Retour au login
                    </a>
                </div>
            </main>
        );
    }

    if (!isMerchant) {
        return (
            <main className="min-h-screen p-8 flex items-center justify-center">
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center max-w-xl text-slate-300">
                    Cette page de transactions est réservée aux marchands.
                </div>
            </main>
        );
    }

    return (
        <div className="min-h-screen p-6">
            <header className="mb-8">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Retour au terminal
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Journal des transactions</h1>
                        <p className="text-slate-400 mt-2">
                            Historique complet depuis la base de données
                        </p>
                    </div>
                    <button
                        onClick={fetchTransactions}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-white/10 text-white rounded-xl hover:bg-slate-700 transition disabled:opacity-60"
                    >
                        <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                        Actualiser
                    </button>
                </div>
            </header>

            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
                    {error}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <GlassCard className="p-4 border border-white/10 bg-slate-900/50">
                    <div className="flex items-center justify-between mb-1">
                        <Activity className="w-4 h-4 text-blue-400" />
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Total</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{stats.total}</div>
                </GlassCard>
                <GlassCard className="p-4 border border-emerald-500/20 bg-emerald-500/5">
                    <div className="flex items-center justify-between mb-1">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Acceptées</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-300">{stats.approved}</div>
                    <div className="text-xs text-slate-400">{stats.successRate.toFixed(0)}% succès</div>
                </GlassCard>
                <GlassCard className="p-4 border border-red-500/20 bg-red-500/5">
                    <div className="flex items-center justify-between mb-1">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Refusées</span>
                    </div>
                    <div className="text-2xl font-bold text-red-300">{stats.declined}</div>
                </GlassCard>
                <GlassCard className="p-4 border border-blue-500/20 bg-blue-500/5">
                    <div className="flex items-center justify-between mb-1">
                        <DollarSign className="w-4 h-4 text-blue-300" />
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Volume</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{formatAmount(stats.volume)}</div>
                </GlassCard>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Rechercher (PAN, marchand, code auth)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800/50 border border-white/10 text-white text-sm focus:outline-none"
                >
                    <option value="ALL">Tous statuts</option>
                    <option value="APPROVED">Approuvé</option>
                    <option value="DECLINED">Refusé</option>
                    <option value="PENDING">En attente</option>
                    <option value="REFUNDED">Remboursé</option>
                    <option value="CANCELLED">Annulé</option>
                </select>
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800/50 border border-white/10 text-white text-sm focus:outline-none"
                >
                    <option value="ALL">Tous types</option>
                    <option value="PURCHASE">Achat</option>
                    <option value="REFUND">Remboursement</option>
                    <option value="VOID">Annulation</option>
                    <option value="PRE_AUTH">Pré-auth</option>
                </select>
            </div>

            {/* Table */}
            <GlassCard className="overflow-hidden border border-white/10 bg-slate-900/50">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                        {filteredTransactions.length === transactions.length
                            ? `${stats.total} transactions`
                            : `${filteredTransactions.length} / ${stats.total} transactions`}
                    </h2>
                </div>

                {loading ? (
                    <div className="p-10 text-center">
                        <div className="h-8 w-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto" />
                    </div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">
                        {transactions.length === 0
                            ? 'Aucune transaction. Effectuez un paiement depuis le terminal.'
                            : 'Aucun résultat pour ces filtres.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Carte</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Marchand</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Montant</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Statut</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">RC</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredTransactions.map((tx) => {
                                    const createdAt = new Date(tx.timestamp);
                                    return (
                                        <tr key={tx.id} className="hover:bg-white/5 transition">
                                            <td className="px-4 py-3 text-sm font-mono text-slate-300">{tx.transaction_id?.slice(0, 8) || tx.stan || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-300">{tx.masked_pan || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-300">{tx.merchant_name || '-'}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-white">{formatAmount(Number(tx.amount))}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[tx.status] || 'bg-slate-500/20 text-slate-400'}`}>
                                                    {tx.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-mono text-slate-400">{tx.response_code || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-400">
                                                {!isNaN(createdAt.getTime()) ? createdAt.toLocaleString('fr-FR', {
                                                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                                }) : '-'}
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
