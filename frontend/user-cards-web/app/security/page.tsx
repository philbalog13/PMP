'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Smartphone, Globe, Bell } from 'lucide-react';
import { useState } from 'react';

export default function SecurityPage() {
    const [settings, setSettings] = useState({
        threeDS: true,
        contactless: true,
        onlinePayments: true,
        notifications: true,
        locationCheck: false
    });

    return (
        <div className="min-h-screen p-6 md:p-10 max-w-[1600px] mx-auto">
            {/* Header */}
            <header className="mb-10">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Retour au Dashboard
                </Link>
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <Shield className="w-8 h-8 text-green-500" />
                    Sécurité & Limites
                </h1>
                <p className="text-slate-400">Gérez la sécurité de vos cartes et méthodes de paiement</p>
            </header>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Main Security Settings */}
                <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                        <h2 className="text-xl font-bold text-white mb-6">Paramètres de Carte</h2>

                        <div className="space-y-6">
                            <label className="flex items-center justify-between cursor-pointer group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                        <Shield className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-white group-hover:text-blue-400 transition">3D Secure v2</div>
                                        <div className="text-sm text-slate-400">Authentification forte pour achats en ligne</div>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.threeDS}
                                    onChange={(e) => setSettings({ ...settings, threeDS: e.target.checked })}
                                    className="w-6 h-6 rounded bg-white/10 border-white/10 text-blue-500 focus:ring-blue-500/20"
                                />
                            </label>

                            <label className="flex items-center justify-between cursor-pointer group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                        <Smartphone className="w-5 h-5 text-purple-500" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-white group-hover:text-purple-400 transition">Paiement Sans Contact</div>
                                        <div className="text-sm text-slate-400">Activer le NFC pour les terminaux physiques</div>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.contactless}
                                    onChange={(e) => setSettings({ ...settings, contactless: e.target.checked })}
                                    className="w-6 h-6 rounded bg-white/10 border-white/10 text-purple-500 focus:ring-purple-500/20"
                                />
                            </label>

                            <label className="flex items-center justify-between cursor-pointer group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                        <Globe className="w-5 h-5 text-green-500" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-white group-hover:text-green-400 transition">Paiements en Ligne</div>
                                        <div className="text-sm text-slate-400">Autoriser les transactions e-commerce</div>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.onlinePayments}
                                    onChange={(e) => setSettings({ ...settings, onlinePayments: e.target.checked })}
                                    className="w-6 h-6 rounded bg-white/10 border-white/10 text-green-500 focus:ring-green-500/20"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                        <h2 className="text-xl font-bold text-white mb-6">Notifications</h2>

                        <label className="flex items-center justify-between cursor-pointer group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                    <Bell className="w-5 h-5 text-amber-500" />
                                </div>
                                <div>
                                    <div className="font-medium text-white group-hover:text-amber-400 transition">Alertes Transaction</div>
                                    <div className="text-sm text-slate-400">Push notification à chaque dépense</div>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.notifications}
                                onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                                className="w-6 h-6 rounded bg-white/10 border-white/10 text-amber-500 focus:ring-amber-500/20"
                            />
                        </label>
                    </div>
                </div>

                {/* Change PIN / Limits */}
                <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                        <h2 className="text-xl font-bold text-white mb-6">Code PIN</h2>
                        <p className="text-slate-400 text-sm mb-6">
                            Ne communiquez jamais votre code PIN. Changez-le immédiatement si vous pensez qu'il a été compromis.
                        </p>
                        <button className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition flex items-center justify-center gap-2">
                            <Lock className="w-4 h-4" />
                            Changer le Code PIN
                        </button>
                    </div>

                    <div className="p-6 rounded-2xl bg-gradient-to-br from-red-600/20 to-red-500/10 border border-red-500/20">
                        <h2 className="text-xl font-bold text-white mb-4">Zone Danger</h2>
                        <p className="text-red-200/70 text-sm mb-6">
                            En cas de perte ou de vol, bloquez immédiatement votre carte pour empêcher toute utilisation frauduleuse.
                        </p>
                        <button className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition shadow-lg shadow-red-500/20">
                            Faire Opposition
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
