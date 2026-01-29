'use client';

import GlassCard from '@/components/ui/GlassCard';
import PremiumButton from '@/components/ui/PremiumButton';
import { Search, Filter, Download, ArrowUpRight, ArrowDownLeft, Store, CreditCard } from 'lucide-react';

export default function TransactionsPage() {
    const transactions = Array.from({ length: 15 }).map((_, i) => ({
        id: `TX-${1000 + i}`,
        merchant: i % 3 === 0 ? 'Amazon Prime' : i % 3 === 1 ? 'Uber Eats' : 'Apple Store',
        amount: (Math.random() * 100 + 10).toFixed(2),
        date: new Date(Date.now() - i * 86400000).toLocaleDateString('fr-FR'),
        type: i % 4 === 0 ? 'credit' : 'debit',
        category: i % 3 === 0 ? 'Abonnement' : i % 3 === 1 ? 'Restaurant' : 'High-Tech',
        status: i === 0 ? 'En attente' : 'Terminé'
    }));

    return (
        <div className="min-h-screen p-6 md:p-10 max-w-[1600px] mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent font-heading">
                        Historique
                    </h1>
                    <p className="text-slate-400 mt-2">Consultez l'ensemble de vos opérations bancaires.</p>
                </div>
                <div className="flex gap-3">
                    <PremiumButton variant="secondary" icon={<Download size={16} />}>Exporter</PremiumButton>
                </div>
            </div>

            <GlassCard className="p-0 overflow-hidden">
                {/* Toolbar */}
                <div className="p-6 border-b border-white/5 flex flex-col md:flex-row gap-4 justify-between bg-white/[0.02]">
                    <div className="relative group w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition" size={20} />
                        <input
                            type="text"
                            placeholder="Rechercher une transaction, un commerçant..."
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-6 text-sm focus:outline-none focus:border-blue-500/50 transition backdrop-blur-sm"
                        />
                    </div>
                    <div className="flex gap-3">
                        <PremiumButton variant="ghost" icon={<Filter size={16} />}>Filtrer</PremiumButton>
                    </div>
                </div>

                {/* List Header */}
                <div className="grid grid-cols-12 px-8 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-900/40 border-b border-white/5">
                    <div className="col-span-5 md:col-span-4">Commerçant</div>
                    <div className="col-span-3 text-center hidden md:block">Catégorie</div>
                    <div className="col-span-3 text-center hidden md:block">Date</div>
                    <div className="col-span-4 md:col-span-2 text-right">Montant</div>
                </div>

                {/* List Items */}
                <div className="divide-y divide-white/5">
                    {transactions.map((tx, i) => (
                        <div key={tx.id} className="grid grid-cols-12 px-8 py-5 items-center hover:bg-white/[0.02] transition-colors group cursor-pointer">

                            <div className="col-span-5 md:col-span-4 flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'credit' ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300'}`}>
                                    {tx.type === 'credit' ? <ArrowDownLeft size={18} /> : <Store size={18} />}
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">{tx.merchant}</div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                        {tx.status === 'En attente' && <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />}
                                        {tx.status} • {tx.type === 'credit' ? 'Virement entrants' : 'Paiement Carte'}
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-3 hidden md:flex justify-center">
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-slate-400 border border-white/5">
                                    {tx.category}
                                </span>
                            </div>

                            <div className="col-span-3 hidden md:block text-center text-sm text-slate-400">
                                {tx.date}
                            </div>

                            <div className="col-span-4 md:col-span-2 text-right">
                                <div className={`font-bold font-mono ${tx.type === 'credit' ? 'text-green-400' : 'text-slate-200'}`}>
                                    {tx.type === 'credit' ? '+' : '-'}{tx.amount} €
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>
        </div>
    );
}
