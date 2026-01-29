'use client';

import { useUserStore } from '@/lib/store';
import Card3D from '@/components/card/Card3D';
import CardGenerator from '@/components/card/CardGenerator';
import GlassCard from '@/components/ui/GlassCard';
import PremiumButton from '@/components/ui/PremiumButton';
import { Plus, CreditCard, ShieldCheck, Globe } from 'lucide-react';

export default function CardsPage() {
    const { cards } = useUserStore();

    return (
        <div className="min-h-screen p-6 md:p-10 max-w-[1600px] mx-auto space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent font-heading">
                        Vos Cartes
                    </h1>
                    <p className="text-slate-400 mt-2">Gérez vos cartes virtuelles et physiques.</p>
                </div>
                <CardGenerator />
            </div>

            {cards.length === 0 ? (
                <GlassCard className="py-24 flex flex-col items-center justify-center border-dashed border-slate-700">
                    <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-white/5">
                        <CreditCard size={40} className="text-slate-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-300">Aucune carte active</h3>
                    <p className="text-slate-500 mt-2 mb-8 text-center max-w-md">
                        Commencez par générer une carte virtuelle sécurisée pour vos achats en ligne.
                    </p>
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {cards.map(card => (
                        <div key={card.id} className="space-y-6">
                            <div className="group relative perspective-1000">
                                <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/30 to-purple-600/30 blur-2xl rounded-[30px] opacity-0 group-hover:opacity-100 transition duration-700" />
                                <Card3D card={card} showDetails={true} />
                            </div>

                            <GlassCard className="p-4 space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">Statut</span>
                                    <span className="text-green-400 font-semibold bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">Active</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">Plafond</span>
                                    <span className="text-white font-medium">2,500.00 €</span>
                                </div>
                                <div className="pt-2 flex gap-2">
                                    <PremiumButton variant="secondary" size="sm" className="w-full">
                                        <ShieldCheck size={14} className="mr-2" /> Options
                                    </PremiumButton>
                                    <PremiumButton variant="secondary" size="sm" className="w-full">
                                        <Globe size={14} className="mr-2" /> Limites
                                    </PremiumButton>
                                </div>
                            </GlassCard>
                        </div>
                    ))}

                    {/* Add New Card Slot */}
                    <GlassCard variant="interactive" className="min-h-[300px] flex flex-col items-center justify-center border-dashed border-slate-700 hover:border-blue-500/50 group h-full">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                            <Plus size={32} />
                        </div>
                        <span className="font-semibold text-slate-300 group-hover:text-white transition">Nouvelle Carte</span>
                    </GlassCard>
                </div>
            )}
        </div>
    );
}
