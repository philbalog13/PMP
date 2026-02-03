'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@shared/context/AuthContext';
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
} from 'lucide-react';

interface Transaction {
    id: string;
    type: 'debit' | 'credit';
    amount: number;
    merchant: string;
    merchantCategory: string;
    category: string;
    date: string;
    time: string;
    status: 'completed' | 'pending' | 'failed' | 'refunded';
    cardLastFour: string;
    authCode: string;
    mcc: string;
    is3dsUsed: boolean;
}

const mockTransactions: Transaction[] = [
    { id: '1', type: 'debit', amount: 45.99, merchant: 'Amazon EU SARL', merchantCategory: 'E-commerce', category: 'Shopping', date: '2024-01-15', time: '14:32:05', status: 'completed', cardLastFour: '4532', authCode: 'A123B4', mcc: '5411', is3dsUsed: true },
    { id: '2', type: 'debit', amount: 12.50, merchant: 'Spotify AB', merchantCategory: 'Digital Services', category: 'Subscription', date: '2024-01-14', time: '09:00:00', status: 'completed', cardLastFour: '4532', authCode: 'B456C7', mcc: '5815', is3dsUsed: false },
    { id: '3', type: 'credit', amount: 500.00, merchant: 'Virement - Jean Dupont', merchantCategory: 'Transfer', category: 'Transfer', date: '2024-01-13', time: '16:45:22', status: 'completed', cardLastFour: '4532', authCode: 'C789D0', mcc: '6012', is3dsUsed: false },
    { id: '4', type: 'debit', amount: 89.90, merchant: 'Carrefour Hypermarché', merchantCategory: 'Grocery Store', category: 'Groceries', date: '2024-01-12', time: '18:20:15', status: 'completed', cardLastFour: '8921', authCode: 'D012E3', mcc: '5411', is3dsUsed: false },
    { id: '5', type: 'debit', amount: 250.00, merchant: 'FNAC Paris', merchantCategory: 'Electronics Store', category: 'Electronics', date: '2024-01-11', time: '11:15:30', status: 'pending', cardLastFour: '4532', authCode: 'E345F6', mcc: '5732', is3dsUsed: true },
    { id: '6', type: 'debit', amount: 35.00, merchant: 'Netflix International', merchantCategory: 'Digital Services', category: 'Subscription', date: '2024-01-10', time: '00:00:00', status: 'completed', cardLastFour: '4532', authCode: 'F678G9', mcc: '5815', is3dsUsed: false },
    { id: '7', type: 'debit', amount: 156.80, merchant: 'Booking.com', merchantCategory: 'Travel Agency', category: 'Travel', date: '2024-01-09', time: '20:45:00', status: 'completed', cardLastFour: '8921', authCode: 'G901H2', mcc: '4722', is3dsUsed: true },
    { id: '8', type: 'debit', amount: 8.50, merchant: 'Starbucks Paris', merchantCategory: 'Restaurant', category: 'Food & Drink', date: '2024-01-08', time: '08:30:45', status: 'completed', cardLastFour: '4532', authCode: 'H234I5', mcc: '5812', is3dsUsed: false },
    { id: '9', type: 'debit', amount: 1200.00, merchant: 'Apple Store', merchantCategory: 'Electronics Store', category: 'Electronics', date: '2024-01-07', time: '15:00:00', status: 'failed', cardLastFour: '4532', authCode: '', mcc: '5732', is3dsUsed: true },
    { id: '10', type: 'credit', amount: 45.99, merchant: 'Amazon EU SARL - Remboursement', merchantCategory: 'E-commerce', category: 'Refund', date: '2024-01-06', time: '10:00:00', status: 'refunded', cardLastFour: '4532', authCode: 'J567K8', mcc: '5411', is3dsUsed: false },
];

