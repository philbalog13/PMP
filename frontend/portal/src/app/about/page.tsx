'use client';

import type { ReactNode } from 'react';
import { Shield, Cpu, Globe, Zap, Users, Github, ChevronRight, Terminal } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 relative overflow-hidden">
            {/* Background Patterns */}
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
            <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[150px] -z-10" />

            <div className="max-w-7xl mx-auto space-y-24 relative z-10">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    <Link href="/" className="hover:text-white transition">Home</Link>
                    <ChevronRight size={12} />
                    <span className="text-white">Notre Mission</span>
                </div>

                {/* Hero */}
                <div className="text-center space-y-12">
                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-500 text-[10px] font-black uppercase tracking-widest">
                        <Globe size={14} /> Open Banking Standard
                    </div>
                    <h1 className="text-7xl md:text-9xl font-black italic tracking-tight uppercase leading-[0.8]">
                        OPEN<span className="text-blue-500">PAYMENT</span> LAB<span className="text-blue-500">.</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto leading-relaxed font-medium">
                        PMP est un écosystème de simulation industriel conçu pour former les experts en paiements de demain.
                    </p>
                </div>

                {/* Mission Grid */}
                <div className="grid lg:grid-cols-2 gap-20 items-center">
                    <div className="space-y-10">
                        <div className="space-y-6">
                            <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">Rendre <span className="text-blue-500">Le Complexe Tangible.</span></h2>
                            <p className="text-slate-400 text-lg leading-relaxed font-medium">
                                Dans un monde où les transactions numériques sont invisibles, nous décomposons chaque bit d&apos;un message ISO 8583,
                                chaque échange de clés HSM et chaque challenge 3DS pour offrir une compréhension parfaite des infrastructures critiques.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-8 rounded-[40px] bg-slate-900/50 border border-white/5 space-y-4 group hover:border-blue-500/30 transition-all duration-500">
                                <div className="text-5xl font-black text-blue-500 italic">100%</div>
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-white transition-colors">Open Source</div>
                            </div>
                            <div className="p-8 rounded-[40px] bg-slate-900/50 border border-white/5 space-y-4 group hover:border-emerald-500/30 transition-all duration-500">
                                <div className="text-5xl font-black text-emerald-500 italic uppercase leading-none">ISO</div>
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-white transition-colors">Standards</div>
                            </div>
                        </div>
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-0 bg-blue-600/30 blur-[120px] rounded-full opacity-20 group-hover:opacity-40 transition duration-1000" />
                        <div className="relative p-12 rounded-[60px] bg-slate-900 border border-white/10 space-y-8 backdrop-blur-3xl shadow-3xl shadow-black">
                            <h3 className="text-2xl font-black italic uppercase tracking-tighter">Publics <span className="text-blue-500">Cibles.</span></h3>
                            <div className="space-y-6">
                                <AudienceItem icon={<Terminal size={18} />} title="Développeurs FinTech" text="Maîtrisez les protocoles bancaires bas-niveau." />
                                <AudienceItem icon={<Shield size={18} />} title="Analystes Cyber" text="Testez les vulnérabilités de paiement en sandbox." />
                                <AudienceItem icon={<Users size={18} />} title="Étudiants" text="Apprenez les fondamentaux de la monétique." />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Infrastructure Section */}
                <div className="space-y-12 py-20">
                    <div className="text-center space-y-4">
                        <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">Notre <span className="text-blue-500">Infrastructure.</span></h2>
                        <p className="text-slate-500 font-medium tracking-wide">Une pile technologique moderne et robuste.</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <TechWidget label="Microservices" icon={<Globe />} />
                        <TechWidget label="Hardware Crypto" icon={<Cpu />} />
                        <TechWidget label="Real-Time Engine" icon={<Zap />} />
                        <TechWidget label="PCI-DSS Ready" icon={<Shield />} />
                    </div>
                </div>

                {/* Final Call to Action */}
                <div className="p-16 md:p-24 rounded-[80px] bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 text-center space-y-10 relative overflow-hidden group">
                    <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] group-hover:scale-125 transition-transform duration-1000" />

                    <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter relative z-10">Envie de <span className="text-blue-500">Contribuer ?</span></h2>
                    <p className="text-slate-400 text-xl font-medium max-w-2xl mx-auto relative z-10 leading-relaxed">
                        Le projet PMP est collaboratif. Rejoignez notre communauté pour améliorer les simulateurs et démocratiser le savoir monétique.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-6 relative z-10 pt-4">
                        <Link href="https://github.com" className="flex items-center justify-center gap-3 px-12 py-5 bg-white text-slate-950 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition shadow-2xl active:scale-95">
                            <Github size={20} /> GitHub Project
                        </Link>
                        <Link href="/documentation" className="flex items-center justify-center gap-3 px-12 py-5 bg-white/5 border border-white/10 font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition backdrop-blur-md active:scale-95">
                            Full Documentation
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TechWidget({ label, icon }: { label: string; icon: ReactNode }) {
    return (
        <div className="p-10 rounded-[50px] bg-slate-900/50 border border-white/5 flex flex-col items-center gap-6 hover:border-blue-500/30 transition-all duration-500 hover:-translate-y-2 group shadow-xl">
            <div className="w-16 h-16 rounded-3xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all duration-500 shadow-lg shadow-blue-500/5">
                {icon}
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-white transition-colors">{label}</span>
        </div>
    );
}

function AudienceItem({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
    return (
        <div className="flex items-start gap-4 p-4 rounded-3xl hover:bg-white/5 transition duration-300">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                {icon}
            </div>
            <div className="space-y-1">
                <h4 className="font-bold text-white text-sm uppercase tracking-tight italic">{title}</h4>
                <p className="text-slate-500 text-xs font-medium leading-relaxed">{text}</p>
            </div>
        </div>
    );
}
