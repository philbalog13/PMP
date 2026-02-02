'use client';

import Link from 'next/link';
import { ArrowLeft, CreditCard, Activity, DollarSign, TrendingUp } from 'lucide-react';
import { useState } from 'react';

interface Transaction {
    id: string;
    amount: number;
    type: string;
    status: 'APPROVED' | 'DECLINED';
    responseCode: string;
    authorizationCode: string;
    maskedPan: string;
    timestamp: Date;
    matchedRules: string[];
}

// Mock transactions - in real app, these would come from the store or API
const mockTransactions: Transaction[] = [
    {
        id: 'TRX001',
        amount: 42.50,
        type: 'PURCHASE',
        status: 'APPROVED',
        responseCode: '00',
        authorizationCode: 'A45B2C',
        maskedPan: '****1234',
        timestamp: new Date(2026, 0, 29, 14, 32),
        matchedRules: ['AMOUNT_CHECK', 'VELOCITY_CHECK']
    },
    {
        id: 'TRX002',
        amount: 125.00,
        type: 'PURCHASE',
        status: 'DECLINED',
        responseCode: '51',
        authorizationCode: '------',
        maskedPan: '****5678',
        timestamp: new Date(2026, 0, 29, 13, 15),
        matchedRules: ['INSUFFICIENT_FUNDS']
    }
];

export default function TransactionsPage() {
    const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);

    return (
        <div className="min-h-screen p-6">
            {/* Header */}
            <header className="mb-8">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Retour au Terminal
                </Link>
                <h1 className="text-3xl font-bold text-white">Historique des Transactions</h1>
                <p className="text-slate-400 mt-2">Consultez et analysez toutes les transactions effectuées</p>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <Activity className="w-5 h-5 text-blue-500" />
                        <span className="text-xs text-slate-500">Total</span>
                    </div>
                    <div className="text-2xl font-bold text-white">248</div>
                    <div className="text-sm text-slate-400">Transactions</div>
                </div>

                <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <DollarSign className="w-5 h-5 text-green-500" />
                        <span className="text-xs text-slate-500">Approuvées</span>
                    </div>
                    <div className="text-2xl font-bold text-green-400">215</div>
                    <div className="text-sm text-slate-400">86.7% taux de succès</div>
                </div>

                <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <CreditCard className="w-5 h-5 text-red-500" />
                        <span className="text-xs text-slate-500">Refusées</span>
                    </div>
                    <div className="text-2xl font-bold text-red-400">33</div>
                    <div className="text-sm text-slate-400">13.3%</div>
                </div>

                <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <TrendingUp className="w-5 h-5 text-purple-500" />
                        <span className="text-xs text-slate-500">Volume</span>
                    </div>
                    <div className="text-2xl font-bold text-white">12,450€</div>
                    <div className="text-sm text-slate-400">Aujourd'hui</div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="rounded-2xl bg-white/5 border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5">
                    <h2 className="text-xl font-bold text-white">Transactions récentes</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">ID</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Carte</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Montant</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Type</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Statut</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Code</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Date</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {mockTransactions.map((tx) => (
                                <tr
                                    key={tx.id}
                                    className="hover:bg-white/5 transition cursor-pointer"
                                    onClick={() => setSelectedTransaction(tx.id)}
                                >
                                    <td className="px-6 py-4 text-sm font-mono text-slate-300">{tx.id}</td>
                                    <td className="px-6 py-4 text-sm text-slate-300">{tx.maskedPan}</td>
                                    <td className="px-6 py-4 text-sm font-semibold text-white">{tx.amount.toFixed(2)}€</td>
                                    <td className="px-6 py-4 text-sm text-slate-400">{tx.type}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${tx.status === 'APPROVED'
                                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                            }`}>
                                            {tx.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono text-slate-300">{tx.responseCode}</td>
                                    <td className="px-6 py-4 text-sm text-slate-400">
                                        {tx.timestamp.toLocaleString('fr-FR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <Link
                                            href={`/transactions/${tx.id}`}
                                            className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                                        >
                                            Détails →
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-6 border-t border-white/5 flex items-center justify-between">
                    <p className="text-sm text-slate-400">Affichage de 1 à 2 sur 248 transactions</p>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm transition">
                            Précédent
                        </button>
                        <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition">
                            Suivant
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
