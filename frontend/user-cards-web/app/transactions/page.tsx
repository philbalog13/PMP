'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@shared/context/AuthContext';
import { UserRole } from '@shared/types/user';
import {
    AlertTriangle,
    Calendar,
    CreditCard,
    Download,
    Filter,
    Hash,
    RefreshCcw,
    Search,
    ShieldCheck,
} from 'lucide-react';
import { clientApi } from '@/lib/api-client';
import { BankPageHeader } from '@shared/components/banking/layout/BankPageHeader';
import { BankButton } from '@shared/components/banking/primitives/BankButton';
import { BankBadge } from '@shared/components/banking/primitives/BankBadge';
import { BankInput } from '@shared/components/banking/primitives/BankInput';
import { BankSpinner } from '@shared/components/banking/primitives/BankSpinner';
import { BankSelect, type BankSelectOption } from '@shared/components/banking/forms/BankSelect';
import { BankModal } from '@shared/components/banking/feedback/BankModal';
import { BankEmptyState } from '@shared/components/banking/feedback/BankEmptyState';
import { BankSkeleton } from '@shared/components/banking/feedback/BankSkeleton';
import { StatCard } from '@shared/components/banking/data-display/StatCard';
import { TransactionList } from '@shared/components/banking/data-display/TransactionList';
import { type BankTransaction } from '@shared/components/banking/data-display/TransactionRow';

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

const PAGE_SIZE = 50;

type TransactionsResponse = {
    transactions?: unknown[];
    pagination?: {
        totalPages?: number;
        total?: number;
    };
};

const STATUS_OPTIONS: BankSelectOption[] = [
    { value: 'ALL', label: 'Tous statuts' },
    { value: 'APPROVED', label: 'APPROVED' },
    { value: 'DECLINED', label: 'DECLINED' },
    { value: 'PENDING', label: 'PENDING' },
    { value: 'REFUNDED', label: 'REFUNDED' },
    { value: 'REVERSED', label: 'REVERSED' },
];

const TYPE_OPTIONS: BankSelectOption[] = [
    { value: 'ALL', label: 'Tous types' },
    { value: 'PURCHASE', label: 'PURCHASE' },
    { value: 'REFUND', label: 'REFUND' },
    { value: 'PREAUTH', label: 'PREAUTH' },
    { value: 'TRANSFER', label: 'TRANSFER' },
];

const statusToVariant = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'APPROVED') return 'success' as const;
    if (s === 'DECLINED') return 'danger' as const;
    if (s === 'PENDING') return 'pending' as const;
    if (s === 'REFUNDED' || s === 'REVERSED') return 'info' as const;
    return 'neutral' as const;
};

function toBankTransaction(tx: ClientTransaction): BankTransaction {
    return {
        id: tx.id,
        transactionId: tx.transactionId,
        maskedPan: tx.maskedPan,
        amount: tx.amount,
        currency: tx.currency,
        type: tx.type,
        status: tx.status,
        responseCode: tx.responseCode,
        timestamp: tx.timestamp,
        description: tx.merchantName,
    };
}

