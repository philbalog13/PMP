'use client';

import { useTerminalStore } from '@/lib/store';
import type { TransactionType } from '@/types/transaction';

export default function ConfigPanel() {
    const { selectedType, setTransactionType, state } = useTerminalStore();

    const transactionTypes: { value: TransactionType; label: string; description: string }[] = [
        { value: 'PURCHASE', label: 'Achat', description: 'Transaction d\'achat standard' },
        { value: 'REFUND', label: 'Remboursement', description: 'Remboursement client' },
        { value: 'VOID', label: 'Annulation', description: 'Annulation de transaction' },
        { value: 'PRE_AUTH', label: 'Pré-autorisation', description: 'Blocage de fonds' },
    ];

    const isDisabled = state !== 'idle' && state !== 'amount-input';

    return (
        <div className="bg-white rounded-lg shadow-xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Configuration</h3>

            <div className="space-y-4">
                {/* Transaction Type */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Type de Transaction
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {transactionTypes.map((type) => (
                            <button
                                key={type.value}
                                onClick={() => setTransactionType(type.value)}
                                disabled={isDisabled}
                                className={`p-3 rounded-lg border-2 transition text-left ${selectedType === type.value
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                <p className="font-semibold text-slate-800">{type.label}</p>
                                <p className="text-xs text-slate-600">{type.description}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Scenarios Presets */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Scénarios Pédagogiques
                    </label>
                    <div className="space-y-2 text-xs">
                        <div className="p-2 bg-green-50 border border-green-200 rounded">
                            <p className="font-semibold text-green-700">✓ Carte Valide (4111...1111)</p>
                            <p className="text-green-600">Approuvée si solde suffisant</p>
                        </div>
                        <div className="p-2 bg-red-50 border border-red-200 rounded">
                            <p className="font-semibold text-red-700">✗ Solde Insuffisant (4000...5556)</p>
                            <p className="text-red-600">Code 51 - Fonds insuffisants</p>
                        </div>
                        <div className="p-2 bg-orange-50 border border-orange-200 rounded">
                            <p className="font-semibold text-orange-700">✗ Carte Expirée (4532...0366)</p>
                            <p className="text-orange-600">Code 54 - Carte expirée</p>
                        </div>
                        <div className="p-2 bg-purple-50 border border-purple-200 rounded">
                            <p className="font-semibold text-purple-700">✗ Carte Volée (4916...2832)</p>
                            <p className="text-purple-600">Code 43 - Carte bloquée</p>
                        </div>
                    </div>
                </div>

                {/* Info */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-xs text-blue-700">
                        <strong>Info:</strong> Ces cartes sont pré-configurées avec des scénarios pédagogiques
                        pour démontrer les différents codes de réponse ISO 8583.
                    </p>
                </div>
            </div>
        </div>
    );
}
