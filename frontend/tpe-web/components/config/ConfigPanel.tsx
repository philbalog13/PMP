'use client';

import { useTerminalStore } from '@/lib/store';
import type { TransactionType } from '@/types/transaction';
import { ShoppingCart, RotateCcw, Ban, Lock } from 'lucide-react';

export default function ConfigPanel() {
    const { selectedType, setTransactionType, state } = useTerminalStore();

    const transactionTypes: { value: TransactionType; label: string; description: string; icon: React.ReactNode }[] = [
        { value: 'PURCHASE', label: 'Achat', description: 'Transaction standard', icon: <ShoppingCart size={16} /> },
        { value: 'REFUND', label: 'Remboursement', description: 'Remboursement client', icon: <RotateCcw size={16} /> },
        { value: 'VOID', label: 'Annulation', description: 'Annuler une transaction', icon: <Ban size={16} /> },
        { value: 'PRE_AUTH', label: 'Pré-auth', description: 'Blocage de fonds', icon: <Lock size={16} /> },
    ];

    const isDisabled = state !== 'idle' && state !== 'amount-input';

    return (
        <div className="space-y-4">
            {/* Transaction Type */}
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Type de Transaction
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {transactionTypes.map((type) => (
                        <button
                            key={type.value}
                            onClick={() => setTransactionType(type.value)}
                            disabled={isDisabled}
                            className={`p-3 rounded-xl border transition text-left flex items-center gap-3 ${selectedType === type.value
                                    ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                                    : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white'
                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                            <div className={selectedType === type.value ? 'text-blue-400' : 'text-slate-500'}>{type.icon}</div>
                            <div>
                                <p className="font-semibold text-sm">{type.label}</p>
                                <p className="text-[10px] opacity-70">{type.description}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Scenarios Presets */}
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Cartes de Test
                </label>
                <div className="space-y-1.5 text-xs">
                    <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between">
                        <span className="text-emerald-300 font-medium">Carte Valide</span>
                        <span className="font-mono text-emerald-400/70">4111...1111</span>
                    </div>
                    <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
                        <span className="text-red-300 font-medium">Solde Insuffisant</span>
                        <span className="font-mono text-red-400/70">Code 51</span>
                    </div>
                    <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-between">
                        <span className="text-amber-300 font-medium">Carte Expirée</span>
                        <span className="font-mono text-amber-400/70">Code 54</span>
                    </div>
                    <div className="px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-between">
                        <span className="text-purple-300 font-medium">Carte Bloquée</span>
                        <span className="font-mono text-purple-400/70">Code 43</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
