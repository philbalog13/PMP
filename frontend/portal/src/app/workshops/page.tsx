'use client';

import { BookOpen, Code, Terminal, Zap, ChevronRight, Lock, Beaker, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

const workshops = [
    {
        id: 'intro',
        title: 'Introduction à la Monétique',
        desc: 'Comprendre le cycle de vie d\'une transaction carte, du client au commerçant.',
        duration: '45 min',
        difficulty: 'Débutant',
        icon: <BookOpen className="text-blue-400" />,
        color: 'from-blue-500/10 to-blue-600/5',
        locked: false
    },
    {
        id: 'iso8583',
        title: 'Protocole ISO 8583',
        desc: 'Maîtrisez le format standard des messages financiers et décodez les MTI.',
        duration: '1h 30min',
        difficulty: 'Intermédiaire',
        icon: <Code className="text-purple-400" />,
        color: 'from-purple-500/10 to-purple-600/5',
        locked: false
    },
    {
        id: 'hsm-keys',
        title: 'Gestion des Clés HSM',
        desc: 'Manipulation des composants de clés, ZCM, LMK et cryptographie symétrique.',
        duration: '2h',
        difficulty: 'Avancé',
        icon: <Terminal className="text-amber-400" />,
        color: 'from-amber-500/10 to-amber-600/5',
        locked: false
    },
    {
        id: '3ds-flow',
        title: '3D Secure v2 Multi-Domain',
        desc: 'Analyse du flux Directory Server, ACS et challenge utilisateur.',
        duration: '1h',
        difficulty: 'Avancé',
        icon: <Zap className="text-emerald-400" />,
        color: 'from-emerald-500/10 to-emerald-600/5',
        locked: false
    },
    {
        id: 'fraud-lab',
        title: 'Simulation de Fraude',
        desc: 'Détection de patterns suspects et implémentation de règles de score.',
        duration: '1h 15min',
        difficulty: 'Intermédiaire',
        icon: <ShieldAlert className="text-red-400" />,
        color: 'from-red-500/10 to-red-600/5',
        locked: true
    },
    {
        id: 'kernel-emv',
        title: 'Kernels EMV & L2',
        desc: 'Comprendre l\'interaction entre la puce et le lecteur (APDU).',
        duration: '3h',
        difficulty: 'Expert',
        icon: <Beaker className="text-indigo-400" />,
        color: 'from-indigo-500/10 to-indigo-600/5',
        locked: true
    }
];

export default function WorkshopsPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-12">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-bold uppercase tracking-wider">
                            Parcours d&apos;Apprentissage
                        </div>
                        <h1 className="text-5xl font-black italic tracking-tight">
                            Ateliers <span className="text-blue-500 text-6xl">.</span>
                        </h1>
                        <p className="text-slate-400 text-lg max-w-xl">
                            Sélectionnez un atelier pour commencer votre immersion dans les systèmes de paiement modernes.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-xs text-slate-500 font-bold uppercase">Progression</div>
                                <div className="text-xl font-mono">24%</div>
                            </div>
                            <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-blue-500 flex items-center justify-center text-[10px] font-bold">
                                4/16
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {workshops.map((w) => (
                        <div
                            key={w.id}
                            className={`group relative p-8 rounded-3xl border border-white/5 transition-all duration-500 overflow-hidden ${w.locked ? 'opacity-60 cursor-not-allowed' : 'hover:border-white/20 hover:bg-white/5 cursor-pointer'
                                }`}
                        >
                            {/* Background Glow */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${w.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                            <div className="relative z-10 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="p-4 bg-slate-900 rounded-2xl border border-white/5 group-hover:scale-110 group-hover:bg-slate-800 transition-all duration-500">
                                        {w.icon}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${w.difficulty === 'Débutant' ? 'text-green-400 border-green-500/20 bg-green-500/5' :
                                                w.difficulty === 'Intermédiaire' ? 'text-blue-400 border-blue-500/20 bg-blue-500/5' :
                                                    w.difficulty === 'Avancé' ? 'text-amber-400 border-amber-500/20 bg-amber-500/5' :
                                                        'text-purple-400 border-purple-500/20 bg-purple-500/5'
                                            }`}>
                                            {w.difficulty}
                                        </span>
                                        <span className="text-xs text-slate-500 font-mono italic">{w.duration}</span>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-2xl font-bold mb-2 group-hover:text-white transition-colors">
                                        {w.title}
                                    </h3>
                                    <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-300 transition-colors">
                                        {w.desc}
                                    </p>
                                </div>

                                <div className="pt-4 flex items-center justify-between">
                                    {w.locked ? (
                                        <div className="flex items-center gap-2 text-slate-600 text-sm font-bold uppercase tracking-widest">
                                            <Lock size={14} /> Verrouillé
                                        </div>
                                    ) : (
                                        <Link href={`/workshops/${w.id}`} className="group/btn flex items-center gap-2 text-white font-bold text-sm bg-white/5 px-4 py-2 rounded-xl border border-white/10 hover:bg-white hover:text-slate-950 transition-all">
                                            Lancer l&apos;Atelier
                                            <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                        </Link>
                                    )}
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-800 group-hover:bg-white transition-colors" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Tip */}
                <div className="mt-12 p-8 rounded-3xl bg-blue-600/5 border border-blue-500/10 flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
                        <Zap size={24} className="text-white" />
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-1">Accès Anticipé</h4>
                        <p className="text-slate-400 text-sm">Réussissez les ateliers initiaux pour déverrouiller les modules avancés et obtenir votre certificat PMP.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}