'use client';

import React, { useState } from 'react';
import { Shield, Lock, Smartphone, ChevronRight, Info } from 'lucide-react';

export default function ClientAuthPage() {
    const [step, setStep] = useState(1);
    const [identifier, setIdentifier] = useState('');

    return (
        <div className="min-h-screen bg-linear-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden transition-all duration-500">
                {/* Header */}
                <div className="p-8 pb-0 text-center">
                    <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                        <Shield className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Espace Client Sécurisé</h1>
                    <p className="text-blue-200 text-sm">PMP - Plateforme Monétique Pédagogique</p>
                </div>

                {/* Progress Indicator */}
                <div className="flex justify-center gap-2 mt-6">
                    <div className={`h-1 w-12 rounded-full transition-colors ${step >= 1 ? 'bg-blue-400' : 'bg-white/20'}`} />
                    <div className={`h-1 w-12 rounded-full transition-colors ${step >= 2 ? 'bg-blue-400' : 'bg-white/20'}`} />
                </div>

                <div className="p-8">
                    {step === 1 ? (
                        <div className="space-y-6 animate-in slide-in-from-right duration-300">
                            <div className="space-y-2 text-center">
                                <h2 className="text-white text-lg font-medium">Identifiez-vous</h2>
                                <p className="text-blue-300 text-xs">Saisissez votre numéro client ou e-mail</p>
                            </div>

                            <div className="relative group">
                                <input
                                    type="text"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-white/20"
                                    placeholder="Ex: 12345678"
                                />
                                <Lock className="absolute right-4 top-3.5 text-white/30 w-5 h-5 group-focus-within:text-blue-400 transition-colors" />
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                disabled={!identifier}
                                className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 active:scale-95"
                            >
                                Suivant <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-right duration-300">
                            <div className="space-y-2 text-center">
                                <h2 className="text-white text-lg font-medium">Double Authentification (2FA)</h2>
                                <p className="text-blue-300 text-xs">Un code a été envoyé sur votre application mobile</p>
                            </div>

                            <div className="flex justify-between gap-2">
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <input
                                        key={i}
                                        type="text"
                                        maxLength={1}
                                        className="w-12 h-12 bg-white/5 border border-white/10 rounded-lg text-center text-xl font-bold text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
                                    />
                                ))}
                            </div>

                            <button
                                className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 active:scale-95"
                            >
                                Valider la connexion
                            </button>

                            <button
                                onClick={() => setStep(1)}
                                className="w-full text-blue-300 hover:text-white text-sm transition-colors text-center"
                            >
                                Retour à l'identification
                            </button>
                        </div>
                    )}

                    {/* Educational Tips */}
                    <div className="mt-8 p-4 bg-blue-900/40 rounded-2xl border border-blue-400/20">
                        <div className="flex items-start gap-3">
                            <Info className="text-blue-400 w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-blue-200 leading-relaxed">
                                <span className="font-bold text-blue-300 block mb-1">💡 Bonnes pratiques de sécurité :</span>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>Ne partagez JAMAIS votre code de sécurité.</li>
                                    <li>Vérifiez que l'URL commence par https://pmp-banque.com</li>
                                    <li>Le support PMP ne vous demandera jamais votre mot de passe.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 text-center text-[10px] text-white/30 uppercase tracking-widest">
                        Documentation : <a href="#" className="hover:text-blue-400 underline transition-colors">Maîtriser ma sécurité</a>
                    </div>
                </div>
            </div>

            {/* Visual elements */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z--1 opacity-20 overflow-hidden">
                <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-blue-500 rounded-full blur-[120px] -translate-y-1/2" />
                <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-indigo-500 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
            </div>
        </div>
    );
}
