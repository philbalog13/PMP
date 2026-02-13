'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../auth/useAuth';
import {
    toRecord, toNumber, toText, formatMoney, formatDateTimeString, getCardBrand, getLastFour
} from '@shared/lib/formatting';
import StatusBadge from '@shared/components/StatusBadge';
import {
    AlertCircle,
    ArrowDownLeft,
    ArrowUpRight,
    CheckCircle2,
    ChevronRight,
    CreditCard,
    DollarSign,
    RefreshCw,
    Store,
    Tablet,
    TrendingDown,
    TrendingUp,
    Wallet,
    XCircle
} from 'lucide-react';

interface DashboardTransaction {
    id: string;
    transactionId: string;
    maskedPan: string;
    amount: number;
    currency: string;
    type: string;
    status: string;
    responseCode: string;
    timestamp: string;
    terminalId: string;
}

interface DashboardTerminal {
    id: string;
    terminalId: string;
    terminalName: string;
    status: string;
    locationName: string;
    lastTransactionAt: string | null;
}

interface DashboardAccount {
    accountNumber: string;
    currency: string;
    status: string;
    availableBalance: number;
    pendingBalance: number;
    reserveBalance: number;
    grossBalance: number;
    availableForPayout: number;
    feePercent: number;
    fixedFee: number;
    lastSettlementAt: string | null;
    lastPayoutAt: string | null;
}

interface DashboardToday {
    transactionCount: number;
    revenue: number;
    refunds: number;
    approvedCount: number;
    declinedCount: number;
    approvalRate: number;
}

interface DashboardData {
    today: DashboardToday;
    account: DashboardAccount | null;
    terminals: DashboardTerminal[];
    recentTransactions: DashboardTransaction[];
}

interface GenerationSummary {
    createdTransactions: number;
    approvedTransactions: number;
    declinedTransactions: number;
    refunds: number;
    voids: number;
    settlements: number;
    payouts: number;
    totalSales: number;
    totalRefunds: number;
    totalFees: number;
    netAfterFees: number;
}

const isDev = process.env.NODE_ENV === 'development';

const normalizeDashboard = (rawDashboard: unknown): DashboardData => {
    /* Uses shared toRecord / toNumber / toText */
    const dashboard = toRecord(rawDashboard);
    const today = toRecord(dashboard.today);
    const account = dashboard.account ? toRecord(dashboard.account) : null;
    const rawTransactions = Array.isArray(dashboard.recentTransactions) ? dashboard.recentTransactions : [];
    const rawTerminals = Array.isArray(dashboard.terminals) ? dashboard.terminals : [];

    return {
        today: {
            transactionCount: toNumber(today.transactionCount),
            revenue: toNumber(today.revenue),
            refunds: toNumber(today.refunds),
            approvedCount: toNumber(today.approvedCount),
            declinedCount: toNumber(today.declinedCount),
            approvalRate: toNumber(today.approvalRate)
        },
        account: account ? {
            accountNumber: toText(account.accountNumber),
            currency: toText(account.currency, 'EUR'),
            status: toText(account.status, 'ACTIVE'),
            availableBalance: toNumber(account.availableBalance),
            pendingBalance: toNumber(account.pendingBalance),
            reserveBalance: toNumber(account.reserveBalance),
            grossBalance: toNumber(account.grossBalance),
            availableForPayout: toNumber(account.availableForPayout),
            feePercent: toNumber(account.feePercent),
            fixedFee: toNumber(account.fixedFee),
            lastSettlementAt: account.lastSettlementAt ? toText(account.lastSettlementAt) : null,
            lastPayoutAt: account.lastPayoutAt ? toText(account.lastPayoutAt) : null
        } : null,
        terminals: rawTerminals.map((item) => {
            const terminal = toRecord(item);
            return {
                id: toText(terminal.id),
                terminalId: toText(terminal.terminal_id || terminal.terminalId),
                terminalName: toText(terminal.terminal_name || terminal.terminalName, 'Terminal'),
                status: toText(terminal.status, 'ACTIVE'),
                locationName: toText(terminal.location_name || terminal.locationName, '-'),
                lastTransactionAt: terminal.last_transaction_at
                    ? toText(terminal.last_transaction_at)
                    : (terminal.lastTransactionAt ? toText(terminal.lastTransactionAt) : null)
            };
        }),
        recentTransactions: rawTransactions.map((item) => {
            const tx = toRecord(item);
            return {
                id: toText(tx.id),
                transactionId: toText(tx.transaction_id || tx.transactionId),
                maskedPan: toText(tx.masked_pan || tx.maskedPan, '****'),
                amount: toNumber(tx.amount),
                currency: toText(tx.currency, 'EUR'),
                type: toText(tx.type, 'PURCHASE'),
                status: toText(tx.status, 'PENDING'),
                responseCode: toText(tx.response_code || tx.responseCode, ''),
                timestamp: toText(tx.timestamp),
                terminalId: toText(tx.terminal_id || tx.terminalId, '-')
            };
        })
    };
};

