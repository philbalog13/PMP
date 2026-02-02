'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../auth/useAuth';
import {
    Store,
    TrendingUp,
    TrendingDown,
    CreditCard,
    Receipt,
    AlertCircle,
    ChevronRight,
    ArrowUpRight,
    ArrowDownLeft,
    Clock,
    CheckCircle2,
    XCircle,
    Tablet,
    BarChart3,
    RefreshCw,
    DollarSign
} from 'lucide-react';
import Link from 'next/link';

interface Transaction {
    id: string;
    type: 'sale' | 'refund';
    amount: number;
    cardLastFour: string;
    cardType: 'visa' | 'mastercard';
    status: 'approved' | 'declined' | 'pending';
    timestamp: string;
    authCode: string;
    terminalId: string;
}

interface DailyStats {
    totalSales: number;
    totalRefunds: number;
    transactionCount: number;
    averageTicket: number;
    approvalRate: number;
}

const mockTransactions: Transaction[] = [
    { id: '1', type: 'sale', amount: 89.90, cardLastFour: '4532', cardType: 'visa', status: 'approved', timestamp: '2024-01-15 14:32:05', authCode: 'A123B4', terminalId: 'POS-001' },
    { id: '2', type: 'sale', amount: 45.50, cardLastFour: '8921', cardType: 'mastercard', status: 'approved', timestamp: '2024-01-15 14:28:12', authCode: 'B456C7', terminalId: 'POS-001' },
    { id: '3', type: 'sale', amount: 156.00, cardLastFour: '3456', cardType: 'visa', status: 'declined', timestamp: '2024-01-15 14:15:45', authCode: '', terminalId: 'POS-002' },
    { id: '4', type: 'refund', amount: 25.00, cardLastFour: '4532', cardType: 'visa', status: 'approved', timestamp: '2024-01-15 13:50:30', authCode: 'C789D0', terminalId: 'POS-001' },
    { id: '5', type: 'sale', amount: 234.99, cardLastFour: '7654', cardType: 'mastercard', status: 'approved', timestamp: '2024-01-15 13:45:18', authCode: 'D012E3', terminalId: 'POS-002' },
    { id: '6', type: 'sale', amount: 12.50, cardLastFour: '9876', cardType: 'visa', status: 'approved', timestamp: '2024-01-15 13:30:00', authCode: 'E345F6', terminalId: 'POS-001' },
    { id: '7', type: 'sale', amount: 78.00, cardLastFour: '5432', cardType: 'mastercard', status: 'pending', timestamp: '2024-01-15 13:28:45', authCode: '', terminalId: 'POS-002' },
];

const mockDailyStats: DailyStats = {
    totalSales: 2456.89,
    totalRefunds: 125.00,
    transactionCount: 47,
    averageTicket: 52.27,
    approvalRate: 94.5
};

