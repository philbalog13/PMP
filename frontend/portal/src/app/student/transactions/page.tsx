'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@shared/context/AuthContext';
import { UserRole } from '@shared/types/user';
import {
    Activity, Search, RefreshCcw, ArrowUpRight, ArrowDownLeft,
    ChevronRight, GitBranch, AlertTriangle, X
} from 'lucide-react';

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
    }, [statusFilter, typeFilter]);

    useEffect(() => {
        if (!isLoading && isAuthenticated) fetchTransactions();
    }, [isLoading, isAuthenticated, fetchTransactions]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="h-8 w-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated || !user || (user.role !== UserRole.ETUDIANT && user.role !== UserRole.FORMATEUR)) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-center p-8">
                <div>
                    <AlertTriangle size={48} className="mx-auto mb-4 text-amber-400" />
                    <h1 className="text-xl font-bold text-white mb-2">Accès restreint</h1>
                    <p className="text-sm text-slate-400 mb-4">Cette page est réservée aux étudiants et formateurs.</p>
                    <Link href="/" className="text-blue-400 text-sm hover:text-blue-300">Retour au portail</Link>
                </div>
            </div>
        );
    }

    const statusColors: Record<string, string> = {
        APPROVED: 'bg-emerald-500/20 text-emerald-400',
        DECLINED: 'bg-red-500/20 text-red-400',
        PENDING: 'bg-amber-500/20 text-amber-400',
        REFUNDED: 'bg-blue-500/20 text-blue-400',
        REVERSED: 'bg-purple-500/20 text-purple-400',
    };

    return (
        <div className="min-h-screen bg-slate-950 pt-24 pb-12 px-4 md:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Breadcrumb */}
                <div className="text-xs text-slate-500 mb-6">
                    <Link href="/student" className="hover:text-emerald-400">Mon Parcours</Link>
                    <ChevronRight size={12} className="inline mx-1" />
                    <span className="text-emerald-400">Transactions</span>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Activity size={28} className="text-emerald-400" />
                            Transactions Plateforme
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Vue globale de toutes les transactions de la plateforme PMP
                        </p>
                    </div>
                    <button onClick={fetchTransactions} disabled={loading} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition text-slate-400">
                        <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <StatCard label="Total" value={transactions.length} color="text-white" />
                    <StatCard label="Approuvées" value={transactions.filter(t => t.status === 'APPROVED').length} color="text-emerald-400" />
                    <StatCard label="Refusées" value={transactions.filter(t => t.status === 'DECLINED').length} color="text-red-400" />
                    <StatCard label="Volume" value={`${transactions.filter(t => t.status === 'APPROVED').reduce((s, t) => s + parseFloat(t.amount), 0).toFixed(2)} EUR`} color="text-blue-400" />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Rechercher (ID, PAN, marchand)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchTransactions()}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2.5 rounded-xl bg-slate-800/50 border border-white/10 text-white text-sm focus:outline-none"
                    >
                        <option value="ALL">Tous statuts</option>
                        <option value="APPROVED">Approuvé</option>
                        <option value="DECLINED">Refusé</option>
                        <option value="PENDING">En attente</option>
                        <option value="REFUNDED">Remboursé</option>
                    </select>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-4 py-2.5 rounded-xl bg-slate-800/50 border border-white/10 text-white text-sm focus:outline-none"
                    >
                        <option value="ALL">Tous types</option>
                        <option value="PURCHASE">Achat</option>
                        <option value="REFUND">Remboursement</option>
                        <option value="VOID">Annulation</option>
                    </select>
                </div>

                {/* Error */}
                {error && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 mb-6 text-sm text-red-300">{error}</div>
                )}

                {/* Transactions list */}
                {loading ? (
                    <div className="text-center py-20">
                        <div className="h-8 w-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin mx-auto" />
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">Aucune transaction trouvée</div>
                ) : (
                    <div className="space-y-2">
                        {transactions.map((tx) => (
                            <div
                                key={tx.id}
                                onClick={() => setSelectedTxn(tx)}
                                className="rounded-xl border border-white/10 bg-slate-800/30 p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/50 hover:border-white/20 transition group"
                            >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="p-2 rounded-lg bg-slate-900 shrink-0">
                                        {tx.type === 'REFUND' ? <ArrowDownLeft size={16} className="text-emerald-400" /> : <ArrowUpRight size={16} className="text-slate-300" />}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-white truncate">{tx.merchant_name || 'N/A'}</span>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusColors[tx.status] || 'bg-slate-500/20 text-slate-400'}`}>
                                                {tx.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                            <span>{tx.masked_pan || '-'}</span>
                                            <span>{tx.client_first_name ? `${tx.client_first_name} ${tx.client_last_name || ''}` : tx.client_username || 'Client'}</span>
                                            <span>{tx.timestamp ? new Date(tx.timestamp).toLocaleString('fr-FR') : '-'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-sm font-bold text-white">{parseFloat(tx.amount).toFixed(2)} {tx.currency || 'EUR'}</span>
                                    <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Detail Modal */}
                {selectedTxn && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedTxn(null)}>
                        <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6">
                                {/* Modal Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-bold text-white">Détail Transaction</h2>
                                    <button onClick={() => setSelectedTxn(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400">
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Amount */}
                                <div className={`rounded-xl p-4 mb-4 border ${selectedTxn.status === 'APPROVED' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                                    <div className="text-2xl font-bold text-white text-center">{parseFloat(selectedTxn.amount).toFixed(2)} EUR</div>
                                    <div className="text-center mt-1">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusColors[selectedTxn.status] || ''}`}>{selectedTxn.status}</span>
                                    </div>
                                </div>

                                {/* Fields */}
                                <div className="space-y-2 text-sm mb-6">
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

                                {/* Timeline Button */}
                                <button
                                    onClick={() => {
                                        setSelectedTxn(null);
                                        router.push(`/student/transactions/${selectedTxn.id}/timeline`);
                                    }}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold hover:from-violet-500 hover:to-purple-500 transition flex items-center justify-center gap-2"
                                >
                                    <GitBranch size={18} />
                                    Voir la Timeline Interactive
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
    return (
        <div className="rounded-xl border border-white/10 bg-slate-800/30 p-3">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
            <div className={`text-lg font-bold ${color}`}>{value}</div>
        </div>
    );
}

function ModalRow({ label, value }: { label: string; value: string | null | undefined }) {
    return (
        <div className="flex justify-between py-1.5 border-b border-white/5">
            <span className="text-slate-500">{label}</span>
            <span className="text-white font-mono text-xs text-right max-w-[250px] truncate">{value || 'N/A'}</span>
        </div>
    );
}

