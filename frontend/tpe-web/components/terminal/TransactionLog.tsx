'use client';

import { useTerminalStore } from '@/lib/store';
import { formatAmount, formatDateTime, maskPAN } from '@/lib/utils';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function TransactionLog() {
    const { transactionHistory } = useTerminalStore();

    if (transactionHistory.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-xl p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Historique des Transactions</h3>
                <div className="text-center py-12">
                    <Clock className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">Aucune transaction</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
                Historique des Transactions ({transactionHistory.length})
            </h3>

            <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {transactionHistory.map((txn) => (
                    <div
                        key={txn.id}
                        className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    {txn.status === 'APPROVED' ? (
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-red-500" />
                                    )}
                                    <span
                                        className={`font-semibold ${txn.status === 'APPROVED' ? 'text-green-700' : 'text-red-700'
                                            }`}
                                    >
                                        {txn.status === 'APPROVED' ? 'Approuvée' : 'Refusée'}
                                    </span>
                                    <span className="text-slate-500 text-sm">
                                        {formatDateTime(txn.timestamp)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-slate-600">Montant:</span>
                                        <span className="ml-2 font-semibold text-slate-800">
                                            {formatAmount(txn.amount)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-600">Type:</span>
                                        <span className="ml-2 font-medium text-slate-800">{txn.type}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-600">Carte:</span>
                                        <span className="ml-2 font-mono text-slate-800">{maskPAN(txn.maskedPan)}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-600">Code:</span>
                                        <span className="ml-2 font-mono text-slate-800">{txn.responseCode}</span>
                                    </div>
                                    {txn.authorizationCode && (
                                        <div className="col-span-2">
                                            <span className="text-slate-600">Autorisation:</span>
                                            <span className="ml-2 font-mono text-slate-800">
                                                {txn.authorizationCode}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {txn.matchedRules.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-slate-200">
                                        <p className="text-xs text-slate-500">
                                            Règles: {txn.matchedRules.join(', ')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
