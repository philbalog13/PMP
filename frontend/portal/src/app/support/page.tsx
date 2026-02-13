'use client';

import type { ReactNode } from 'react';
import { HelpCircle, BookOpen, GraduationCap, MessageCircle, ChevronRight, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function SupportPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 relative overflow-hidden">
            {/* Background Patterns */}
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-600/5 rounded-full blur-[150px] -z-10" />

            <div className="max-w-5xl mx-auto space-y-20 relative z-10">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    <Link href="/" className="hover:text-white transition">Home</Link>
                    <ChevronRight size={12} />
                    <span className="text-emerald-500">Support Center</span>
                </div>

                {/* Hero */}
                <div className="text-center space-y-8">
                    <div className="w-24 h-24 mx-auto rounded-[32px] bg-emerald-500 flex items-center justify-center shadow-3xl shadow-emerald-500/40 rotate-12 transition-transform hover:rotate-0 duration-700">
                        <HelpCircle size={48} className="text-white" />
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.8]">
                            Help <span className="text-emerald-500">Center.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
                            Documentation technique, guides d&apos;apprentissage et support communautaire pour PMP.
                        </p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    <SupportPortalCard
                        href="/student"
                        title="Guide Étudiant"
                        desc="Tutorials pas-à-pas pour maîtriser les flux transactionnels et les ateliers."
                        icon={<GraduationCap className="w-8 h-8" />}
                        color="emerald"
                    />
                    <SupportPortalCard
                        href="/instructor"
                        title="Espace Formateur"
                        desc="Gestion des classes, monitoring des labs et corrections automatisées."
                        icon={<BookOpen className="w-8 h-8" />}
                        color="blue"
                    />
                </div>

                {/* FAQ Section */}
                <div className="bg-slate-900/50 rounded-[60px] p-10 md:p-16 border border-white/5 backdrop-blur-3xl shadow-3xl shadow-black/50 space-y-12">
                    <div className="flex items-center gap-4">
                        <div className="w-1 h-12 bg-emerald-500 rounded-full" />
                        <h3 className="text-3xl font-black italic uppercase tracking-tighter">Questions <span className="text-emerald-500 uppercase">Fréquentes.</span></h3>
                    </div>

                    <div className="grid gap-8">
                        <FAQItem
                            q="Comment réinitialiser les clés HSM ?"
                            a="Allez dans la console HSM Admin > Opérations et lancez un 'LMK Rekey' ou 'Zeroize' pour tout remettre à zéro."
                        />
                        <FAQItem
                            q="Pourquoi ma transaction est-elle refusée ?"
                            a="Vérifiez le code réponse dans le message 0110. '05' signifie un refus de l'émetteur (souvent solde insuffisant)."
                        />
                        <FAQItem
                            q="Comment simuler une attaque PCI ?"
                            a="Utilisez le Security Lab pour apprendre à intercepter les composants de clés ou tester des injections SQL."
                        />
                    </div>
                </div>

                {/* Community Link */}
                <div className="flex flex-col md:flex-row items-center justify-between p-10 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 gap-8">
                    <div className="flex items-center gap-6 text-center md:text-left">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <MessageCircle size={24} className="text-white" />
                        </div>
                        <div>
                            <h4 className="text-lg font-black italic uppercase tracking-tighter text-emerald-500">Rejoignez le Discord</h4>
                            <p className="text-slate-500 text-sm font-medium">Une communauté d&apos;experts pour répondre à vos questions complexes.</p>
                        </div>
                    </div>
                    <button className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all shadow-xl shadow-emerald-500/30 active:scale-95 whitespace-nowrap">
                        Rejoindre le chat
                    </button>
                </div>
            </div>
        </div>
    );
}

type SupportColor = 'emerald' | 'blue';

function SupportPortalCard({ href, title, desc, icon, color }: { href: string; title: string; desc: string; icon: ReactNode; color: SupportColor }) {
    const colors: Record<SupportColor, string> = {
        emerald: "hover:border-emerald-500/30 text-emerald-500",
        blue: "hover:border-blue-500/30 text-blue-500",
    };

    return (
        <Link href={href} className={`group p-10 rounded-[50px] bg-slate-900 border border-white/5 transition-all duration-700 hover:-translate-y-2 shadow-2xl ${colors[color]}`}>
            <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-8 group-hover:bg-current group-hover:text-slate-950 transition-all duration-500">
                {icon}
            </div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-4 group-hover:translate-x-2 transition-transform">{title}</h3>
            <p className="text-slate-500 font-medium leading-relaxed mb-10 h-16 overflow-hidden">
                {desc}
            </p>
            <div className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 group-hover:gap-4 transition-all">
                Ouvrir le portail <ArrowRight size={14} />
            </div>
        </Link>
    );
}

function FAQItem({ q, a }: { q: string, a: string }) {
    return (
        <div className="p-8 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/[0.08] transition duration-300 space-y-3 group">
            <h4 className="text-lg font-black italic uppercase tracking-tight text-white flex items-center gap-4">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-xs">Q</span>
                {q}
            </h4>
            <div className="pl-10 text-slate-400 font-medium leading-relaxed text-sm">
                {a}
            </div>
        </div>
    );
}
