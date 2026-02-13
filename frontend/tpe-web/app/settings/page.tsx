'use client';

import Link from 'next/link';
import { ArrowLeft, Building2, Terminal as TerminalIcon, Shield, Save, CheckCircle2, X } from 'lucide-react';
import { useState, useCallback } from 'react';

interface Toast {
    id: number;
    message: string;
}

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
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [activeSection, setActiveSection] = useState<'merchant' | 'terminal' | 'security'>('merchant');
    const [saving, setSaving] = useState(false);

    const showToast = useCallback((message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const handleSave = async () => {
        setSaving(true);
        // Simulate save
        await new Promise(r => setTimeout(r, 400));
        setSaving(false);
        showToast('Paramètres enregistrés avec succès');
    };

    const sections = [
        { key: 'merchant' as const, label: 'Marchand', icon: Building2, color: 'text-blue-500' },
        { key: 'terminal' as const, label: 'Terminal', icon: TerminalIcon, color: 'text-purple-500' },
        { key: 'security' as const, label: 'Sécurité', icon: Shield, color: 'text-green-500' },
    ];

    return (
        <div className="min-h-screen p-6">
            {/* Toast Notifications */}
            <div className="fixed top-6 right-6 z-50 flex flex-col gap-2">
                {toasts.map(toast => (
                    <div key={toast.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg bg-emerald-500/20 border-emerald-500/30 text-emerald-300">
                        <CheckCircle2 size={18} />
                        <span className="text-sm font-medium">{toast.message}</span>
                        <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="ml-2 opacity-60 hover:opacity-100">
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>

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
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                        <nav className="space-y-2">
                            {sections.map(s => (
                                <button
                                    key={s.key}
                                    onClick={() => setActiveSection(s.key)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-left ${
                                        activeSection === s.key
                                            ? 'bg-blue-500/10 border border-blue-500/20 text-white'
                                            : 'hover:bg-white/5 text-slate-400 hover:text-white border border-transparent'
                                    }`}
                                >
                                    <s.icon className={`w-5 h-5 ${s.color}`} />
                                    <span className="font-medium">{s.label}</span>
                                </button>
                            ))}
                        </nav>

                        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                            <p className="text-xs text-blue-300">
                                Ces paramètres sont locaux à votre session de terminal pédagogique.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Merchant Info */}
                    {activeSection === 'merchant' && (
                        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Building2 className="w-6 h-6 text-blue-500" />
                                Informations Marchand
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Nom du Marchand</label>
                                    <input
                                        type="text"
                                        value={settings.merchantName}
                                        onChange={(e) => setSettings({ ...settings, merchantName: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
                                    />
                                </div>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">ID Marchand</label>
                                        <input
                                            type="text"
                                            value={settings.merchantId}
                                            onChange={(e) => setSettings({ ...settings, merchantId: e.target.value })}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Code MCC</label>
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
                    )}

                    {/* Terminal Config */}
                    {activeSection === 'terminal' && (
                        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <TerminalIcon className="w-6 h-6 text-purple-500" />
                                Configuration Terminal
                            </h2>
                            <div className="space-y-4">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">ID Terminal</label>
                                        <input
                                            type="text"
                                            value={settings.terminalId}
                                            onChange={(e) => setSettings({ ...settings, terminalId: e.target.value })}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Devise</label>
                                        <select
                                            value={settings.currency}
                                            onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
                                        >
                                            <option value="EUR">EUR</option>
                                            <option value="USD">USD</option>
                                            <option value="GBP">GBP</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Limite Auto-Approbation</label>
                                    <input
                                        type="number"
                                        value={settings.autoApproveLimit}
                                        onChange={(e) => setSettings({ ...settings, autoApproveLimit: Number(e.target.value) })}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
                                    />
                                    <p className="text-sm text-slate-500 mt-1">
                                        Transactions sous ce montant approuvées automatiquement (mode pédagogique)
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Security */}
                    {activeSection === 'security' && (
                        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Shield className="w-6 h-6 text-green-500" />
                                Paramètres de Sécurité
                            </h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div>
                                        <div className="font-medium text-white">Exiger le PIN</div>
                                        <div className="text-sm text-slate-400">Demander systématiquement le code PIN</div>
                                    </div>
                                    <button
                                        onClick={() => setSettings({ ...settings, requirePin: !settings.requirePin })}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                            settings.requirePin ? 'bg-blue-500' : 'bg-slate-700'
                                        }`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                            settings.requirePin ? 'translate-x-6' : 'translate-x-1'
                                        }`} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div>
                                        <div className="font-medium text-white">Exiger le CVV</div>
                                        <div className="text-sm text-slate-400">Vérifier le code de sécurité de la carte</div>
                                    </div>
                                    <button
                                        onClick={() => setSettings({ ...settings, requireCvv: !settings.requireCvv })}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                            settings.requireCvv ? 'bg-blue-500' : 'bg-slate-700'
                                        }`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                            settings.requireCvv ? 'translate-x-6' : 'translate-x-1'
                                        }`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                        {saving ? (
                            <>
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Enregistrement...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Enregistrer les Paramètres
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
