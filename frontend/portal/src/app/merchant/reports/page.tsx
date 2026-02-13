'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import {
    BarChart3,
    CheckCircle2,
    ChevronRight,
    CreditCard,
    Download,
    FileText,
    PieChart,
    RefreshCw,
    TrendingDown,
    TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { toRecord, toNumber, toText, formatMoney, getCardBrand } from '@shared/lib/formatting';

const isDev = process.env.NODE_ENV === 'development';

interface MerchantTransaction {
    id: string;
    amount: number;
    type: string;
    status: string;
    maskedPan: string;
    timestamp: string;
}

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

interface ReconciliationData {
    totalTransactions: number;
    totalDebits: number;
    totalCredits: number;
    netAmount: number;
    status: string;
}

const dateToIso = (value: Date) => value.toISOString().split('T')[0];

const normalizeTransactions = (raw: unknown): MerchantTransaction[] => {
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
        const row = toRecord(item);
        return {
            id: toText(row.id),
            amount: toNumber(row.amount),
            type: toText(row.type, 'PURCHASE'),
            status: toText(row.status, 'PENDING'),
            maskedPan: toText(row.masked_pan || row.maskedPan, ''),
            timestamp: toText(row.timestamp)
        };
    });
};

const mapRangeToDays = (range: string): number => {
    switch (range) {
        case 'today': return 1;
        case 'week': return 7;
        case 'month': return 30;
        case 'quarter': return 90;
        default: return 7;
    }
};

