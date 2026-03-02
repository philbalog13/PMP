'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@shared/context/AuthContext';
import { UserRole } from '@shared/types/user';
import {
    Activity, Search, RefreshCcw, ArrowUpRight, ArrowDownLeft,
    GitBranch, AlertTriangle, X
} from 'lucide-react';
import { NotionCard, NotionBadge, NotionSkeleton, NotionEmptyState } from '@shared/components/notion';

interface PlatformTransaction {
    id: string;
    transaction_id: string;
    stan: string;
    masked_pan: string;
    client_id: string;
    merchant_id: string;
    amount: string;
    currency: string;
    type: string;
    status: string;
    response_code: string;
    authorization_code: string;
    merchant_name: string;
    merchant_mcc: string;
    terminal_id: string;
    threeds_status: string;
    fraud_score: string;
    timestamp: string;
    settled_at: string | null;
    client_username: string;
    client_first_name: string;
    client_last_name: string;
    merchant_username: string;
    merchant_first_name: string;
    merchant_last_name: string;
}

const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
    APPROVED: 'success',
    DECLINED: 'danger',
    PENDING:  'warning',
    REFUNDED: 'default',
    REVERSED: 'default',
};

const STATUS_LABEL: Record<string, string> = {
    APPROVED: 'Approuvée',
    DECLINED: 'Refusée',
    PENDING:  'En attente',
    REFUNDED: 'Remboursée',
    REVERSED: 'Annulée',
};