export default function TransactionsPage() {
    const { isLoading, isAuthenticated } = useAuth();
    const [transactions] = useState<Transaction[]>(mockTransactions);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [cardFilter, setCardFilter] = useState<string>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const uniqueCards = useMemo(() => {
        return Array.from(new Set(transactions.map((tx) => tx.cardLastFour)));
    }, [transactions]);

    const filteredTransactions = transactions.filter((tx) => {
        const matchesSearch =
            tx.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tx.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
        const matchesType = typeFilter === 'all' || tx.type === typeFilter;
        const matchesCard = cardFilter === 'all' || tx.cardLastFour === cardFilter;
        return matchesSearch && matchesStatus && matchesType && matchesCard;
    });

    const totalDebits = filteredTransactions
        .filter((tx) => tx.type === 'debit' && tx.status === 'completed')
        .reduce((acc, tx) => acc + tx.amount, 0);
    const totalCredits = filteredTransactions
        .filter((tx) => tx.type === 'credit')
        .reduce((acc, tx) => acc + tx.amount, 0);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return (
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                        <CheckCircle2 size={12} /> Validee
                    </span>
                );
            case 'pending':
                return (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full flex items-center gap-1">
                        <Clock size={12} /> En cours
                    </span>
                );
            case 'failed':
                return (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center gap-1">
                        <XCircle size={12} /> Echouee
                    </span>
                );
            case 'refunded':
                return (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full flex items-center gap-1">
                        <ArrowDownLeft size={12} /> Remboursee
                    </span>
                );
            default:
                return null;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
                <div className="max-w-md w-full rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center space-y-4">
                    <h1 className="text-2xl font-bold text-white">Session expiree</h1>
                    <p className="text-slate-400">Reconnectez-vous sur le portail pour acceder a votre espace client.</p>
                    <a
                        href={`${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}/login`}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 transition-colors"
                    >
                        Retour au login
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-8 pb-12">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Historique des transactions</h1>
                        <p className="text-slate-400">Consultez et exportez l&apos;historique de vos paiements</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-white/10 text-white rounded-xl hover:bg-slate-700 transition-colors">
                        <Download size={18} />
                        Exporter CSV
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <p className="text-sm text-slate-400 mb-1">Total debits</p>
                        <p className="text-2xl font-bold text-white">
                            -{totalDebits.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                        </p>
                    </div>
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                        <p className="text-sm text-slate-400 mb-1">Total credits</p>
                        <p className="text-2xl font-bold text-emerald-400">
                            +{totalCredits.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                        </p>
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
                            placeholder="Rechercher un marchand ou une categorie..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
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

                {isFilterOpen && (
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Statut</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-900 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                            >
                                <option value="all">Tous</option>
                                <option value="completed">Validee</option>
                                <option value="pending">En cours</option>
                                <option value="failed">Echouee</option>
                                <option value="refunded">Remboursee</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Type</label>
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-900 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                            >
                                <option value="all">Tous</option>
                                <option value="debit">Debit</option>
                                <option value="credit">Credit</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Carte</label>
                            <select
                                value={cardFilter}
                                onChange={(e) => setCardFilter(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-900 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                            >
                                <option value="all">Toutes</option>
                                {uniqueCards.map((cardLastFour) => (
                                    <option key={cardLastFour} value={cardLastFour}>
                                        **** {cardLastFour}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <div className="bg-slate-800/50 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-white/10 text-sm text-slate-400 font-medium">
                        <div className="col-span-4">Marchand</div>
                        <div className="col-span-2">Date</div>
                        <div className="col-span-2">Carte</div>
                        <div className="col-span-2">Statut</div>
                        <div className="col-span-2 text-right">Montant</div>
                    </div>

                    {filteredTransactions.map((tx, index) => (
                        <div
                            key={tx.id}
                            className={`grid grid-cols-1 md:grid-cols-12 gap-4 p-4 hover:bg-white/5 transition-colors items-center ${index !== 0 ? 'border-t border-white/5' : ''}`}
                        >
                            <div className="md:col-span-4 flex items-center gap-3">
                                <div className={`p-3 rounded-xl ${tx.type === 'credit' ? 'bg-emerald-500/20' : 'bg-slate-700'}`}>
                                    {tx.type === 'credit' ? (
                                        <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                                    ) : (
                                        <ArrowUpRight className="w-5 h-5 text-slate-400" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-medium text-white">{tx.merchant}</p>
                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                        <span>{tx.category}</span>
                                        {tx.is3dsUsed && (
                                            <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                                                3DS
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <div className="flex items-center gap-2 text-slate-300">
                                    <Calendar size={14} className="text-slate-500" />
                                    <span className="text-sm">{tx.date}</span>
                                </div>
                                <span className="text-xs text-slate-500">{tx.time}</span>
                            </div>

                            <div className="md:col-span-2">
                                <div className="flex items-center gap-2 text-slate-300">
                                    <CreditCard size={14} className="text-slate-500" />
                                    <span className="text-sm font-mono">**** {tx.cardLastFour}</span>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                {getStatusBadge(tx.status)}
                            </div>

                            <div className="md:col-span-2 text-right">
                                <p className={`font-semibold ${tx.type === 'credit' ? 'text-emerald-400' : 'text-white'}`}>
                                    {tx.type === 'credit' ? '+' : '-'}
                                    {tx.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                                </p>
                                {tx.authCode && (
                                    <span className="text-xs text-slate-500 font-mono">
                                        Auth: {tx.authCode}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}

                    {filteredTransactions.length === 0 && (
                        <div className="p-12 text-center">
                            <Search size={48} className="text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-400">Aucune transaction trouvee</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
