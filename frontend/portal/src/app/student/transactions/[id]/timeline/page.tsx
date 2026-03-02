'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { TimelineStep } from '@shared/components/TransactionTimeline';
import {
    ArrowLeft,
    Activity,
    Clock,
    Store,
    CreditCard,
    ChevronDown,
    ChevronUp,
    Code,
    User,
    Shield,
    GitBranch,
    Database,
    Hash,
    Fingerprint,
    Server,
    type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { NotionCard, NotionBadge, NotionSkeleton, NotionEmptyState } from '@shared/components/notion';

/* ── Dynamic import ─────────────────────────────────────────────────────── */

const TransactionTimeline = dynamic(
    () => import('@shared/components/TransactionTimeline'),
    {
        ssr: false,
        loading: () => (
            <div style={{ padding: 'var(--n-space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--n-space-3)' }}>
                {[...Array(5)].map((_, i) => <NotionSkeleton key={i} type="list" />)}
            </div>
        )
    }
);

/* ── Types ──────────────────────────────────────────────────────────────── */

type TransactionSummary = {
    transaction_id: string;
    status: string;
    amount: number;
    currency: string;
    response_code: string;
    authorization_code: string;
    stan: string;
    terminal_id: string;
    merchant_mcc: string;
    fraud_score: number | null;
    client_first_name: string;
    client_last_name: string;
    client_username: string;
    merchant_name: string;
    merchant_first_name: string;
    merchant_last_name: string;
    merchant_username: string;
    masked_pan: string;
    processing_steps: unknown;
};

type ServiceItem = {
    name: string;
    icon: LucideIcon;
    desc: string;
    color: string;
    glowColor: string;
};

/* ── Constants ──────────────────────────────────────────────────────────── */

const SERVICES: ServiceItem[] = [
    { name: 'POS Terminal',    icon: CreditCard, desc: 'Point de vente',       color: '#38bdf8', glowColor: 'rgba(56,189,248,0.15)'  },
    { name: 'Acquirer',        icon: Store,      desc: 'Banque acquéreur',      color: '#60a5fa', glowColor: 'rgba(96,165,250,0.15)'  },
    { name: 'Network Switch',  icon: Server,     desc: 'Réseau interbancaire',  color: '#818cf8', glowColor: 'rgba(129,140,248,0.15)' },
    { name: 'Fraud Detection', icon: Shield,     desc: 'Analyse de fraude',     color: '#f59e0b', glowColor: 'rgba(245,158,11,0.15)'  },
    { name: 'Auth Engine',     icon: GitBranch,  desc: 'Moteur autorisation',   color: '#a78bfa', glowColor: 'rgba(167,139,250,0.15)' },
    { name: 'Issuer',          icon: Fingerprint,desc: 'Banque émettrice',      color: '#f472b6', glowColor: 'rgba(244,114,182,0.15)' },
    { name: 'Ledger',          icon: Database,   desc: 'Comptabilité',          color: '#f59e0b', glowColor: 'rgba(245,158,11,0.15)'  },
    { name: 'Settlement',      icon: Hash,       desc: 'Compensation',          color: '#2dd4bf', glowColor: 'rgba(45,212,191,0.15)'  },
];

const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
    APPROVED: 'success',
    DECLINED: 'danger',
    PENDING:  'warning',
};

/* ── Helpers (business logic — unchanged) ───────────────────────────────── */

const asObject = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const toNumber = (value: unknown): number => {
    const parsed = Number.parseFloat(String(value ?? '0'));
    return Number.isFinite(parsed) ? parsed : 0;
};

const toCategory = (value: unknown): TimelineStep['category'] => {
    const category = String(value ?? '').toLowerCase();
    if (category === 'security' || category === 'decision' || category === 'data') return category;
    return 'process';
};

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
};

const normalizeTransaction = (raw: unknown): TransactionSummary | null => {
    const source = asObject(raw);
    if (Object.keys(source).length === 0) return null;
    const scoreRaw = source.fraud_score;
    return {
        transaction_id:    String(source.transaction_id    || source.transactionId    || ''),
        status:            String(source.status            || ''),
        amount:            toNumber(source.amount),
        currency:          String(source.currency          || 'EUR'),
        response_code:     String(source.response_code     || source.responseCode     || ''),
        authorization_code:String(source.authorization_code|| source.authorizationCode|| ''),
        stan:              String(source.stan               || ''),
        terminal_id:       String(source.terminal_id       || source.terminalId       || ''),
        merchant_mcc:      String(source.merchant_mcc      || source.merchantMcc      || ''),
        fraud_score:       scoreRaw === null || scoreRaw === undefined ? null : toNumber(scoreRaw),
        client_first_name: String(source.client_first_name || source.clientFirstName  || ''),
        client_last_name:  String(source.client_last_name  || source.clientLastName   || ''),
        client_username:   String(source.client_username   || source.clientUsername   || ''),
        merchant_name:     String(source.merchant_name     || source.merchantName     || ''),
        merchant_first_name:String(source.merchant_first_name||source.merchantFirstName||''),
        merchant_last_name: String(source.merchant_last_name ||source.merchantLastName ||''),
        merchant_username: String(source.merchant_username || source.merchantUsername || ''),
        masked_pan:        String(source.masked_pan        || source.maskedPan        || ''),
        processing_steps:  source.processing_steps,
    };
};

