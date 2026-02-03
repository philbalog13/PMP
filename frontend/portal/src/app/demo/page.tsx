'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
    CreditCard,
    ArrowLeft,
    Play,
    Terminal,
    Shield,
    AlertTriangle,
    CheckCircle,
    XCircle,
    ChevronRight
} from 'lucide-react';

const demos = [
    {
        id: 'transaction-simple',
        title: 'Transaction Simple',
        description: 'Suivez le parcours complet d\'une transaction carte de l\'insertion à l\'autorisation.',
        icon: CreditCard,
        color: 'blue',
        duration: '5 min',
        level: 'Débutant'
    },
    {
        id: 'transaction-error',
        title: 'Transaction avec Erreur',
        description: 'Comprenez les différents codes d\'erreur et leur signification.',
        icon: XCircle,
        color: 'red',
        duration: '7 min',
        level: 'Intermédiaire'
    },
    {
        id: 'mitm-attack',
        title: 'Attaque MITM',
        description: 'Visualisez une attaque Man-in-the-Middle et les mesures de protection.',
        icon: AlertTriangle,
        color: 'amber',
        duration: '10 min',
        level: 'Avancé'
    },
    {
        id: '3d-secure',
        title: 'Flux 3D-Secure',
        description: 'Découvrez l\'authentification forte du porteur avec 3D-Secure 2.0.',
        icon: Shield,
        color: 'green',
        duration: '8 min',
        level: 'Intermédiaire'
    }
];

import { useAuth } from '../auth/useAuth';

export default function DemoPage() {
    const { isLoading } = useAuth(true);
    const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

    const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
        blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
        red: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
        amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' },
        green: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30' }
    };

    if (isLoading) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
            <Play className="animate-spin w-12 h-12 text-blue-500" />
        </div>;
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="border-b border-white/5 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-6">
                    <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition">
                        <ArrowLeft className="w-5 h-5" />
                        Retour
                    </Link>
                    <div className="h-6 w-px bg-white/10" />
                    <h1 className="text-xl font-bold text-white flex items-center gap-2 flex-grow">
                        <Play className="w-5 h-5 text-blue-500" />
                        Démonstrations Interactives
                    </h1>
                    <button
                        onClick={() => {
                            localStorage.clear();
                            window.location.href = '/login';
                        }}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-500 font-bold text-[10px] uppercase tracking-widest transition"
                    >
                        Déconnexion
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12">
                {/* Intro */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Choisissez une Démonstration
                    </h2>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        Explorez les concepts de la monétique à travers des démonstrations interactives et guidées.
                    </p>
                </div>

                {/* Demo Grid */}
                <div className="grid md:grid-cols-2 gap-6 mb-12">
                    {demos.map((demo) => {
                        const Icon = demo.icon;
                        const colors = colorClasses[demo.color];
                        return (
                            <button
                                key={demo.id}
                                onClick={() => setSelectedDemo(demo.id)}
                                className={`p-6 rounded-2xl text-left transition-all border ${selectedDemo === demo.id
                                    ? `bg-white/10 ${colors.border}`
                                    : 'bg-white/5 border-white/5 hover:border-white/10'
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`w-14 h-14 rounded-2xl ${colors.bg} flex items-center justify-center shrink-0`}>
                                        <Icon className={`w-7 h-7 ${colors.text}`} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-bold text-white">{demo.title}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                                                {demo.level}
                                            </span>
                                        </div>
                                        <p className="text-slate-400 text-sm mb-3">{demo.description}</p>
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className="text-slate-500">⏱️ {demo.duration}</span>
                                        </div>
                                    </div>
                                    {selectedDemo === demo.id && (
                                        <CheckCircle className="w-6 h-6 text-blue-500 shrink-0" />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Start Demo Button */}
                {selectedDemo && (
                    <div className="text-center">
                        <Link
                            href={`${process.env.NEXT_PUBLIC_TPE_URL || "http://localhost:3001"}?demo=${selectedDemo}`}
                            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-2xl transition-all shadow-xl shadow-blue-500/30"
                        >
                            <Play className="w-5 h-5" />
                            Lancer la Démo
                            <ChevronRight className="w-5 h-5" />
                        </Link>
                    </div>
                )}

                {/* Quick Access */}
                <div className="mt-16 pt-12 border-t border-white/5">
                    <h3 className="text-xl font-bold text-white mb-6 text-center">Accès Direct aux Modules</h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Link
                            href={process.env.NEXT_PUBLIC_TPE_URL || "http://localhost:3001"}
                            className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition flex items-center gap-3"
                        >
                            <Terminal className="w-8 h-8 text-blue-500" />
                            <div>
                                <div className="font-semibold text-white">TPE Web</div>
                                <div className="text-sm text-slate-500">Port 3001</div>
                            </div>
                        </Link>
                        <Link
                            href={process.env.NEXT_PUBLIC_MONITORING_URL || "http://localhost:3082"}
                            className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-green-500/30 transition flex items-center gap-3"
                        >
                            <CheckCircle className="w-8 h-8 text-green-500" />
                            <div>
                                <div className="font-semibold text-white">Dashboard</div>
                                <div className="text-sm text-slate-500">Port 3082</div>
                            </div>
                        </Link>
                        <Link
                            href={process.env.NEXT_PUBLIC_HSM_URL || "http://localhost:3006"}
                            className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-amber-500/30 transition flex items-center gap-3"
                        >
                            <Shield className="w-8 h-8 text-amber-500" />
                            <div>
                                <div className="font-semibold text-white">HSM Admin</div>
                                <div className="text-sm text-slate-500">Port 3006</div>
                            </div>
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
