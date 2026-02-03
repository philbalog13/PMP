'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@shared/context/AuthContext';
import {
    CreditCard,
    ArrowUpRight,
    ArrowDownLeft,
    TrendingUp,
    Shield,
    AlertCircle,
    ChevronRight,
    Plus,
    Eye,
    EyeOff,
    Wallet,
    Clock,
    CheckCircle2,
} from 'lucide-react';

interface VirtualCard {
    id: string;
    lastFour: string;
    type: 'visa' | 'mastercard';
    expiryDate: string;
    balance: number;
    limit: number;
    status: 'active' | 'blocked' | 'expired';
    is3dsEnabled: boolean;
}

interface Transaction {
    id: string;
    type: 'debit' | 'credit';
    amount: number;
    merchant: string;
    category: string;
    date: string;
    status: 'completed' | 'pending' | 'failed';
    cardLastFour: string;
}

const mockCards: VirtualCard[] = [
    {
        id: '1',
        lastFour: '4532',
        type: 'visa',
        expiryDate: '12/27',
        balance: 2450.75,
        limit: 5000,
        status: 'active',
        is3dsEnabled: true,
    },
    {
        id: '2',
        lastFour: '8921',
        type: 'mastercard',
        expiryDate: '06/26',
        balance: 890.5,
        limit: 2000,
        status: 'active',
        is3dsEnabled: false,
    },
];

const mockTransactions: Transaction[] = [
    { id: '1', type: 'debit', amount: 45.99, merchant: 'Amazon', category: 'Shopping', date: '2024-01-15 14:32', status: 'completed', cardLastFour: '4532' },
    { id: '2', type: 'debit', amount: 12.5, merchant: 'Spotify', category: 'Subscription', date: '2024-01-14 09:00', status: 'completed', cardLastFour: '4532' },
    { id: '3', type: 'credit', amount: 500.0, merchant: 'Virement entrant', category: 'Transfer', date: '2024-01-13 16:45', status: 'completed', cardLastFour: '4532' },
    { id: '4', type: 'debit', amount: 89.9, merchant: 'Carrefour', category: 'Groceries', date: '2024-01-12 18:20', status: 'completed', cardLastFour: '8921' },
    { id: '5', type: 'debit', amount: 250.0, merchant: 'FNAC', category: 'Electronics', date: '2024-01-11 11:15', status: 'pending', cardLastFour: '4532' },
];