const normalizeTimeline = (raw: unknown, fallback: unknown): TimelineStep[] => {
    const source = Array.isArray(raw) ? raw : Array.isArray(fallback) ? fallback : [];
    return source.map((step, index) => {
        const row = asObject(step);
        const stepNumber = Number.parseInt(String(row.step ?? index + 1), 10);
        const details = asObject(row.details);
        return {
            step:        Number.isFinite(stepNumber) ? stepNumber : index + 1,
            name:        String(row.name || row.step_name || `Step ${index + 1}`),
            category:    toCategory(row.category),
            status:      String(row.status || 'pending'),
            timestamp:   String(row.timestamp || ''),
            duration_ms: toNumber(row.duration_ms),
            details,
        };
    });
};

/* ── Component ──────────────────────────────────────────────────────────── */

export default function StudentTransactionTimelinePage() {
    const params = useParams();
    const router = useRouter();
    const id     = params.id as string;

    const [txn,     setTxn]     = useState<TransactionSummary | null>(null);
    const [timeline,setTimeline] = useState<TimelineStep[]>([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState<string | null>(null);
    const [showRaw, setShowRaw] = useState(false);

    useEffect(() => {
        if (!id) return;
        const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || '') : '';
        void fetch(`/api/platform/transactions/${id}/timeline`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then((res) => res.json() as Promise<unknown>)
            .then((payload) => {
                const data = asObject(payload);
                if (data.success === false) throw new Error(String(data.error || 'Échec du chargement'));
                const transaction = normalizeTransaction(data.transaction);
                setTxn(transaction);
                setTimeline(normalizeTimeline(data.timeline, transaction?.processing_steps));
            })
            .catch((loadError: unknown) => setError(getErrorMessage(loadError, 'Impossible de charger la timeline')))
            .finally(() => setLoading(false));
    }, [id]);

    /* ── Loading ── */
    if (loading) {
        return (
            <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '960px', margin: '0 auto' }}>
                <div style={{ marginBottom: 'var(--n-space-5)' }}><NotionSkeleton type="line" width="140px" height="14px" /></div>
                <NotionSkeleton type="card" />
                <div style={{ marginTop: 'var(--n-space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--n-space-2)' }}>
                    {[...Array(6)].map((_, i) => <NotionSkeleton key={i} type="list" />)}
                </div>
            </div>
        );
    }

    /* ── Error ── */
    if (error || !txn) {
        return (
            <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '960px', margin: '0 auto' }}>
                <NotionEmptyState
                    icon={<Activity size={28} />}
                    title={error || 'Transaction introuvable'}
                    description="Vérifiez que vous êtes connecté et que la transaction existe."
                    action={
                        <button
                            onClick={() => router.back()}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--n-space-2)', padding: '7px 16px', borderRadius: 'var(--n-radius-sm)', border: '1px solid var(--n-border)', background: 'var(--n-bg-primary)', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)', cursor: 'pointer' }}
                        >
                            <ArrowLeft size={14} /> Retour
                        </button>
                    }
                />
            </div>
        );
    }

    /* ── Derived values ── */
    const isApproved    = txn.status === 'APPROVED';
    const totalDuration = timeline.reduce((sum, step) => sum + step.duration_ms, 0);
    const clientName    = txn.client_first_name
        ? `${txn.client_first_name} ${txn.client_last_name || ''}`.trim()
        : (txn.client_username || 'Client');
    const merchantName  = txn.merchant_name
        || (txn.merchant_first_name
            ? `${txn.merchant_first_name} ${txn.merchant_last_name || ''}`.trim()
            : (txn.merchant_username || 'Marchand'));

    /* ── Info pills data ── */
    type Pill = { label: string; value: string; variant: 'success' | 'danger' | 'warning' | 'default' };
    const pills: Pill[] = [
        ...(txn.response_code ? [{ label: 'Réponse', value: txn.response_code, variant: (txn.response_code === '00' ? 'success' : 'danger') as Pill['variant'] }] : []),
        ...(txn.authorization_code ? [{ label: 'Auth',     value: txn.authorization_code, variant: 'default' as Pill['variant'] }] : []),
        ...(txn.stan               ? [{ label: 'STAN',     value: txn.stan,               variant: 'default' as Pill['variant'] }] : []),
        ...(txn.terminal_id        ? [{ label: 'Terminal', value: txn.terminal_id,        variant: 'default' as Pill['variant'] }] : []),
        ...(txn.merchant_mcc       ? [{ label: 'MCC',      value: txn.merchant_mcc,       variant: 'default' as Pill['variant'] }] : []),
        ...(txn.fraud_score !== null ? [{ label: 'Score fraude', value: `${txn.fraud_score}/100`, variant: (txn.fraud_score < 30 ? 'success' : txn.fraud_score < 70 ? 'warning' : 'danger') as Pill['variant'] }] : []),
    ];

    /* ── Render ── */
    return (
        <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '960px', margin: '0 auto' }}>

            {/* ── BACK LINK ────────────────────────────────────────────── */}
            <Link
                href="/student/transactions"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--n-space-2)', fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)', textDecoration: 'none', marginBottom: 'var(--n-space-5)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--n-text-primary)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--n-text-secondary)'}
            >
                <ArrowLeft size={14} /> Transactions
            </Link>

            {/* ── PAGE HEADER ──────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--n-space-4)', marginBottom: 'var(--n-space-7)' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)', letterSpacing: '-0.02em', marginBottom: 'var(--n-space-1)' }}>
                        Timeline Transaction
                    </h1>
                    <p style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-mono)' }}>
                        {txn.transaction_id}
                    </p>
                </div>
                <NotionBadge variant={STATUS_VARIANT[txn.status] || 'default'}>{txn.status}</NotionBadge>
            </div>

            {/* ── SUMMARY CARDS ────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--n-space-3)', marginBottom: 'var(--n-space-6)' }}>
                {[
                    { Icon: CreditCard, label: 'Montant',   value: `${txn.amount.toFixed(2)} ${txn.currency || 'EUR'}` },
                    { Icon: Store,      label: 'Marchand',  value: merchantName },
                    { Icon: CreditCard, label: 'Carte',     value: txn.masked_pan || 'N/A' },
                    { Icon: Clock,      label: 'Traitement',value: `${totalDuration}ms` },
                ].map(({ Icon, label, value }) => (
                    <NotionCard key={label} variant="default" padding="sm">
                        <div style={{ padding: 'var(--n-space-1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-1)', marginBottom: '4px' }}>
                                <Icon size={11} style={{ color: 'var(--n-text-tertiary)' }} />
                                <span style={{ fontSize: '10px', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</span>
                            </div>
                            <span style={{ fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {value}
                            </span>
                        </div>
                    </NotionCard>
                ))}
            </div>

            {/* ── INFO PILLS ───────────────────────────────────────────── */}
            {pills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-5)' }}>
                    {pills.map((pill) => (
                        <div key={pill.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>{pill.label}:</span>
                            <NotionBadge variant={pill.variant} size="sm">{pill.value}</NotionBadge>
                        </div>
                    ))}
                </div>
            )}

            {/* ── SERVICES ─────────────────────────────────────────────── */}
            <NotionCard variant="default" padding="sm" style={{ marginBottom: 'var(--n-space-5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-3)', padding: 'var(--n-space-1) var(--n-space-2) 0' }}>
                    <Server size={12} style={{ color: 'var(--n-text-tertiary)' }} />
                    <span style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                        Services impliqués dans le flux
                    </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--n-space-2)', padding: '0 var(--n-space-2) var(--n-space-1)' }}>
                    {SERVICES.map((service) => (
                        <div
                            key={service.name}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-bg-elevated)', border: '1px solid var(--n-border)' }}
                        >
                            <service.icon size={12} style={{ color: service.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)', fontWeight: 500 }}>{service.name}</span>
                        </div>
                    ))}
                </div>
            </NotionCard>

            {/* ── TIMELINE ─────────────────────────────────────────────── */}
            <NotionCard variant="default" padding="none" style={{ marginBottom: 'var(--n-space-5)', overflow: 'hidden' }}>
                {timeline.length > 0 ? (
                    <TransactionTimeline steps={timeline} />
                ) : (
                    <div style={{ padding: 'var(--n-space-8)', textAlign: 'center' }}>
                        <Activity size={28} style={{ color: 'var(--n-text-tertiary)', margin: '0 auto var(--n-space-3)' }} />
                        <p style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>
                            Aucune donnée de timeline disponible
                        </p>
                    </div>
                )}
            </NotionCard>

            {/* ── RAW DATA TOGGLE ──────────────────────────────────────── */}
            <button
                onClick={() => setShowRaw(!showRaw)}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', fontSize: 'var(--n-text-sm)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 'var(--n-space-3)', padding: 0 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--n-text-secondary)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--n-text-tertiary)'}
            >
                <Code size={14} />
                Données brutes (ISO 8583)
                {showRaw ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showRaw && (
                <NotionCard variant="default" padding="md" style={{ marginBottom: 'var(--n-space-5)', overflowX: 'auto' }}>
                    <pre style={{ fontSize: 'var(--n-text-xs)', fontFamily: 'var(--n-font-mono)', color: 'var(--n-text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>
                        {JSON.stringify(timeline, null, 2)}
                    </pre>
                </NotionCard>
            )}

            {/* ── FOOTER ───────────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 'var(--n-space-4)', borderTop: '1px solid var(--n-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>
                    <User size={12} />
                    Client : <span style={{ color: 'var(--n-text-secondary)' }}>{clientName}</span>
                </div>
                <button
                    onClick={() => router.push('/student/transactions')}
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--n-text-primary)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--n-text-secondary)'}
                >
                    <ArrowLeft size={14} /> Retour aux transactions
                </button>
            </div>
        </div>
    );
}
