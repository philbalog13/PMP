'use client';

import { useUserStore } from '@/lib/store';
import Card3D from '@/components/card/Card3D';
import CardGenerator from '@/components/card/CardGenerator';
import GlassCard from '@/components/ui/GlassCard';
import PremiumButton from '@/components/ui/PremiumButton';
import {
  Wallet,
  Bell,
  ArrowUpRight,
  ArrowDownLeft,
  LayoutGrid,
  Search,
  MoreHorizontal
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const { cards } = useUserStore();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-[1600px] mx-auto space-y-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-slate-400 bg-clip-text text-transparent font-heading">
            Bonsoir, Georges 👋
          </h1>
          <p className="text-slate-400 mt-2 text-lg">Voici un aperçu de vos finances.</p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative group w-full md:w-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition" size={20} />
            <input
              type="text"
              placeholder="Rechercher une transaction..."
              className="w-full md:w-80 bg-slate-900/50 border border-slate-800 rounded-full py-3 pl-12 pr-6 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition backdrop-blur-sm"
            />
          </div>
          <button className="relative p-3 bg-slate-900/50 rounded-full border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 transition backdrop-blur-sm group">
            <Bell size={20} className="group-hover:animate-swing" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
          </button>
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 p-[2px] cursor-pointer hover:scale-105 transition shadow-lg shadow-blue-500/20">
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-sm text-white">
              GD
            </div>
          </div>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard variant="interactive" glowColor="blue" className="p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-600/20 transition duration-700" />
          <div className="relative z-10">
            <div className="text-slate-400 text-sm font-medium mb-2 uppercase tracking-wider">Solde Total</div>
            <div className="text-4xl font-bold text-white mb-4 tracking-tight">2,450.80 €</div>
            <div className="flex items-center text-green-400 text-sm gap-2 bg-green-500/10 w-fit px-3 py-1 rounded-full border border-green-500/20">
              <ArrowUpRight size={16} />
              <span className="font-semibold">+12.5%</span>
              <span className="text-slate-500 ml-1">vs mois dernier</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard variant="interactive" glowColor="purple" className="p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-purple-600/20 transition duration-700" />
          <div className="relative z-10">
            <div className="text-slate-400 text-sm font-medium mb-2 uppercase tracking-wider">Dépenses (Jan)</div>
            <div className="text-4xl font-bold text-white mb-4 tracking-tight">842.00 €</div>
            <div className="flex items-center text-red-400 text-sm gap-2 bg-red-500/10 w-fit px-3 py-1 rounded-full border border-red-500/20">
              <ArrowDownLeft size={16} />
              <span className="font-semibold">+5.2%</span>
              <span className="text-slate-500 ml-1">vs mois dernier</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard variant="highlight" className="p-8 relative overflow-hidden text-white flex flex-col justify-center items-start">
          <div className="absolute -right-10 -bottom-10 opacity-20 rotate-12">
            <LayoutGrid size={120} />
          </div>
          <h3 className="font-bold text-2xl mb-3 bg-gradient-to-r from-blue-200 to-white bg-clip-text text-transparent">PMP Premium</h3>
          <p className="text-blue-100/80 text-sm mb-6 max-w-[80%] leading-relaxed">
            Profitez de plafonds élevés, d'assurances exclusives et d'un support prioritaire 24/7.
          </p>
          <PremiumButton variant="glass" size="sm">
            Découvrir le Premium
          </PremiumButton>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Cards */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Wallet className="text-blue-500" size={24} />
              </div>
              Vos Cartes
            </h2>
            <CardGenerator />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {cards.map(card => (
              <div key={card.id} className="group relative perspective-1000">
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-2xl rounded-[30px] opacity-0 group-hover:opacity-100 transition duration-700" />
                <Card3D card={card} showDetails={true} />
              </div>
            ))}

            {cards.length === 0 && (
              <GlassCard className="col-span-2 py-20 flex flex-col items-center justify-center border-dashed border-slate-700 opacity-80 hover:opacity-100 transition hover:border-slate-600">
                <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-white/5">
                  <CreditCardIcon />
                </div>
                <p className="font-medium text-lg text-slate-200">Aucune carte active</p>
                <p className="text-slate-400 mt-2">Générez votre première carte virtuelle ci-dessus.</p>
              </GlassCard>
            )}
          </div>
        </div>

        {/* Right Col: Transactions */}
        <GlassCard className="p-0 h-fit overflow-hidden border-white/10">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
            <h2 className="font-bold text-lg">Transactions Récentes</h2>
            <button className="text-slate-500 hover:text-white transition p-2 hover:bg-white/5 rounded-full">
              <MoreHorizontal size={20} />
            </button>
          </div>

          <div className="divide-y divide-white/5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between group cursor-pointer hover:bg-white/[0.03] p-5 transition-all duration-200">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg border border-white/5 transition-transform group-hover:scale-105 ${i % 2 === 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                    {i % 2 === 0 ? '🛒' : '🎬'}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                      {i % 2 === 0 ? 'Supermarché Bio' : 'Netflix Sub'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Aujourd'hui, 14:30</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-200 group-hover:text-white transition-colors">
                    -{(Math.random() * 50 + 10).toFixed(2)} €
                  </div>
                  <div className="text-[10px] text-green-400/80 font-semibold bg-green-500/10 px-2 py-0.5 rounded-full inline-block mt-1">
                    Terminé
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-white/[0.02]">
            <PremiumButton variant="ghost" className="w-full justify-between group">
              Voir tout l'historique
              <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </PremiumButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function CreditCardIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}
