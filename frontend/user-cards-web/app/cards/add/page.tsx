'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { clientApi } from '@/lib/api-client';

const CARD_TYPES = ['PREPAID', 'DEBIT', 'CREDIT'] as const;
const NETWORKS = ['VISA', 'MASTERCARD', 'CB', 'AMEX'] as const;

type CardTypeValue = (typeof CARD_TYPES)[number];
type NetworkValue = (typeof NETWORKS)[number];

const getErrorMessage = (error: unknown, fallback: string): string =>
    error instanceof Error && error.message ? error.message : fallback;

export default function AddCardPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        amount: '250',
        holder: '',
        cardType: 'PREPAID' as CardTypeValue,
        network: 'VISA' as NetworkValue
    });

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);

        const amount = Number(formData.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            setError('Le montant doit etre superieur a 0.');
            return;
        }

        setIsLoading(true);

        try {
            await clientApi.createCard({
                amount,
                cardholderName: formData.holder || undefined,
                cardType: formData.cardType,
                network: formData.network
            });

            router.push('/cards');
        } catch (createError: unknown) {
            setError(getErrorMessage(createError, 'Creation de carte impossible'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-6 flex flex-col items-center justify-center bg-slate-950">
            <div className="w-full max-w-lg">
                <div className="mb-8 text-center">
                    <Link href="/cards" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition mb-6">
                        <ArrowLeft className="w-4 h-4" />
                        Retour
                    </Link>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20">
                        <CreditCard className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Generer une carte</h1>
                    <p className="text-slate-400">Choisissez le montant attribue et les proprietes de la carte supplementaire.</p>
                </div>

                <div className="p-8 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Montant a affecter (EUR)
                            </label>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={formData.amount}
                                onChange={(event) => setFormData({ ...formData, amount: event.target.value })}
                                className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Nom du titulaire (optionnel)
                            </label>
                            <input
                                type="text"
                                value={formData.holder}
                                onChange={(event) => setFormData({ ...formData, holder: event.target.value.toUpperCase() })}
                                placeholder="JEAN DUPONT"
                                className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Type de carte</label>
                                <select
                                    value={formData.cardType}
                                    onChange={(event) => setFormData({ ...formData, cardType: event.target.value as CardTypeValue })}
                                    className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
                                >
                                    {CARD_TYPES.map((type) => (
                                        <option key={type} value={type} className="bg-slate-900">{type}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Reseau</label>
                                <select
                                    value={formData.network}
                                    onChange={(event) => setFormData({ ...formData, network: event.target.value as NetworkValue })}
                                    className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
                                >
                                    {NETWORKS.map((network) => (
                                        <option key={network} value={network} className="bg-slate-900">{network}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 mt-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Creation en cours...
                                </>
                            ) : (
                                'Creer la carte'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
