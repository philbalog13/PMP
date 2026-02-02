'use client';

import { useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Download,
    Calendar,
    FileText,
    Clock,
    CreditCard,
    CheckCircle2,
    XCircle,
    RefreshCw,
    PieChart
} from 'lucide-react';

interface DailyReport {
    date: string;
    totalSales: number;
    totalRefunds: number;
    transactionCount: number;
    approvedCount: number;
    declinedCount: number;
    averageTicket: number;
}

interface CardBreakdown {
    type: string;
    count: number;
    amount: number;
    percentage: number;
}

const mockDailyReports: DailyReport[] = [
    { date: '2024-01-15', totalSales: 2456.89, totalRefunds: 125.00, transactionCount: 47, approvedCount: 44, declinedCount: 3, averageTicket: 52.27 },
    { date: '2024-01-14', totalSales: 1890.45, totalRefunds: 0, transactionCount: 38, approvedCount: 36, declinedCount: 2, averageTicket: 49.75 },
    { date: '2024-01-13', totalSales: 3210.00, totalRefunds: 89.90, transactionCount: 62, approvedCount: 59, declinedCount: 3, averageTicket: 51.77 },
    { date: '2024-01-12', totalSales: 1567.30, totalRefunds: 45.00, transactionCount: 31, approvedCount: 29, declinedCount: 2, averageTicket: 50.56 },
    { date: '2024-01-11', totalSales: 2890.15, totalRefunds: 156.00, transactionCount: 55, approvedCount: 52, declinedCount: 3, averageTicket: 52.55 },
    { date: '2024-01-10', totalSales: 1234.50, totalRefunds: 0, transactionCount: 25, approvedCount: 24, declinedCount: 1, averageTicket: 49.38 },
    { date: '2024-01-09', totalSales: 2678.90, totalRefunds: 78.00, transactionCount: 51, approvedCount: 48, declinedCount: 3, averageTicket: 52.53 },
];

const mockCardBreakdown: CardBreakdown[] = [
    { type: 'VISA', count: 156, amount: 8234.50, percentage: 58 },
    { type: 'Mastercard', count: 98, amount: 5123.40, percentage: 36 },
    { type: 'Amex', count: 15, amount: 890.20, percentage: 6 },
];