export default function TransactionsPage() {
    const { isLoading, isAuthenticated, user } = useAuth();
    const [transactions, setTransactions] = useState<ClientTransaction[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [minAmount, setMinAmount] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedTransaction, setSelectedTransaction] = useState<ClientTransaction | null>(null);

    const isClient = user?.role === UserRole.CLIENT;

    const loadTransactions = useCallback(async (p = page) => {
        setIsRefreshing(true);
        setError(null);
        try {
            const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(p) });
            if (statusFilter !== 'ALL') params.set('status', statusFilter);
            if (typeFilter !== 'ALL') params.set('type', typeFilter);
            const response = await clientApi.getTransactions(params.toString()) as TransactionsResponse;
            setTransactions((response.transactions || []).map(normalizeTransaction));
            if (response.pagination) {
                setTotalPages(response.pagination.totalPages || 1);
                setTotal(response.pagination.total || 0);
            }
        } catch (loadError: unknown) {
            setError(getErrorMessage(loadError, 'Impossible de charger les transactions'));
        } finally {
            setIsRefreshing(false);
        }
    }, [page, statusFilter, typeFilter]);

    useEffect(() => {
        if (!isAuthenticated || !isClient) return;
        loadTransactions(page);
    }, [isAuthenticated, isClient, page, loadTransactions]);

    const filteredTransactions = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        const minAmountNumber = minAmount.trim() ? Number(minAmount) : null;

        const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
        const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

        return transactions.filter((tx) => {
            const matchesSearch =
                normalizedSearch.length === 0 ||
                tx.merchantName.toLowerCase().includes(normalizedSearch) ||
                tx.maskedPan.toLowerCase().includes(normalizedSearch) ||
                tx.transactionId.toLowerCase().includes(normalizedSearch);

            const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;
            const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;

            const txDate = tx.timestamp ? new Date(tx.timestamp) : null;
            const matchesFrom = !fromDate || (txDate && txDate >= fromDate);
            const matchesTo = !toDate || (txDate && txDate <= toDate);

            const matchesAmount =
                minAmountNumber === null || Number.isNaN(minAmountNumber) || tx.amount >= minAmountNumber;

            return matchesSearch && matchesStatus && matchesType && matchesFrom && matchesTo && matchesAmount;
        });
    }, [transactions, searchTerm, statusFilter, typeFilter, dateFrom, dateTo, minAmount]);

    const totalAmount = useMemo(
        () => filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0),
        [filteredTransactions]
    );

    const approvedCount = useMemo(
        () => filteredTransactions.filter((tx) => tx.status === 'APPROVED').length,
        [filteredTransactions]
    );

    const bankTransactions = useMemo(
        () => filteredTransactions.map(toBankTransaction),
        [filteredTransactions]
    );

    const exportCsv = () => {
        const headers = [
            'id',
            'transaction_id',
            'merchant',
            'masked_pan',
            'amount',
            'currency',
            'type',
            'status',
            'response_code',
            'authorization_code',
            'merchant_mcc',
            'timestamp',
        ];

        const rows = filteredTransactions.map((tx) => [
            tx.id,
            tx.transactionId,
            tx.merchantName,
            tx.maskedPan,
            tx.amount.toFixed(2),
            tx.currency,
            tx.type,
            tx.status,
            tx.responseCode,
            tx.authorizationCode,
            tx.merchantMcc,
            tx.timestamp,
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
        link.download = `transactions-client-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BankSpinner size={40} />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
                <div className="max-w-md w-full rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center space-y-4">
                    <h1 className="text-2xl font-bold text-white">Session expiree</h1>
                    <p className="text-slate-400">Reconnectez-vous sur le portail pour acceder a votre espace client.</p>
                    <Link
                        href={`${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}/login`}
                        className="bk-btn bk-btn--primary"
                        style={{ display: 'inline-flex', textDecoration: 'none' }}
                    >
                        Retour au login
                    </Link>
                </div>
            </div>
        );
    }

    if (!isClient) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
                <div className="max-w-lg w-full rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center text-slate-300">
                    Cette section est reservee aux clients.
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: 'var(--bank-space-6)' }}>
            <BankPageHeader
                title="Historique"
                subtitle="Liste des transactions liees a votre compte client."
                actions={
                    <div style={{ display: 'flex', gap: 'var(--bank-space-2)', flexWrap: 'wrap' }}>
                        <BankButton
                            size="sm"
                            variant="ghost"
                            icon={Download}
                            onClick={exportCsv}
                            disabled={filteredTransactions.length === 0}
                        >
                            Exporter CSV
                        </BankButton>
                        <BankButton
                            size="sm"
                            variant="ghost"
                            icon={RefreshCcw}
                            onClick={() => {
                                setPage(1);
                                loadTransactions(1);
                            }}
                            loading={isRefreshing}
                        >
                            Actualiser
                        </BankButton>
                    </div>
                }
            />

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 'var(--bank-space-4)',
                    marginBottom: 'var(--bank-space-6)',
                }}
            >
                <StatCard label="Transactions filtrees" value={String(filteredTransactions.length)} icon={Filter} loading={isRefreshing && transactions.length === 0} index={0} />
                <StatCard label="Montant total" value={formatMoney(totalAmount, filteredTransactions[0]?.currency || 'EUR')} icon={CreditCard} loading={isRefreshing && transactions.length === 0} index={1} />
                <StatCard label="Approuvees" value={String(approvedCount)} icon={ShieldCheck} loading={isRefreshing && transactions.length === 0} accent index={2} />
            </div>

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
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--bank-space-2)',
                    }}
                >
                    <AlertTriangle size={16} />
                    {error}
                </div>
            )}

            <section className="bk-card" style={{ marginBottom: 'var(--bank-space-5)' }}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                        gap: 'var(--bank-space-3)',
                    }}
                    className="bk-transactions-filters"
                >
                    <BankInput
                        label="Recherche"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Marchand, carte ou ID transaction"
                        prefix={Search}
                    />
                    <BankSelect
                        label="Statut"
                        value={statusFilter}
                        onChange={(value) => {
                            setStatusFilter(value);
                            setPage(1);
                        }}
                        options={STATUS_OPTIONS}
                    />
                    <BankSelect
                        label="Type"
                        value={typeFilter}
                        onChange={(value) => {
                            setTypeFilter(value);
                            setPage(1);
                        }}
                        options={TYPE_OPTIONS}
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
                    <BankInput
                        label="Montant min"
                        type="number"
                        min="0"
                        step="0.01"
                        value={minAmount}
                        onChange={(event) => setMinAmount(event.target.value)}
                        placeholder="0.00"
                    />
                </div>
            </section>

            <section className="bk-card" style={{ padding: 'var(--bank-space-2)' }}>
                {isRefreshing && transactions.length === 0 ? (
                    <BankSkeleton variant="transaction-row" count={6} />
                ) : filteredTransactions.length === 0 ? (
                    <BankEmptyState
                        icon={<CreditCard size={22} />}
                        title="Aucune transaction"
                        description="Aucune operation ne correspond aux filtres selectionnes."
                    />
                ) : (
                    <TransactionList
                        transactions={bankTransactions}
                        loading={isRefreshing}
                        groupByDate
                        skeletonCount={6}
                        label="Historique des transactions"
                        onClickRow={(tx) => {
                            const matched = filteredTransactions.find((item) => item.id === tx.id);
                            if (matched) setSelectedTransaction(matched);
                        }}
                    />
                )}
            </section>

            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--bank-space-5)', gap: 'var(--bank-space-3)', flexWrap: 'wrap' }}>
                    <p className="bk-caption" style={{ margin: 0 }}>
                        Page {page} / {totalPages} - {total} transaction(s) au total
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--bank-space-2)' }}>
                        <BankButton
                            variant="ghost"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1 || isRefreshing}
                        >
                            Precedent
                        </BankButton>
                        <BankButton
                            variant="ghost"
                            size="sm"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || isRefreshing}
                        >
                            Suivant
                        </BankButton>
                    </div>
                </div>
            )}

            <BankModal
                open={Boolean(selectedTransaction)}
                onClose={() => setSelectedTransaction(null)}
                title="Detail transaction"
                size="md"
                footer={
                    <BankButton variant="ghost" onClick={() => setSelectedTransaction(null)}>
                        Fermer
                    </BankButton>
                }
            >
                {selectedTransaction && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-4)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--bank-space-3)' }}>
                            <div>
                                <p className="bk-label-upper" style={{ marginBottom: 4 }}>Marchand</p>
                                <p style={{ margin: 0, fontSize: 'var(--bank-text-base)', color: 'var(--bank-text-primary)', fontWeight: 'var(--bank-font-semibold)' }}>
                                    {selectedTransaction.merchantName}
                                </p>
                            </div>
                            <BankBadge variant={statusToVariant(selectedTransaction.status)} label={selectedTransaction.status} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--bank-space-3)' }}>
                            <div className="bk-card" style={{ padding: 'var(--bank-space-4)' }}>
                                <p className="bk-label-upper" style={{ marginBottom: 4 }}>Montant</p>
                                <p style={{ margin: 0, fontSize: 'var(--bank-text-lg)', color: 'var(--bank-text-primary)', fontWeight: 'var(--bank-font-semibold)' }}>
                                    {formatMoney(selectedTransaction.amount, selectedTransaction.currency)}
                                </p>
                            </div>
                            <div className="bk-card" style={{ padding: 'var(--bank-space-4)' }}>
                                <p className="bk-label-upper" style={{ marginBottom: 4 }}>Type</p>
                                <p style={{ margin: 0, fontSize: 'var(--bank-text-base)', color: 'var(--bank-text-primary)', fontWeight: 'var(--bank-font-semibold)' }}>
                                    {selectedTransaction.type}
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--bank-space-3)' }}>
                            <div>
                                <p className="bk-label-upper" style={{ marginBottom: 4 }}>Transaction ID</p>
                                <p className="bk-body" style={{ margin: 0, fontFamily: 'var(--bank-font-mono)', color: 'var(--bank-text-primary)' }}>
                                    <Hash size={12} style={{ marginRight: 6 }} />
                                    {selectedTransaction.transactionId || selectedTransaction.id}
                                </p>
                            </div>
                            <div>
                                <p className="bk-label-upper" style={{ marginBottom: 4 }}>Carte</p>
                                <p className="bk-body" style={{ margin: 0, fontFamily: 'var(--bank-font-mono)', color: 'var(--bank-text-primary)' }}>
                                    <CreditCard size={12} style={{ marginRight: 6 }} />
                                    {selectedTransaction.maskedPan || '-'}
                                </p>
                            </div>
                            <div>
                                <p className="bk-label-upper" style={{ marginBottom: 4 }}>Code reponse</p>
                                <p className="bk-body" style={{ margin: 0, color: 'var(--bank-text-primary)' }}>
                                    {selectedTransaction.responseCode || '-'}
                                </p>
                            </div>
                            <div>
                                <p className="bk-label-upper" style={{ marginBottom: 4 }}>Code autorisation</p>
                                <p className="bk-body" style={{ margin: 0, fontFamily: 'var(--bank-font-mono)', color: 'var(--bank-text-primary)' }}>
                                    {selectedTransaction.authorizationCode || '-'}
                                </p>
                            </div>
                        </div>

                        <div className="bk-card" style={{ padding: 'var(--bank-space-4)' }}>
                            <p className="bk-label-upper" style={{ marginBottom: 'var(--bank-space-2)' }}>Timeline</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-3)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bank-space-2)' }}>
                                    <span className="bk-status-dot bk-status-dot--online" />
                                    <p className="bk-body" style={{ margin: 0 }}>
                                        Transaction creee
                                    </p>
                                    <span className="bk-caption" style={{ marginLeft: 'auto' }}>
                                        <Calendar size={12} style={{ marginRight: 4 }} />
                                        {selectedTransaction.timestamp ? new Date(selectedTransaction.timestamp).toLocaleString('fr-FR') : '-'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bank-space-2)' }}>
                                    <span className={`bk-status-dot ${selectedTransaction.status === 'APPROVED' ? 'bk-status-dot--online' : selectedTransaction.status === 'DECLINED' ? 'bk-status-dot--offline' : 'bk-status-dot--idle'}`} />
                                    <p className="bk-body" style={{ margin: 0 }}>
                                        Statut final: {selectedTransaction.status}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </BankModal>

            <style>{`
              .bk-transactions-filters {
                grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;
              }
              @media (max-width: 1120px) {
                .bk-transactions-filters {
                  grid-template-columns: 1fr 1fr;
                }
              }
              @media (max-width: 720px) {
                .bk-transactions-filters {
                  grid-template-columns: 1fr;
                }
              }
            `}</style>
        </div>
    );
}