export default function MerchantDashboard() {
    const { user, isLoading } = useAuth(true);
    const [transactions] = useState<Transaction[]>(mockTransactions);
    const [stats] = useState<DailyStats>(mockDailyStats);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return (
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                        <CheckCircle2 size={12} /> Approuvée
                    </span>
                );
            case 'pending':
                return (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full flex items-center gap-1">
                        <Clock size={12} /> En attente
                    </span>
                );
            case 'declined':
                return (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center gap-1">
                        <XCircle size={12} /> Refusée
                    </span>
                );
            default:
                return null;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pt-24 pb-12">
            <div className="max-w-7xl mx-auto px-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                            Dashboard Marchand
                        </h1>
                        <p className="text-slate-400">
                            Bienvenue, {user?.firstName || 'Marchand'}. Gérez vos transactions et terminaux.
                        </p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className={`flex items-center gap-2 px-4 py-2 bg-slate-800 border border-white/10 text-white rounded-xl hover:bg-slate-700 transition-colors ${isRefreshing ? 'animate-pulse' : ''}`}
                    >
                        <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                        Actualiser
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                    {/* Total Sales */}
                    <div className="bg-gradient-to-br from-purple-500/20 to-violet-500/10 border border-purple-500/30 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-500/20 rounded-xl">
                                <DollarSign className="w-6 h-6 text-purple-400" />
                            </div>
                            <span className="text-emerald-400 text-sm flex items-center gap-1">
                                <TrendingUp size={14} /> +12%
                            </span>
                        </div>
                        <p className="text-sm text-slate-400 mb-1">CA du jour</p>
                        <p className="text-2xl font-bold text-white">
                            {stats.totalSales.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                        </p>
                    </div>

                    {/* Refunds */}
                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="p-3 bg-red-500/20 rounded-xl w-fit mb-4">
                            <TrendingDown className="w-6 h-6 text-red-400" />
                        </div>
                        <p className="text-sm text-slate-400 mb-1">Remboursements</p>
                        <p className="text-2xl font-bold text-white">
                            {stats.totalRefunds.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                        </p>
                    </div>

                    {/* Transaction Count */}
                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="p-3 bg-blue-500/20 rounded-xl w-fit mb-4">
                            <Receipt className="w-6 h-6 text-blue-400" />
                        </div>
                        <p className="text-sm text-slate-400 mb-1">Transactions</p>
                        <p className="text-2xl font-bold text-white">{stats.transactionCount}</p>
                    </div>

                    {/* Average Ticket */}
                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="p-3 bg-amber-500/20 rounded-xl w-fit mb-4">
                            <BarChart3 className="w-6 h-6 text-amber-400" />
                        </div>
                        <p className="text-sm text-slate-400 mb-1">Panier moyen</p>
                        <p className="text-2xl font-bold text-white">
                            {stats.averageTicket.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                        </p>
                    </div>

                    {/* Approval Rate */}
                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="p-3 bg-emerald-500/20 rounded-xl w-fit mb-4">
                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        </div>
                        <p className="text-sm text-slate-400 mb-1">Taux d'approbation</p>
                        <p className="text-2xl font-bold text-white">{stats.approvalRate}%</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Transactions */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-white">Transactions en temps réel</h2>
                            <Link
                                href="/merchant/transactions"
                                className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                            >
                                Voir tout <ChevronRight size={16} />
                            </Link>
                        </div>

                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl overflow-hidden">
                            {transactions.slice(0, 6).map((tx, index) => (
                                <Link
                                    key={tx.id}
                                    href={`/merchant/transactions/${tx.id}`}
                                    className={`flex items-center justify-between p-4 hover:bg-white/5 transition-colors ${
                                        index !== 0 ? 'border-t border-white/5' : ''
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${
                                            tx.type === 'refund' ? 'bg-red-500/20' : 'bg-slate-700'
                                        }`}>
                                            {tx.type === 'refund' ? (
                                                <ArrowDownLeft className="w-5 h-5 text-red-400" />
                                            ) : (
                                                <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-white">
                                                    {tx.type === 'sale' ? 'Vente' : 'Remboursement'}
                                                </p>
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                                    tx.cardType === 'visa' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'
                                                }`}>
                                                    {tx.cardType.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                                <CreditCard size={12} />
                                                <span className="font-mono">•••• {tx.cardLastFour}</span>
                                                <span>•</span>
                                                <span>{tx.terminalId}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className={`font-semibold ${
                                            tx.type === 'refund' ? 'text-red-400' : 'text-white'
                                        }`}>
                                            {tx.type === 'refund' ? '-' : '+'}
                                            {tx.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                                        </p>
                                        <div className="flex items-center gap-2 justify-end mt-1">
                                            {getStatusBadge(tx.status)}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions & Alerts */}
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-4">Actions rapides</h2>
                            <div className="space-y-3">
                                <Link
                                    href="/merchant/pos"
                                    className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-500/20 to-violet-500/10 border border-purple-500/30 rounded-xl hover:scale-[1.02] transition-transform"
                                >
                                    <div className="p-3 bg-purple-500/20 rounded-xl">
                                        <Tablet className="w-6 h-6 text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">Terminal POS</p>
                                        <p className="text-sm text-slate-400">Encaisser un paiement</p>
                                    </div>
                                    <ChevronRight size={20} className="text-slate-400 ml-auto" />
                                </Link>

                                <Link
                                    href="/merchant/reports"
                                    className="flex items-center gap-4 p-4 bg-slate-800/50 border border-white/10 rounded-xl hover:scale-[1.02] transition-transform"
                                >
                                    <div className="p-3 bg-blue-500/20 rounded-xl">
                                        <BarChart3 className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">Rapports</p>
                                        <p className="text-sm text-slate-400">Statistiques & export</p>
                                    </div>
                                    <ChevronRight size={20} className="text-slate-400 ml-auto" />
                                </Link>

                                <Link
                                    href="/merchant/api"
                                    className="flex items-center gap-4 p-4 bg-slate-800/50 border border-white/10 rounded-xl hover:scale-[1.02] transition-transform"
                                >
                                    <div className="p-3 bg-emerald-500/20 rounded-xl">
                                        <Store className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">Intégration API</p>
                                        <p className="text-sm text-slate-400">Clés & webhooks</p>
                                    </div>
                                    <ChevronRight size={20} className="text-slate-400 ml-auto" />
                                </Link>
                            </div>
                        </div>

                        {/* Alerts */}
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-4">Alertes</h2>
                            <div className="space-y-3">
                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-white">Transaction en attente</p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                1 transaction nécessite une vérification manuelle
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <XCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-white">Transaction refusée</p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Carte ****3456 - Fonds insuffisants
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Terminal Status */}
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-4">Terminaux</h2>
                            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-white font-mono">POS-001</span>
                                    </div>
                                    <span className="text-xs text-emerald-400">En ligne</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-white font-mono">POS-002</span>
                                    </div>
                                    <span className="text-xs text-emerald-400">En ligne</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
