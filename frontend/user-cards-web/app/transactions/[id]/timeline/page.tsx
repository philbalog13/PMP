'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api-client';
import {
    Activity,
    AlertTriangle,
    ArrowLeft,
    Clock,
    CreditCard,
    Hash,
    Shield,
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

const normalizeTransaction = (raw: unknown): TransactionSummary | null => {
    const source = asObject(raw);
    if (Object.keys(source).length === 0) return null;
    return {
        transaction_id: String(source.transaction_id || source.transactionId || ''),
        status: String(source.status || 'PENDING'),
        amount: toNumber(source.amount),
        merchant_name: String(source.merchant_name || source.merchantName || ''),
        masked_pan: String(source.masked_pan || source.maskedPan || ''),
        currency: String(source.currency || 'EUR'),
    };
};

const normalizeCategory = (value: unknown): TimelineCategory => {
    const category = String(value || '').toLowerCase();
    if (category === 'process' || category === 'security' || category === 'decision' || category === 'data') {
        return category;
    }
    return 'process';
};

const normalizeTimeline = (raw: unknown): TimelineStep[] => {
    if (!Array.isArray(raw)) return [];
    return raw.map((step, index) => {
        const source = asObject(step);
        return {
            step: Number.parseInt(String(source.step ?? index + 1), 10) || (index + 1),
            name: String(source.name || `Step ${index + 1}`),
            category: normalizeCategory(source.category),
            status: String(source.status || 'pending'),
            timestamp: String(source.timestamp || source.created_at || new Date().toISOString()),
            duration_ms: toNumber(source.duration_ms ?? source.durationMs),
            details: asObject(source.details),
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

export default function TimelinePage() {
    const params = useParams();
    const router = useRouter();
    const id = String(params.id || '');

    const [txn, setTxn] = useState<TransactionSummary | null>(null);
    const [timeline, setTimeline] = useState<TimelineStep[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showRaw, setShowRaw] = useState(false);

    useEffect(() => {
        if (!id) return;
        let active = true;
        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await clientApi.getTransactionTimeline(id);
                if (!active) return;
                setTxn(normalizeTransaction(data.transaction));
                setTimeline(normalizeTimeline(data.timeline));
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
    }, [id]);

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

    if (loading) {
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
                        <BankButton variant="ghost" onClick={() => router.push('/transactions')}>
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
                subtitle="Parcours complet de la transaction depuis l initiation jusqu au reglement."
                actions={(
                    <div style={{ display: 'flex', gap: 'var(--bank-space-2)', flexWrap: 'wrap' }}>
                        <BankButton variant="ghost" size="sm" icon={ArrowLeft} onClick={() => router.push(`/transactions/${id}`)}>
                            Retour detail
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
                <StatCard
                    label="Montant"
                    value={formatMoney(txn.amount, txn.currency || 'EUR')}
                    icon={CreditCard}
                    index={0}
                />
                <StatCard label="Etapes" value={String(timeline.length)} icon={Activity} index={1} />
                <StatCard label="Duree totale" value={`${totalDuration}ms`} icon={Clock} index={2} />
                <StatCard
                    label="Statut final"
                    value={txn.status.toUpperCase()}
                    icon={Shield}
                    accent={txn.status.toUpperCase() === 'APPROVED'}
                    index={3}
                />
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
                    caption="Timeline transaction client"
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
