'use client';

import Link from 'next/link';
import { ArrowLeft, Building2, Terminal as TerminalIcon, Shield, Save } from 'lucide-react';
import { useState } from 'react';

export default function SettingsPage() {
    const [settings, setSettings] = useState({
        merchantName: 'Marchand Pédagogique 001',
        merchantId: 'MERCH_PED_001',
        terminalId: 'TERM_WEB_01',
        mcc: '5411',
        currency: 'EUR',
        autoApproveLimit: 50,
        requirePin: true,
        requireCvv: true
    });

    const handleSave = () => {
        // In real app, save to backend
        alert('Paramètres enregistrés avec succès !');
    };

    return (
        <div className="min-h-screen p-6">
            {/* Header */}
            <header className="mb-8">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Retour au Terminal
                </Link>
                <h1 className="text-3xl font-bold text-white">Paramètres du Terminal</h1>
                <p className="text-slate-400 mt-2">Configuration du terminal de paiement et du marchand</p>
            </header>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Navigation Sidebar */}
                <div className="lg:col-span-1">
                    <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                        <nav className="space-y-2">
                            <Link
                                href="/settings/merchant"
                                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-white"
                            >
                                <Building2 className="w-5 h-5 text-blue-500" />
                                <span className="font-medium">Marchand</span>
                            </Link>
                            <Link
                                href="/settings/terminal-config"
                                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition"
                            >
                                <TerminalIcon className="w-5 h-5" />
                                <span className="font-medium">Terminal</span>
                            </Link>
                            <Link
                                href="/settings/security"
                                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition"
                            >
                                <Shield className="w-5 h-5" />
                                <span className="font-medium">Sécurité</span>
                            </Link>
                        </nav>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Merchant Info */}
                    <div className="rounded-2xl bg-white/5 border border-white/5 p-6">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Building2 className="w-6 h-6 text-blue-500" />
                            Informations Marchand
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Nom du Marchand
                                </label>
                                <input
                                    type="text"
                                    value={settings.merchantName}
                                    onChange={(e) => setSettings({ ...settings, merchantName: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
                                />
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        ID Marchand
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.merchantId}
                                        onChange={(e) => setSettings({ ...settings, merchantId: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Code MCC
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.mcc}
                                        onChange={(e) => setSettings({ ...settings, mcc: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Terminal Config */}
                    <div className="rounded-2xl bg-white/5 border border-white/5 p-6">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <TerminalIcon className="w-6 h-6 text-purple-500" />
                            Configuration Terminal
                        </h2>

                        <div className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        ID Terminal
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.terminalId}
                                        onChange={(e) => setSettings({ ...settings, terminalId: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Devise
                                    </label>
                                    <select
                                        value={settings.currency}
                                        onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
                                    >
                                        <option value="EUR">EUR (€)</option>
                                        <option value="USD">USD ($)</option>
                                        <option value="GBP">GBP (£)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Limite Auto-Approbation (€)
                                </label>
                                <input
                                    type="number"
                                    value={settings.autoApproveLimit}
                                    onChange={(e) => setSettings({ ...settings, autoApproveLimit: Number(e.target.value) })}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
                                />
                                <p className="text-sm text-slate-500 mt-1">
                                    Les transactions en dessous de ce montant sont approuvées automatiquement (pédagogique)
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Security */}
                    <div className="rounded-2xl bg-white/5 border border-white/5 p-6">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Shield className="w-6 h-6 text-green-500" />
                            Paramètres de Sécurité
                        </h2>

                        <div className="space-y-4">
                            <label className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                                <div>
                                    <div className="font-medium text-white">Exiger le PIN</div>
                                    <div className="text-sm text-slate-400">Demander systématiquement le code PIN</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.requirePin}
                                    onChange={(e) => setSettings({ ...settings, requirePin: e.target.checked })}
                                    className="w-5 h-5 rounded bg-white/5 border-white/10 text-blue-500 focus:ring-blue-500/20"
                                />
                            </label>

                            <label className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                                <div>
                                    <div className="font-medium text-white">Exiger le CVV</div>
                                    <div className="text-sm text-slate-400">Vérifier le code de sécurité de la carte</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.requireCvv}
                                    onChange={(e) => setSettings({ ...settings, requireCvv: e.target.checked })}
                                    className="w-5 h-5 rounded bg-white/5 border-white/10 text-blue-500 focus:ring-blue-500/20"
                                />
                            </label>
                        </div>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                    >
                        <Save className="w-5 h-5" />
                        Enregistrer les Paramètres
                    </button>
                </div>
            </div>
        </div>
    );
}
