'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@shared/context/AuthContext';
import { UserRole } from '@shared/types/user';
import { ArrowDownLeft, ArrowUpRight, Calendar, CreditCard, Filter, RefreshCcw, Search } from 'lucide-react';
import { clientApi } from '@/lib/api-client';

type ClientTransaction = {
    id: string;
    transactionId: string;
    maskedPan: string;
    amount: number;
    currency: string;
    type: string;
    status: string;
    responseCode: string;
    authorizationCode: string;
    merchantName: string;
    merchantMcc: string;
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

const normalizeTransaction = (raw: unknown): ClientTransaction => {
    const transaction = asObject(raw);
    return {
        id: String(transaction.id || ''),
        transactionId: String(transaction.transaction_id || transaction.transactionId || ''),
        maskedPan: String(transaction.masked_pan || transaction.maskedPan || ''),
        amount: toNumber(transaction.amount),
        currency: String(transaction.currency || 'EUR'),
        type: String(transaction.type || 'PURCHASE'),
        status: String(transaction.status || 'PENDING'),
        responseCode: String(transaction.response_code || transaction.responseCode || ''),
        authorizationCode: String(transaction.authorization_code || transaction.authorizationCode || ''),
        merchantName: String(transaction.merchant_name || transaction.merchantName || '-'),
        merchantMcc: String(transaction.merchant_mcc || transaction.merchantMcc || ''),
        timestamp: String(transaction.timestamp || '')
    };
};

export default function TransactionsPage() {
    const router = useRouter();
    const { isLoading, isAuthenticated, user } = useAuth();
    const [transactions, setTransactions] = useState<ClientTransaction[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL');

    const isClient = user?.role === UserRole.CLIENT;

    const loadTransactions = async () => {
        setIsRefreshing(true);
        setError(null);
        try {
            const response = await clientApi.getTransactions('limit=200&page=1');
            setTransactions((response.transactions || []).map(normalizeTransaction));
        } catch (loadError: unknown) {
            setError(getErrorMessage(loadError, 'Impossible de charger les transactions'));
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated || !isClient) return;
        loadTransactions();
    }, [isAuthenticated, isClient]);

    const filteredTransactions = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return transactions.filter((tx) => {
            const matchesSearch =
                normalizedSearch.length === 0 ||
                tx.merchantName.toLowerCase().includes(normalizedSearch) ||
                tx.maskedPan.toLowerCase().includes(normalizedSearch) ||
                tx.transactionId.toLowerCase().includes(normalizedSearch);

            const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;
            const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;
            return matchesSearch && matchesStatus && matchesType;
        });
    }, [transactions, searchTerm, statusFilter, typeFilter]);

    const totalAmount = useMemo(
        () => filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0),
        [filteredTransactions]
    );

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
                <div className="max-w-lg w-full rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center text-slate-300">
                    Cette section est réservée aux clients.
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-8 pb-12">
            <div className="max-w-6xl mx-auto px-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">Historique des transactions</h1>
                        <p className="text-slate-400">Liste réelle des transactions liées à votre compte client.</p>
                    </div>
                    <button
                        onClick={loadTransactions}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-white hover:bg-slate-700 disabled:opacity-60"
                    >
                        <RefreshCcw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                        Actualiser
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-5">
                        <p className="text-sm text-slate-400">Transactions filtrées</p>
                        <p className="text-2xl font-bold text-white">{filteredTransactions.length}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-5">
                        <p className="text-sm text-slate-400">Montant total</p>
                        <p className="text-2xl font-bold text-white">{formatMoney(totalAmount, filteredTransactions[0]?.currency || 'EUR')}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-5">
                        <p className="text-sm text-slate-400">Approuvées</p>
                        <p className="text-2xl font-bold text-emerald-300">
                            {filteredTransactions.filter((tx) => tx.status === 'APPROVED').length}
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                        {error}
                    </div>
                )}

                <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="relative md:col-span-2">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Marchand, carte ou ID transaction"
                                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                            />
                        </div>
                        <label className="text-sm text-slate-300 flex items-center gap-2">
                            <Filter size={14} className="text-slate-500" />
                            <select
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none"
                            >
                                <option value="ALL">Tous statuts</option>
                                <option value="APPROVED">APPROVED</option>
                                <option value="DECLINED">DECLINED</option>
                                <option value="PENDING">PENDING</option>
                                <option value="REFUNDED">REFUNDED</option>
                                <option value="REVERSED">REVERSED</option>
                            </select>
                        </label>
                        <label className="text-sm text-slate-300">
                            <select
                                value={typeFilter}
                                onChange={(event) => setTypeFilter(event.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none"
                            >
                                <option value="ALL">Tous types</option>
                                <option value="PURCHASE">PURCHASE</option>
                                <option value="REFUND">REFUND</option>
                                <option value="PREAUTH">PREAUTH</option>
                                <option value="TRANSFER">TRANSFER</option>
                            </select>
                        </label>
                    </div>
                </div>

                <div className="space-y-3">
                    {filteredTransactions.map((tx) => (
                        <div key={tx.id} onClick={() => router.push(`/transactions/${tx.id}`)} className="rounded-2xl border border-white/10 bg-slate-800/50 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 cursor-pointer hover:bg-slate-800/70 hover:border-white/20 transition-all group">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-slate-900">
                                    {tx.type === 'REFUND' ? (
                                        <ArrowDownLeft size={16} className="text-emerald-400" />
                                    ) : (
                                        <ArrowUpRight size={16} className="text-slate-300" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-white font-medium">{tx.merchantName}</p>
                                    <p className="text-xs text-slate-400">ID: {tx.transactionId || tx.id} - MCC: {tx.merchantMcc || '-'}</p>
                                    <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                                        <span className="inline-flex items-center gap-1">
                                            <CreditCard size={12} />
                                            {tx.maskedPan || '-'}
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <Calendar size={12} />
                                            {tx.timestamp ? new Date(tx.timestamp).toLocaleString('fr-FR') : '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-white font-semibold">{formatMoney(tx.amount, tx.currency)}</p>
                                <p className="text-xs text-slate-400">{tx.type} - {tx.status}</p>
                                {tx.authorizationCode && (
                                    <p className="text-xs text-slate-500 font-mono">AUTH {tx.authorizationCode}</p>
                                )}
                            </div>
                        </div>
                    ))}

                    {filteredTransactions.length === 0 && (
                        <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-8 text-center text-slate-400">
                            Aucune transaction ne correspond aux filtres.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
