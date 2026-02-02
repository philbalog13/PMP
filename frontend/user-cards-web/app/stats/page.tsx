'use client';

import GlassCard from '@shared/components/GlassCard';
import { PieChart, TrendingUp, BarChart3, Calendar } from 'lucide-react';

export default function StatsPage() {
    return (
        <div className="min-h-screen p-6 md:p-10 max-w-[1600px] mx-auto space-y-10">
            <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent font-heading">
                    Analyses & Statistiques
                </h1>
                <p className="text-slate-400 mt-2">Visualisez vos habitudes de dépenses en temps réel.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {['Dépenses Totales', 'Revenus', 'Épargne', 'Budget Restant'].map((label, i) => (
                    <GlassCard key={i} className="p-6">
                        <div className="text-slate-500 text-xs uppercase tracking-wider font-semibold mb-2">{label}</div>
                        <div className="text-2xl font-bold text-white mb-2">{Math.floor(Math.random() * 5000)} €</div>
                        <div className="text-green-400 text-xs flex items-center gap-1">
                            <TrendingUp size={12} /> +{Math.floor(Math.random() * 20)}% vs mois dernier
                        </div>
                    </GlassCard>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <GlassCard className="lg:col-span-2 p-8 min-h-[400px] flex items-center justify-center relative">
                    <div className="absolute top-6 left-6 flex items-center gap-2 text-slate-300 font-semibold">
                        <BarChart3 size={20} className="text-blue-500" /> Dépenses par jour
                    </div>
                    {/* Placeholder for complex chart */}
                    <div className="flex items-end gap-3 h-64 w-full px-10">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="w-full bg-blue-600/20 hover:bg-blue-600/40 rounded-t-lg transition-all duration-500 relative group" style={{ height: `${Math.random() * 100}%` }}>
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-white text-black text-xs px-2 py-1 rounded transition-opacity">
                                    {Math.floor(Math.random() * 500)}€
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>

                <GlassCard className="p-8 flex flex-col items-center justify-center relative">
                    <div className="absolute top-6 left-6 flex items-center gap-2 text-slate-300 font-semibold">
                        <PieChart size={20} className="text-purple-500" /> Répartition
                    </div>

                    <div className="w-48 h-48 rounded-full border-8 border-slate-800 relative flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-8 border-blue-500 border-t-transparent border-l-transparent rotate-45" />
                        <div className="absolute inset-0 rounded-full border-8 border-purple-500 border-b-transparent border-r-transparent -rotate-12 scale-90" />
                        <div className="text-center">
                            <div className="text-2xl font-bold text-white">Top 3</div>
                            <div className="text-xs text-slate-500">Catégories</div>
                        </div>
                    </div>

                    <div className="mt-8 w-full space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-2 text-slate-400"><span className="w-2 h-2 rounded-full bg-blue-500" /> Alimentation</span>
                            <span className="text-white font-medium">45%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-2 text-slate-400"><span className="w-2 h-2 rounded-full bg-purple-500" /> Loisirs</span>
                            <span className="text-white font-medium">30%</span>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