/* statusBadge, getCardBrand, getLastFour imported from @shared */

export default function MerchantDashboard() {
    const { user, isLoading } = useAuth(true);
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationSummary, setGenerationSummary] = useState<GenerationSummary | null>(null);

    const fetchDashboard = useCallback(async () => {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/merchant/dashboard', {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Impossible de charger le dashboard marchand');
        }

        const payload = await response.json();
        setDashboard(normalizeDashboard(payload.dashboard));
    }, []);

    const refreshDashboard = useCallback(async () => {
        try {
            setIsRefreshing(true);
            await fetchDashboard();
            setFetchError(null);
        } catch (error: any) {
            setFetchError(error.message || 'Erreur de chargement');
        } finally {
            setIsRefreshing(false);
        }
    }, [fetchDashboard]);

    useEffect(() => {
        if (isLoading) return;
        refreshDashboard();
    }, [isLoading, refreshDashboard]);

    const generateRealHistory = async () => {
        try {
            setIsGenerating(true);
            setFetchError(null);
            const token = localStorage.getItem('token');
            const response = await fetch('/api/merchant/account/generate-history', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    days: 14,
                    transactionsPerDay: 12,
                    includeRefunds: true,
                    includeVoids: true,
                    includeSettlements: true,
                    includePayouts: true
                })
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error || 'Échec de génération');
            }

            const summary = toRecord(payload.summary);
            setGenerationSummary({
                createdTransactions: toNumber(summary.createdTransactions),
                approvedTransactions: toNumber(summary.approvedTransactions),
                declinedTransactions: toNumber(summary.declinedTransactions),
                refunds: toNumber(summary.refunds),
                voids: toNumber(summary.voids),
                settlements: toNumber(summary.settlements),
                payouts: toNumber(summary.payouts),
                totalSales: toNumber(summary.totalSales),
                totalRefunds: toNumber(summary.totalRefunds),
                totalFees: toNumber(summary.totalFees),
                netAfterFees: toNumber(summary.netAfterFees)
            });

            await refreshDashboard();
        } catch (error: any) {
            setFetchError(error.message || 'Erreur pendant la génération');
        } finally {
            setIsGenerating(false);
        }
    };

    const stats = useMemo(() => {
        const today = dashboard?.today;
        if (!today) {
            return { avgTicket: 0, netToday: 0 };
        }

        const avgTicket = today.transactionCount > 0 ? (today.revenue / today.transactionCount) : 0;
        const netToday = today.revenue - today.refunds;
        return { avgTicket, netToday };
    }, [dashboard]);

    if (isLoading || !dashboard) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    const accountCurrency = dashboard.account?.currency || 'EUR';

    return (
        <div className="min-h-screen bg-slate-950 pt-24 pb-12">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Dashboard Marchand</h1>
                        <p className="text-slate-400">
                            Bienvenue, {user?.firstName || 'Marchand'}. Voici un résumé de votre activité du jour.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={refreshDashboard}
                            className={`flex items-center gap-2 px-4 py-2 bg-slate-800 border border-white/10 text-white rounded-xl hover:bg-slate-700 ${isRefreshing ? 'animate-pulse' : ''}`}
                        >
                            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                            Actualiser
                        </button>
                        {isDev && (
                            <button
                                onClick={generateRealHistory}
                                disabled={isGenerating}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-60"
                            >
                                <Store size={18} />
                                {isGenerating ? 'Génération...' : 'Générer historique réel'}
                            </button>
                        )}
                    </div>
                </div>

                {fetchError && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
                        {fetchError}
                    </div>
                )}

                {isDev && generationSummary && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm text-emerald-200">
                        Historique créé : {generationSummary.createdTransactions} transactions ({generationSummary.approvedTransactions} approuvées, {generationSummary.declinedTransactions} refusées), {generationSummary.refunds} remboursements, {generationSummary.voids} annulations.
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-purple-500/20 to-violet-500/10 border border-purple-500/30 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-500/20 rounded-xl"><DollarSign className="w-6 h-6 text-purple-400" /></div>
                            <span className="text-emerald-400 text-sm flex items-center gap-1"><TrendingUp size={14} /> Réel</span>
                        </div>
                        <p className="text-sm text-slate-400 mb-1">CA du jour</p>
                        <p className="text-2xl font-bold text-white">{formatMoney(dashboard.today.revenue, accountCurrency)}</p>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="p-3 bg-red-500/20 rounded-xl w-fit mb-4"><TrendingDown className="w-6 h-6 text-red-400" /></div>
                        <p className="text-sm text-slate-400 mb-1">Remboursements</p>
                        <p className="text-2xl font-bold text-white">{formatMoney(dashboard.today.refunds, accountCurrency)}</p>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="p-3 bg-blue-500/20 rounded-xl w-fit mb-4"><CreditCard className="w-6 h-6 text-blue-400" /></div>
                        <p className="text-sm text-slate-400 mb-1">Transactions</p>
                        <p className="text-2xl font-bold text-white">{dashboard.today.transactionCount}</p>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="p-3 bg-emerald-500/20 rounded-xl w-fit mb-4"><CheckCircle2 className="w-6 h-6 text-emerald-400" /></div>
                        <p className="text-sm text-slate-400 mb-1">Taux d&apos;approbation</p>
                        <p className="text-2xl font-bold text-white">{dashboard.today.approvalRate}%</p>
                    </div>
                </div>

                {dashboard.account && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-5">
                            <p className="text-sm text-slate-400 mb-1">Solde disponible</p>
                            <p className="text-xl font-bold text-emerald-400">{formatMoney(dashboard.account.availableBalance, dashboard.account.currency)}</p>
                        </div>
                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-5">
                            <p className="text-sm text-slate-400 mb-1">Solde en attente</p>
                            <p className="text-xl font-bold text-amber-400">{formatMoney(dashboard.account.pendingBalance, dashboard.account.currency)}</p>
                        </div>
                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-5">
                            <p className="text-sm text-slate-400 mb-1">Solde de réserve</p>
                            <p className="text-xl font-bold text-red-400">{formatMoney(dashboard.account.reserveBalance, dashboard.account.currency)}</p>
                        </div>
                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-5">
                            <p className="text-sm text-slate-400 mb-1">Net du jour / Panier moyen</p>
                            <p className="text-xl font-bold text-white">{formatMoney(stats.netToday, dashboard.account.currency)}</p>
                            <p className="text-xs text-slate-500 mt-1">Panier moyen: {formatMoney(stats.avgTicket, dashboard.account.currency)}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-white">Transactions réelles</h2>
                            <Link href="/merchant/transactions" className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1">
                                Voir tout <ChevronRight size={16} />
                            </Link>
                        </div>

                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl overflow-hidden">
                            {dashboard.recentTransactions.length === 0 && (
                                <div className="p-8 text-slate-400 text-sm text-center">
                                    Aucune transaction réelle. Clique sur &quot;Générer historique réel&quot;.
                                </div>
                            )}

                            {dashboard.recentTransactions.map((tx, index) => (
                                <div
                                    key={tx.id}
                                    className={`flex items-center justify-between p-4 hover:bg-white/5 transition-colors ${index !== 0 ? 'border-t border-white/5' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${tx.type === 'REFUND' ? 'bg-red-500/20' : 'bg-slate-700'}`}>
                                            {tx.type === 'REFUND'
                                                ? <ArrowDownLeft className="w-5 h-5 text-red-400" />
                                                : <ArrowUpRight className="w-5 h-5 text-emerald-400" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">
                                                {tx.type === 'REFUND' ? 'Remboursement' : tx.type === 'VOID' ? 'Annulation' : 'Vente'}
                                            </p>
                                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                                <span>{getCardBrand(tx.maskedPan)}</span>
                                                <span>•</span>
                                                <span className="font-mono">•••• {getLastFour(tx.maskedPan)}</span>
                                                <span>•</span>
                                                <span>{tx.terminalId}</span>
                                                <span>•</span>
                                                <span>{formatDateTimeString(tx.timestamp)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className={`font-semibold ${tx.type === 'REFUND' || tx.type === 'VOID' ? 'text-red-400' : 'text-white'}`}>
                                            {tx.type === 'REFUND' || tx.type === 'VOID' ? '-' : '+'}
                                            {formatMoney(tx.amount, tx.currency)}
                                        </p>
                                        <div className="flex items-center gap-2 justify-end mt-1">
                                            <StatusBadge status={tx.status} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-4">Actions rapides</h2>
                            <div className="space-y-3">
                                <Link href="/merchant/pos" className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-500/20 to-violet-500/10 border border-purple-500/30 rounded-xl hover:scale-[1.02] transition-transform">
                                    <div className="p-3 bg-purple-500/20 rounded-xl"><Tablet className="w-6 h-6 text-purple-400" /></div>
                                    <div><p className="font-medium text-white">Terminal POS</p><p className="text-sm text-slate-400">Créer des transactions réelles</p></div>
                                    <ChevronRight size={20} className="text-slate-400 ml-auto" />
                                </Link>

                                <Link href="/merchant/reports" className="flex items-center gap-4 p-4 bg-slate-800/50 border border-white/10 rounded-xl hover:scale-[1.02] transition-transform">
                                    <div className="p-3 bg-blue-500/20 rounded-xl"><Wallet className="w-6 h-6 text-blue-400" /></div>
                                    <div><p className="font-medium text-white">Rapports</p><p className="text-sm text-slate-400">CA, remboursements, réconciliation</p></div>
                                    <ChevronRight size={20} className="text-slate-400 ml-auto" />
                                </Link>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-semibold text-white mb-4">Alertes</h2>
                            <div className="space-y-3">
                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-white">En attente de règlement</p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Solde pending: {dashboard.account ? formatMoney(dashboard.account.pendingBalance, dashboard.account.currency) : '-'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <XCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-white">Transactions refusées</p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Aujourd&apos;hui: {dashboard.today.declinedCount}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-semibold text-white mb-4">Terminaux</h2>
                            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4 space-y-3">
                                {dashboard.terminals.length === 0 && (
                                    <p className="text-sm text-slate-500">Aucun terminal disponible.</p>
                                )}
                                {dashboard.terminals.map((terminal) => (
                                    <div key={terminal.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${terminal.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></div>
                                            <span className="text-white font-mono">{terminal.terminalId}</span>
                                        </div>
                                        <span className={`text-xs ${terminal.status === 'ACTIVE' ? 'text-emerald-400' : 'text-slate-400'}`}>
                                            {terminal.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {dashboard.account && (
                            <div className="p-4 bg-slate-800/50 border border-white/10 rounded-xl text-xs text-slate-400">
                                <p>Compte: <span className="text-white font-mono">{dashboard.account.accountNumber}</span></p>
                                <p className="mt-1">Dernier settlement: <span className="text-white">{formatDateTimeString(dashboard.account.lastSettlementAt)}</span></p>
                                <p className="mt-1">Dernier payout: <span className="text-white">{formatDateTimeString(dashboard.account.lastPayoutAt)}</span></p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
