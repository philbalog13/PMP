'use client';

import { Zap, Play, Settings, Terminal, Shield, ArrowRight, Activity, Clock } from 'lucide-react';
import { useState } from 'react';

export default function SimulatePage() {
    const [isSimulating, setIsSimulating] = useState(false);

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-7xl mx-auto space-y-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                <Zap size={20} className="text-blue-500" />
                            </div>
                            <h1 className="text-3xl font-black italic tracking-tight uppercase">Simulation Engine<span className="text-blue-500">.</span></h1>
                        </div>
                        <p className="text-slate-400 font-medium">Configurez et lancez des scénarios transactionnels complexes.</p>
                    </div>

                    <button
                        onClick={() => setIsSimulating(!isSimulating)}
                        className={`px-10 py-4 rounded-2xl font-black italic uppercase tracking-widest transition-all active:scale-95 shadow-2xl flex items-center gap-3 ${isSimulating
                                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                            }`}
                    >
                        {isSimulating ? 'Arrêter Simulation' : 'Lancer Simulation'}
                        {isSimulating ? <Activity className="animate-pulse" /> : <Play fill="currentColor" size={16} />}
                    </button>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Config Panel */}
                    <div className="space-y-6">
                        <div className="p-8 rounded-[40px] bg-slate-900/50 border border-white/5 space-y-8">
                            <h3 className="text-xl font-bold flex items-center gap-2"><Settings size={20} /> Paramètres</h3>

                            <div className="space-y-6">
                                <SimOption label="Type de Flux" value="ISO 8583 (0100)" />
                                <SimOption label="Terminal Target" value="TPE-VIRTUAL-01" />
                                <SimOption label="Volume" value="50 Tx/min" />
                                <SimOption label="Taux d'erreur" value="5% (Auto)" />
                            </div>

                            <div className="pt-4 space-y-3">
                                <label className="flex items-center gap-3 p-4 bg-slate-950 rounded-2xl border border-white/5 cursor-pointer hover:border-blue-500/30 transition">
                                    <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-slate-800" defaultChecked />
                                    <span className="text-sm font-medium">Activer Fraud-Engine</span>
                                </label>
                                <label className="flex items-center gap-3 p-4 bg-slate-950 rounded-2xl border border-white/5 cursor-pointer hover:border-blue-500/30 transition">
                                    <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-slate-800" />
                                    <span className="text-sm font-medium">Mode Debug (Verbosite Max)</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Console Output */}
                    <div className="lg:col-span-2 bg-black rounded-[40px] border border-white/5 p-8 font-mono text-sm relative overflow-hidden group">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-shimmer" />
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Live Output</span>
                        </div>

                        <div className="space-y-2 h-[450px] overflow-y-auto custom-scrollbar">
                            <ConsoleLine time="10:02:44" type="system" text="Simulation Engine v2.4 initialized..." />
                            <ConsoleLine time="10:02:45" type="io" text="Connecting to API Gateway on port 8000..." />
                            <ConsoleLine time="10:02:46" type="success" text="Connection established (Latency: 12ms)" />
                            {isSimulating && (
                                <>
                                    <ConsoleLine time="10:02:48" type="tx" text="TX-4821: SENDING 0100 (Auth Request)..." />
                                    <ConsoleLine time="10:02:49" type="tx" text="TX-4821: RECEIVED 0110 (Approved)" />
                                    <ConsoleLine time="10:02:51" type="tx" text="TX-4822: SENDING 0100 (Auth Request)..." />
                                    <ConsoleLine time="10:02:52" type="error" text="TX-4822: DECLINED (Code 51 - Insufficient Funds)" />
                                    <ConsoleLine time="10:02:54" type="tx" text="TX-4823: SENDING 0100 (Auth Request)..." />
                                    <ConsoleLine time="10:02:55" type="tx" text="TX-4823: RECEIVED 0110 (Approved)" />
                                </>
                            )}
                            {!isSimulating && <div className="text-slate-800 italic animate-pulse">En attente du lancement...</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SimOption({ label, value }: any) {
    return (
        <div className="flex justify-between items-center border-b border-white/5 pb-4 last:border-0 last:pb-0">
            <span className="text-sm font-medium text-slate-500">{label}</span>
            <span className="text-sm font-bold text-white hover:text-blue-400 cursor-pointer transition-colors">{value}</span>
        </div>
    );
}

function ConsoleLine({ time, type, text }: any) {
    const colors: any = {
        system: 'text-blue-500',
        io: 'text-slate-500',
        success: 'text-emerald-500',
        tx: 'text-white',
        error: 'text-red-500'
    };
    return (
        <div className="flex gap-4 group/line">
            <span className="text-slate-700 opacity-50 select-none">[{time}]</span>
            <span className={`${colors[type]} font-bold`}>{type.toUpperCase()}:</span>
            <span className="text-slate-300 group-hover/line:text-white transition-colors">{text}</span>
        </div>
    );
}