export default function ClientDashboardHome() {
    const { user, isLoading, isAuthenticated } = useAuth();
    const [cards] = useState<VirtualCard[]>(mockCards);
    const [transactions] = useState<Transaction[]>(mockTransactions);
    const [showBalance, setShowBalance] = useState(true);
    const [selectedCard, setSelectedCard] = useState<VirtualCard | null>(mockCards[0]);

    const totalBalance = cards.reduce((acc, card) => acc + card.balance, 0);
    const totalLimit = cards.reduce((acc, card) => acc + card.limit, 0);
    const monthlySpending = transactions
        .filter((t) => t.type === 'debit' && t.status === 'completed')
        .reduce((acc, t) => acc + t.amount, 0);

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
                    <h1 className="text-2xl font-bold text-white">Session expirée</h1>
                    <p className="text-slate-400">Reconnectez-vous sur le portail pour accéder à votre espace client.</p>
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
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Bonjour, {user?.name || user?.email?.split('@')[0] || 'Client'} !
                    </h1>
                    <p className="text-slate-400">
                        Gérez vos cartes virtuelles et suivez vos transactions en temps réel.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-amber-500/20 rounded-xl">
                                <Wallet className="w-6 h-6 text-amber-400" />
                            </div>
                            <button
                                onClick={() => setShowBalance(!showBalance)}
                                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                            >
                                {showBalance ? (
                                    <Eye className="w-5 h-5 text-slate-400" />
                                ) : (
                                    <EyeOff className="w-5 h-5 text-slate-400" />
                                )}
                            </button>
                        </div>
                        <p className="text-sm text-slate-400 mb-1">Solde total</p>
                        <p className="text-2xl font-bold text-white">
                            {showBalance ? `${totalBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR` : '••••••'}
                        </p>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="p-3 bg-blue-500/20 rounded-xl w-fit mb-4">
                            <TrendingUp className="w-6 h-6 text-blue-400" />
                        </div>
                        <p className="text-sm text-slate-400 mb-1">Limite totale</p>
                        <p className="text-2xl font-bold text-white">
                            {totalLimit.toLocaleString('fr-FR')} EUR
                        </p>
                        <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                                style={{ width: `${(totalBalance / totalLimit) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="p-3 bg-purple-500/20 rounded-xl w-fit mb-4">
                            <ArrowUpRight className="w-6 h-6 text-purple-400" />
                        </div>
                        <p className="text-sm text-slate-400 mb-1">Dépenses ce mois</p>
                        <p className="text-2xl font-bold text-white">
                            {monthlySpending.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                        </p>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                        <div className="p-3 bg-emerald-500/20 rounded-xl w-fit mb-4">
                            <CreditCard className="w-6 h-6 text-emerald-400" />
                        </div>
                        <p className="text-sm text-slate-400 mb-1">Cartes actives</p>
                        <p className="text-2xl font-bold text-white">{cards.filter((c) => c.status === 'active').length}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-white">Mes cartes</h2>
                            <Link
                                href="/cards"
                                className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1"
                            >
                                Voir tout <ChevronRight size={16} />
                            </Link>
                        </div>

                        <div className="space-y-4">
                            {cards.map((card) => (
                                <div
                                    key={card.id}
                                    onClick={() => setSelectedCard(card)}
                                    className={`relative overflow-hidden rounded-2xl p-6 cursor-pointer transition-all ${
                                        selectedCard?.id === card.id
                                            ? 'ring-2 ring-amber-500 scale-[1.02]'
                                            : 'hover:scale-[1.01]'
                                    } ${
                                        card.type === 'visa'
                                            ? 'bg-gradient-to-br from-slate-800 via-slate-800 to-blue-900'
                                            : 'bg-gradient-to-br from-slate-800 via-slate-800 to-orange-900'
                                    }`}
                                >
                                    <div className="absolute inset-0 opacity-10">
                                        <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/20 blur-2xl"></div>
                                        <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-white/10 blur-xl"></div>
                                    </div>

                                    <div className="relative">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="w-10 h-7 rounded bg-gradient-to-br from-yellow-400 to-yellow-600"></div>
                                            <span className="text-xs font-medium text-white/60 uppercase">
                                                {card.type}
                                            </span>
                                        </div>

                                        <p className="text-lg font-mono text-white/90 tracking-widest mb-4">
                                            •••• •••• •••• {card.lastFour}
                                        </p>

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-white/40 mb-1">Solde</p>
                                                <p className="text-white font-semibold">
                                                    {showBalance ? `${card.balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR` : '••••'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-white/40 mb-1">Expire</p>
                                                <p className="text-white font-mono">{card.expiryDate}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 mt-4">
                                            {card.status === 'active' && (
                                                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                                                    <CheckCircle2 size={12} /> Active
                                                </span>
                                            )}
                                            {card.is3dsEnabled && (
                                                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full flex items-center gap-1">
                                                    <Shield size={12} /> 3D Secure
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <Link
                                href="/cards/add"
                                className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-700 rounded-2xl text-slate-400 hover:text-amber-400 hover:border-amber-500/50 transition-colors"
                            >
                                <Plus size={20} />
                                <span>Nouvelle carte</span>
                            </Link>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-white">Transactions récentes</h2>
                            <Link
                                href="/transactions"
                                className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1"
                            >
                                Historique complet <ChevronRight size={16} />
                            </Link>
                        </div>

                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl overflow-hidden">
                            {transactions.slice(0, 5).map((tx, index) => (
                                <Link
                                    key={tx.id}
                                    href="/transactions"
                                    className={`flex items-center justify-between p-4 hover:bg-white/5 transition-colors ${
                                        index !== 0 ? 'border-t border-white/5' : ''
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${
                                            tx.type === 'credit'
                                                ? 'bg-emerald-500/20'
                                                : 'bg-slate-700'
                                        }`}>
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
                                                <span>•</span>
                                                <span>••••{tx.cardLastFour}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className={`font-semibold ${
                                            tx.type === 'credit' ? 'text-emerald-400' : 'text-white'
                                        }`}>
                                            {tx.type === 'credit' ? '+' : '-'}
                                            {tx.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                                        </p>
                                        <div className="flex items-center gap-2 justify-end">
                                            <Clock size={12} className="text-slate-500" />
                                            <span className="text-xs text-slate-500">{tx.date}</span>
                                            {tx.status === 'pending' && (
                                                <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                                                    En cours
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <h2 className="text-xl font-semibold text-white mb-4">Actions rapides</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Link
                            href="/3ds"
                            className="p-6 bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-2xl hover:scale-[1.02] transition-transform"
                        >
                            <div className="p-3 bg-amber-500/20 rounded-xl w-fit mb-4">
                                <ArrowUpRight className="w-6 h-6 text-amber-400" />
                            </div>
                            <h3 className="font-semibold text-white mb-1">Simuler un paiement</h3>
                            <p className="text-sm text-slate-400">Testez le flux de paiement</p>
                        </Link>

                        <Link
                            href="/cards/add"
                            className="p-6 bg-slate-800/50 border border-white/10 rounded-2xl hover:scale-[1.02] transition-transform"
                        >
                            <div className="p-3 bg-blue-500/20 rounded-xl w-fit mb-4">
                                <Plus className="w-6 h-6 text-blue-400" />
                            </div>
                            <h3 className="font-semibold text-white mb-1">Nouvelle carte</h3>
                            <p className="text-sm text-slate-400">Créez une carte virtuelle</p>
                        </Link>

                        <Link
                            href="/security"
                            className="p-6 bg-slate-800/50 border border-white/10 rounded-2xl hover:scale-[1.02] transition-transform"
                        >
                            <div className="p-3 bg-purple-500/20 rounded-xl w-fit mb-4">
                                <Shield className="w-6 h-6 text-purple-400" />
                            </div>
                            <h3 className="font-semibold text-white mb-1">Sécurité</h3>
                            <p className="text-sm text-slate-400">Gérez 3D Secure</p>
                        </Link>

                        <Link
                            href="/learn"
                            className="p-6 bg-slate-800/50 border border-white/10 rounded-2xl hover:scale-[1.02] transition-transform"
                        >
                            <div className="p-3 bg-emerald-500/20 rounded-xl w-fit mb-4">
                                <AlertCircle className="w-6 h-6 text-emerald-400" />
                            </div>
                            <h3 className="font-semibold text-white mb-1">Apprendre 3DS</h3>
                            <p className="text-sm text-slate-400">Comprendre le flux</p>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
