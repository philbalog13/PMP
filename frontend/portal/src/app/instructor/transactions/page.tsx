'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../auth/useAuth';
import {
    Activity, Search, RefreshCw, ArrowUpRight, ArrowDownLeft,
    GitBranch, X
} from 'lucide-react';
import { NotionSkeleton } from '@shared/components/notion/NotionSkeleton';

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

const STATUS_TOKENS: Record<string, { color: string; bg: string; border: string }> = {
    APPROVED: { color: 'var(--n-success)', bg: 'var(--n-success-bg)', border: 'var(--n-success-border)' },
    DECLINED: { color: 'var(--n-danger)', bg: 'var(--n-danger-bg)', border: 'var(--n-danger-border)' },
    PENDING:  { color: 'var(--n-warning)', bg: 'var(--n-warning-bg)', border: 'var(--n-warning-border)' },
    REFUNDED: { color: 'var(--n-accent)', bg: 'var(--n-accent-bg)', border: 'var(--n-accent-border)' },
    REVERSED: { color: '#8b5cf6', bg: '#8b5cf610', border: '#8b5cf630' },
};

export default function InstructorTransactionsPage() {
    const router = useRouter();
    const { isLoading, isAuthenticated } = useAuth(true);
    const [transactions, setTransactions] = useState<PlatformTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [selectedTxn, setSelectedTxn] = useState<PlatformTransaction | null>(null);
    const searchTermRef = useRef(searchTerm);

    useEffect(() => {
        searchTermRef.current = searchTerm;
    }, [searchTerm]);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || '') : '';
            const params = new URLSearchParams({ limit: '200', page: '1' });
            if (statusFilter !== 'ALL') params.set('status', statusFilter);
            if (typeFilter !== 'ALL') params.set('type', typeFilter);
            const currentSearch = searchTermRef.current.trim();
            if (currentSearch) params.set('search', currentSearch);

            const res = await fetch(`/api/platform/transactions?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) {
                const text = await res.text();
                let msg = `Erreur ${res.status}`;
                try { msg = JSON.parse(text)?.error || msg; } catch { /* plain text */ }
                throw new Error(msg);
            }
            const data = await res.json();
            setTransactions(data.transactions || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, typeFilter]);

    useEffect(() => {
        if (!isLoading && isAuthenticated) fetchTransactions();
    }, [isLoading, isAuthenticated, fetchTransactions]);

    const approvedCount = transactions.filter(t => t.status === 'APPROVED').length;
    const declinedCount = transactions.filter(t => t.status === 'DECLINED').length;
    const totalVolume = transactions.filter(t => t.status === 'APPROVED').reduce((s, t) => s + parseFloat(t.amount), 0);

    const SELECT_STYLE: React.CSSProperties = {
        padding: '9px 12px', borderRadius: 8, border: '1px solid var(--n-border)',
        background: 'var(--n-bg-secondary)', color: 'var(--n-text-primary)', fontSize: 13, outline: 'none',
    };

    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)' }}>
                <div style={{ background: 'var(--n-bg-primary)', borderBottom: '1px solid var(--n-border)', padding: '24px 32px' }}>
                    <NotionSkeleton type="title" />
                </div>
                <div style={{ padding: '32px', maxWidth: 1200, margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                        {[...Array(4)].map((_, i) => <NotionSkeleton key={i} type="stat" />)}
                    </div>
                    {[...Array(6)].map((_, i) => <div key={i} style={{ marginBottom: 8 }}><NotionSkeleton type="card" /></div>)}
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)' }}>
            {/* Page Header */}
            <div style={{ background: 'var(--n-bg-primary)', borderBottom: '1px solid var(--n-border)', padding: '24px 32px' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--n-accent-bg)', border: '1px solid var(--n-accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Activity size={20} style={{ color: 'var(--n-accent)' }} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--n-text-primary)', margin: 0 }}>Transactions Plateforme</h1>
                            <p style={{ fontSize: 13, color: 'var(--n-text-tertiary)', margin: '2px 0 0' }}>
                                Vue formateur — toutes les transactions PMP
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={fetchTransactions}
                        disabled={loading}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--n-border)', background: 'var(--n-bg-secondary)', color: 'var(--n-text-secondary)', fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer' }}
                    >
                        <RefreshCw size={14} style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
                        Actualiser
                    </button>
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: '32px', maxWidth: 1200, margin: '0 auto' }}>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                    <StatCard label="Total" value={transactions.length} accent="var(--n-text-primary)" accentBg="var(--n-bg-tertiary)" />
                    <StatCard label="Approuvées" value={approvedCount} accent="var(--n-success)" accentBg="var(--n-success-bg)" />
                    <StatCard label="Refusées" value={declinedCount} accent="var(--n-danger)" accentBg="var(--n-danger-bg)" />
                    <StatCard label="Volume" value={`${totalVolume.toFixed(2)} EUR`} accent="var(--n-accent)" accentBg="var(--n-accent-bg)" />
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                        <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-text-tertiary)', pointerEvents: 'none' }} />
                        <input
                            type="text"
                            placeholder="Rechercher (ID, PAN, marchand)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchTransactions()}
                            style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, borderRadius: 8, border: '1px solid var(--n-border)', background: 'var(--n-bg-secondary)', color: 'var(--n-text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={SELECT_STYLE}>
                        <option value="ALL">Tous statuts</option>
                        <option value="APPROVED">Approuvé</option>
                        <option value="DECLINED">Refusé</option>
                        <option value="PENDING">En attente</option>
                        <option value="REFUNDED">Remboursé</option>
                    </select>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={SELECT_STYLE}>
                        <option value="ALL">Tous types</option>
                        <option value="PURCHASE">Achat</option>
                        <option value="REFUND">Remboursement</option>
                        <option value="VOID">Annulation</option>
                    </select>
                </div>

                {/* Error */}
                {error && (
                    <div style={{ padding: '12px 16px', background: 'var(--n-danger-bg)', border: '1px solid var(--n-danger-border)', borderRadius: 8, color: 'var(--n-danger)', fontSize: 13, marginBottom: 20 }}>
                        {error}
                    </div>
                )}

                {/* Transactions list */}
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[...Array(6)].map((_, i) => <NotionSkeleton key={i} type="card" />)}
                    </div>
                ) : transactions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '64px 16px', color: 'var(--n-text-tertiary)', fontSize: 14 }}>
                        Aucune transaction trouvée
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {transactions.map((tx) => {
                            const tokens = STATUS_TOKENS[tx.status] || { color: 'var(--n-text-tertiary)', bg: 'var(--n-bg-tertiary)', border: 'var(--n-border)' };
                            return (
                                <div
                                    key={tx.id}
                                    onClick={() => setSelectedTxn(tx)}
                                    style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: 9, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--n-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {tx.type === 'REFUND'
                                                ? <ArrowDownLeft size={14} style={{ color: 'var(--n-success)' }} />
                                                : <ArrowUpRight size={14} style={{ color: 'var(--n-text-tertiary)' }} />
                                            }
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {tx.merchant_name || 'N/A'}
                                                </span>
                                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 5, background: tokens.bg, border: `1px solid ${tokens.border}`, color: tokens.color, textTransform: 'uppercase', flexShrink: 0 }}>
                                                    {tx.status}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--n-text-tertiary)', marginTop: 2 }}>
                                                <span>{tx.masked_pan || '-'}</span>
                                                <span>{tx.client_first_name ? `${tx.client_first_name} ${tx.client_last_name || ''}` : tx.client_username || 'Client'}</span>
                                                <span>{tx.timestamp ? new Date(tx.timestamp).toLocaleString('fr-FR') : '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--n-text-primary)', flexShrink: 0 }}>
                                        {parseFloat(tx.amount).toFixed(2)} {tx.currency || 'EUR'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedTxn && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                    onClick={() => setSelectedTxn(null)}
                >
                    <div
                        style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ padding: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--n-text-primary)', margin: 0 }}>Détail Transaction</h2>
                                <button
                                    onClick={() => setSelectedTxn(null)}
                                    style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-text-tertiary)', borderRadius: 6 }}
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Amount banner */}
                            <div style={{
                                borderRadius: 8, padding: '16px 12px', marginBottom: 16, textAlign: 'center',
                                background: selectedTxn.status === 'APPROVED' ? 'var(--n-success-bg)' : 'var(--n-danger-bg)',
                                border: `1px solid ${selectedTxn.status === 'APPROVED' ? 'var(--n-success-border)' : 'var(--n-danger-border)'}`,
                            }}>
                                <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--n-text-primary)' }}>
                                    {parseFloat(selectedTxn.amount).toFixed(2)} EUR
                                </div>
                                <div style={{ marginTop: 6 }}>
                                    {(() => {
                                        const t = STATUS_TOKENS[selectedTxn.status] || { color: 'var(--n-text-tertiary)', bg: 'var(--n-bg-tertiary)', border: 'var(--n-border)' };
                                        return (
                                            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: t.bg, border: `1px solid ${t.border}`, color: t.color }}>
                                                {selectedTxn.status}
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Details */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 20 }}>
                                <ModalRow label="Transaction ID" value={selectedTxn.transaction_id} />
                                <ModalRow label="STAN" value={selectedTxn.stan} />
                                <ModalRow label="Code Auth." value={selectedTxn.authorization_code} />
                                <ModalRow label="Code Réponse" value={selectedTxn.response_code} />
                                <ModalRow label="Type" value={selectedTxn.type} />
                                <ModalRow label="Carte" value={selectedTxn.masked_pan} />
                                <ModalRow label="Terminal" value={selectedTxn.terminal_id} />
                                <ModalRow label="Marchand" value={selectedTxn.merchant_name} />
                                <ModalRow label="MCC" value={selectedTxn.merchant_mcc} />
                                <ModalRow label="Client" value={selectedTxn.client_first_name ? `${selectedTxn.client_first_name} ${selectedTxn.client_last_name || ''}` : selectedTxn.client_username} />
                                <ModalRow label="Score Fraude" value={selectedTxn.fraud_score ? `${parseFloat(selectedTxn.fraud_score).toFixed(1)}/100` : 'N/A'} />
                                <ModalRow label="3DS" value={selectedTxn.threeds_status || 'N/A'} />
                                <ModalRow label="Date" value={selectedTxn.timestamp ? new Date(selectedTxn.timestamp).toLocaleString('fr-FR') : 'N/A'} />
                                <ModalRow label="Réglé le" value={selectedTxn.settled_at ? new Date(selectedTxn.settled_at).toLocaleString('fr-FR') : 'Non réglé'} />
                            </div>

                            <button
                                onClick={() => {
                                    setSelectedTxn(null);
                                    router.push(`/instructor/transactions/${selectedTxn.id}/timeline`);
                                }}
                                style={{ width: '100%', padding: '12px 16px', borderRadius: 8, background: 'var(--n-accent)', color: '#fff', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
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

function StatCard({ label, value, accent, accentBg }: { label: string; value: number | string; accent: string; accentBg: string }) {
    return (
        <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: 9, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--n-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: accent }}>{value}</div>
        </div>
    );
}

function ModalRow({ label, value }: { label: string; value: string | null | undefined }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--n-border)' }}>
            <span style={{ fontSize: 12, color: 'var(--n-text-tertiary)' }}>{label}</span>
            <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--n-text-primary)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {value || 'N/A'}
            </span>
        </div>
    );
}
