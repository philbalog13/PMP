'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../auth/useAuth';
import {
    ChevronRight,
    Download,
    GitBranch,
    RefreshCw,
    RotateCcw,
    Search,
} from 'lucide-react';
import {
    toRecord,
    toNumber,
    toText,
    formatMoney,
    formatDateTimeString,
    getCardBrand,
    getLastFour,
    mapStatus,
    mapType,
} from '@shared/lib/formatting';
import { BankPageHeader } from '@shared/components/banking/layout/BankPageHeader';
import { BankButton } from '@shared/components/banking/primitives/BankButton';
import { BankBadge } from '@shared/components/banking/primitives/BankBadge';
import { BankSpinner } from '@shared/components/banking/primitives/BankSpinner';
import { BankInput } from '@shared/components/banking/primitives/BankInput';
import { BankSelect, type BankSelectOption } from '@shared/components/banking/forms/BankSelect';
import { StatCard } from '@shared/components/banking/data-display/StatCard';
import { BankTable, type BankTableColumn } from '@shared/components/banking/data-display/BankTable';

interface MerchantTransaction {
    id: string;
    transactionId: string;
    stan: string;
    maskedPan: string;
    amount: number;
    currency: string;
    type: string;
    status: string;
    responseCode: string;
    authorizationCode: string;
    terminalId: string;
    timestamp: string;
    settledAt: string | null;
    fraudScore: number | null;
    threedsStatus: string | null;
    eci: string | null;
}

interface GenerationSummary {
    createdTransactions: number;
    approvedTransactions: number;
    declinedTransactions: number;
    refunds: number;
    voids: number;
}

const normalizeTransactions = (rawList: unknown): MerchantTransaction[] => {
    if (!Array.isArray(rawList)) return [];

    return rawList.map((item) => {
        const row = toRecord(item);
        return {
            id: toText(row.id),
            transactionId: toText(row.transaction_id || row.transactionId),
            stan: toText(row.stan),
            maskedPan: toText(row.masked_pan || row.maskedPan, '****'),
            amount: toNumber(row.amount),
            currency: toText(row.currency, 'EUR'),
            type: toText(row.type, 'PURCHASE'),
            status: toText(row.status, 'PENDING'),
            responseCode: toText(row.response_code || row.responseCode, ''),
            authorizationCode: toText(row.authorization_code || row.authorizationCode, ''),
            terminalId: toText(row.terminal_id || row.terminalId, '-'),
            timestamp: toText(row.timestamp),
            settledAt: row.settled_at ? toText(row.settled_at) : null,
            fraudScore: row.fraud_score != null ? toNumber(row.fraud_score) : null,
            threedsStatus: row.threeds_status ? toText(row.threeds_status) : null,
            eci: row.eci ? toText(row.eci) : null
        };
    });
};

const isDev = process.env.NODE_ENV === 'development';

const statusOptions: BankSelectOption[] = [
    { value: 'all', label: 'Tous statuts' },
    { value: 'approved', label: 'Approuvee' },
    { value: 'pending', label: 'En attente' },
    { value: 'declined', label: 'Refusee' },
    { value: 'voided', label: 'Annulee / Remboursee' },
];

const typeOptions: BankSelectOption[] = [
    { value: 'all', label: 'Tous types' },
    { value: 'sale', label: 'Vente' },
    { value: 'refund', label: 'Remboursement' },
    { value: 'void', label: 'Annulation' },
];

const statusToVariant = (status: string) => {
    if (status === 'approved') return 'success' as const;
    if (status === 'pending') return 'pending' as const;
    if (status === 'declined') return 'danger' as const;
    if (status === 'voided') return 'neutral' as const;
    return 'neutral' as const;
};

const typeToVariant = (type: string) => {
    if (type === 'sale') return 'info' as const;
    if (type === 'refund') return 'danger' as const;
    if (type === 'void') return 'neutral' as const;
    return 'neutral' as const;
};

