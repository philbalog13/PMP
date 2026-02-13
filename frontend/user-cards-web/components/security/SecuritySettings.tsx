'use client';

import { useState } from 'react';
import { Shield, Lock, Globe, AlertTriangle, Smartphone } from 'lucide-react';

export default function SecuritySettings() {
    const [limits, setLimits] = useState({
        daily: 500,
        monthly: 2000,
        contactless: 50,
    });

    const toggles = [
        { id: 'online', label: 'Paiements en ligne', icon: Globe, enabled: true },
        { id: 'contactless', label: 'Sans contact (NFC)', icon: Smartphone, enabled: true },
        { id: 'abroad', label: 'Paiements à l\'étranger', icon: Globe, enabled: false },
    ];

    return (
        <div className="space-y-8">
            {/* Limits Section */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Shield className="text-blue-600" />
                    Plafonds et Limites
                </h3>

                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium text-slate-700">Plafond Journalier</label>
                            <span className="text-sm font-bold text-slate-900">{limits.daily} €</span>
                        </div>
                        <input
                            type="range"
                            min="100"
                            max="2000"
                            step="50"
                            value={limits.daily}
                            onChange={(e) => setLimits({ ...limits, daily: Number(e.target.value) })}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium text-slate-700">Plafond Mensuel</label>
                            <span className="text-sm font-bold text-slate-900">{limits.monthly} €</span>
                        </div>
                        <input
                            type="range"
                            min="500"
                            max="10000"
                            step="100"
                            value={limits.monthly}
                            onChange={(e) => setLimits({ ...limits, monthly: Number(e.target.value) })}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                    </div>
                </div>
            </section>

            {/* Toggles Section */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Lock className="text-blue-600" />
                    Verrouillage Canaux
                </h3>

                <div className="space-y-4">
                    {toggles.map((toggle) => (
                        <div key={toggle.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                                    <toggle.icon size={20} />
                                </div>
                                <span className="font-medium text-slate-700">{toggle.label}</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" defaultChecked={toggle.enabled} className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    ))}
                </div>
            </section>

            {/* Danger Zone */}
            <section className="bg-red-50 p-6 rounded-xl border border-red-100">
                <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
                    <AlertTriangle className="text-red-600" />
                    Zone de Danger
                </h3>
                <button className="w-full py-3 bg-white border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 transition">
                    Bloquer Temporairement la Carte
                </button>
            </section>
        </div>
    );
}
