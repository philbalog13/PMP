'use client';

import { Beaker, ShieldAlert, Cpu, Terminal, Lock, ArrowRight, Zap, Database, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function LabPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 relative overflow-hidden">
            {/* Background Patterns */}
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] -z-10" />

            <div className="max-w-7xl mx-auto space-y-16 relative z-10">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    <Link href="/" className="hover:text-white transition">Home</Link>
                    <ChevronRight size={12} />
                    <span className="text-blue-500">Security Lab</span>
                </div>

                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 border-b border-white/5 pb-16">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-500 text-[10px] font-black uppercase tracking-widest">
                            <Beaker size={14} /> Sandbox Environment
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.8]">
                            Security <span className="text-blue-500">Lab.</span>
                        </h1>
                        <p className="text-slate-400 text-xl max-w-2xl font-medium leading-relaxed">
                            Exploitez les failles protocolaires, manipulez les messages ISO8583 et
                            maîtrisez l'ingénierie inverse des flux bancaires.
                        </p>
                    </div>
                    <div className="flex items-center gap-4 p-6 bg-slate-900/50 rounded-3xl border border-white/5 backdrop-blur-md">
                        <div className="text-right">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Votre Score</div>
                            <div className="text-3xl font-black font-mono italic text-blue-500">2,450 XP</div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <Zap size={24} className="fill-current text-white" />
                        </div>
                    </div>
                </div>

                {/* Lab Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <LabCard
                        title="Crack le PIN"
                        desc="Exploitez une faille de gestion de session pour bruteforcer un bloc PIN ISO-0."
                        icon={<Terminal className="w-6 h-6" />}
                        difficulty="Facile"
                        points={150}
                        color="blue"
                    />
                    <LabCard
                        title="Key Exposure"
                        desc="Interceptez les composants de clés clairs lors d'une cérémonie de chargement HSM."
                        icon={<Lock className="w-6 h-6" />}
                        difficulty="Intermédiaire"
                        points={300}
                        color="purple"
                    />
                    <LabCard
                        title="Replay ISO8583"
                        desc="Capturez et modifiez un message 0200 pour doubler un montant de transaction."
                        icon={<Cpu className="w-6 h-6" />}
                        difficulty="Avancé"
                        points={450}
                        color="emerald"
                    />
                    <LabCard
                        title="Bypass 3DS"
                        desc="Contournez l'authentification forte via une injection de réponse ACS."
                        icon={<Zap className="w-6 h-6" />}
                        difficulty="Expert"
                        points={750}
                        color="amber"
                    />
                    <LabCard
                        title="HSM Buffer Overflow"
                        desc="Exploitez une vulnérabilité de parsing dans le simulateur de console HSM."
                        icon={<ShieldAlert className="w-6 h-6" />}
                        difficulty="Critique"
                        points={1200}
                        color="red"
                    />
                    <LabCard
                        title="SQL Audit"
                        desc="Extraire les PANs masqués de la base de données via une faille SQLi."
                        icon={<Database className="w-6 h-6" />}
                        difficulty="Avancé"
                        points={600}
                        color="indigo"
                    />
                </div>

                {/* Warning Section */}
                <div className="relative group p-10 rounded-[50px] bg-red-500/5 border border-red-500/10 overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-[100px]" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                        <div className="w-20 h-20 rounded-3xl bg-red-500 flex items-center justify-center shrink-0 shadow-2xl shadow-red-500/40 rotate-12 group-hover:rotate-0 transition-transform duration-500">
                            <ShieldAlert size={40} className="text-white" />
                        </div>
                        <div className="space-y-3 text-center md:text-left flex-1">
                            <h4 className="text-2xl font-black italic uppercase tracking-tighter text-red-500">Charte Éthique & Légalité</h4>
                            <p className="text-slate-400 font-medium leading-relaxed">
                                Les outils et scénarios présentés ici sont strictement réservés à l'apprentissage au sein de ce bac à sable.
                                L'utilisation de ces techniques contre des infrastructures réelles est un crime fédéral.
                            </p>
                        </div>
                        <button className="px-10 py-5 bg-red-500 hover:bg-red-400 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-red-500/30 active:scale-95">
                            J'ai compris le risque
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function LabCard({ title, desc, icon, difficulty, points, color }: any) {
    const colors: any = {
        blue: "hover:border-blue-500/30 text-blue-500 shadow-blue-500/5",
        purple: "hover:border-purple-500/30 text-purple-500 shadow-purple-500/5",
        emerald: "hover:border-emerald-500/30 text-emerald-500 shadow-emerald-500/5",
        amber: "hover:border-amber-500/30 text-amber-500 shadow-amber-500/5",
        red: "hover:border-red-500/30 text-red-500 shadow-red-500/5",
        indigo: "hover:border-indigo-500/30 text-indigo-500 shadow-indigo-500/5",
    };

    return (
        <div className={`group p-10 rounded-[50px] bg-slate-900 border border-white/5 transition-all duration-700 hover:-translate-y-4 shadow-2xl ${colors[color]}`}>
            <div className="flex justify-between items-center mb-10">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-current group-hover:text-slate-950 transition-all duration-500">
                    {icon}
                </div>
                <div className="text-right space-y-1 text-current">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 group-hover:text-current opacity-60 transition-colors">{difficulty}</div>
                    <div className="text-xl font-black font-mono italic">+{points} PTS</div>
                </div>
            </div>

            <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-4 group-hover:translate-x-2 transition-transform">{title}</h3>
            <p className="text-slate-500 font-medium leading-relaxed mb-10 h-20 overflow-hidden line-clamp-3">
                {desc}
            </p>

            <button className="w-full py-5 bg-white/5 hover:bg-current group-hover:text-slate-950 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all">
                Initialiser le Lab <ArrowRight size={14} />
            </button>
        </div>
    );
}
