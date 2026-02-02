'use client';

import { ShieldAlert, Users, Server, Database, Activity, Lock, Key, ChevronRight, Zap, ArrowRight, ShieldCheck, Settings } from 'lucide-react';
import Link from 'next/link';

import { useAuth } from '../auth/useAuth';

export default function AdminPage() {
    const { isLoading } = useAuth(true);

    if (isLoading) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
            <ShieldAlert className="animate-pulse w-12 h-12 text-red-500" />
        </div>;
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 relative overflow-hidden">
            {/* Background Patterns */}
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-[150px] -z-10" />

            <div className="max-w-7xl mx-auto space-y-12 relative z-10">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    <Link href="/" className="hover:text-white transition">Home</Link>
                    <ChevronRight size={12} />
                    <span className="text-red-500">Admin Control</span>
                </div>

                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 border-b border-white/5 pb-16">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 text-[10px] font-black uppercase tracking-widest">
                            <ShieldAlert size={14} /> Master Control Unit
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.8]">
                            Admin <span className="text-red-500 text-7xl md:text-9xl">Terminal.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-slate-400 font-medium leading-relaxed max-w-2xl">
                            Gestion globale de l'écosystème PMP : monitorage des services,
                            audit des logs et maintenance des socles cryptographiques.
                        </p>
                    </div>
                </div>

                {/* System Health Section */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                    <HealthCard label="API GATEWAY" status="Healthy" uptime="99.9%" color="emerald" icon={<Zap />} />
                    <HealthCard label="HSM ENGINE" status="Healthy" uptime="100%" color="emerald" icon={<Lock />} />
                    <HealthCard label="AUTH SERVICE" status="Healthy" uptime="99.8%" color="emerald" icon={<ShieldCheck />} />
                    <HealthCard label="SWITCH NODE" status="Degraded" uptime="94.2%" color="amber" icon={<Activity />} />
                </div>

                <div className="grid lg:grid-cols-3 gap-12">
                    {/* User Management Section */}
                    <div className="lg:col-span-2 space-y-10">
                        <div className="bg-slate-900 border border-white/5 rounded-[50px] p-10 shadow-2xl">
                            <div className="flex justify-between items-center mb-10">
                                <h3 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                                    <Users className="text-red-500" /> Comptes Utilisateurs
                                </h3>
                                <div className="flex gap-4">
                                    <button className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition">Filter By Role</button>
                                    <button className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 transition">View All</button>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <AdminUserRow name="Prof. Jean-Luc" role="Instructor" lastLogin="2m ago" />
                                <AdminUserRow name="Admin System" role="Global Admin" lastLogin="Now" />
                                <AdminUserRow name="Thomas M." role="Student" lastLogin="1h ago" />
                                <AdminUserRow name="Sophie V." role="Student" lastLogin="12h ago" />
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-white/5 rounded-[40px] p-10 space-y-6">
                            <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                                <Database className="text-blue-500" /> Infrastructure Logs
                            </h3>
                            <div className="font-mono text-xs bg-black/60 rounded-3xl p-8 text-slate-500 space-y-2 max-h-[300px] overflow-y-auto border border-white/5">
                                <div className="flex gap-4"><span className="text-red-500 font-bold">[ERR]</span> <span className="text-slate-400 font-bold">14:24:02</span> HSM Timeout on Command 0x32</div>
                                <div className="flex gap-4"><span className="text-emerald-500 font-bold">[OK]</span> <span className="text-slate-400 font-bold">14:23:55</span> Auth Token Refresh Student #422</div>
                                <div className="flex gap-4"><span className="text-blue-500 font-bold">[INF]</span> <span className="text-slate-400 font-bold">14:23:40</span> Gateway Routing Table Updated</div>
                                <div className="flex gap-4"><span className="text-emerald-500 font-bold">[OK]</span> <span className="text-slate-400 font-bold">14:23:12</span> ISO-8583 0100 Request Processed Success</div>
                                <div className="flex gap-4"><span className="text-blue-500 font-bold">[INF]</span> <span className="text-slate-400 font-bold">14:22:50</span> Switch Node Heartbeat Received</div>
                            </div>
                        </div>
                    </div>

                    {/* Master Actions Sidebar */}
                    <div className="space-y-10">
                        <div className="p-10 rounded-[50px] bg-slate-900 border border-white/5 space-y-10 shadow-3xl">
                            <h3 className="text-2xl font-black italic uppercase tracking-tighter">System Configuration.</h3>
                            <div className="space-y-6">
                                <AdminAction label="Gestion des Certificats" icon={<Key />} color="blue" />
                                <AdminAction label="Maintenance DB" icon={<Server />} color="purple" />
                                <AdminAction label="Paramètres Sécurité" icon={<Settings />} color="emerald" />
                            </div>
                            <div className="pt-6 border-t border-white/5">
                                <button className="w-full py-5 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-2xl shadow-red-500/20 active:scale-95 transition-all">
                                    Force Global Reset
                                </button>
                            </div>
                        </div>

                        <div className="p-10 rounded-[50px] bg-gradient-to-br from-indigo-900 via-slate-900 to-black text-white space-y-8 border border-white/5">
                            <h3 className="text-xl font-black italic uppercase tracking-tighter">Network Map</h3>
                            <div className="relative h-48 bg-black/40 rounded-3xl border border-white/5 flex items-center justify-center">
                                <div className="absolute inset-0 bg-grid opacity-20" />
                                <div className="relative text-[10px] font-mono text-blue-500 animate-pulse">MAP_LOADING...</div>
                            </div>
                            <button className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition">Monitorage Visuel</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function HealthCard({ label, status, uptime, color, icon }: any) {
    const colors: any = {
        emerald: "text-emerald-500",
        amber: "text-amber-500",
        red: "text-red-500",
    }
    return (
        <div className="bg-slate-900 border border-white/5 p-8 rounded-[40px] space-y-6 hover:bg-white/5 transition-colors duration-500">
            <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${colors[color]}`}>
                {icon}
            </div>
            <div className="space-y-1">
                <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{label}</div>
                <div className="text-2xl font-black italic uppercase tracking-tight">{status}</div>
                <div className="text-[10px] text-slate-600 font-bold uppercase">{uptime} UPTIME</div>
            </div>
        </div>
    );
}

function AdminUserRow({ name, role, lastLogin }: any) {
    return (
        <div className="flex items-center justify-between p-6 bg-slate-950/50 rounded-3xl border border-white/5 group hover:border-red-500/30 transition-all duration-500">
            <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center font-black text-xs text-slate-500 group-hover:bg-red-500 group-hover:text-white transition-all">
                    {name.split(' ').map((n: any) => n[0]).join('')}
                </div>
                <div>
                    <h4 className="font-bold text-white text-lg tracking-tight italic">{name}</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{role}</p>
                </div>
            </div>
            <div className="flex items-center gap-8">
                <div className="text-[10px] text-slate-600 font-black uppercase w-24 text-right">{lastLogin}</div>
                <button className="p-3 hover:bg-white/5 rounded-2xl transition"><Settings size={18} className="text-slate-700" /></button>
            </div>
        </div>
    );
}

function AdminAction({ label, icon, color }: any) {
    const colors: any = {
        blue: "text-blue-500",
        purple: "text-purple-500",
        emerald: "text-emerald-500",
    }
    return (
        <div className="flex items-center justify-between group p-2 cursor-pointer">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors ${colors[color]}`}>
                    {icon}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white">{label}</span>
            </div>
            <ChevronRight size={16} className="text-slate-700 group-hover:translate-x-1 transition-transform" />
        </div>
    );
}
