'use client';

import { Users, FileText, Settings, Shield, Clock, CheckCircle2, AlertCircle, BarChart3, ArrowRight, Star, BookOpen, MessageSquare, ChevronRight, Zap } from 'lucide-react';
import Link from 'next/link';

import { useAuth } from '../auth/useAuth';

export default function InstructorPage() {
    const { isLoading } = useAuth(true);

    if (isLoading) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
            <Shield className="animate-bounce w-12 h-12 text-blue-500" />
        </div>;
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 relative overflow-hidden">
            {/* Background Patterns */}
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] -z-10" />

            <div className="max-w-7xl mx-auto space-y-12 relative z-10">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    <Link href="/" className="hover:text-white transition">Home</Link>
                    <ChevronRight size={12} />
                    <span className="text-blue-500">Instructor Hub</span>
                </div>

                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 border-b border-white/5 pb-16">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-500 text-[10px] font-black uppercase tracking-widest">
                            <Shield size={14} /> Control Station
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.8]">
                            Professor <span className="text-blue-500">Panel.</span>
                        </h1>
                        <p className="text-slate-400 text-xl max-w-2xl font-medium leading-relaxed">
                            Pilotez vos sessions de formation, surveillez les métriques de succès
                            et injectez des scénarios de fraude en temps réel.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <button className="px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-2xl shadow-blue-500/40 active:scale-95">
                            Nouvelle Session
                        </button>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                    <StatBox label="Promotion 2026" value="24" sub="Étudiants actifs" color="blue" />
                    <StatBox label="Taux de Réussite" value="78%" sub="+5% vs hier" color="emerald" />
                    <StatBox label="Temps de Lab" value="12h" sub="Moyenne / jour" color="amber" />
                    <StatBox label="Alertes" value="03" sub="Critiques" color="red" />
                </div>

                <div className="grid lg:grid-cols-3 gap-12">
                    {/* Main Monitoring Area */}
                    <div className="lg:col-span-2 space-y-10">
                        <div className="bg-slate-900 border border-white/5 rounded-[50px] p-10 shadow-2xl">
                            <div className="flex justify-between items-center mb-10">
                                <h3 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                                    <Users className="text-blue-500" /> Progression Cohorte
                                </h3>
                                <button className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition">Full Report</button>
                            </div>
                            <div className="space-y-6">
                                <StudentRow name="Alice Smith" progress={85} status="Online" lastActive="2m ago" />
                                <StudentRow name="Bob Jones" progress={42} status="Lab: Crack PIN" lastActive="12m ago" />
                                <StudentRow name="Charlie Day" progress={91} status="Finished ISO8583" lastActive="Just now" />
                                <StudentRow name="Diana Prince" progress={65} status="Idle" lastActive="5m ago" />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-slate-900 border border-white/5 rounded-[40px] p-8 space-y-6">
                                <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                                    <Star className="text-amber-500" /> Évaluations
                                </h3>
                                <div className="space-y-4">
                                    <EvaluationCard student="Eric Stoltz" workshop="HSM Advanced" score="A+" />
                                    <EvaluationCard student="Fiona Gallagher" workshop="3DS Multi-Domain" score="B-" />
                                </div>
                            </div>
                            <div className="bg-slate-900 border border-white/5 rounded-[40px] p-8 space-y-6">
                                <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                                    <MessageSquare className="text-blue-500" /> Support tickets
                                </h3>
                                <div className="space-y-4">
                                    <SupportTicket name="Sébastien R." issue="Auth Timeout" time="5m" />
                                    <SupportTicket name="Léa M." issue="BitMap Error" time="12m" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Laboratory Controls Sidebar */}
                    <div className="space-y-10">
                        <div className="p-10 rounded-[50px] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white space-y-10 shadow-3xl shadow-blue-500/20">
                            <div className="space-y-2">
                                <h3 className="text-3xl font-black italic uppercase tracking-tighter">Lab Command.</h3>
                                <p className="text-white/70 text-sm font-medium">Contrôlez les conditions du simulateur.</p>
                            </div>

                            <div className="space-y-8">
                                <ControlSlider label="Latence Network" value="150" unit="ms" />
                                <ControlSlider label="Taux d'Échec Auth" value="5" unit="%" />
                                <ControlToggle label="Injection de Fraude" checked={true} />
                            </div>

                            <button className="w-full py-5 bg-white text-blue-600 font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-2xl hover:bg-blue-50 transition active:scale-95">
                                Appliquer les Conditions
                            </button>
                        </div>

                        <div className="bg-slate-900 border border-white/5 rounded-[50px] p-10 space-y-6">
                            <h3 className="text-xl font-black italic uppercase tracking-tighter">Quick Links</h3>
                            <div className="space-y-4">
                                <QuickLink title="Docs Architecture" icon={<BookOpen />} />
                                <QuickLink title="Lab Monitoring" icon={<BarChart3 />} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatBox({ label, value, sub, color }: any) {
    const colors: any = {
        blue: "text-blue-500",
        emerald: "text-emerald-500",
        amber: "text-amber-500",
        red: "text-red-500",
    }
    return (
        <div className="bg-slate-900 border border-white/5 p-10 rounded-[40px] space-y-2 hover:bg-white/5 transition-colors duration-500">
            <div className={`text-5xl font-black font-mono italic tracking-tighter ${colors[color]}`}>{value}</div>
            <div className="space-y-1">
                <div className="text-[10px] text-white font-black uppercase tracking-widest">{label}</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{sub}</div>
            </div>
        </div>
    );
}

