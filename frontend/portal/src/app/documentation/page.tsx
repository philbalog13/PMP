'use client';

import type { ReactNode } from 'react';
import { Code, Database, Shield, Cpu, ArrowRight, ChevronRight, Search, Zap, Globe, Lock } from 'lucide-react';
import Link from 'next/link';

export default function DocumentationPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col lg:flex-row relative">
            {/* Background Patterns */}
            <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />

            {/* Left Sidebar */}
            <aside className="w-full lg:w-80 border-r border-white/5 bg-slate-900/40 backdrop-blur-3xl lg:sticky lg:top-20 lg:h-[calc(100vh-80px)] overflow-y-auto p-8 space-y-10 relative z-10 shrink-0">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black italic tracking-tighter">D</div>
                        <span className="font-black text-xs uppercase tracking-[0.3em] text-slate-300">Docs v1.0.42</span>
                    </div>
                </div>

                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={14} />
                    <input
                        type="text"
                        placeholder="RECHERCHER DANS LA DOC..."
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-700"
                    />
                </div>

                <nav className="space-y-8">
                    <DocNavSection title="Fondamentaux" items={['Introduction', 'Architecture', 'Flux Transactionnel', 'Glossaire']} />
                    <DocNavSection title="Protocoles" items={['ISO 8583', 'Nexo (ISO 20022)', 'EMV L1/L2', 'API JSON']} />
                    <DocNavSection title="Sécurité" items={['Gestion HSM', 'DUKPT', '3D Secure v2', 'PCI-DSS Compliance']} />
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-12 lg:p-20 relative z-10">
                <div className="max-w-4xl mx-auto space-y-20">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-4">
                            <Link href="/" className="hover:text-white transition">Platform</Link>
                            <ChevronRight size={12} />
                            <span className="text-white">Documentation</span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.8] mb-8">
                            Knowledge <span className="text-blue-500 text-7xl md:text-9xl">Base.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-slate-400 font-medium leading-relaxed max-w-2xl">
                            La référence technique complète pour l&apos;intégration, le test et la compréhension des systèmes monétiques industriels.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <DocGridCard
                            title="Quick Start"
                            desc="Configurez votre stack et lancez votre première transaction ISO 8583."
                            icon={<Zap className="w-6 h-6" />}
                            color="blue"
                        />
                        <DocGridCard
                            title="Spec ISO 8583"
                            desc="Détail complet des Data Elements et du Bitmap transactionnel."
                            icon={<Code className="w-6 h-6" />}
                            color="purple"
                        />
                        <DocGridCard
                            title="Crypto & HSM"
                            desc="Échange de clés, gestion LMK/ZMK et signatures numériques."
                            icon={<Lock className="w-6 h-6" />}
                            color="emerald"
                        />
                        <DocGridCard
                            title="Infrastructure"
                            desc="Comment les 14 microservices collaborent pour orchestrer le flux."
                            icon={<Database className="w-6 h-6" />}
                            color="amber"
                        />
                    </div>

                    {/* Section concepts */}
                    <div className="p-10 md:p-16 rounded-[60px] bg-slate-900/50 border border-white/5 space-y-12 backdrop-blur-md">
                        <h2 className="text-3xl font-black italic uppercase tracking-tighter">Concepts <span className="text-blue-500 uppercase">Clés.</span></h2>
                        <div className="grid md:grid-cols-3 gap-8">
                            <ConceptBox icon={<Globe className="text-blue-500" />} title="Acquéreur" text="L'institution qui capture la transaction marchand." />
                            <ConceptBox icon={<Shield className="text-purple-500" />} title="Émetteur" text="La banque qui autorise la transaction client." />
                            <ConceptBox icon={<Cpu className="text-emerald-500" />} title="Switch" text="Le routeur central des messages interbancaires." />
                        </div>
                    </div>

                    {/* Footer Doc */}
                    <div className="flex items-center justify-between pt-10 border-t border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <span>Dernière mise à jour : 24 Janvier 2026</span>
                        <div className="flex gap-6">
                            <button className="hover:text-white transition">Signaler une erreur</button>
                            <button className="hover:text-white transition">Éditer sur GitHub</button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function DocNavSection({ title, items }: { title: string; items: string[] }) {
    return (
        <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-3">{title}</h4>
            <ul className="space-y-1">
                {items.map((it: string) => (
                    <li key={it}>
                        <button className="w-full text-left px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition duration-300">
                            {it}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

type DocCardColor = 'blue' | 'purple' | 'emerald' | 'amber';

function DocGridCard({ title, desc, icon, color }: { title: string; desc: string; icon: ReactNode; color: DocCardColor }) {
    const colors: Record<DocCardColor, string> = {
        blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        purple: "text-purple-500 bg-purple-500/10 border-purple-500/20",
        emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    }
    return (
        <div className="group p-10 rounded-[50px] bg-slate-900 border border-white/5 hover:border-blue-500/30 transition-all duration-700 hover:-translate-y-2 cursor-pointer shadow-2xl">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition duration-500 ${colors[color]}`}>
                {icon}
            </div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-3">{title}</h3>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">{desc}</p>
            <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                Lire le guide <ArrowRight size={14} />
            </div>
        </div>
    );
}

function ConceptBox({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
    return (
        <div className="space-y-4 p-6 rounded-3xl bg-slate-950/50 border border-white/5 hover:bg-white/5 transition duration-500 group">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h4 className="font-black italic uppercase tracking-tighter text-white">{title}</h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">{text}</p>
        </div>
    );
}
