'use client';

import GlassCard from '@/components/ui/GlassCard';
import PremiumButton from '@/components/ui/PremiumButton';
import { ShieldCheck, Lock, Globe, AlertTriangle, Smartphone, Zap, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export default function SecurityPage() {
    const [limits, setLimits] = useState({
        daily: 500,
        monthly: 2000,
        contactless: 50,
    });

    const [toggles, setToggles] = useState([
        { id: 'online', label: 'Paiements en ligne', icon: Globe, enabled: true },
        { id: 'contactless', label: 'Sans contact (NFC)', icon: Smartphone, enabled: true },
        { id: 'abroad', label: 'Paiements à l\'étranger', icon: Globe, enabled: false },
        { id: 'atm', label: 'Retraits DAB', icon: Zap, enabled: true },
    ]);

    const handleToggle = (id: string) => {
        setToggles(toggles.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t));
    };

    return (
        <div className="min-h-screen p-6 md:p-10 max-w-[1200px] mx-auto space-y-10">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <ShieldCheck size={32} className="text-white" />
                </div>
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent font-heading">
                        Centre de Sécurité
                    </h1>
                    <p className="text-slate-400 mt-1">Protégez vos cartes avec des contrôles avancés.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Limits Section */}
                <GlassCard className="p-8">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
                            <Zap size={20} className="text-blue-400" />
                        </div>
                        Plafonds & Limites
                    </h3>

                    <div className="space-y-8">
                        <div>
                            <div className="flex justify-between mb-3">
                                <label className="text-sm font-medium text-slate-300">Plafond Journalier</label>
                                <span className="text-lg font-bold text-blue-400">{limits.daily} €</span>
                            </div>
                            <input
                                type="range"
                                min="100"
                                max="2000"
                                step="50"
                                value={limits.daily}
                                onChange={(e) => setLimits({ ...limits, daily: Number(e.target.value) })}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                                <span>100 €</span>
                                <span>2000 €</span>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between mb-3">
                                <label className="text-sm font-medium text-slate-300">Plafond Mensuel</label>
                                <span className="text-lg font-bold text-purple-400">{limits.monthly} €</span>
                            </div>
                            <input
                                type="range"
                                min="500"
                                max="10000"
                                step="100"
                                value={limits.monthly}
                                onChange={(e) => setLimits({ ...limits, monthly: Number(e.target.value) })}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                                <span>500 €</span>
                                <span>10 000 €</span>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between mb-3">
                                <label className="text-sm font-medium text-slate-300">Limite Sans Contact</label>
                                <span className="text-lg font-bold text-green-400">{limits.contactless} €</span>
                            </div>
                            <input
                                type="range"
                                min="20"
                                max="150"
                                step="10"
                                value={limits.contactless}
                                onChange={(e) => setLimits({ ...limits, contactless: Number(e.target.value) })}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                            />
                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                                <span>20 €</span>
                                <span>150 €</span>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* Toggles Section */}
                <GlassCard className="p-8">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center">
                            <Lock size={20} className="text-purple-400" />
                        </div>
                        Canaux de Paiement
                    </h3>

                    <div className="space-y-3">
                        {toggles.map((toggle) => (
                            <div
                                key={toggle.id}
                                onClick={() => handleToggle(toggle.id)}
                                className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-300 border ${toggle.enabled
                                        ? 'bg-white/5 border-white/10 hover:bg-white/10'
                                        : 'bg-slate-900/50 border-slate-800 opacity-60'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${toggle.enabled ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-800 text-slate-600'}`}>
                                        <toggle.icon size={20} />
                                    </div>
                                    <div>
                                        <span className="font-semibold text-white">{toggle.label}</span>
                                        <p className="text-xs text-slate-500">{toggle.enabled ? 'Activé' : 'Désactivé'}</p>
                                    </div>
                                </div>
                                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${toggle.enabled ? 'bg-blue-600' : 'bg-slate-700'}`}>
                                    <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${toggle.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            </div>

            {/* Danger Zone */}
            <GlassCard className="p-8 border-red-500/20 bg-red-950/20">
                <h3 className="text-xl font-bold text-red-400 mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-600/20 flex items-center justify-center">
                        <AlertTriangle size={20} className="text-red-400" />
                    </div>
                    Zone de Danger
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PremiumButton variant="secondary" className="border-red-500/30 hover:bg-red-950/30 text-red-400">
                        <EyeOff size={16} className="mr-2" /> Masquer le Numéro de Carte
                    </PremiumButton>
                    <PremiumButton variant="secondary" className="border-red-500/50 hover:bg-red-600/20 text-red-400">
                        <Lock size={16} className="mr-2" /> Bloquer Temporairement
                    </PremiumButton>
                </div>
            </GlassCard>
        </div>
    );
}
