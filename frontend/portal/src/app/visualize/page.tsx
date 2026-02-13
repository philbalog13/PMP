'use client';

import type { ReactNode, Dispatch, SetStateAction, SVGProps } from 'react';
import { Layers, Box, Cpu, Activity, Zap, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export default function VisualizePage() {
    const [activeNode, setActiveNode] = useState('Gateway');

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-7xl mx-auto space-y-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-10">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-purple-500 font-bold uppercase tracking-widest text-xs">
                            <Layers size={14} /> System Architecture
                        </div>
                        <h1 className="text-5xl font-black italic tracking-tighter uppercase">Visualiseur<span className="text-purple-500">.</span></h1>
                        <p className="text-slate-400 font-medium">Cartographie interactive des microservices et flux de données en temps réel.</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-4 gap-8">
                    {/* Node List */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-4">Composants</h3>
                        <div className="space-y-2">
                            <NodeLink id="TPE" icon={<Box />} label="Terminal Endpoint" active={activeNode} set={setActiveNode} />
                            <NodeLink id="Gateway" icon={<Zap />} label="API Gateway" active={activeNode} set={setActiveNode} />
                            <NodeLink id="Switch" icon={<Activity />} label="Network Switch" active={activeNode} set={setActiveNode} />
                            <NodeLink id="HSM" icon={<Cpu />} label="HSM Engine" active={activeNode} set={setActiveNode} />
                            <NodeLink id="Auth" icon={<Shield />} label="Auth Engine" active={activeNode} set={setActiveNode} />
                        </div>
                    </div>

                    {/* Canvas Area */}
                    <div className="lg:col-span-2 min-h-[500px] bg-slate-900/30 rounded-[40px] border border-white/5 relative flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-grid opacity-20" />

                        {/* Mock Graph Visualization */}
                        <div className="relative z-10 w-full h-full flex items-center justify-center">
                            <svg className="w-full h-full max-w-lg" viewBox="0 0 400 300">
                                {/* Connections */}
                                <line x1="50" y1="150" x2="150" y2="150" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
                                <line x1="150" y1="150" x2="250" y2="100" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
                                <line x1="150" y1="150" x2="250" y2="200" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />

                                {/* Nodes */}
                                <circle cx="50" cy="150" r="20" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
                                <circle cx="150" cy="150" r="30" fill="#1e293b" stroke="#8b5cf6" strokeWidth="4" className="animate-pulse" />
                                <circle cx="250" cy="100" r="20" fill="#1e293b" stroke="#10b981" strokeWidth="2" />
                                <circle cx="250" cy="200" r="20" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />

                                <text x="50" y="185" fill="#64748b" fontSize="10" textAnchor="middle">TPE</text>
                                <text x="150" y="195" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">GATEWAY</text>
                                <text x="250" y="135" fill="#64748b" fontSize="10" textAnchor="middle">AUTH</text>
                                <text x="250" y="235" fill="#64748b" fontSize="10" textAnchor="middle">HSM</text>
                            </svg>
                        </div>
                    </div>

                    {/* Node Details */}
                    <div className="space-y-6">
                        <div className="p-8 rounded-[40px] bg-slate-900 border border-white/5 space-y-6">
                            <h3 className="text-xl font-bold text-purple-400">Détails : {activeNode}</h3>
                            <div className="space-y-4">
                                <DetailRow label="Statut" value="En ligne" color="text-emerald-500" />
                                <DetailRow label="Version" value="v1.2.0" />
                                <DetailRow label="Trafic" value="Low" />
                                <DetailRow label="Latence" value="14ms" />
                            </div>
                            <div className="pt-4 space-y-2">
                                <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Aperçu Logs</h4>
                                <div className="p-3 bg-black rounded-xl font-mono text-[10px] text-slate-500 border border-white/5">
                                    [10:12:01] GET /status - 200 OK<br />
                                    [10:12:04] POST /relay - 201 Created
                                </div>
                            </div>
                            <button className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all">
                                Inspecter Container <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function NodeLink({ id, icon, label, active, set }: { id: string; icon: ReactNode; label: string; active: string; set: Dispatch<SetStateAction<string>> }) {
    const isActive = active === id;
    return (
        <button
            onClick={() => set(id)}
            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${isActive
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
        >
            <div className="flex items-center gap-3">
                {icon}
                <span className="text-sm font-bold">{label}</span>
            </div>
            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-glow" />}
        </button>
    );
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 font-medium">{label}</span>
            <span className={`font-bold ${color || 'text-white'}`}>{value}</span>
        </div>
    );
}

function Shield(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        </svg>
    )
}
