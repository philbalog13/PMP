'use client';

import { useTerminalStore } from '@/lib/store';
import { formatAmount } from '@/lib/utils';
import { CreditCard, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function TerminalScreen() {
    const { state, amount, currentTransaction } = useTerminalStore();

    const getStatusIcon = () => {
        switch (state) {
            case 'approved':
                return <CheckCircle2 className="w-16 h-16 text-green-500" />;
            case 'declined':
                return <XCircle className="w-16 h-16 text-red-500" />;
            case 'processing':
                return <Clock className="w-16 h-16 text-blue-500 animate-pulse" />;
            case 'card-wait':
                return <CreditCard className="w-16 h-16 text-yellow-500 animate-bounce" />;
            default:
                return null;
        }
    };

    const getMessage = () => {
        switch (state) {
            case 'idle':
                return 'Bienvenue';
            case 'amount-input':
                return 'Saisissez le montant';
            case 'card-wait':
                return 'Présentez la carte';
            case 'processing':
                return 'Traitement en cours...';
            case 'approved':
                return currentTransaction?.responseMessage || 'Transaction approuvée';
            case 'declined':
                return currentTransaction?.responseMessage || 'Transaction refusée';
            default:
                return '';
        }
    };

    return (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-8 shadow-2xl min-h-[400px] flex flex-col justify-between">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-green-400 text-sm font-mono mb-2">TERMINAL DE PAIEMENT</h2>
                <div className="h-1 w-full bg-green-500/20 rounded"></div>
            </div>

            {/* Main Display */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                {/* Status Icon */}
                <div className="flex items-center justify-center">
                    {getStatusIcon()}
                </div>

                {/* Message */}
                <div className="text-center">
                    <p className="text-green-400 text-2xl font-mono mb-2">{getMessage()}</p>

                    {/* Amount Display */}
                    {state === 'amount-input' && (
                        <p className="text-green-300 text-5xl font-mono font-bold">
                            {formatAmount(amount)}
                        </p>
                    )}

                    {/* Transaction Result */}
                    {(state === 'approved' || state === 'declined') && currentTransaction && (
                        <div className="space-y-2 mt-4">
                            <p className="text-green-300 text-4xl font-mono font-bold">
                                {formatAmount(amount)}
                            </p>
                            <div className="text-sm text-green-400/70 space-y-1">
                                <p>Code: {currentTransaction.responseCode}</p>
                                {currentTransaction.authorizationCode && (
                                    <p>Auth: {currentTransaction.authorizationCode}</p>
                                )}
                                <p className="text-xs">
                                    Temps: {currentTransaction.processingTime}ms
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="text-center">
                <div className="h-1 w-full bg-green-500/20 rounded mb-2"></div>
                <p className="text-green-400/50 text-xs font-mono">
                    {new Date().toLocaleTimeString('fr-FR')}
                </p>
            </div>
        </div>
    );
}