export default function MerchantReportsPage() {
    const { isLoading } = useAuth(true);
    const [dateRange, setDateRange] = useState('week');
    const [reportType, setReportType] = useState<'daily' | 'card' | 'reconciliation'>('daily');
    const [transactions, setTransactions] = useState<MerchantTransaction[]>([]);
    const [reconciliation, setReconciliation] = useState<ReconciliationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const fetchReportsData = useCallback(async () => {
        const days = mapRangeToDays(dateRange);
        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setDate(toDate.getDate() - (days - 1));

        const fromDateIso = dateToIso(fromDate);
        const toDateIso = dateToIso(toDate);
        const token = localStorage.getItem('token');

        const [transactionsResponse, reconciliationResponse] = await Promise.all([
            fetch(`/api/merchant/transactions?limit=1000&fromDate=${fromDateIso}&toDate=${toDateIso}T23:59:59`, {
                headers: { Authorization: `Bearer ${token}` }
            }),
            fetch(`/api/merchant/reports/reconciliation?fromDate=${fromDateIso}&toDate=${toDateIso}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
        ]);

        if (!transactionsResponse.ok) {
            throw new Error('Impossible de récupérer les transactions de reporting');
        }

        const transactionsPayload = await transactionsResponse.json();
        setTransactions(normalizeTransactions(transactionsPayload.transactions));

        if (reconciliationResponse.ok) {
            const payload = await reconciliationResponse.json();
            const recon = toRecord(payload.reconciliation);
            setReconciliation({
                totalTransactions: toNumber(recon.totalTransactions),
                totalDebits: toNumber(recon.totalDebits),
                totalCredits: toNumber(recon.totalCredits),
                netAmount: toNumber(recon.netAmount),
                status: toText(recon.status, 'UNKNOWN')
            });
        } else {
            setReconciliation(null);
        }
    }, [dateRange]);

    const refreshData = useCallback(async () => {
        try {
            setRefreshing(true);
            await fetchReportsData();
            setError(null);
        } catch (fetchError: any) {
            setError(fetchError.message || 'Erreur chargement rapports');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [fetchReportsData]);

    useEffect(() => {
        if (isLoading) return;
        refreshData();
    }, [isLoading, refreshData]);

    const generateHistory = async () => {
        try {
            setIsGenerating(true);
            setError(null);
            const token = localStorage.getItem('token');
            const response = await fetch('/api/merchant/account/generate-history', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    days: mapRangeToDays(dateRange),
                    transactionsPerDay: 10,
                    includeRefunds: true,
                    includeVoids: true,
                    includeSettlements: true,
                    includePayouts: true
                })
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error || 'Échec génération historique');
            }

            await refreshData();
        } catch (generationError: any) {
            setError(generationError.message || 'Erreur génération historique');
        } finally {
            setIsGenerating(false);
        }
    };

    const dailyReports = useMemo<DailyReport[]>(() => {
        const map = new Map<string, DailyReport>();

        for (const tx of transactions) {
            const date = tx.timestamp ? tx.timestamp.split('T')[0] : 'N/A';
            if (!map.has(date)) {
                map.set(date, {
                    date,
                    totalSales: 0,
                    totalRefunds: 0,
                    transactionCount: 0,
                    approvedCount: 0,
                    declinedCount: 0,
                    averageTicket: 0
                });
            }

            const row = map.get(date)!;
            row.transactionCount += 1;
            if (tx.status === 'APPROVED') row.approvedCount += 1;
            if (tx.status === 'DECLINED') row.declinedCount += 1;

            if (tx.type === 'PURCHASE' && tx.status === 'APPROVED') {
                row.totalSales += tx.amount;
            }
            if (tx.type === 'REFUND' && tx.status === 'APPROVED') {
                row.totalRefunds += tx.amount;
            }
        }

        return Array.from(map.values())
            .sort((a, b) => a.date < b.date ? 1 : -1)
            .map((row) => ({
                ...row,
                averageTicket: row.approvedCount > 0 ? row.totalSales / row.approvedCount : 0
            }));
    }, [transactions]);

    const cardBreakdown = useMemo<CardBreakdown[]>(() => {
        const map = new Map<string, { count: number; amount: number }>();
        for (const tx of transactions) {
            if (tx.status !== 'APPROVED' || tx.type !== 'PURCHASE') continue;
            const brand = getCardBrand(tx.maskedPan);
            const current = map.get(brand) || { count: 0, amount: 0 };
            current.count += 1;
            current.amount += tx.amount;
            map.set(brand, current);
        }

        const totalAmount = Array.from(map.values()).reduce((sum, item) => sum + item.amount, 0);
        return Array.from(map.entries()).map(([type, values]) => ({
            type,
            count: values.count,
            amount: values.amount,
            percentage: totalAmount > 0 ? Math.round((values.amount / totalAmount) * 100) : 0
        }));
    }, [transactions]);

    const totals = useMemo(() => {
        const totalSales = dailyReports.reduce((sum, row) => sum + row.totalSales, 0);
        const totalRefunds = dailyReports.reduce((sum, row) => sum + row.totalRefunds, 0);
        const totalTransactions = dailyReports.reduce((sum, row) => sum + row.transactionCount, 0);
        const totalApproved = dailyReports.reduce((sum, row) => sum + row.approvedCount, 0);
        const approvalRate = totalTransactions > 0 ? (totalApproved / totalTransactions) * 100 : 0;
        return { totalSales, totalRefunds, totalTransactions, approvalRate };
    }, [dailyReports]);

    const exportJson = () => {
        const payload = {
            generatedAt: new Date().toISOString(),
            dateRange,
            totals,
            dailyReports,
            cardBreakdown,
            reconciliation
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `merchant-report-${dateRange}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (isLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pt-24 pb-12">
            <div className="max-w-7xl mx-auto px-6">
                {/* Breadcrumb */}
                <div className="text-xs text-slate-500 mb-6">
                    <Link href="/merchant" className="hover:text-purple-400">Dashboard Marchand</Link>
                    <ChevronRight size={12} className="inline mx-1" />
                    <span className="text-purple-400">Rapports</span>
                </div>

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Rapports & Statistiques</h1>
                        <p className="text-slate-400">Reporting calculé sur les transactions réelles.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={dateRange}
                            onChange={(event) => setDateRange(event.target.value)}
                            className="px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-white"
                        >
                            <option value="today">Aujourd&apos;hui</option>
                            <option value="week">7 derniers jours</option>
                            <option value="month">30 derniers jours</option>
                            <option value="quarter">3 mois</option>
                        </select>
                        <button onClick={refreshData} className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-white/10 text-white rounded-xl hover:bg-slate-700">
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                            Actualiser
                        </button>
                        {isDev && (
                            <button onClick={generateHistory} disabled={isGenerating} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-60">
                                <BarChart3 size={16} />
                                {isGenerating ? 'Génération...' : 'Générer historique'}
                            </button>
                        )}
                        <button onClick={exportJson} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600">
                            <Download size={16} />
                            Export JSON
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-purple-500/20 to-violet-500/10 border border-purple-500/30 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-500/20 rounded-xl"><TrendingUp className="w-6 h-6 text-purple-400" /></div>
                        </div>
                        <p className="text-sm text-slate-400 mb-1">Chiffre d&apos;affaires</p>
                        <p className="text-2xl font-bold text-white">{formatMoney(totals.totalSales)}</p>
                    </div>
                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="p-3 bg-red-500/20 rounded-xl w-fit mb-4"><TrendingDown className="w-6 h-6 text-red-400" /></div>
                        <p className="text-sm text-slate-400 mb-1">Remboursements</p>
                        <p className="text-2xl font-bold text-white">{formatMoney(totals.totalRefunds)}</p>
                    </div>
                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="p-3 bg-blue-500/20 rounded-xl w-fit mb-4"><CreditCard className="w-6 h-6 text-blue-400" /></div>
                        <p className="text-sm text-slate-400 mb-1">Transactions</p>
                        <p className="text-2xl font-bold text-white">{totals.totalTransactions}</p>
                    </div>
                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="p-3 bg-emerald-500/20 rounded-xl w-fit mb-4"><CheckCircle2 className="w-6 h-6 text-emerald-400" /></div>
                        <p className="text-sm text-slate-400 mb-1">Taux d&apos;approbation</p>
                        <p className="text-2xl font-bold text-white">{totals.approvalRate.toFixed(1)}%</p>
                    </div>
                </div>

                <div className="flex gap-2 mb-6">
                    <button onClick={() => setReportType('daily')} className={`px-4 py-2 rounded-xl font-medium ${reportType === 'daily' ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
                        Rapport journalier
                    </button>
                    <button onClick={() => setReportType('card')} className={`px-4 py-2 rounded-xl font-medium ${reportType === 'card' ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
                        Par réseau carte
                    </button>
                    <button onClick={() => setReportType('reconciliation')} className={`px-4 py-2 rounded-xl font-medium ${reportType === 'reconciliation' ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
                        Réconciliation
                    </button>
                </div>

                {reportType === 'daily' && (
                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-white/10"><h2 className="text-lg font-semibold text-white">Rapport journalier réel</h2></div>
                        <div className="hidden md:grid grid-cols-7 gap-4 p-4 border-b border-white/10 text-sm text-slate-400 font-medium">
                            <div>Date</div><div className="text-right">Ventes</div><div className="text-right">Remboursements</div><div className="text-right">Net</div><div className="text-center">Transactions</div><div className="text-center">Approuvées</div><div className="text-right">Panier moyen</div>
                        </div>
                        {dailyReports.map((report, index) => (
                            <div key={report.date} className={`grid grid-cols-1 md:grid-cols-7 gap-4 p-4 items-center ${index !== 0 ? 'border-t border-white/5' : ''}`}>
                                <div className="font-medium text-white">{report.date}</div>
                                <div className="text-right text-emerald-400 font-medium">+{formatMoney(report.totalSales)}</div>
                                <div className="text-right text-red-400">-{formatMoney(report.totalRefunds)}</div>
                                <div className="text-right text-white font-bold">{formatMoney(report.totalSales - report.totalRefunds)}</div>
                                <div className="text-center text-slate-300">{report.transactionCount}</div>
                                <div className="text-center"><span className="text-emerald-400">{report.approvedCount}</span><span className="text-slate-500"> / </span><span className="text-red-400">{report.declinedCount}</span></div>
                                <div className="text-right text-slate-300">{formatMoney(report.averageTicket)}</div>
                            </div>
                        ))}
                    </div>
                )}

                {reportType === 'card' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-6"><PieChart size={20} className="text-purple-400" /> Répartition par réseau</h2>
                            <div className="space-y-4">
                                {cardBreakdown.map((card) => (
                                    <div key={card.type}>
                                        <div className="flex justify-between text-sm mb-2"><span className="text-white font-medium">{card.type}</span><span className="text-slate-400">{card.percentage}%</span></div>
                                        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full bg-purple-500" style={{ width: `${card.percentage}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                                {cardBreakdown.length === 0 && <p className="text-slate-500 text-sm">Aucune donnée carte.</p>}
                            </div>
                        </div>

                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-6"><CreditCard size={20} className="text-purple-400" /> Détail par réseau</h2>
                            <div className="space-y-4">
                                {cardBreakdown.map((card) => (
                                    <div key={card.type} className="p-4 bg-slate-900/50 rounded-xl">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div><p className="text-slate-400">Réseau</p><p className="text-white font-bold">{card.type}</p></div>
                                            <div><p className="text-slate-400">Transactions</p><p className="text-white font-bold">{card.count}</p></div>
                                            <div><p className="text-slate-400">Montant</p><p className="text-white font-bold">{formatMoney(card.amount)}</p></div>
                                            <div><p className="text-slate-400">Part</p><p className="text-white font-bold">{card.percentage}%</p></div>
                                        </div>
                                    </div>
                                ))}
                                {cardBreakdown.length === 0 && <p className="text-slate-500 text-sm">Aucune donnée carte.</p>}
                            </div>
                        </div>
                    </div>
                )}

                {reportType === 'reconciliation' && (
                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2"><FileText size={20} className="text-purple-400" /> Réconciliation bancaire</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="p-4 bg-slate-900/50 rounded-xl">
                                <p className="text-sm text-slate-400 mb-2">Total transactions</p>
                                <p className="text-2xl font-bold text-white">{reconciliation?.totalTransactions ?? totals.totalTransactions}</p>
                            </div>
                            <div className="p-4 bg-slate-900/50 rounded-xl">
                                <p className="text-sm text-slate-400 mb-2">Total débits</p>
                                <p className="text-2xl font-bold text-white">{formatMoney(reconciliation?.totalDebits ?? totals.totalSales)}</p>
                            </div>
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                                <p className="text-sm text-slate-400 mb-2">Écart / Net</p>
                                <p className="text-2xl font-bold text-emerald-400">{formatMoney(reconciliation?.netAmount ?? (totals.totalSales - totals.totalRefunds))}</p>
                                <p className="text-sm text-emerald-400 mt-1 flex items-center gap-1">
                                    <CheckCircle2 size={14} /> {reconciliation?.status || 'BALANCED'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
