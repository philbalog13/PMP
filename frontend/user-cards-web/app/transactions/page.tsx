'use client';

import { History } from 'lucide-react';

export default function TransactionsPage() {
    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex items-center gap-3 mb-8">
                    <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                        <History size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Historique des Transactions</h1>
                        <p className="text-slate-500">Consultez l'ensemble de vos opérations.</p>
                    </div>
                </header>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-100">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50 transition">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-xl">
                                    🛒
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Magasin {i + 1}</h3>
                                    <p className="text-sm text-slate-500">28 Jan 2026 • 14:{30 + i}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold font-mono text-slate-900">-{(Math.random() * 100).toFixed(2)} €</p>
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Validé</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
