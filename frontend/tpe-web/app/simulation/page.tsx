'use client';

import Link from 'next/link';
import { ArrowLeft, Play, Code, AlertTriangle, Target } from 'lucide-react';
import { useState } from 'react';

const scenarios = [
    {
        id: 'simple-purchase',
        title: 'Transaction Simple',
        description: 'Achat classique avec montant faible, approbation garantie',
        difficulty: 'Débutant',
        icon: '✅',
        color: 'green',
        params: { amount: 25, guaranteeApproval: true }
    },
    {
        id: 'high-amount',
        title: 'Montant Élevé',
        description: 'Transaction avec un montant important, vérifications renforcées',
        difficulty: 'Intermédiaire',
        icon: '💰',
        color: 'blue',
        params: { amount: 500, strictChecks: true }
    },
    {
        id: 'insufficient-funds',
        title: 'Fonds Insuffisants',
        description: 'Simulation d\'un refus pour solde insuffisant',
        difficulty: 'Intermédiaire',
        icon: '❌',
        color: 'red',
        params: { amount: 100, forceDecline: 'INSUFFICIENT_FUNDS' }
    },
    {
        id: 'expired-card',
        title: 'Carte Expirée',
        description: 'Test avec une carte dont la date de validité est dépassée',
        difficulty: 'Débutant',
        icon: '⏰',
        color: 'amber',
        params: { cardExpired: true }
    }
];

export default function SimulationPage() {
    const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

    const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
        green: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30' },
        blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
        red: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
        amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' }
    };

    return (
        <div className="min-h-screen p-6">
            {/* Header */}
            <header className="mb-8">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Retour au Terminal
                </Link>
                <h1 className="text-3xl font-bold text-white">Mode Simulation</h1>
                <p className="text-slate-400 mt-2">Testez différents scénarios de transaction</p>
            </header>

            {/* Scenarios Grid */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
                {scenarios.map((scenario) => {
                    const colors = colorClasses[scenario.color];
                    return (
                        <button
                            key={scenario.id}
                            onClick={() => setSelectedScenario(scenario.id)}
                            className={`p-6 rounded-2xl text-left transition-all border ${selectedScenario === scenario.id
                                    ? `bg-white/10 ${colors.border}`
                                    : 'bg-white/5 border-white/5 hover:border-white/10'
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className="text-4xl">{scenario.icon}</div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-bold text-white">{scenario.title}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                                            {scenario.difficulty}
                                        </span>
                                    </div>
                                    <p className="text-slate-400 text-sm mb-4">{scenario.description}</p>
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <Code className="w-4 h-4" />
                                        <span>Paramètres: {JSON.stringify(scenario.params, null, 0)}</span>
                                    </div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Launch Button */}
            {selectedScenario && (
                <div className="text-center mb-12">
                    <Link
                        href={`/?scenario=${selectedScenario}`}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-2xl transition-all shadow-xl shadow-blue-500/30"
                    >
                        <Play className="w-5 h-5" />
                        Lancer le Scénario
                    </Link>
                </div>
            )}

            {/* Custom Simulation */}
            <div className="rounded-2xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-white/10 p-8">
                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                        <Target className="w-7 h-7 text-purple-400" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-white mb-2">Simulation Personnalisée</h2>
                        <p className="text-slate-300 mb-6">
                            Créez votre propre scénario de test en définissant les paramètres de transaction
                        </p>
                        <Link
                            href="/simulation/custom"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-white font-medium transition"
                        >
                            Créer un Scénario
                            <ArrowLeft className="w-4 h-4 rotate-180" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
