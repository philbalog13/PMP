'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../auth/useAuth';
import {
    BarChart3,
    CheckCircle2,
    ChevronRight,
    Download,
    FileText,
    RefreshCw,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import {
    formatMoney,
    getCardBrand,
    toNumber,
    toRecord,
    toText,
} from '@shared/lib/formatting';
import { BankPageHeader } from '@shared/components/banking/layout/BankPageHeader';
import { BankButton } from '@shared/components/banking/primitives/BankButton';
import { BankBadge } from '@shared/components/banking/primitives/BankBadge';
import { BankSpinner } from '@shared/components/banking/primitives/BankSpinner';
import { BankSelect, type BankSelectOption } from '@shared/components/banking/forms/BankSelect';
import { StatCard } from '@shared/components/banking/data-display/StatCard';
import { BankTable, type BankTableColumn } from '@shared/components/banking/data-display/BankTable';
import { MiniSparkline } from '@shared/components/banking/data-display/MiniSparkline';

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

type ReportType = 'daily' | 'card' | 'reconciliation';

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
            timestamp: toText(row.timestamp),
        };
    });
};

const mapRangeToDays = (range: string): number => {
    if (range === 'today') return 1;
    if (range === 'week') return 7;
    if (range === 'month') return 30;
    if (range === 'quarter') return 90;
    return 7;
};

const dateRangeOptions: BankSelectOption[] = [
    { value: 'today', label: 'Aujourd hui' },
    { value: 'week', label: '7 jours' },
    { value: 'month', label: '30 jours' },
    { value: 'quarter', label: '3 mois' },
];

const reportTypeOptions: BankSelectOption[] = [
    { value: 'daily', label: 'Journalier' },
    { value: 'card', label: 'Reseaux carte' },
    { value: 'reconciliation', label: 'Reconciliation' },
];

