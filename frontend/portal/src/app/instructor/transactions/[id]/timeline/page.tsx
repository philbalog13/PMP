'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Activity, Clock, Store, CreditCard, ChevronDown, ChevronUp, Code, User, type LucideIcon } from 'lucide-react';
import type { TimelineStep } from '@shared/components/TransactionTimeline';

const TransactionTimeline = dynamic(
    () => import('@shared/components/TransactionTimeline'),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            </div>
        )
    }
);

type TransactionSummary = {
    transaction_id: string;
    status: string;
    amount: number;
    merchant_name: string;
    masked_pan: string;
    client_first_name: string;
    client_last_name: string;
    client_username: string;
    processing_steps: unknown;
};

const asObject = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const toNumber = (value: unknown): number => {
    const parsed = Number.parseFloat(String(value ?? '0'));
    return Number.isFinite(parsed) ? parsed : 0;
};

const toCategory = (value: unknown): TimelineStep['category'] => {
    const category = String(value ?? '').toLowerCase();
    if (category === 'security' || category === 'decision' || category === 'data') {
        return category;
    }
    return 'process';
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
        status: String(source.status || ''),
        amount: toNumber(source.amount),
        merchant_name: String(source.merchant_name || source.merchantName || ''),
        masked_pan: String(source.masked_pan || source.maskedPan || ''),
        client_first_name: String(source.client_first_name || source.clientFirstName || ''),
        client_last_name: String(source.client_last_name || source.clientLastName || ''),
        client_username: String(source.client_username || source.clientUsername || ''),
        processing_steps: source.processing_steps,
    };
};

const normalizeTimeline = (raw: unknown, fallback: unknown): TimelineStep[] => {
    const source = Array.isArray(raw) ? raw : Array.isArray(fallback) ? fallback : [];
    return source.map((step, index) => {
        const row = asObject(step);
        const stepNumber = Number.parseInt(String(row.step ?? index + 1), 10);
        const details = asObject(row.details);

        return {
            step: Number.isFinite(stepNumber) ? stepNumber : index + 1,
            name: String(row.name || row.step_name || `Step ${index + 1}`),
            category: toCategory(row.category),
            status: String(row.status || 'pending'),
            timestamp: String(row.timestamp || ''),
            duration_ms: toNumber(row.duration_ms),
            details,
        };
    });
};