export default function MerchantReportsPage() {
    const { isLoading } = useAuth(true);
    const [dateRange, setDateRange] = useState('week');
    const [reportType, setReportType] = useState<'daily' | 'card' | 'reconciliation'>('daily');

    // Calculate totals
    const totalSales = mockDailyReports.reduce((acc, r) => acc + r.totalSales, 0);
    const totalRefunds = mockDailyReports.reduce((acc, r) => acc + r.totalRefunds, 0);
    const totalTransactions = mockDailyReports.reduce((acc, r) => acc + r.transactionCount, 0);
    const approvalRate = (mockDailyReports.reduce((acc, r) => acc + r.approvedCount, 0) / totalTransactions * 100).toFixed(1);

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
                        <h1 className="text-3xl font-bold text-white mb-2">Rapports & Statistiques</h1>
                        <p className="text-slate-400">
                            Analysez vos performances et générez des rapports
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        >
                            <option value="today">Aujourd'hui</option>
                            <option value="week">7 derniers jours</option>
                            <option value="month">30 derniers jours</option>
                            <option value="quarter">3 mois</option>
                        </select>
                        <button className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors">
                            <Download size={18} />
                            Exporter
                        </button>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-purple-500/20 to-violet-500/10 border border-purple-500/30 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-500/20 rounded-xl">
                                <TrendingUp className="w-6 h-6 text-purple-400" />
                            </div>
                            <span className="text-emerald-400 text-sm flex items-center gap-1">
                                <TrendingUp size={14} /> +8.5%
                            </span>
                        </div>
                        <p className="text-sm text-slate-400 mb-1">Chiffre d'affaires</p>
                        <p className="text-2xl font-bold text-white">
                            {totalSales.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                        </p>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="p-3 bg-red-500/20 rounded-xl w-fit mb-4">
                            <TrendingDown className="w-6 h-6 text-red-400" />
                        </div>
                        <p className="text-sm text-slate-400 mb-1">Remboursements</p>
                        <p className="text-2xl font-bold text-white">
                            {totalRefunds.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                        </p>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="p-3 bg-blue-500/20 rounded-xl w-fit mb-4">
                            <CreditCard className="w-6 h-6 text-blue-400" />
                        </div>
                        <p className="text-sm text-slate-400 mb-1">Transactions</p>
                        <p className="text-2xl font-bold text-white">{totalTransactions}</p>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="p-3 bg-emerald-500/20 rounded-xl w-fit mb-4">
                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        </div>
                        <p className="text-sm text-slate-400 mb-1">Taux d'approbation</p>
                        <p className="text-2xl font-bold text-white">{approvalRate}%</p>
                    </div>
                </div>

                {/* Report Type Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setReportType('daily')}
                        className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                            reportType === 'daily'
                                ? 'bg-purple-500 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                    >
                        Rapport journalier
                    </button>
                    <button
                        onClick={() => setReportType('card')}
                        className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                            reportType === 'card'
                                ? 'bg-purple-500 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                    >
                        Par réseau carte
                    </button>
                    <button
                        onClick={() => setReportType('reconciliation')}
                        className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                            reportType === 'reconciliation'
                                ? 'bg-purple-500 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                    >
                        Réconciliation
                    </button>
                </div>

                {/* Daily Report */}
                {reportType === 'daily' && (
                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-white/10">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Calendar size={20} className="text-purple-400" />
                                Rapport journalier
                            </h2>
                        </div>

                        {/* Table Header */}
                        <div className="hidden md:grid grid-cols-7 gap-4 p-4 border-b border-white/10 text-sm text-slate-400 font-medium">
                            <div>Date</div>
                            <div className="text-right">Ventes</div>
                            <div className="text-right">Remboursements</div>
                            <div className="text-right">Net</div>
                            <div className="text-center">Transactions</div>
                            <div className="text-center">Approuvées</div>
                            <div className="text-right">Panier moyen</div>
                        </div>

                        {/* Table Body */}
                        {mockDailyReports.map((report, index) => (
                            <div
                                key={report.date}
                                className={`grid grid-cols-1 md:grid-cols-7 gap-4 p-4 items-center ${
                                    index !== 0 ? 'border-t border-white/5' : ''
                                }`}
                            >
                                <div className="font-medium text-white">{report.date}</div>
                                <div className="text-right text-emerald-400 font-medium">
                                    +{report.totalSales.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                                </div>
                                <div className="text-right text-red-400">
                                    -{report.totalRefunds.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                                </div>
                                <div className="text-right text-white font-bold">
                                    {(report.totalSales - report.totalRefunds).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                                </div>
                                <div className="text-center text-slate-300">{report.transactionCount}</div>
                                <div className="text-center">
                                    <span className="text-emerald-400">{report.approvedCount}</span>
                                    <span className="text-slate-500"> / </span>
                                    <span className="text-red-400">{report.declinedCount}</span>
                                </div>
                                <div className="text-right text-slate-300">
                                    {report.averageTicket.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                                </div>
                            </div>
                        ))}

                        {/* Total Row */}
                        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 p-4 bg-slate-900/50 border-t border-white/10 items-center font-semibold">
                            <div className="text-white">TOTAL</div>
                            <div className="text-right text-emerald-400">
                                +{totalSales.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                            </div>
                            <div className="text-right text-red-400">
                                -{totalRefunds.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                            </div>
                            <div className="text-right text-white">
                                {(totalSales - totalRefunds).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                            </div>
                            <div className="text-center text-white">{totalTransactions}</div>
                            <div className="text-center text-emerald-400">{approvalRate}%</div>
                            <div className="text-right text-white">
                                {(totalSales / totalTransactions).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                            </div>
                        </div>
                    </div>
                )}

                {/* Card Network Report */}
                {reportType === 'card' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
                                <PieChart size={20} className="text-purple-400" />
                                Répartition par réseau
                            </h2>

                            <div className="space-y-4">
                                {mockCardBreakdown.map((card) => (
                                    <div key={card.type}>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-white font-medium">{card.type}</span>
                                            <span className="text-slate-400">{card.percentage}%</span>
                                        </div>
                                        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${
                                                    card.type === 'VISA' ? 'bg-blue-500' :
                                                    card.type === 'Mastercard' ? 'bg-orange-500' : 'bg-slate-400'
                                                }`}
                                                style={{ width: `${card.percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
                                <CreditCard size={20} className="text-purple-400" />
                                Détail par réseau
                            </h2>

                            <div className="space-y-4">
                                {mockCardBreakdown.map((card) => (
                                    <div key={card.type} className="p-4 bg-slate-900/50 rounded-xl">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                                                card.type === 'VISA' ? 'bg-blue-500/20 text-blue-400' :
                                                card.type === 'Mastercard' ? 'bg-orange-500/20 text-orange-400' :
                                                'bg-slate-500/20 text-slate-400'
                                            }`}>
                                                {card.type}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-slate-400">Transactions</p>
                                                <p className="text-white font-bold text-lg">{card.count}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400">Montant</p>
                                                <p className="text-white font-bold text-lg">
                                                    {card.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Reconciliation Report */}
                {reportType === 'reconciliation' && (
                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <FileText size={20} className="text-purple-400" />
                                Réconciliation bancaire
                            </h2>
                            <button className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors">
                                <RefreshCw size={16} />
                                Synchroniser
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="p-4 bg-slate-900/50 rounded-xl">
                                <p className="text-sm text-slate-400 mb-2">Transactions TPE</p>
                                <p className="text-2xl font-bold text-white">{totalTransactions}</p>
                                <p className="text-sm text-slate-400 mt-1">
                                    {totalSales.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                                </p>
                            </div>
                            <div className="p-4 bg-slate-900/50 rounded-xl">
                                <p className="text-sm text-slate-400 mb-2">Transactions banque</p>
                                <p className="text-2xl font-bold text-white">{totalTransactions}</p>
                                <p className="text-sm text-slate-400 mt-1">
                                    {totalSales.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                                </p>
                            </div>
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                                <p className="text-sm text-slate-400 mb-2">Écart</p>
                                <p className="text-2xl font-bold text-emerald-400">0,00 EUR</p>
                                <p className="text-sm text-emerald-400 mt-1 flex items-center gap-1">
                                    <CheckCircle2 size={14} /> Réconcilié
                                </p>
                            </div>
                        </div>

                        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                            <div className="flex items-start gap-3">
                                <Clock size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-white">Prochaine réconciliation</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        La prochaine réconciliation automatique est prévue le 16/01/2024 à 00:00.
                                        Les fonds seront virés sur votre compte bancaire sous 2-3 jours ouvrés.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