export default function MerchantReportsPage() {
    const { isLoading } = useAuth(true);
    const [dateRange, setDateRange] = useState('week');
    const [reportType, setReportType] = useState<ReportType>('daily');
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
                headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`/api/merchant/reports/reconciliation?fromDate=${fromDateIso}&toDate=${toDateIso}`, {
                headers: { Authorization: `Bearer ${token}` },
            }),
        ]);

        if (!transactionsResponse.ok) {
            throw new Error('Impossible de recuperer les transactions de reporting');
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
                status: toText(recon.status, 'UNKNOWN'),
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
        } catch (fetchError: unknown) {
            const message = fetchError instanceof Error ? fetchError.message : 'Erreur chargement rapports';
            setError(message);
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
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    days: mapRangeToDays(dateRange),
                    transactionsPerDay: 10,
                    includeRefunds: true,
                    includeVoids: true,
                    includeSettlements: true,
                    includePayouts: true,
                }),
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error || 'Echec generation historique');
            }

            await refreshData();
        } catch (generationError: unknown) {
            const message = generationError instanceof Error ? generationError.message : 'Erreur generation historique';
            setError(message);
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
                    averageTicket: 0,
                });
            }

            const row = map.get(date)!;
            row.transactionCount += 1;
            if (tx.status === 'APPROVED') row.approvedCount += 1;
            if (tx.status === 'DECLINED') row.declinedCount += 1;
            if (tx.type === 'PURCHASE' && tx.status === 'APPROVED') row.totalSales += tx.amount;
            if (tx.type === 'REFUND' && tx.status === 'APPROVED') row.totalRefunds += tx.amount;
        }

        return Array.from(map.values())
            .sort((a, b) => (a.date < b.date ? 1 : -1))
            .map((row) => ({
                ...row,
                averageTicket: row.approvedCount > 0 ? row.totalSales / row.approvedCount : 0,
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
            percentage: totalAmount > 0 ? Math.round((values.amount / totalAmount) * 100) : 0,
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

    const trendSeries = useMemo(() => {
        const sorted = [...dailyReports].sort((a, b) => (a.date > b.date ? 1 : -1));
        return {
            sales: sorted.map((row) => row.totalSales),
            net: sorted.map((row) => row.totalSales - row.totalRefunds),
        };
    }, [dailyReports]);

    const exportCsv = () => {
        const headers = ['date', 'transaction_id', 'type', 'status', 'masked_pan', 'amount'];
        const rows = transactions.map((tx) => [
            tx.timestamp ? tx.timestamp.split('T')[0] : '',
            tx.id,
            tx.type,
            tx.status,
            tx.maskedPan,
            tx.amount.toFixed(2),
        ]);

        const escapeCsv = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
        const csv = [
            headers.map(escapeCsv).join(','),
            ...rows.map((row) => row.map((cell) => escapeCsv(cell)).join(',')),
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `merchant-report-${dateRange}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const dailyColumns = useMemo<BankTableColumn<DailyReport>[]>(() => {
        return [
            {
                key: 'date',
                header: 'Date',
                sortable: true,
                render: (row) => <span style={{ fontWeight: 600 }}>{row.date}</span>,
            },
            {
                key: 'totalSales',
                header: 'Ventes',
                align: 'right',
                render: (row) => <span style={{ color: 'var(--bank-success)' }}>+{formatMoney(row.totalSales)}</span>,
            },
            {
                key: 'totalRefunds',
                header: 'Remboursements',
                align: 'right',
                render: (row) => <span style={{ color: 'var(--bank-danger)' }}>-{formatMoney(row.totalRefunds)}</span>,
            },
            {
                key: 'net',
                header: 'Net',
                align: 'right',
                render: (row) => <span>{formatMoney(row.totalSales - row.totalRefunds)}</span>,
            },
            {
                key: 'transactionCount',
                header: 'Transactions',
                align: 'right',
                render: (row) => <span>{row.transactionCount}</span>,
            },
            {
                key: 'approval',
                header: 'Taux approb.',
                align: 'right',
                render: (row) => {
                    const rate = row.transactionCount > 0 ? Math.round((row.approvedCount / row.transactionCount) * 100) : 0;
                    return <BankBadge variant={rate >= 80 ? 'success' : rate >= 60 ? 'warning' : 'danger'} label={`${rate}%`} />;
                },
            },
            {
                key: 'averageTicket',
                header: 'Panier moyen',
                align: 'right',
                render: (row) => <span>{formatMoney(row.averageTicket)}</span>,
            },
        ];
    }, []);

    const cardColumns = useMemo<BankTableColumn<CardBreakdown>[]>(() => {
        return [
            {
                key: 'type',
                header: 'Reseau',
                render: (row) => <BankBadge variant="info" label={row.type} />,
            },
            {
                key: 'count',
                header: 'Transactions',
                align: 'right',
                render: (row) => <span>{row.count}</span>,
            },
            {
                key: 'amount',
                header: 'Montant',
                align: 'right',
                render: (row) => <span>{formatMoney(row.amount)}</span>,
            },
            {
                key: 'percentage',
                header: 'Part',
                align: 'right',
                render: (row) => <span>{row.percentage}%</span>,
            },
            {
                key: 'spark',
                header: 'Tendance',
                render: (row) => (
                    <MiniSparkline
                        data={[Math.max(1, row.count), Math.max(1, Math.round(row.amount)), Math.max(1, row.percentage)]}
                        width={90}
                        height={30}
                        filled
                        dotEnd
                    />
                ),
            },
        ];
    }, []);

    if (isLoading || loading) {
        return (
            <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BankSpinner size={40} />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: 'var(--bank-space-6)' }}>
            <div className="bk-caption" style={{ marginBottom: 'var(--bank-space-4)' }}>
                <Link href="/merchant" style={{ color: 'var(--bank-text-tertiary)', textDecoration: 'none' }}>Dashboard Marchand</Link>
                <ChevronRight size={12} style={{ display: 'inline', margin: '0 6px' }} />
                <span style={{ color: 'var(--bank-accent)' }}>Rapports</span>
            </div>

            <BankPageHeader
                title="Rapports et statistiques"
                subtitle="Reporting calcule sur les transactions reelles."
                actions={
                    <div style={{ display: 'flex', gap: 'var(--bank-space-2)', flexWrap: 'wrap' }}>
                        <BankButton variant="ghost" size="sm" icon={RefreshCw} onClick={refreshData} loading={refreshing}>
                            Actualiser
                        </BankButton>
                        <BankButton variant="ghost" size="sm" icon={Download} onClick={exportCsv} disabled={transactions.length === 0}>
                            Export CSV
                        </BankButton>
                        {isDev && (
                            <BankButton size="sm" icon={BarChart3} onClick={generateHistory} loading={isGenerating}>
                                {isGenerating ? 'Generation...' : 'Generer historique'}
                            </BankButton>
                        )}
                    </div>
                }
            />

            {error && (
                <div
                    style={{
                        marginBottom: 'var(--bank-space-4)',
                        borderRadius: 'var(--bank-radius-lg)',
                        border: '1px solid color-mix(in srgb, var(--bank-danger) 30%, transparent)',
                        background: 'color-mix(in srgb, var(--bank-danger) 8%, transparent)',
                        color: 'var(--bank-danger)',
                        padding: 'var(--bank-space-4)',
                        fontSize: 'var(--bank-text-sm)',
                    }}
                >
                    {error}
                </div>
            )}

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 'var(--bank-space-4)',
                    marginBottom: 'var(--bank-space-5)',
                }}
            >
                <StatCard label="Chiffre d affaires" value={formatMoney(totals.totalSales)} icon={TrendingUp} loading={refreshing} index={0} accent />
                <StatCard label="Remboursements" value={formatMoney(totals.totalRefunds)} icon={TrendingDown} loading={refreshing} index={1} />
                <StatCard label="Transactions" value={String(totals.totalTransactions)} icon={FileText} loading={refreshing} index={2} />
                <StatCard label="Taux approbation" value={`${totals.approvalRate.toFixed(1)}%`} icon={CheckCircle2} loading={refreshing} index={3} />
            </div>

            <section className="bk-card" style={{ marginBottom: 'var(--bank-space-4)' }}>
                <div className="bk-reports-filters">
                    <BankSelect
                        label="Periode"
                        value={dateRange}
                        onChange={(value) => setDateRange(value)}
                        options={dateRangeOptions}
                    />
                    <BankSelect
                        label="Vue"
                        value={reportType}
                        onChange={(value) => setReportType(value as ReportType)}
                        options={reportTypeOptions}
                    />
                </div>
            </section>

            {reportType === 'daily' && (
                <>
                    <section className="bk-card" style={{ marginBottom: 'var(--bank-space-4)' }}>
                        <div className="bk-reports-trends">
                            <div>
                                <p className="bk-caption" style={{ marginBottom: 8 }}>Tendance ventes</p>
                                <MiniSparkline data={trendSeries.sales.length > 1 ? trendSeries.sales : [0, 0]} width={180} height={48} />
                            </div>
                            <div>
                                <p className="bk-caption" style={{ marginBottom: 8 }}>Tendance net</p>
                                <MiniSparkline data={trendSeries.net.length > 1 ? trendSeries.net : [0, 0]} width={180} height={48} color="var(--bank-success)" />
                            </div>
                        </div>
                    </section>

                    <BankTable
                        columns={dailyColumns}
                        data={dailyReports}
                        loading={refreshing}
                        skeletonRows={6}
                        emptyTitle="Aucune donnee journaliere"
                        emptyDesc="Aucune transaction sur la periode selectionnee."
                        rowKey={(row) => row.date}
                        caption="Rapport journalier marchand"
                    />
                </>
            )}

            {reportType === 'card' && (
                <BankTable
                    columns={cardColumns}
                    data={cardBreakdown}
                    loading={refreshing}
                    skeletonRows={4}
                    emptyTitle="Aucune donnee carte"
                    emptyDesc="Aucune transaction approuvee de type vente sur la periode."
                    rowKey={(row) => row.type}
                    caption="Repartition reseaux carte"
                />
            )}

            {reportType === 'reconciliation' && (
                <section className="bk-card">
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                            gap: 'var(--bank-space-4)',
                        }}
                    >
                        <StatCard
                            label="Total transactions"
                            value={String(reconciliation?.totalTransactions ?? totals.totalTransactions)}
                            icon={FileText}
                            loading={refreshing}
                            index={0}
                        />
                        <StatCard
                            label="Total debits"
                            value={formatMoney(reconciliation?.totalDebits ?? totals.totalSales)}
                            icon={TrendingUp}
                            loading={refreshing}
                            index={1}
                        />
                        <StatCard
                            label="Total credits"
                            value={formatMoney(reconciliation?.totalCredits ?? totals.totalRefunds)}
                            icon={TrendingDown}
                            loading={refreshing}
                            index={2}
                        />
                        <StatCard
                            label="Net"
                            value={formatMoney(reconciliation?.netAmount ?? (totals.totalSales - totals.totalRefunds))}
                            icon={CheckCircle2}
                            loading={refreshing}
                            accent
                            index={3}
                        />
                    </div>
                    <div style={{ marginTop: 'var(--bank-space-4)' }}>
                        <BankBadge
                            variant={reconciliation?.status === 'BALANCED' ? 'success' : 'warning'}
                            label={`Statut reconciliation: ${reconciliation?.status || 'BALANCED'}`}
                        />
                    </div>
                </section>
            )}

            <style>{`
              .bk-reports-filters {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: var(--bank-space-3);
              }
              .bk-reports-trends {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: var(--bank-space-4);
              }
              @media (max-width: 820px) {
                .bk-reports-filters,
                .bk-reports-trends {
                  grid-template-columns: 1fr;
                }
              }
            `}</style>
        </div>
    );
}

