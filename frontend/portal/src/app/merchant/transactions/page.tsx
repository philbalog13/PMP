'use client';

import { useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import {
    ArrowUpRight,
    ArrowDownLeft,
    Search,
    Filter,
    Download,
    Calendar,
    CreditCard,
    CheckCircle2,
    Clock,
    XCircle,
    ChevronDown,
    Eye,
    RefreshCw,
    RotateCcw
} from 'lucide-react';
import Link from 'next/link';

interface Transaction {
    id: string;
    type: 'sale' | 'refund' | 'void';
    amount: number;
    cardLastFour: string;
    cardType: 'visa' | 'mastercard' | 'amex';
    status: 'approved' | 'declined' | 'pending' | 'voided';
    timestamp: string;
    authCode: string;
    terminalId: string;
    rrn: string;
    mcc: string;
    responseCode: string;
}

const mockTransactions: Transaction[] = [
    { id: '1', type: 'sale', amount: 89.90, cardLastFour: '4532', cardType: 'visa', status: 'approved', timestamp: '2024-01-15 14:32:05', authCode: 'A123B4', terminalId: 'POS-001', rrn: '123456789012', mcc: '5411', responseCode: '00' },
    { id: '2', type: 'sale', amount: 45.50, cardLastFour: '8921', cardType: 'mastercard', status: 'approved', timestamp: '2024-01-15 14:28:12', authCode: 'B456C7', terminalId: 'POS-001', rrn: '123456789013', mcc: '5411', responseCode: '00' },
    { id: '3', type: 'sale', amount: 156.00, cardLastFour: '3456', cardType: 'visa', status: 'declined', timestamp: '2024-01-15 14:15:45', authCode: '', terminalId: 'POS-002', rrn: '123456789014', mcc: '5411', responseCode: '51' },
    { id: '4', type: 'refund', amount: 25.00, cardLastFour: '4532', cardType: 'visa', status: 'approved', timestamp: '2024-01-15 13:50:30', authCode: 'C789D0', terminalId: 'POS-001', rrn: '123456789015', mcc: '5411', responseCode: '00' },
    { id: '5', type: 'sale', amount: 234.99, cardLastFour: '7654', cardType: 'mastercard', status: 'approved', timestamp: '2024-01-15 13:45:18', authCode: 'D012E3', terminalId: 'POS-002', rrn: '123456789016', mcc: '5411', responseCode: '00' },
    { id: '6', type: 'sale', amount: 12.50, cardLastFour: '9876', cardType: 'visa', status: 'approved', timestamp: '2024-01-15 13:30:00', authCode: 'E345F6', terminalId: 'POS-001', rrn: '123456789017', mcc: '5411', responseCode: '00' },
    { id: '7', type: 'sale', amount: 78.00, cardLastFour: '5432', cardType: 'mastercard', status: 'pending', timestamp: '2024-01-15 13:28:45', authCode: '', terminalId: 'POS-002', rrn: '123456789018', mcc: '5411', responseCode: '' },
    { id: '8', type: 'void', amount: 45.50, cardLastFour: '8921', cardType: 'mastercard', status: 'voided', timestamp: '2024-01-15 13:00:00', authCode: 'F678G9', terminalId: 'POS-001', rrn: '123456789019', mcc: '5411', responseCode: '00' },
    { id: '9', type: 'sale', amount: 567.00, cardLastFour: '1234', cardType: 'amex', status: 'approved', timestamp: '2024-01-15 12:45:30', authCode: 'G901H2', terminalId: 'POS-001', rrn: '123456789020', mcc: '5411', responseCode: '00' },
    { id: '10', type: 'sale', amount: 33.25, cardLastFour: '6789', cardType: 'visa', status: 'declined', timestamp: '2024-01-15 12:30:15', authCode: '', terminalId: 'POS-002', rrn: '123456789021', mcc: '5411', responseCode: '14' },
];

export default function MerchantTransactionsPage() {
    const { isLoading } = useAuth(true);
    const [transactions] = useState<Transaction[]>(mockTransactions);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [terminalFilter, setTerminalFilter] = useState<string>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

    // Filter transactions
    const filteredTransactions = transactions.filter(tx => {
        const matchesSearch = tx.cardLastFour.includes(searchTerm) ||
            tx.authCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tx.rrn.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
        const matchesType = typeFilter === 'all' || tx.type === typeFilter;
        const matchesTerminal = terminalFilter === 'all' || tx.terminalId === terminalFilter;
        return matchesSearch && matchesStatus && matchesType && matchesTerminal;
    });

    // Calculate stats
    const totalSales = filteredTransactions
        .filter(tx => tx.type === 'sale' && tx.status === 'approved')
        .reduce((acc, tx) => acc + tx.amount, 0);
    const totalRefunds = filteredTransactions
        .filter(tx => tx.type === 'refund' && tx.status === 'approved')
        .reduce((acc, tx) => acc + tx.amount, 0);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return (
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                        <CheckCircle2 size={12} /> Approuvée
                    </span>
                );
            case 'pending':
                return (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full flex items-center gap-1">
                        <Clock size={12} /> En attente
                    </span>
                );
            case 'declined':
                return (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center gap-1">
                        <XCircle size={12} /> Refusée
                    </span>
                );
            case 'voided':
                return (
                    <span className="px-2 py-1 bg-slate-500/20 text-slate-400 text-xs rounded-full flex items-center gap-1">
                        <RotateCcw size={12} /> Annulée
                    </span>
                );
            default:
                return null;
        }
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'sale':
                return <span className="text-emerald-400">Vente</span>;
            case 'refund':
                return <span className="text-red-400">Remboursement</span>;
            case 'void':
                return <span className="text-slate-400">Annulation</span>;
            default:
                return null;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pt-24 pb-12">
            <div className="max-w-7xl mx-auto px-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Transactions</h1>
                        <p className="text-slate-400">
                            Historique complet de vos encaissements
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-white/10 text-white rounded-xl hover:bg-slate-700 transition-colors">
                            <RefreshCw size={18} />
                            Actualiser
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors">
                            <Download size={18} />
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <p className="text-sm text-slate-400 mb-1">Total ventes</p>
                        <p className="text-2xl font-bold text-emerald-400">
                            +{totalSales.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                        </p>
                    </div>
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <p className="text-sm text-slate-400 mb-1">Total remboursements</p>
                        <p className="text-2xl font-bold text-red-400">
                            -{totalRefunds.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                        </p>
                    </div>
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <p className="text-sm text-slate-400 mb-1">Net</p>
                        <p className="text-2xl font-bold text-white">
                            {(totalSales - totalRefunds).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                        </p>
                    </div>
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <p className="text-sm text-slate-400 mb-1">Transactions</p>
                        <p className="text-2xl font-bold text-white">{filteredTransactions.length}</p>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Rechercher par carte, auth code ou RRN..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                    </div>

                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white hover:bg-slate-700 transition-colors"
                    >
                        <Filter size={18} />
                        Filtres
                        <ChevronDown size={16} className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {/* Filter Panel */}
                {isFilterOpen && (
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Statut</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-900 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            >
                                <option value="all">Tous</option>
                                <option value="approved">Approuvée</option>
                                <option value="pending">En attente</option>
                                <option value="declined">Refusée</option>
                                <option value="voided">Annulée</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Type</label>
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-900 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
                                onChange={(e) => setTerminalFilter(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-900 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            >
                                <option value="all">Tous</option>
                                <option value="POS-001">POS-001</option>
                                <option value="POS-002">POS-002</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Transactions Table */}
                <div className="bg-slate-800/50 border border-white/10 rounded-2xl overflow-hidden">
                    {/* Table Header */}
                    <div className="hidden lg:grid grid-cols-12 gap-4 p-4 border-b border-white/10 text-sm text-slate-400 font-medium">
                        <div className="col-span-2">Type</div>
                        <div className="col-span-2">Carte</div>
                        <div className="col-span-2">Date/Heure</div>
                        <div className="col-span-2">Terminal</div>
                        <div className="col-span-2">Statut</div>
                        <div className="col-span-2 text-right">Montant</div>
                    </div>

                    {/* Transactions */}
                    {filteredTransactions.map((tx, index) => (
                        <div
                            key={tx.id}
                            onClick={() => setSelectedTx(tx)}
                            className={`grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 hover:bg-white/5 transition-colors cursor-pointer items-center ${
                                index !== 0 ? 'border-t border-white/5' : ''
                            }`}
                        >
                            {/* Type */}
                            <div className="lg:col-span-2 flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${
                                    tx.type === 'refund' ? 'bg-red-500/20' :
                                    tx.type === 'void' ? 'bg-slate-500/20' : 'bg-emerald-500/20'
                                }`}>
                                    {tx.type === 'refund' ? (
                                        <ArrowDownLeft size={16} className="text-red-400" />
                                    ) : tx.type === 'void' ? (
                                        <RotateCcw size={16} className="text-slate-400" />
                                    ) : (
                                        <ArrowUpRight size={16} className="text-emerald-400" />
                                    )}
                                </div>
                                {getTypeBadge(tx.type)}
                            </div>

                            {/* Card */}
                            <div className="lg:col-span-2">
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                        tx.cardType === 'visa' ? 'bg-blue-500/20 text-blue-400' :
                                        tx.cardType === 'mastercard' ? 'bg-orange-500/20 text-orange-400' :
                                        'bg-slate-500/20 text-slate-400'
                                    }`}>
                                        {tx.cardType.toUpperCase()}
                                    </span>
                                    <span className="text-white font-mono">•••• {tx.cardLastFour}</span>
                                </div>
                            </div>

                            {/* Timestamp */}
                            <div className="lg:col-span-2 text-slate-300 text-sm">
                                {tx.timestamp}
                            </div>

                            {/* Terminal */}
                            <div className="lg:col-span-2">
                                <span className="text-white font-mono text-sm">{tx.terminalId}</span>
                            </div>

                            {/* Status */}
                            <div className="lg:col-span-2">
                                {getStatusBadge(tx.status)}
                            </div>

                            {/* Amount */}
                            <div className="lg:col-span-2 text-right">
                                <p className={`font-semibold ${
                                    tx.type === 'refund' || tx.type === 'void' ? 'text-red-400' : 'text-white'
                                }`}>
                                    {tx.type === 'refund' || tx.type === 'void' ? '-' : '+'}
                                    {tx.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                                </p>
                                {tx.authCode && (
                                    <span className="text-xs text-slate-500 font-mono">
                                        {tx.authCode}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}

                    {filteredTransactions.length === 0 && (
                        <div className="p-12 text-center">
                            <Search size={48} className="text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-400">Aucune transaction trouvée</p>
                        </div>
                    )}
                </div>

                {/* Transaction Detail Modal */}
                {selectedTx && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 w-full max-w-lg">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white">Détail transaction</h2>
                                <button
                                    onClick={() => setSelectedTx(null)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-slate-400">Type</span>
                                    <span className="text-white">{getTypeBadge(selectedTx.type)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-slate-400">Montant</span>
                                    <span className="text-white font-bold">
                                        {selectedTx.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                                    </span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-slate-400">Carte</span>
                                    <span className="text-white font-mono">•••• {selectedTx.cardLastFour}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-slate-400">Réseau</span>
                                    <span className="text-white">{selectedTx.cardType.toUpperCase()}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-slate-400">Statut</span>
                                    {getStatusBadge(selectedTx.status)}
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-slate-400">Code réponse</span>
                                    <span className="text-white font-mono">{selectedTx.responseCode || '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-slate-400">Auth Code</span>
                                    <span className="text-white font-mono">{selectedTx.authCode || '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-slate-400">RRN</span>
                                    <span className="text-white font-mono">{selectedTx.rrn}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-slate-400">Terminal</span>
                                    <span className="text-white font-mono">{selectedTx.terminalId}</span>
                                </div>
                                <div className="flex justify-between py-2">
                                    <span className="text-slate-400">Date/Heure</span>
                                    <span className="text-white">{selectedTx.timestamp}</span>
                                </div>
                            </div>

                            {selectedTx.status === 'approved' && selectedTx.type === 'sale' && (
                                <div className="mt-6 flex gap-3">
                                    <button className="flex-1 py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors">
                                        Rembourser
                                    </button>
                                    <button className="flex-1 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors">
                                        Imprimer ticket
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
