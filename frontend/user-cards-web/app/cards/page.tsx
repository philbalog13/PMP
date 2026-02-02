'use client';

import Link from 'next/link';
import { ArrowLeft, CreditCard, Plus, Shield, Check } from 'lucide-react';
import GlassCard from '@shared/components/GlassCard';
import { useState } from 'react';

// Mock cards data
const initialCards = [
    {
        id: '1',
        type: 'mastercard',
        number: '**** **** **** 4242',
        holder: 'Jean Dupont',
        expiry: '12/28',
        status: 'active',
        balance: 2450.50,
        color: 'from-purple-600 to-blue-600'
    },
    {
        id: '2',
        type: 'visa',
        number: '**** **** **** 8899',
        holder: 'Jean Dupont',
        expiry: '09/27',
        status: 'active',
        balance: 120.00,
        color: 'from-emerald-600 to-teal-600'
    }
];

export default function CardsPage() {
    const [cards] = useState(initialCards);

    return (
        <div className="min-h-screen p-6 md:p-10 max-w-[1600px] mx-auto">
            {/* Header */}
            <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition mb-2">
                        <ArrowLeft className="w-4 h-4" />
                        Retour au Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <CreditCard className="w-8 h-8 text-blue-500" />
                        Mes Cartes
                    </h1>
                </div>

                <Link
                    href="/cards/add"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Nouvelle Carte
                </Link>
            </header>

            {/* Cards Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {cards.map((card) => (
                    <div key={card.id} className="group relative">
                        <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-20 blur-xl group-hover:opacity-30 transition duration-500`} />
                        <GlassCard className="h-full relative overflow-hidden group-hover:-translate-y-1 transition-transform duration-300">
                            {/* Card Visual */}
                            <div className={`h-48 rounded-2xl bg-gradient-to-br ${card.color} p-6 relative overflow-hidden shadow-lg mb-6`}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-5 -mb-5" />

                                <div className="flex justify-between items-start mb-8 relative z-10">
                                    <div className="w-12 h-8 bg-white/20 rounded-md backdrop-blur-sm border border-white/10" />
                                    <span className="font-bold text-white italic tracking-wider uppercase">{card.type}</span>
                                </div>

                                <div className="text-xl font-mono text-white tracking-widest mb-4 relative z-10 shadow-black drop-shadow-md">
                                    {card.number}
                                </div>

                                <div className="flex justify-between items-end relative z-10">
                                    <div>
                                        <div className="text-[10px] text-white/70 uppercase mb-1">Titulaire</div>
                                        <div className="text-sm font-medium text-white tracking-wide">{card.holder}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-white/70 uppercase mb-1">Expires</div>
                                        <div className="text-sm font-medium text-white tracking-wide">{card.expiry}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Details & Actions */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                    <span className="text-slate-400">Solde disponible</span>
                                    <span className="text-xl font-bold text-white">{card.balance.toFixed(2)} €</span>
                                </div>

                                <div className="flex gap-2">
                                    <button className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition border border-white/5 flex items-center justify-center gap-2">
                                        <Shield className="w-4 h-4" />
                                        Sécurité
                                    </button>
                                    <button className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition border border-white/5">
                                        Détails
                                    </button>
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                ))}

                {/* Add New Card Placeholder */}
                <Link href="/cards/add" className="group rounded-3xl border-2 border-dashed border-white/10 hover:border-blue-500/50 bg-white/[0.02] hover:bg-white/[0.05] transition flex flex-col items-center justify-center min-h-[300px]">
                    <div className="w-16 h-16 rounded-full bg-white/5 group-hover:bg-blue-500/20 flex items-center justify-center mb-4 transition">
                        <Plus className="w-8 h-8 text-slate-500 group-hover:text-blue-400 transition" />
                    </div>
                    <span className="font-medium text-slate-400 group-hover:text-blue-400 transition">Ajouter une carte</span>
                </Link>
            </div>
        </div>
    );
}