export default function InstructorTimelinePage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [txn, setTxn] = useState<TransactionSummary | null>(null);
    const [timeline, setTimeline] = useState<TimelineStep[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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
                if (data.success === false) {
                    throw new Error(String(data.error || 'Failed'));
                }

                const transaction = normalizeTransaction(data.transaction);
                setTxn(transaction);
                setTimeline(normalizeTimeline(data.timeline, transaction?.processing_steps));
            })
            .catch((loadError: unknown) => setError(getErrorMessage(loadError, 'Impossible de charger la timeline')))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '40px', height: '40px', border: '2px solid var(--n-border)', borderTopColor: 'var(--n-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '13px', color: 'var(--n-text-tertiary)' }}>Chargement de la timeline...</p>
                </div>
            </div>
        );
    }

    if (error || !txn) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)', padding: '32px' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', paddingTop: '80px' }}>
                    <p style={{ color: 'var(--n-warning)', marginBottom: '16px' }}>{error}</p>
                    <button onClick={() => router.back()} style={{ color: 'var(--n-accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>Retour</button>
                </div>
            </div>
        );
    }

    const isApproved = txn.status === 'APPROVED';
    const amount = txn.amount;
    const totalDuration = timeline.reduce((sum, step) => sum + step.duration_ms, 0);
    const clientName = txn.client_first_name
        ? `${txn.client_first_name} ${txn.client_last_name || ''}`.trim()
        : (txn.client_username || 'Client');
    const merchantName = txn.merchant_name || 'Marchand';

    return (
        <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)' }}>
            {/* Header sticky */}
            <div style={{ borderBottom: '1px solid var(--n-border)', background: 'var(--n-bg-primary)', position: 'sticky', top: 0, zIndex: 50 }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button onClick={() => router.push('/instructor/transactions')} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--n-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                            <ArrowLeft size={14} />
                            Transactions
                        </button>
                        <div style={{ width: '1px', height: '20px', background: 'var(--n-border)' }} />
                        <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--n-text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                            <Activity size={18} style={{ color: 'var(--n-accent)' }} />
                            Timeline Transaction
                        </h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
                        <span style={{ color: 'var(--n-text-tertiary)' }} className="hidden md:inline">{txn.transaction_id}</span>
                        <span style={{
                            padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700,
                            background: isApproved ? 'var(--n-success-bg)' : 'var(--n-danger-bg)',
                            color: isApproved ? 'var(--n-success)' : 'var(--n-danger)'
                        }}>
                            {txn.status}
                        </span>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
                {/* Summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '20px' }}>
                    <SummaryCard icon={CreditCard} label="Montant" value={`${amount.toFixed(2)} EUR`} />
                    <SummaryCard icon={Store} label="Marchand" value={merchantName} />
                    <SummaryCard icon={User} label="Client" value={clientName} />
                    <SummaryCard icon={CreditCard} label="Carte" value={txn.masked_pan || 'N/A'} />
                    <SummaryCard icon={Clock} label="Durée totale" value={`${totalDuration}ms`} />
                    <SummaryCard icon={Activity} label="Étapes" value={`${timeline.length}`} />
                </div>

                {/* Légende */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                    <LegendItem color="#3b82f6" label="Process" />
                    <LegendItem color="#f59e0b" label="Sécurité" />
                    <LegendItem color="#8b5cf6" label="Decision" />
                    <LegendItem color="#10b981" label="Données" />
                    <div style={{ width: '1px', height: '16px', background: 'var(--n-border)' }} />
                    <LegendItem color="#10b981" label="Succès" border />
                    <LegendItem color="#ef4444" label="Échec" border />
                    <LegendItem color="#3b82f6" label="En attente" dashed />
                </div>

                {/* Timeline */}
                <div style={{ borderRadius: '8px', border: '1px solid var(--n-border)', background: 'var(--n-bg-primary)', overflow: 'hidden', marginBottom: '20px' }}>
                    {timeline.length > 0 ? (
                        <TransactionTimeline steps={timeline} />
                    ) : (
                        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--n-text-tertiary)' }}>
                            <Activity size={32} style={{ margin: '0 auto 12px' }} />
                            <p>Aucune donnée de timeline disponible</p>
                        </div>
                    )}
                </div>

                {/* Raw data */}
                <button onClick={() => setShowRaw(!showRaw)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--n-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '12px' }}>
                    <Code size={13} />
                    Données brutes
                    {showRaw ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {showRaw && (
                    <div style={{ borderRadius: '8px', border: '1px solid var(--n-border)', background: 'var(--n-bg-secondary)', padding: '16px', overflowX: 'auto' }}>
                        <pre style={{ fontSize: '12px', color: 'var(--n-text-secondary)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0 }}>
                            {JSON.stringify(timeline, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}

function SummaryCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
    return (
        <div style={{ borderRadius: '8px', border: '1px solid var(--n-border)', background: 'var(--n-bg-primary)', padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Icon size={12} style={{ color: 'var(--n-text-tertiary)' }} />
                <span style={{ fontSize: '11px', color: 'var(--n-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--n-text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        </div>
    );
}

function LegendItem({ color, label, border, dashed }: { color: string; label: string; border?: boolean; dashed?: boolean }) {
    const style: React.CSSProperties = {
        width: '12px', height: '12px', borderRadius: '3px', flexShrink: 0,
        background: border || dashed ? 'transparent' : color,
        border: border ? `2px solid ${color}` : dashed ? `1px dashed ${color}` : 'none'
    };
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={style} />
            <span style={{ fontSize: '11px', color: 'var(--n-text-tertiary)' }}>{label}</span>
        </div>
    );
}
