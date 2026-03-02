'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../auth/useAuth';
import {
    Activity,
    AlertTriangle,
    ArrowLeft,
    Clock,
    CreditCard,
    Hash,
    Store,
} from 'lucide-react';
import { formatDateTimeString, formatMoney } from '@shared/lib/formatting';
import { BankPageHeader } from '@shared/components/banking/layout/BankPageHeader';
import { BankButton } from '@shared/components/banking/primitives/BankButton';
import { BankBadge } from '@shared/components/banking/primitives/BankBadge';
import { BankSpinner } from '@shared/components/banking/primitives/BankSpinner';
import { BankEmptyState } from '@shared/components/banking/feedback/BankEmptyState';
import { StatCard } from '@shared/components/banking/data-display/StatCard';
import { BankTable, type BankTableColumn } from '@shared/components/banking/data-display/BankTable';

type TransactionSummary = {
    transaction_id: string;
    status: string;
    amount: number;
    merchant_name: string;
    masked_pan: string;
    processing_steps: unknown;
    currency?: string;
};

type TimelineCategory = 'process' | 'security' | 'decision' | 'data';

type TimelineStep = {
    step: number;
    name: string;
    category: TimelineCategory;
    status: string;
    timestamp: string;
    duration_ms: number;
    details: Record<string, unknown>;
};

const asObject = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const toNumber = (value: unknown): number => {
    const parsed = Number.parseFloat(String(value ?? '0'));
    return Number.isFinite(parsed) ? parsed : 0;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
};

const toCategory = (value: unknown): TimelineCategory => {
    const category = String(value ?? '').toLowerCase();
    if (category === 'security' || category === 'decision' || category === 'data') {
        return category;
    }
    return 'process';
};

const normalizeTransaction = (raw: unknown): TransactionSummary | null => {
    const source = asObject(raw);
    if (Object.keys(source).length === 0) return null;
    return {
        transaction_id: String(source.transaction_id || source.transactionId || ''),
        status: String(source.status || 'PENDING'),
        amount: toNumber(source.amount),
        merchant_name: String(source.merchant_name || source.merchantName || ''),
        masked_pan: String(source.masked_pan || source.maskedPan || ''),
        processing_steps: source.processing_steps,
        currency: String(source.currency || 'EUR'),
    };
};

const normalizeTimeline = (raw: unknown, fallback: unknown): TimelineStep[] => {
    const source = Array.isArray(raw) ? raw : Array.isArray(fallback) ? fallback : [];
    return source.map((step, index) => {
        const row = asObject(step);
        const stepNumber = Number.parseInt(String(row.step ?? index + 1), 10);
        return {
            step: Number.isFinite(stepNumber) ? stepNumber : index + 1,
            name: String(row.name || row.step_name || `Step ${index + 1}`),
            category: toCategory(row.category),
            status: String(row.status || 'pending'),
            timestamp: String(row.timestamp || row.created_at || ''),
            duration_ms: toNumber(row.duration_ms ?? row.durationMs),
            details: asObject(row.details),
        };
    });
};

const statusToVariant = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'SUCCESS' || s === 'APPROVED' || s === 'SETTLED') return 'success' as const;
    if (s === 'FAILED' || s === 'DECLINED' || s === 'ERROR') return 'danger' as const;
    if (s === 'PENDING' || s === 'QUEUED' || s === 'PROCESSING') return 'pending' as const;
    if (s === 'SKIPPED' || s === 'VOIDED') return 'neutral' as const;
    return 'info' as const;
};

const categoryToVariant = (category: TimelineCategory) => {
    if (category === 'security') return 'warning' as const;
    if (category === 'decision') return 'accent' as const;
    if (category === 'data') return 'info' as const;
    return 'neutral' as const;
};

const detailsToText = (details: Record<string, unknown>) => {
    const entries = Object.entries(details);
    if (entries.length === 0) return '-';
    return entries
        .slice(0, 3)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(' | ');
};

