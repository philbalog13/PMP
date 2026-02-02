'use client';

import Link from 'next/link';
import { ArrowLeft, CreditCard, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function AddCardPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        pan: '',
        expiry: '',
        cvv: '',
        holder: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        window.location.href = '/cards';
    };

    // Basic formatting helpers
    const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '');
        val = val.substring(0, 16);
        val = val.replace(/(\d{4})/g, '$1 ').trim();
        setFormData({ ...formData, pan: val });
    };

    const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length >= 2) {
            val = val.substring(0, 2) + '/' + val.substring(2, 4);
        }
        setFormData({ ...formData, expiry: val.substring(0, 5) });
    };

    return (
        <div className="min-h-screen p-6 flex flex-col items-center justify-center">
            <div className="w-full max-w-lg">
                {/* Header */}
                <div className="mb-8 text-center">
                    <Link href="/cards" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition mb-6">
                        <ArrowLeft className="w-4 h-4" />
                        Annuler
                    </Link>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20">
                        <CreditCard className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Ajouter une Carte</h1>
                    <p className="text-slate-400">Entrez les détails de votre carte bancaire</p>
                </div>

                {/* Form */}
                <div className="p-8 rounded-3xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Card Number */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Numéro de Carte
                            </label>
                            <input
                                type="text"
                                value={formData.pan}
                                onChange={handlePanChange}
                                placeholder="0000 0000 0000 0000"
                                className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            {/* Expiry */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Expiration (MM/YY)
                                </label>
                                <input
                                    type="text"
                                    value={formData.expiry}
                                    onChange={handleExpiryChange}
                                    placeholder="MM/YY"
                                    className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
                                    required
                                />
                            </div>

                            {/* CVV */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    CVV
                                </label>
                                <input
                                    type="password"
                                    maxLength={3}
                                    value={formData.cvv}
                                    onChange={(e) => setFormData({ ...formData, cvv: e.target.value.replace(/\D/g, '') })}
                                    placeholder="123"
                                    className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
                                    required
                                />
                            </div>
                        </div>

                        {/* Holder Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Nom du Titulaire
                            </label>
                            <input
                                type="text"
                                value={formData.holder}
                                onChange={(e) => setFormData({ ...formData, holder: e.target.value.toUpperCase() })}
                                placeholder="JEAN DUPONT"
                                className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 mt-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Vérification...
                                </>
                            ) : (
                                'Enregistrer la Carte'
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs text-slate-500 mt-6 max-w-xs mx-auto">
                    Vos données sont chiffrées de bout en bout et sécurisées selon les normes PCI-DSS.
                </p>
            </div>
        </div>
    );
}
