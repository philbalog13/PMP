'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Beaker, AlertTriangle, RefreshCw, Zap, Shield, Clock } from 'lucide-react';

export default function LabControlPage() {
    const [latency, setLatency] = useState(150);
    const [authFailureRate, setAuthFailureRate] = useState(5);
    const [fraudInjection, setFraudInjection] = useState(false);
    const [hsmLatency, setHsmLatency] = useState(50);
    const [networkErrors, setNetworkErrors] = useState(false);

    const handleApplyConditions = () => {
        // In a real implementation, this would call the backend API
        console.log('Applying lab conditions:', {
            latency,
            authFailureRate,
            fraudInjection,
            hsmLatency,
            networkErrors,
        });

        alert('Conditions de lab appliquées avec succès! ✅');
    };

    const handleReset = () => {
        setLatency(0);
        setAuthFailureRate(0);
        setFraudInjection(false);
        setHsmLatency(0);
        setNetworkErrors(false);

        alert('Environnement réinitialisé ✅');
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <Link
                        href="/instructor"
                        className="text-sm text-slate-400 hover:text-white transition"
                    >
                        ← Retour au hub
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-orange-500/20 rounded-2xl border border-orange-500/30">
                            <Beaker className="w-8 h-8 text-orange-400" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black">Contrôle Laboratoire</h1>
                            <p className="text-slate-400 mt-1">
                                Injection de conditions d'erreur pour tests pédagogiques
                            </p>
                        </div>
                    </div>
                </div>

                {/* Warning Banner */}
                <div className="bg-orange-500/10 border-l-4 border-orange-500 p-4 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-bold text-orange-400">Mode Formateur Actif</p>
                        <p className="text-slate-300 mt-1">
                            Les conditions appliquées ici affecteront les sessions de TOUS les
                            étudiants connectés. Utilisez avec précaution.
                        </p>
                    </div>
                </div>

                {/* Control Panels */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Network Latency */}
                    <ControlCard
                        title="Latence Réseau"
                        icon={<Clock className="w-6 h-6" />}
                        color="blue"
                    >
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium">
                                        Délai (milliseconds)
                                    </label>
                                    <span className="text-sm font-bold text-blue-400">
                                        {latency} ms
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="500"
                                    step="10"
                                    value={latency}
                                    onChange={(e) => setLatency(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                                />
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>0ms</span>
                                    <span>500ms</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400">
                                Simule une connexion lente pour tester la résilience des
                                applications
                            </p>
                        </div>
                    </ControlCard>

                    {/* Auth Failures */}
                    <ControlCard
                        title="Échecs d'Authentification"
                        icon={<Shield className="w-6 h-6" />}
                        color="red"
                    >
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium">Taux d'échec (%)</label>
                                    <span className="text-sm font-bold text-red-400">
                                        {authFailureRate}%
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={authFailureRate}
                                    onChange={(e) => setAuthFailureRate(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                                />
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>0%</span>
                                    <span>100%</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400">
                                Simule des refus d'autorisation aléatoires (code 05, 51, 54, etc.)
                            </p>
                        </div>
                    </ControlCard>

                    {/* HSM Latency */}
                    <ControlCard
                        title="Latence HSM"
                        icon={<Shield className="w-6 h-6" />}
                        color="purple"
                    >
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium">
                                        Délai cryptographique (ms)
                                    </label>
                                    <span className="text-sm font-bold text-purple-400">
                                        {hsmLatency} ms
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="300"
                                    step="10"
                                    value={hsmLatency}
                                    onChange={(e) => setHsmLatency(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                                />
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>0ms</span>
                                    <span>300ms</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400">
                                Simule un HSM surchargé (PIN verify, MAC generation, etc.)
                            </p>
                        </div>
                    </ControlCard>

                    {/* Fraud Injection */}
                    <ControlCard
                        title="Injection Fraude"
                        icon={<AlertTriangle className="w-6 h-6" />}
                        color="yellow"
                    >
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Mode Fraude Actif</span>
                                <button
                                    onClick={() => setFraudInjection(!fraudInjection)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                        fraudInjection ? 'bg-yellow-500' : 'bg-slate-700'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                            fraudInjection ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                            <p className="text-xs text-slate-400">
                                Injecte des patterns de fraude détectables (velocity abuse,
                                géolocalisation suspecte)
                            </p>
                            {fraudInjection && (
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                                    <p className="text-xs text-yellow-400 font-bold">
                                        ⚠️ Actif: Les étudiants verront des alertes de fraude
                                    </p>
                                </div>
                            )}
                        </div>
                    </ControlCard>
                </div>

                {/* Additional Toggles */}
                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
                    <h2 className="text-xl font-bold">Options Avancées</h2>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Erreurs Réseau Aléatoires</p>
                            <p className="text-xs text-slate-400 mt-1">
                                Simule des timeouts et connexions refusées (5-10% des requêtes)
                            </p>
                        </div>
                        <button
                            onClick={() => setNetworkErrors(!networkErrors)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                networkErrors ? 'bg-red-500' : 'bg-slate-700'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                    networkErrors ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                    <button
                        onClick={handleApplyConditions}
                        className="flex-1 px-8 py-4 bg-emerald-600 rounded-2xl font-bold hover:bg-emerald-500 transition flex items-center justify-center gap-2"
                    >
                        <Zap className="w-5 h-5" />
                        Appliquer les Conditions
                    </button>
                    <button
                        onClick={handleReset}
                        className="px-8 py-4 bg-slate-800 rounded-2xl font-bold hover:bg-slate-700 transition flex items-center gap-2"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Réinitialiser
                    </button>
                </div>

                {/* Info Box */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
                    <h3 className="font-bold text-blue-400 mb-2">💡 Cas d'usage pédagogiques</h3>
                    <ul className="space-y-2 text-sm text-slate-300">
                        <li>
                            • <strong>Latence 300ms</strong>: Apprendre la gestion de timeouts et
                            retry logic
                        </li>
                        <li>
                            • <strong>Échecs auth 20%</strong>: Comprendre les codes de refus ISO
                            8583
                        </li>
                        <li>
                            • <strong>Mode Fraude</strong>: Tester les détecteurs de patterns
                            suspects
                        </li>
                        <li>
                            • <strong>HSM lent</strong>: Observer l'impact des opérations
                            cryptographiques
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

function ControlCard({
    title,
    icon,
    color,
    children,
}: {
    title: string;
    icon: React.ReactNode;
    color: string;
    children: React.ReactNode;
}) {
    const colors: Record<string, string> = {
        blue: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
        red: 'bg-red-500/20 border-red-500/30 text-red-400',
        purple: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
        yellow: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
    };

    return (
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg border ${colors[color]}`}>{icon}</div>
                <h3 className="text-lg font-bold">{title}</h3>
            </div>
            {children}
        </div>
    );
}
