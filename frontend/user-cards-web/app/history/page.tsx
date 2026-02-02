'use client';

import Link from 'next/link';
import { ArrowLeft, Search, Filter, ShoppingBag, Coffee, Car } from 'lucide-react';
import { useState } from 'react';

const transactionHistory = [
    { id: 'TX1', title: 'Carrefour Market', date: '29 Janv. 14:30', amount: -42.50, type: 'course', icon: ShoppingBag, color: 'bg-blue-500' },
    { id: 'TX2', title: 'Starbucks', date: '29 Janv. 09:15', amount: -8.50, type: 'food', icon: Coffee, color: 'bg-amber-500' },
    { id: 'TX3', title: 'Uber Ride', date: '28 Janv. 22:45', amount: -24.00, type: 'transport', icon: Car, color: 'bg-purple-500' },
    { id: 'TX4', title: 'Remboursement Amazon', date: '27 Janv. 10:00', amount: 59.99, type: 'refund', icon: ShoppingBag, color: 'bg-green-500' },
];

export default function HistoryPage() {
    return (
        <div className="min-h-screen p-6 md:p-10 max-w-[1600px] mx-auto">
            {/* Header */}
            <header className="mb-10">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Retour au Dashboard
                </Link>
                <h1 className="text-3xl font-bold text-white mb-2">Historique des Transactions</h1>
                <p className="text-slate-400">Consultez vos dépenses et rentrées d'argent</p>
            </header>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Rechercher une transaction..."
                        className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition"
                    />
                </div>
                <button className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filtres
                </button>
            </div>

            {/* List */}
            <div className="space-y-4">
                {transactionHistory.map((tx) => {
                    const Icon = tx.icon;
                    return (
                        <div key={tx.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl ${tx.color}/10 flex items-center justify-center shrink-0`}>
                                <Icon className={`w-6 h-6 ${tx.color.replace('bg-', 'text-')}`} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-white">{tx.title}</h3>
                                <div className="text-sm text-slate-400">{tx.date}</div>
                            </div>
                            <div className={`font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-white'}`}>
                                {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} €
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