export default function MerchantTimelinePage() {
    const params = useParams();
    const router = useRouter();
    const { isLoading } = useAuth(true);
    const id = String(params.id || '');

    const [txn, setTxn] = useState<TransactionSummary | null>(null);
    const [timeline, setTimeline] = useState<TimelineStep[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showRaw, setShowRaw] = useState(false);

    useEffect(() => {
        if (!id || isLoading) return;
        let active = true;

        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || '') : '';
                const response = await fetch(`/api/merchant/transactions/${id}/timeline`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const payload = await response.json() as unknown;
                const data = asObject(payload);
                if (data.success === false) {
                    throw new Error(String(data.error || 'Failed'));
                }

                if (!active) return;
                const transaction = normalizeTransaction(data.transaction);
                setTxn(transaction);
                setTimeline(normalizeTimeline(data.timeline, transaction?.processing_steps));
            } catch (loadError: unknown) {
                if (!active) return;
                setError(getErrorMessage(loadError, 'Impossible de charger la timeline'));
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();
        return () => {
            active = false;
        };
    }, [id, isLoading]);

    const totalDuration = useMemo(
        () => timeline.reduce((sum, step) => sum + step.duration_ms, 0),
        [timeline]
    );

    const timelineColumns = useMemo<BankTableColumn<TimelineStep>[]>(() => ([
        {
            key: 'step',
            header: '#',
            align: 'right',
            sortable: true,
            render: (row) => <span style={{ fontFamily: 'var(--bank-font-mono)' }}>{row.step}</span>,
        },
        {
            key: 'name',
            header: 'Etape',
            sortable: true,
            render: (row) => <span style={{ fontWeight: 600 }}>{row.name}</span>,
        },
        {
            key: 'category',
            header: 'Categorie',
            render: (row) => (
                <BankBadge
                    variant={categoryToVariant(row.category)}
                    label={row.category.toUpperCase()}
                />
            ),
        },
        {
            key: 'status',
            header: 'Statut',
            render: (row) => (
                <BankBadge
                    variant={statusToVariant(row.status)}
                    label={row.status.toUpperCase()}
                    dot
                />
            ),
        },
        {
            key: 'duration_ms',
            header: 'Duree',
            align: 'right',
            sortable: true,
            render: (row) => `${row.duration_ms}ms`,
        },
        {
            key: 'timestamp',
            header: 'Horodatage',
            render: (row) => formatDateTimeString(row.timestamp),
        },
        {
            key: 'details',
            header: 'Details',
            render: (row) => (
                <span
                    style={{
                        color: 'var(--bank-text-secondary)',
                        fontSize: 'var(--bank-text-xs)',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                    }}
                >
                    {detailsToText(row.details)}
                </span>
            ),
        },
    ]), []);

    if (isLoading || loading) {
        return (
            <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BankSpinner size={40} />
            </div>
        );
    }

    if (error || !txn) {
        return (
            <div style={{ maxWidth: 960, margin: '0 auto', padding: 'var(--bank-space-6)' }}>
                <BankEmptyState
                    icon={<AlertTriangle size={20} aria-hidden="true" />}
                    title="Timeline indisponible"
                    description={error || 'Transaction introuvable.'}
                    action={(
                        <BankButton variant="ghost" onClick={() => router.push('/merchant/transactions')}>
                            Retour transactions
                        </BankButton>
                    )}
                />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: 'var(--bank-space-6)' }}>
            <BankPageHeader
                title="Timeline transaction"
                subtitle="Suivi detaille du traitement marchand, etape par etape."
                actions={(
                    <div style={{ display: 'flex', gap: 'var(--bank-space-2)', flexWrap: 'wrap' }}>
                        <BankButton variant="ghost" size="sm" icon={ArrowLeft} onClick={() => router.push('/merchant/transactions')}>
                            Retour liste
                        </BankButton>
                        <BankButton variant="ghost" size="sm" onClick={() => setShowRaw((value) => !value)}>
                            {showRaw ? 'Masquer brut' : 'Afficher brut'}
                        </BankButton>
                    </div>
                )}
            />

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 'var(--bank-space-4)',
                    marginBottom: 'var(--bank-space-5)',
                }}
            >
                <StatCard label="Montant" value={formatMoney(txn.amount, txn.currency || 'EUR')} icon={CreditCard} index={0} />
                <StatCard label="Etapes" value={String(timeline.length)} icon={Activity} index={1} />
                <StatCard label="Duree totale" value={`${totalDuration}ms`} icon={Clock} index={2} />
                <StatCard label="Statut final" value={txn.status.toUpperCase()} icon={AlertTriangle} accent={txn.status.toUpperCase() === 'APPROVED'} index={3} />
            </div>

            <section
                className="bk-card"
                style={{
                    marginBottom: 'var(--bank-space-4)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: 'var(--bank-space-4)',
                }}
            >
                <div>
                    <p className="bk-label-upper" style={{ marginBottom: 6 }}>Transaction ID</p>
                    <p style={{ margin: 0, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <Hash size={14} aria-hidden="true" />
                        <code>{txn.transaction_id || id}</code>
                    </p>
                </div>
                <div>
                    <p className="bk-label-upper" style={{ marginBottom: 6 }}>Marchand</p>
                    <p style={{ margin: 0, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <Store size={14} aria-hidden="true" />
                        {txn.merchant_name || 'N/A'}
                    </p>
                </div>
                <div>
                    <p className="bk-label-upper" style={{ marginBottom: 6 }}>Carte</p>
                    <p style={{ margin: 0, display: 'inline-flex', gap: 6, alignItems: 'center', fontFamily: 'var(--bank-font-mono)' }}>
                        <CreditCard size={14} aria-hidden="true" />
                        {txn.masked_pan || 'N/A'}
                    </p>
                </div>
            </section>

            {timeline.length === 0 ? (
                <div className="bk-card">
                    <BankEmptyState
                        icon={<Activity size={20} aria-hidden="true" />}
                        title="Aucune etape disponible"
                        description="La transaction existe mais la timeline detaillee est vide."
                    />
                </div>
            ) : (
                <BankTable
                    columns={timelineColumns}
                    data={timeline}
                    rowKey={(row) => `${row.step}-${row.timestamp}`}
                    caption="Timeline transaction marchand"
                    emptyTitle="Timeline vide"
                    emptyDesc="Aucune information de traitement disponible."
                />
            )}

            {showRaw && (
                <section className="bk-card" style={{ marginTop: 'var(--bank-space-4)' }}>
                    <h2 style={{ marginTop: 0, marginBottom: 'var(--bank-space-3)', fontSize: 'var(--bank-text-base)' }}>
                        Donnees brutes
                    </h2>
                    <pre
                        style={{
                            margin: 0,
                            overflowX: 'auto',
                            fontSize: 'var(--bank-text-xs)',
                            background: 'var(--bank-bg-sunken)',
                            border: '1px solid var(--bank-border-subtle)',
                            borderRadius: 'var(--bank-radius-md)',
                            padding: 'var(--bank-space-3)',
                            color: 'var(--bank-text-secondary)',
                        }}
                    >
                        {JSON.stringify(timeline, null, 2)}
                    </pre>
                </section>
            )}
        </div>
    );
}