function StudentRow({ name, progress, status, lastActive }: any) {
    return (
        <div className="flex items-center justify-between p-6 bg-slate-950/50 rounded-3xl border border-white/5 group hover:border-blue-500/30 transition-all duration-500">
            <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center font-black text-xs text-slate-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                    {name.split(' ').map((n: any) => n[0]).join('')}
                </div>
                <div>
                    <h4 className="font-bold text-white text-lg tracking-tight italic">{name}</h4>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{status}</p>
                </div>
            </div>
            <div className="flex items-center gap-10">
                <div className="flex flex-col items-end gap-1.5 hidden md:flex">
                    <div className="text-[10px] text-slate-600 font-black uppercase">{progress}% COMPLETION</div>
                    <div className="w-40 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${progress}%` }} />
                    </div>
                </div>
                <div className="text-[10px] text-slate-600 font-black uppercase w-20 text-right">{lastActive}</div>
                <button className="p-3 hover:bg-white/5 rounded-2xl transition"><Settings size={18} className="text-slate-700 hover:text-white" /></button>
            </div>
        </div>
    );
}

function EvaluationCard({ student, workshop, score }: any) {
    return (
        <div className="p-6 bg-slate-950/50 rounded-3xl border border-white/5 flex items-center justify-between hover:bg-white/5 transition duration-300">
            <div>
                <h4 className="font-bold text-white">{student}</h4>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{workshop}</p>
            </div>
            <div className="text-2xl font-black text-emerald-500 font-mono italic">{score}</div>
        </div>
    );
}

function SupportTicket({ name, issue, time }: any) {
    return (
        <div className="p-6 bg-slate-950/50 rounded-3xl border border-white/5 flex items-center justify-between hover:bg-white/5 transition duration-300">
            <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <div>
                    <h4 className="font-bold text-white text-sm">{name}</h4>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{issue}</p>
                </div>
            </div>
            <div className="text-[10px] text-slate-600 font-black uppercase italic">{time}</div>
        </div>
    );
}

function ControlSlider({ label, value, unit }: any) {
    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/60">
                <span>{label}</span>
                <span className="text-white">{value}{unit}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-white w-1/2" />
            </div>
        </div>
    );
}

function ControlToggle({ label, checked }: any) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{label}</span>
            <div className={`w-12 h-6 rounded-full transition-all relative cursor-pointer ${checked ? 'bg-white' : 'bg-white/10'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${checked ? 'right-1 bg-blue-600' : 'left-1 bg-white/40'}`} />
            </div>
        </div>
    );
}

function QuickLink({ title, icon }: any) {
    return (
        <div className="flex items-center justify-between p-5 bg-slate-950/50 rounded-2xl border border-white/5 group hover:border-blue-500/30 transition cursor-pointer">
            <div className="flex items-center gap-4">
                <div className="text-slate-500 group-hover:text-blue-500 transition-colors">{icon}</div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">{title}</span>
            </div>
            <ArrowRight size={16} className="text-slate-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
        </div>
    );
}