export default function MerchantTransactionsPage() {
    const router = useRouter();
    const { isLoading } = useAuth(true);
    const [transactions, setTransactions] = useState<MerchantTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [terminalFilter, setTerminalFilter] = useState<string>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationSummary, setGenerationSummary] = useState<GenerationSummary | null>(null);

    const fetchTransactions = useCallback(async () => {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/merchant/transactions?limit=300&page=1', {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Impossible de charger les transactions');
        }

        const payload = await response.json();
        setTransactions(normalizeTransactions(payload.transactions));
    }, []);

    const refreshTransactions = useCallback(async () => {
        try {
            setIsRefreshing(true);
            await fetchTransactions();
            setError(null);
        } catch (fetchError: unknown) {
            const message = fetchError instanceof Error ? fetchError.message : 'Erreur de chargement';
            setError(message);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [fetchTransactions]);

    useEffect(() => {
        if (isLoading) return;
        refreshTransactions();
    }, [isLoading, refreshTransactions]);

    const generateRealHistory = async () => {
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
                    days: 21,
                    transactionsPerDay: 10,
                    includeRefunds: true,
                    includeVoids: true,
                    includeSettlements: true,
                    includePayouts: true
                })
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error || 'Echec generation historique');
            }

            const summary = toRecord(payload.summary);
            setGenerationSummary({
                createdTransactions: toNumber(summary.createdTransactions),
                approvedTransactions: toNumber(summary.approvedTransactions),
                declinedTransactions: toNumber(summary.declinedTransactions),
                refunds: toNumber(summary.refunds),
                voids: toNumber(summary.voids)
            });

            await refreshTransactions();
        } catch (historyError: unknown) {
            const message = historyError instanceof Error ? historyError.message : 'Erreur generation historique';
            setError(message);
        } finally {
            setIsGenerating(false);
        }
    };

    const performRefund = useCallback(async (tx: MerchantTransaction) => {
        try {
            const typedAmount = window.prompt('Montant du remboursement (laisser vide = total)', tx.amount.toFixed(2));
            if (typedAmount === null) return;
            const parsedAmount = typedAmount.trim() === '' ? tx.amount : Number(typedAmount.replace(',', '.'));
            if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
                setError('Montant de remboursement invalide');
                return;
            }

            const token = localStorage.getItem('token');
            const response = await fetch(`/api/merchant/transactions/${tx.id}/refund`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: parsedAmount,
                    reason: 'Remboursement manuel depuis portail'
                })
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error || 'Echec du remboursement');
            }

            await refreshTransactions();
        } catch (refundError: unknown) {
            const message = refundError instanceof Error ? refundError.message : 'Erreur remboursement';
            setError(message);
        }
    }, [refreshTransactions]);

    const performVoid = useCallback(async (tx: MerchantTransaction) => {
        try {
            const confirmVoid = window.confirm('Annuler cette transaction ?');
            if (!confirmVoid) return;

            const token = localStorage.getItem('token');
            const response = await fetch(`/api/merchant/transactions/${tx.id}/void`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reason: 'Annulation manuelle depuis portail'
                })
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error || 'Echec de l annulation');
            }

            await refreshTransactions();
        } catch (voidError: unknown) {
            const message = voidError instanceof Error ? voidError.message : 'Erreur annulation';
            setError(message);
        }
    }, [refreshTransactions]);

    const filteredTransactions = useMemo(() => {
        const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
        const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

        return transactions.filter((tx) => {
            const mappedStatus = mapStatus(tx.status);
            const mappedType = mapType(tx.type);

            const searchableText = [
                tx.transactionId,
                tx.stan,
                tx.maskedPan,
                tx.authorizationCode,
                tx.terminalId
            ].join(' ').toLowerCase();

            const matchesSearch = searchableText.includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || mappedStatus === statusFilter;
            const matchesType = typeFilter === 'all' || mappedType === typeFilter;
            const matchesTerminal = terminalFilter === 'all' || tx.terminalId === terminalFilter;

            const txDate = tx.timestamp ? new Date(tx.timestamp) : null;
            const matchesFrom = !fromDate || (txDate && txDate >= fromDate);
            const matchesTo = !toDate || (txDate && txDate <= toDate);

            return matchesSearch && matchesStatus && matchesType && matchesTerminal && matchesFrom && matchesTo;
        });
    }, [transactions, searchTerm, statusFilter, typeFilter, terminalFilter, dateFrom, dateTo]);

    const stats = useMemo(() => {
        const totalSales = filteredTransactions
            .filter((tx) => mapType(tx.type) === 'sale' && mapStatus(tx.status) === 'approved')
            .reduce((sum, tx) => sum + tx.amount, 0);
        const totalRefunds = filteredTransactions
            .filter((tx) => mapType(tx.type) === 'refund' && mapStatus(tx.status) === 'approved')
            .reduce((sum, tx) => sum + tx.amount, 0);

        return {
            totalSales,
            totalRefunds,
            net: totalSales - totalRefunds
        };
    }, [filteredTransactions]);

    const terminals = useMemo(() => {
        return Array.from(new Set(transactions.map((tx) => tx.terminalId).filter(Boolean)));
    }, [transactions]);

    const terminalOptions = useMemo<BankSelectOption[]>(() => {
        return [
            { value: 'all', label: 'Tous terminaux' },
            ...terminals.map((terminalId) => ({ value: terminalId, label: terminalId })),
        ];
    }, [terminals]);

    const exportCsv = () => {
        const headers = [
            'transaction_id',
            'stan',
            'masked_pan',
            'amount',
            'currency',
            'type',
            'status',
            'response_code',
            'authorization_code',
            'terminal_id',
            'timestamp',
            'settled_at',
            'fraud_score',
            'threeds_status',
            'eci',
        ];

        const rows = filteredTransactions.map((tx) => [
            tx.transactionId || tx.id,
            tx.stan,
            tx.maskedPan,
            tx.amount.toFixed(2),
            tx.currency,
            tx.type,
            tx.status,
            tx.responseCode,
            tx.authorizationCode,
            tx.terminalId,
            tx.timestamp,
            tx.settledAt || '',
            tx.fraudScore ?? '',
            tx.threedsStatus || '',
            tx.eci || '',
        ]);

        const escapeCsv = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
        const csv = [
            headers.map(escapeCsv).join(','),
            ...rows.map((row) => row.map((cell) => escapeCsv(String(cell))).join(',')),
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `merchant-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const columns = useMemo<BankTableColumn<MerchantTransaction>[]>(() => {
        return [
            {
                key: 'transactionId',
                header: 'ID',
                sortable: true,
                render: (tx) => (
                    <span style={{ fontFamily: 'var(--bank-font-mono)', color: 'var(--bank-text-primary)' }}>
                        {tx.transactionId || tx.id}
                    </span>
                ),
            },
            {
                key: 'maskedPan',
                header: 'PAN masqué',
                render: (tx) => (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <BankBadge variant="neutral" label={getCardBrand(tx.maskedPan)} />
                        <span style={{ fontFamily: 'var(--bank-font-mono)' }}>•••• {getLastFour(tx.maskedPan)}</span>
                    </span>
                ),
            },
            {
                key: 'amount',
                header: 'Montant',
                align: 'right',
                sortable: true,
                render: (tx) => {
                    const txType = mapType(tx.type);
                    const negative = txType === 'refund' || mapStatus(tx.status) === 'voided';
                    return (
                        <span style={{ color: negative ? 'var(--bank-danger)' : 'var(--bank-text-primary)', fontWeight: 600 }}>
                            {negative ? '-' : '+'}{formatMoney(tx.amount, tx.currency)}
                        </span>
                    );
                },
            },
            {
                key: 'type',
                header: 'Type',
                render: (tx) => {
                    const txType = mapType(tx.type);
                    const label = txType === 'sale' ? 'Vente' : txType === 'refund' ? 'Remboursement' : 'Annulation';
                    return <BankBadge variant={typeToVariant(txType)} label={label} />;
                },
            },
            {
                key: 'status',
                header: 'Status',
                render: (tx) => {
                    const txStatus = mapStatus(tx.status);
                    const label = txStatus === 'approved' ? 'Approuvée' : txStatus === 'pending' ? 'En attente' : txStatus === 'declined' ? 'Refusée' : 'Annulée';
                    return <BankBadge variant={statusToVariant(txStatus)} label={label} />;
                },
            },
            {
                key: 'terminalId',
                header: 'Terminal',
                render: (tx) => <span style={{ fontFamily: 'var(--bank-font-mono)' }}>{tx.terminalId}</span>,
            },
            {
                key: 'timestamp',
                header: 'Date',
                sortable: true,
                render: (tx) => <span>{formatDateTimeString(tx.timestamp)}</span>,
            },
            {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (tx) => {
                    const canAdjust = mapStatus(tx.status) === 'approved' && mapType(tx.type) === 'sale';
                    return (
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                            {canAdjust && (
                                <>
                                    <BankButton
                                        size="sm"
                                        variant="ghost"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            performRefund(tx);
                                        }}
                                    >
                                        Refund
                                    </BankButton>
                                    <BankButton
                                        size="sm"
                                        variant="ghost"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            performVoid(tx);
                                        }}
                                    >
                                        Void
                                    </BankButton>
                                </>
                            )}
                            <BankButton
                                size="sm"
                                variant="ghost"
                                icon={GitBranch}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    router.push(`/merchant/transactions/${tx.id}/timeline`);
                                }}
                            >
                                Timeline
                            </BankButton>
                        </div>
                    );
                },
            },
        ];
    }, [router, performRefund, performVoid]);

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
                <span style={{ color: 'var(--bank-accent)' }}>Transactions</span>
            </div>

            <BankPageHeader
                title="Transactions"
                subtitle="Historique reel alimente par la base transactionnelle marchande."
                actions={
                    <div style={{ display: 'flex', gap: 'var(--bank-space-2)', flexWrap: 'wrap' }}>
                        <BankButton variant="ghost" size="sm" icon={RefreshCw} onClick={refreshTransactions} loading={isRefreshing}>
                            Actualiser
                        </BankButton>
                        <BankButton variant="ghost" size="sm" icon={Download} onClick={exportCsv} disabled={filteredTransactions.length === 0}>
                            Export CSV
                        </BankButton>
                        {isDev && (
                            <BankButton size="sm" icon={RotateCcw} onClick={generateRealHistory} loading={isGenerating}>
                                {isGenerating ? 'Generation...' : 'Generer historique reel'}
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

            {isDev && generationSummary && (
                <div
                    style={{
                        marginBottom: 'var(--bank-space-4)',
                        borderRadius: 'var(--bank-radius-lg)',
                        border: '1px solid color-mix(in srgb, var(--bank-success) 30%, transparent)',
                        background: 'color-mix(in srgb, var(--bank-success) 10%, transparent)',
                        color: 'var(--bank-success)',
                        padding: 'var(--bank-space-4)',
                        fontSize: 'var(--bank-text-sm)',
                    }}
                >
                    Historique cree: {generationSummary.createdTransactions} transactions ({generationSummary.approvedTransactions} approuvees, {generationSummary.declinedTransactions} refusees), {generationSummary.refunds} remboursements, {generationSummary.voids} annulations.
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
                <StatCard label="Total ventes" value={`+${formatMoney(stats.totalSales)}`} loading={isRefreshing} index={0} />
                <StatCard label="Total remboursements" value={`-${formatMoney(stats.totalRefunds)}`} loading={isRefreshing} index={1} />
                <StatCard label="Net" value={formatMoney(stats.net)} loading={isRefreshing} accent index={2} />
                <StatCard label="Transactions" value={String(filteredTransactions.length)} loading={isRefreshing} index={3} />
            </div>

            <section className="bk-card" style={{ marginBottom: 'var(--bank-space-4)' }}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                        gap: 'var(--bank-space-3)',
                    }}
                    className="bk-merchant-tx-filters"
                >
                    <BankInput
                        label="Recherche"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="ID, STAN, carte, auth code..."
                        prefix={Search}
                    />
                    <BankSelect
                        label="Statut"
                        value={statusFilter}
                        onChange={(value) => setStatusFilter(value)}
                        options={statusOptions}
                    />
                    <BankSelect
                        label="Type"
                        value={typeFilter}
                        onChange={(value) => setTypeFilter(value)}
                        options={typeOptions}
                    />
                    <BankSelect
                        label="Terminal"
                        value={terminalFilter}
                        onChange={(value) => setTerminalFilter(value)}
                        options={terminalOptions}
                    />
                    <BankInput
                        label="Date debut"
                        type="date"
                        value={dateFrom}
                        onChange={(event) => setDateFrom(event.target.value)}
                    />
                    <BankInput
                        label="Date fin"
                        type="date"
                        value={dateTo}
                        onChange={(event) => setDateTo(event.target.value)}
                    />
                </div>
            </section>

            <BankTable
                columns={columns}
                data={filteredTransactions}
                loading={isRefreshing}
                skeletonRows={6}
                emptyTitle="Aucune transaction"
                emptyDesc="Aucune transaction ne correspond aux filtres actifs."
                onRowClick={(tx) => router.push(`/merchant/transactions/${tx.id}/timeline`)}
                rowKey={(tx) => tx.id}
                caption="Transactions marchand"
            />

            <style>{`
              .bk-merchant-tx-filters {
                grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;
              }
              @media (max-width: 1120px) {
                .bk-merchant-tx-filters {
                  grid-template-columns: 1fr 1fr;
                }
              }
              @media (max-width: 720px) {
                .bk-merchant-tx-filters {
                  grid-template-columns: 1fr;
                }
              }
            `}</style>
        </div>
    );
}
