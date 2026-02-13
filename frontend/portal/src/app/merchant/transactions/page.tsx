'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../auth/useAuth';
import {
    ArrowDownLeft,
    ArrowUpRight,
    ChevronDown,
    ChevronRight,
    Download,
    Filter,
    GitBranch,
    RefreshCw,
    RotateCcw,
    Search
} from 'lucide-react';
import { toRecord, toNumber, toText, formatMoney, formatDateTimeString, getCardBrand, getLastFour, mapStatus, mapType } from '@shared/lib/formatting';
import StatusBadge from '@shared/components/StatusBadge';

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
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedTx, setSelectedTx] = useState<MerchantTransaction | null>(null);
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
        } catch (fetchError: any) {
            setError(fetchError.message || 'Erreur de chargement');
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
                throw new Error(payload.error || 'Échec génération historique');
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
        } catch (historyError: any) {
            setError(historyError.message || 'Erreur génération historique');
        } finally {
            setIsGenerating(false);
        }
    };

    const performRefund = async (tx: MerchantTransaction) => {
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
                throw new Error(payload.error || 'Échec du remboursement');
            }

            await refreshTransactions();
            setSelectedTx(null);
        } catch (refundError: any) {
            setError(refundError.message || 'Erreur remboursement');
        }
    };

    const performVoid = async (tx: MerchantTransaction) => {
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
                throw new Error(payload.error || 'Échec de l’annulation');
            }

            await refreshTransactions();
            setSelectedTx(null);
        } catch (voidError: any) {
            setError(voidError.message || 'Erreur annulation');
        }
    };

    const filteredTransactions = useMemo(() => {
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

            return matchesSearch && matchesStatus && matchesType && matchesTerminal;
        });
    }, [transactions, searchTerm, statusFilter, typeFilter, terminalFilter]);

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

    if (isLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pt-24 pb-12">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="text-xs text-slate-500 mb-2">
                            <Link href="/merchant" className="hover:text-purple-400">Dashboard Marchand</Link>
                            <ChevronRight size={12} className="inline mx-1" />
                            <span className="text-purple-400">Transactions</span>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">Transactions réelles</h1>
                        <p className="text-slate-400">Historique réel alimenté par la base transactionnelle.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={refreshTransactions}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-white/10 text-white rounded-xl hover:bg-slate-700"
                        >
                            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                            Actualiser
                        </button>
                        {isDev && (
                            <button
                                onClick={generateRealHistory}
                                disabled={isGenerating}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-60"
                            >
                                <Download size={18} />
                                {isGenerating ? 'Génération...' : 'Générer historique réel'}
                            </button>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
                        {error}
                    </div>
                )}

                {isDev && generationSummary && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-200 text-sm">
                        Historique créé: {generationSummary.createdTransactions} transactions ({generationSummary.approvedTransactions} approuvées, {generationSummary.declinedTransactions} refusées), {generationSummary.refunds} remboursements, {generationSummary.voids} annulations.
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <p className="text-sm text-slate-400 mb-1">Total ventes</p>
                        <p className="text-2xl font-bold text-emerald-400">+{formatMoney(stats.totalSales)}</p>
                    </div>
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <p className="text-sm text-slate-400 mb-1">Total remboursements</p>
                        <p className="text-2xl font-bold text-red-400">-{formatMoney(stats.totalRefunds)}</p>
                    </div>
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <p className="text-sm text-slate-400 mb-1">Net</p>
                        <p className="text-2xl font-bold text-white">{formatMoney(stats.net)}</p>
                    </div>
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <p className="text-sm text-slate-400 mb-1">Transactions</p>
                        <p className="text-2xl font-bold text-white">{filteredTransactions.length}</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Rechercher par ID, STAN, carte, auth code..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                    </div>

                    <button
                        onClick={() => setIsFilterOpen((current) => !current)}
                        className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white hover:bg-slate-700"
                    >
                        <Filter size={18} />
                        Filtres
                        <ChevronDown size={16} className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {isFilterOpen && (
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Statut</label>
                            <select
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value)}
                                className="w-full px-4 py-2 bg-slate-900 border border-white/10 rounded-lg text-white"
                            >
                                <option value="all">Tous</option>
                                <option value="approved">Approuvée</option>
                                <option value="pending">En attente</option>
                                <option value="declined">Refusée</option>
                                <option value="voided">Annulée / Remboursée</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Type</label>
                            <select
                                value={typeFilter}
                                onChange={(event) => setTypeFilter(event.target.value)}
                                className="w-full px-4 py-2 bg-slate-900 border border-white/10 rounded-lg text-white"
                            >
                                <option value="all">Tous</option>
                                <option value="sale">Vente</option>
                                <option value="refund">Remboursement</option>
                                <option value="void">Annulation</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Terminal</label>
                            <select
                                value={terminalFilter}
                                onChange={(event) => setTerminalFilter(event.target.value)}
                                className="w-full px-4 py-2 bg-slate-900 border border-white/10 rounded-lg text-white"
                            >
                                <option value="all">Tous</option>
                                {terminals.map((terminalId) => (
                                    <option key={terminalId} value={terminalId}>{terminalId}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <div className="bg-slate-800/50 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="hidden lg:grid grid-cols-12 gap-4 p-4 border-b border-white/10 text-sm text-slate-400 font-medium">
                        <div className="col-span-2">Type</div>
                        <div className="col-span-2">Carte</div>
                        <div className="col-span-2">Date/Heure</div>
                        <div className="col-span-2">Terminal</div>
                        <div className="col-span-2">Statut</div>
                        <div className="col-span-2 text-right">Montant</div>
                    </div>

                    {filteredTransactions.map((tx, index) => {
                        const txType = mapType(tx.type);
                        const txStatus = mapStatus(tx.status);
                        return (
                            <div
                                key={tx.id}
                                onClick={() => setSelectedTx(tx)}
                                className={`grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 hover:bg-white/5 transition-colors cursor-pointer items-center ${index !== 0 ? 'border-t border-white/5' : ''}`}
                            >
                                <div className="lg:col-span-2 flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${txType === 'refund' ? 'bg-red-500/20' : txType === 'void' ? 'bg-slate-500/20' : 'bg-emerald-500/20'}`}>
                                        {txType === 'refund' ? (
                                            <ArrowDownLeft size={16} className="text-red-400" />
                                        ) : txType === 'void' ? (
                                            <RotateCcw size={16} className="text-slate-400" />
                                        ) : (
                                            <ArrowUpRight size={16} className="text-emerald-400" />
                                        )}
                                    </div>
                                    <span className={txType === 'refund' ? 'text-red-400' : txType === 'void' ? 'text-slate-300' : 'text-emerald-400'}>
                                        {txType === 'refund' ? 'Remboursement' : txType === 'void' ? 'Annulation' : 'Vente'}
                                    </span>
                                </div>

                                <div className="lg:col-span-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                                            {getCardBrand(tx.maskedPan)}
                                        </span>
                                        <span className="text-white font-mono">•••• {getLastFour(tx.maskedPan)}</span>
                                    </div>
                                </div>

                                <div className="lg:col-span-2 text-slate-300 text-sm">{formatDateTimeString(tx.timestamp)}</div>
                                <div className="lg:col-span-2"><span className="text-white font-mono text-sm">{tx.terminalId}</span></div>
                                <div className="lg:col-span-2"><StatusBadge status={tx.status} /></div>

                                <div className="lg:col-span-2 text-right">
                                    <p className={`font-semibold ${txType === 'refund' || txStatus === 'voided' ? 'text-red-400' : 'text-white'}`}>
                                        {txType === 'refund' || txStatus === 'voided' ? '-' : '+'}
                                        {formatMoney(tx.amount, tx.currency)}
                                    </p>
                                    {tx.authorizationCode && (
                                        <span className="text-xs text-slate-500 font-mono">{tx.authorizationCode}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {filteredTransactions.length === 0 && (
                        <div className="p-12 text-center text-slate-400">Aucune transaction trouvée</div>
                    )}
                </div>

                {selectedTx && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 w-full max-w-lg">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white">Détail transaction</h2>
                                <button onClick={() => setSelectedTx(null)} className="text-slate-400 hover:text-white">✕</button>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between py-2 border-b border-white/5"><span className="text-slate-400">Transaction ID</span><span className="text-white font-mono">{selectedTx.transactionId}</span></div>
                                <div className="flex justify-between py-2 border-b border-white/5"><span className="text-slate-400">Montant</span><span className="text-white font-bold">{formatMoney(selectedTx.amount, selectedTx.currency)}</span></div>
                                <div className="flex justify-between py-2 border-b border-white/5"><span className="text-slate-400">Carte</span><span className="text-white font-mono">{selectedTx.maskedPan}</span></div>
                                <div className="flex justify-between py-2 border-b border-white/5"><span className="text-slate-400">Statut</span><StatusBadge status={selectedTx.status} /></div>
                                <div className="flex justify-between py-2 border-b border-white/5"><span className="text-slate-400">Code réponse</span><span className="text-white font-mono">{selectedTx.responseCode || '-'}</span></div>
                                <div className="flex justify-between py-2 border-b border-white/5"><span className="text-slate-400">Auth code</span><span className="text-white font-mono">{selectedTx.authorizationCode || '-'}</span></div>
                                <div className="flex justify-between py-2 border-b border-white/5"><span className="text-slate-400">STAN</span><span className="text-white font-mono">{selectedTx.stan || '-'}</span></div>
                                <div className="flex justify-between py-2 border-b border-white/5"><span className="text-slate-400">Terminal</span><span className="text-white font-mono">{selectedTx.terminalId}</span></div>
                                <div className="flex justify-between py-2 border-b border-white/5"><span className="text-slate-400">Date</span><span className="text-white">{formatDateTimeString(selectedTx.timestamp)}</span></div>
                                <div className="flex justify-between py-2 border-b border-white/5"><span className="text-slate-400">Settled at</span><span className="text-white">{selectedTx.settledAt ? formatDateTimeString(selectedTx.settledAt) : '-'}</span></div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-slate-400">Fraud Score</span>
                                    <span className={`font-mono font-bold ${selectedTx.fraudScore != null ? (selectedTx.fraudScore < 30 ? 'text-emerald-400' : selectedTx.fraudScore < 60 ? 'text-amber-400' : 'text-red-400') : 'text-white'}`}>
                                        {selectedTx.fraudScore != null ? selectedTx.fraudScore : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-slate-400">3DS Status</span>
                                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${selectedTx.threedsStatus === 'Y' ? 'bg-emerald-500/20 text-emerald-400' : selectedTx.threedsStatus === 'N' ? 'bg-red-500/20 text-red-400' : 'text-white'}`}>
                                        {selectedTx.threedsStatus || '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between py-2">
                                    <span className="text-slate-400">ECI</span>
                                    <span className="text-white font-mono">{selectedTx.eci || '-'}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    const txId = selectedTx.id;
                                    setSelectedTx(null);
                                    router.push(`/merchant/transactions/${txId}/timeline`);
                                }}
                                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white font-bold hover:from-purple-500 hover:to-violet-500 transition flex items-center justify-center gap-2"
                            >
                                <GitBranch size={18} />
                                Voir la Timeline Interactive
                            </button>

                            {mapStatus(selectedTx.status) === 'approved' && mapType(selectedTx.type) === 'sale' && (
                                <div className="mt-3 flex gap-3">
                                    <button
                                        onClick={() => performRefund(selectedTx)}
                                        className="flex-1 py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30"
                                    >
                                        Rembourser
                                    </button>
                                    <button
                                        onClick={() => performVoid(selectedTx)}
                                        className="flex-1 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600"
                                    >
                                        Annuler (void)
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