export default function PlatformTransactionsPage() {
    const router = useRouter();
    const { isLoading, isAuthenticated, user } = useAuth();
    const [transactions, setTransactions] = useState<PlatformTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [selectedTxn, setSelectedTxn] = useState<PlatformTransaction | null>(null);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || '') : '';
            const params = new URLSearchParams({ limit: '200', page: '1' });
            if (statusFilter !== 'ALL') params.set('status', statusFilter);
            if (typeFilter !== 'ALL') params.set('type', typeFilter);
            if (searchTerm.trim()) params.set('search', searchTerm.trim());

            const res = await fetch(`/api/platform/transactions?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) {
                const text = await res.text();
                let msg = `Erreur ${res.status}`;
                try { msg = JSON.parse(text)?.error || msg; } catch { /* plain text response */ }
                throw new Error(msg);
            }
            const data = await res.json();
            setTransactions(data.transactions || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, typeFilter, searchTerm]);

    useEffect(() => {
        if (!isLoading && isAuthenticated) fetchTransactions();
    }, [isLoading, isAuthenticated, fetchTransactions]);

    /* ── Auth loading ──────────────────────────────────────────────────── */
    if (isLoading) {
        return (
            <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '1080px', margin: '0 auto' }}>
                <div style={{ marginBottom: 'var(--n-space-6)' }}>
                    <NotionSkeleton type="line" width="220px" height="28px" />
                    <div style={{ marginTop: 'var(--n-space-2)' }}><NotionSkeleton type="line" width="340px" height="14px" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--n-space-3)', marginBottom: 'var(--n-space-6)' }}>
                    {[...Array(4)].map((_, i) => <NotionSkeleton key={i} type="stat" />)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-2)' }}>
                    {[...Array(8)].map((_, i) => <NotionSkeleton key={i} type="list" />)}
                </div>
            </div>
        );
    }

    /* ── Access check ──────────────────────────────────────────────────── */
    if (!isAuthenticated || !user || (user.role !== UserRole.ETUDIANT && user.role !== UserRole.FORMATEUR)) {
        return (
            <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                <AlertTriangle size={40} style={{ color: 'var(--n-danger)', margin: '0 auto var(--n-space-4)' }} />
                <h1 style={{ fontSize: 'var(--n-text-lg)', fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)', marginBottom: 'var(--n-space-2)' }}>
                    Accès restreint
                </h1>
                <p style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)', marginBottom: 'var(--n-space-4)' }}>
                    Cette page est réservée aux étudiants et formateurs.
                </p>
                <Link href="/" style={{ color: 'var(--n-accent)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)' }}>
                    Retour au portail
                </Link>
            </div>
        );
    }

    const approved = transactions.filter(t => t.status === 'APPROVED');
    const declined = transactions.filter(t => t.status === 'DECLINED');
    const volume   = approved.reduce((s, t) => s + parseFloat(t.amount), 0).toFixed(2);

    /* ── Render ────────────────────────────────────────────────────────── */
    return (
        <div style={{ padding: 'var(--n-space-8) var(--n-space-6)', maxWidth: '1080px', margin: '0 auto' }}>

            {/* ── PAGE HEADER ─────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--n-space-4)', marginBottom: 'var(--n-space-7)' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)', letterSpacing: '-0.02em', marginBottom: 'var(--n-space-1)' }}>
                        Transactions Plateforme
                    </h1>
                    <p style={{ color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)' }}>
                        Vue globale de toutes les transactions de la plateforme PMP en temps réel.
                    </p>
                </div>
                <button
                    onClick={fetchTransactions}
                    disabled={loading}
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', padding: '6px 14px', borderRadius: 'var(--n-radius-sm)', border: '1px solid var(--n-border)', background: 'var(--n-bg-primary)', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)', cursor: loading ? 'default' : 'pointer', flexShrink: 0, opacity: loading ? 0.5 : 1 }}
                    onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.borderColor = 'var(--n-border-strong)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--n-border)'; }}
                >
                    <RefreshCcw size={13} /> Actualiser
                </button>
            </div>

            {/* ── STAT CARDS ──────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--n-space-3)', marginBottom: 'var(--n-space-7)' }}>
                {[
                    { label: 'Total',      value: transactions.length },
                    { label: 'Approuvées', value: approved.length },
                    { label: 'Refusées',   value: declined.length },
                    { label: 'Volume EUR', value: volume },
                ].map(({ label, value }) => (
                    <NotionCard key={label} variant="default" padding="sm">
                        <div style={{ padding: 'var(--n-space-2)', textAlign: 'center' }}>
                            <div style={{ fontSize: '20px', fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'], fontFamily: 'var(--n-font-mono)', color: 'var(--n-text-primary)', lineHeight: 1, marginBottom: '3px' }}>
                                {value}
                            </div>
                            <div style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>{label}</div>
                        </div>
                    </NotionCard>
                ))}
            </div>

            {/* ── FILTERS ─────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 'var(--n-space-3)', marginBottom: 'var(--n-space-5)', flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--n-text-tertiary)', pointerEvents: 'none' }} />
                    <input
                        type="text"
                        placeholder="Rechercher (ID, PAN, marchand)…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchTransactions()}
                        style={{ width: '100%', paddingLeft: '32px', paddingRight: '12px', paddingTop: '7px', paddingBottom: '7px', borderRadius: 'var(--n-radius-sm)', border: '1px solid var(--n-border)', background: 'var(--n-bg-primary)', color: 'var(--n-text-primary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)', outline: 'none', boxSizing: 'border-box' }}
                        onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'var(--n-border-strong)'}
                        onBlur={e  => (e.target as HTMLInputElement).style.borderColor = 'var(--n-border)'}
                    />
                </div>
                {/* Status */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ padding: '7px 12px', borderRadius: 'var(--n-radius-sm)', border: '1px solid var(--n-border)', background: 'var(--n-bg-primary)', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)', outline: 'none', cursor: 'pointer' }}
                >
                    <option value="ALL">Tous statuts</option>
                    <option value="APPROVED">Approuvé</option>
                    <option value="DECLINED">Refusé</option>
                    <option value="PENDING">En attente</option>
                    <option value="REFUNDED">Remboursé</option>
                </select>
                {/* Type */}
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    style={{ padding: '7px 12px', borderRadius: 'var(--n-radius-sm)', border: '1px solid var(--n-border)', background: 'var(--n-bg-primary)', color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)', outline: 'none', cursor: 'pointer' }}
                >
                    <option value="ALL">Tous types</option>
                    <option value="PURCHASE">Achat</option>
                    <option value="REFUND">Remboursement</option>
                    <option value="VOID">Annulation</option>
                </select>
            </div>

            {/* ── ERROR ───────────────────────────────────────────────── */}
            {error && (
                <div style={{ marginBottom: 'var(--n-space-5)', padding: 'var(--n-space-3) var(--n-space-4)', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-danger-bg)', border: '1px solid var(--n-danger-border)', color: 'var(--n-danger)', fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{error}</span>
                    <button onClick={fetchTransactions} style={{ fontSize: 'var(--n-text-xs)', textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>Réessayer</button>
                </div>
            )}

            {/* ── TRANSACTION LIST ─────────────────────────────────────── */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-2)' }}>
                    {[...Array(6)].map((_, i) => <NotionSkeleton key={i} type="list" />)}
                </div>
            ) : transactions.length === 0 ? (
                <NotionEmptyState
                    icon={<Activity size={28} />}
                    title="Aucune transaction trouvée"
                    description="Ajustez les filtres ou actualisez pour charger les transactions."
                    action={
                        <button
                            onClick={fetchTransactions}
                            style={{ display: 'inline-flex', alignItems: 'center', padding: '7px 16px', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-accent)', color: '#fff', fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], fontFamily: 'var(--n-font-sans)', border: 'none', cursor: 'pointer' }}
                        >
                            Actualiser
                        </button>
                    }
                />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-2)' }}>
                    {transactions.map((tx) => (
                        <NotionCard
                            key={tx.id}
                            variant="hover"
                            padding="sm"
                            onClick={() => setSelectedTxn(tx)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--n-space-4)', padding: 'var(--n-space-1)' }}>
                                {/* Left: icon + info */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-3)', flex: 1, minWidth: 0 }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {tx.type === 'REFUND'
                                            ? <ArrowDownLeft size={14} style={{ color: 'var(--n-info)' }} />
                                            : <ArrowUpRight  size={14} style={{ color: 'var(--n-text-tertiary)' }} />
                                        }
                                    </div>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', flexWrap: 'wrap', marginBottom: '2px' }}>
                                            <span style={{ fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {tx.merchant_name || 'N/A'}
                                            </span>
                                            <NotionBadge variant={STATUS_VARIANT[tx.status] || 'default'} size="sm">
                                                {STATUS_LABEL[tx.status] || tx.status}
                                            </NotionBadge>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-3)', fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', flexWrap: 'wrap' }}>
                                            <span style={{ fontFamily: 'var(--n-font-mono)' }}>{tx.masked_pan || '—'}</span>
                                            <span>{tx.client_first_name ? `${tx.client_first_name} ${tx.client_last_name || ''}` : tx.client_username || 'Client'}</span>
                                            <span>{tx.timestamp ? new Date(tx.timestamp).toLocaleString('fr-FR') : '—'}</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Right: amount */}
                                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                    <span style={{ fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-mono)' }}>
                                        {parseFloat(tx.amount).toFixed(2)}{' '}
                                        <span style={{ color: 'var(--n-text-tertiary)', fontWeight: 400, fontFamily: 'var(--n-font-sans)' }}>{tx.currency || 'EUR'}</span>
                                    </span>
                                </div>
                            </div>
                        </NotionCard>
                    ))}
                </div>
            )}

            {/* ── DETAIL MODAL ─────────────────────────────────────────── */}
            {selectedTxn && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--n-space-4)', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setSelectedTxn(null)}
                >
                    <div
                        style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', borderRadius: 'var(--n-radius)', background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', boxShadow: 'var(--n-shadow-lg)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ padding: 'var(--n-space-6)' }}>
                            {/* Modal header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--n-space-5)' }}>
                                <h2 style={{ fontSize: 'var(--n-text-base)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)' }}>
                                    Détail Transaction
                                </h2>
                                <button
                                    onClick={() => setSelectedTxn(null)}
                                    style={{ padding: '4px', borderRadius: 'var(--n-radius-sm)', border: 'none', background: 'none', color: 'var(--n-text-tertiary)', cursor: 'pointer' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--n-bg-elevated)'}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Amount highlight */}
                            <div style={{
                                borderRadius: 'var(--n-radius-sm)',
                                padding: 'var(--n-space-4)',
                                marginBottom: 'var(--n-space-5)',
                                textAlign: 'center',
                                background:  selectedTxn.status === 'APPROVED' ? 'var(--n-success-bg)' : selectedTxn.status === 'DECLINED' ? 'var(--n-danger-bg)' : 'var(--n-bg-elevated)',
                                border: `1px solid ${selectedTxn.status === 'APPROVED' ? 'var(--n-success-border)' : selectedTxn.status === 'DECLINED' ? 'var(--n-danger-border)' : 'var(--n-border)'}`,
                            }}>
                                <div style={{ fontSize: '24px', fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-mono)', marginBottom: 'var(--n-space-2)' }}>
                                    {parseFloat(selectedTxn.amount).toFixed(2)} EUR
                                </div>
                                <NotionBadge variant={STATUS_VARIANT[selectedTxn.status] || 'default'}>
                                    {STATUS_LABEL[selectedTxn.status] || selectedTxn.status}
                                </NotionBadge>
                            </div>

                            {/* Fields */}
                            <div style={{ marginBottom: 'var(--n-space-6)' }}>
                                <ModalRow label="Transaction ID"  value={selectedTxn.transaction_id} />
                                <ModalRow label="STAN"            value={selectedTxn.stan} />
                                <ModalRow label="Code Auth."      value={selectedTxn.authorization_code} />
                                <ModalRow label="Code Réponse"    value={selectedTxn.response_code} />
                                <ModalRow label="Type"            value={selectedTxn.type} />
                                <ModalRow label="Carte"           value={selectedTxn.masked_pan} />
                                <ModalRow label="Terminal"        value={selectedTxn.terminal_id} />
                                <ModalRow label="Marchand"        value={selectedTxn.merchant_name} />
                                <ModalRow label="MCC"             value={selectedTxn.merchant_mcc} />
                                <ModalRow label="Client"          value={selectedTxn.client_first_name ? `${selectedTxn.client_first_name} ${selectedTxn.client_last_name || ''}` : selectedTxn.client_username} />
                                <ModalRow label="Score Fraude"    value={selectedTxn.fraud_score ? `${parseFloat(selectedTxn.fraud_score).toFixed(1)}/100` : 'N/A'} />
                                <ModalRow label="3DS"             value={selectedTxn.threeds_status || 'N/A'} />
                                <ModalRow label="Date"            value={selectedTxn.timestamp ? new Date(selectedTxn.timestamp).toLocaleString('fr-FR') : 'N/A'} />
                                <ModalRow label="Réglé le"        value={selectedTxn.settled_at ? new Date(selectedTxn.settled_at).toLocaleString('fr-FR') : 'Non réglé'} />
                            </div>

                            {/* Timeline CTA */}
                            <button
                                onClick={() => { setSelectedTxn(null); router.push(`/student/transactions/${selectedTxn.id}/timeline`); }}
                                style={{ width: '100%', padding: 'var(--n-space-3)', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-accent)', color: '#fff', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], fontSize: 'var(--n-text-sm)', fontFamily: 'var(--n-font-sans)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--n-space-2)' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.88'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                            >
                                <GitBranch size={16} />
                                Voir la Timeline Interactive
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ModalRow({ label, value }: { label: string; value: string | null | undefined }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--n-space-2) 0', borderBottom: '1px solid var(--n-border)' }}>
            <span style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-mono)', textAlign: 'right', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {value || 'N/A'}
            </span>
        </div>
    );
}
