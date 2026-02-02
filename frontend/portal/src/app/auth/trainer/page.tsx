'use client';

import React, { useState } from 'react';
import { LayoutDashboard, ShieldCheck, Fingerprint, History, Settings, ExternalLink, AlertCircle } from 'lucide-react';

export default function TrainerAuthPage() {
    const [step, setStep] = useState(1);

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Security Badge */}
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-4 py-2 rounded-full shadow-lg">
                        <ShieldCheck className="text-emerald-400" size={18} />
                        <span className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">Zone d'Administration Sécurisée</span>
                    </div>
                </div>

                <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden p-10 space-y-8">
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl font-bold text-white">Dashboard Formateur</h1>
                        <p className="text-slate-400 text-xs">PMP - Plateforme Monétique Pédagogique</p>
                    </div>

                    {step === 1 ? (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Identifiant Admin</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden transition-all"
                                        placeholder="admin_root"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Mot de Passe Maitre</label>
                                    <input
                                        type="password"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden transition-all"
                                        placeholder="********"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95"
                            >
                                <LayoutDashboard size={18} /> Accéder aux outils
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in zoom-in-95 duration-300">
                            <div className="flex flex-col items-center gap-4 py-4 text-center">
                                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center animate-pulse">
                                    <Fingerprint size={32} className="text-emerald-500" />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-white font-bold italic">2FA OBLIGATOIRE</h2>
                                    <p className="text-slate-400 text-[10px]">Une notification a été envoyée sur votre appareil de confiance.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="h-14 bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center text-xl font-mono text-emerald-400">
                                        •
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 bg-red-400/5 border border-red-400/20 rounded-lg flex items-start gap-3">
                                <AlertCircle className="text-red-400 flex-shrink-0" size={16} />
                                <p className="text-[9px] text-red-300 leading-tight">
                                    PROTECTION ACTIVE : Toutes vos actions et connexions sont journalisées. L'accès aux données stagiaires nécessite une clé de session valide.
                                </p>
                            </div>

                            <button
                                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs py-2 rounded-lg transition-colors"
                                onClick={() => setStep(1)}
                            >
                                Annuler et réinitialiser la session
                            </button>
                        </div>
                    )}

                    <div className="pt-6 border-t border-slate-700 flex flex-col gap-3">
                        <div className="flex items-center justify-between text-[9px] text-slate-500 uppercase font-bold tracking-widest">
                            <span className="flex items-center gap-1"><History size={10} /> Connexions récentes</span>
                            <span className="flex items-center gap-1"><Settings size={10} /> Syst: OK</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[8px] text-slate-600">
                                <span>Session ID: 0x88...F2</span>
                                <span>Location: Paris, FR</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-center gap-6">
                    <a href="#" className="text-[10px] text-slate-500 hover:text-emerald-400 flex items-center gap-1 transition-colors">
                        Documentation Admin <ExternalLink size={10} />
                    </a>
                    <a href="#" className="text-[10px] text-slate-500 hover:text-emerald-400 flex items-center gap-1 transition-colors">
                        Journal Audit <ExternalLink size={10} />
                    </a>
                </div>
            </div>
        </div>
    );
}
