'use client';

import Link from 'next/link';
import { ArrowLeft, Play, ShieldAlert, CreditCard, Banknote, Clock, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const scenarios = [
    {
        id: 'simple-purchase',
        title: 'Transaction Simple',
        description: 'Achat classique avec montant faible, approbation garantie',
        difficulty: 'Débutant',
        icon: CreditCard,
        color: 'emerald',
        hint: 'Montant < solde carte = approbation',
    },
    {
        id: 'high-amount',
        title: 'Montant Élevé',
        description: 'Transaction avec un montant important, vérifications renforcées',
        difficulty: 'Intermédiaire',
        icon: Banknote,
        color: 'blue',
        hint: 'Teste les seuils 3DS et fraude',
    },
    {
        id: 'insufficient-funds',
        title: 'Fonds Insuffisants',
        description: 'Simulation d\'un refus pour solde insuffisant (code 51)',
        difficulty: 'Intermédiaire',
        icon: AlertTriangle,
        color: 'red',
        hint: 'Montant > solde carte = code 51',
    },
    {
        id: 'expired-card',
        title: 'Carte Expirée',
        description: 'Test avec une carte dont la date de validité est dépassée (code 54)',
        difficulty: 'Débutant',
        icon: Clock,
        color: 'amber',
        hint: 'Sélectionnez une carte expirée dans le sélecteur',
    }
];

const colorClasses: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', iconBg: 'bg-emerald-500/20' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', iconBg: 'bg-blue-500/20' },
    red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', iconBg: 'bg-red-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', iconBg: 'bg-amber-500/20' }
};

export default function SimulationPage() {
    const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
    const router = useRouter();

    return (
        <div className="min-h-screen p-6">
            <header className="mb-8">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Retour au Terminal
                </Link>
                <h1 className="text-3xl font-bold text-white">Mode Simulation</h1>
                <p className="text-slate-400 mt-2">Testez différents scénarios de transaction pédagogiques</p>
            </header>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
                {scenarios.map((scenario) => {
                    const colors = colorClasses[scenario.color];
                    const isSelected = selectedScenario === scenario.id;
                    const Icon = scenario.icon;

                    return (
                        <button
                            key={scenario.id}
                            onClick={() => setSelectedScenario(scenario.id)}
                            className={`p-6 rounded-2xl text-left transition-all border ${isSelected
                                    ? `bg-white/10 ${colors.border}`
                                    : 'bg-white/5 border-white/10 hover:border-white/20'
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-xl ${colors.iconBg}`}>
                                    <Icon size={24} className={colors.text} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-bold text-white">{scenario.title}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                                            {scenario.difficulty}
                                        </span>
                                    </div>
                                    <p className="text-slate-400 text-sm mb-3">{scenario.description}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <ShieldAlert size={12} />
                                        <span>{scenario.hint}</span>
                                    </div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {selectedScenario && (
                <div className="text-center mb-8">
                    <button
                        onClick={() => router.push('/')}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-2xl transition-all shadow-xl shadow-blue-500/30"
                    >
                        <Play className="w-5 h-5" />
                        Aller au Terminal
                    </button>
                    <p className="text-xs text-slate-500 mt-2">
                        Suivez les instructions du scénario sur le terminal
                    </p>
                </div>
            )}

            <div className="rounded-2xl bg-blue-500/10 border border-blue-500/20 p-6">
                <h3 className="font-bold text-blue-400 mb-3">Comment utiliser les scénarios</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-300">
                    <div className="space-y-2">
                        <p><strong className="text-white">1.</strong> Sélectionnez un scénario ci-dessus</p>
                        <p><strong className="text-white">2.</strong> Cliquez sur &quot;Aller au Terminal&quot;</p>
                    </div>
                    <div className="space-y-2">
                        <p><strong className="text-white">3.</strong> Suivez les indications pour reproduire le cas</p>
                        <p><strong className="text-white">4.</strong> Observez le code de réponse ISO 8583</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
