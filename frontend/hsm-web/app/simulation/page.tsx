'use client';

import { Server } from 'lucide-react';

export default function SimulationPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-slate-500/10 rounded-xl border border-slate-500/20 text-slate-400">
                    <Server size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold font-heading text-white">Hardware Simulation</h1>
                    <p className="text-slate-400 text-sm">Interactive Front Panel View.</p>
                </div>
            </div>

            <div className="flex justify-center">
                {/* HSM RACK UNIT VISUALIZATION */}
                <div className="w-full max-w-4xl bg-[#1a1a1a] rounded-lg border-y-4 border-slate-700 shadow-2xl p-2 relative">
                    {/* Rack Ears */}
                    <div className="absolute left-0 top-0 bottom-0 w-8 bg-slate-800 border-r border-black flex flex-col justify-between py-4 items-center">
                        <div className="w-4 h-4 rounded-full bg-slate-900 border border-slate-600 shadow-inner" />
                        <div className="w-4 h-4 rounded-full bg-slate-900 border border-slate-600 shadow-inner" />
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-slate-800 border-l border-black flex flex-col justify-between py-4 items-center">
                        <div className="w-4 h-4 rounded-full bg-slate-900 border border-slate-600 shadow-inner" />
                        <div className="w-4 h-4 rounded-full bg-slate-900 border border-slate-600 shadow-inner" />
                    </div>

                    {/* Front Panel Content */}
                    <div className="mx-10 bg-[#0f0f0f] h-48 rounded border border-white/5 flex items-center px-8 justify-between relative overflow-hidden">
                        {/* Branding/Model */}
                        <div className="flex flex-col">
                            <span className="text-slate-500 font-bold tracking-[0.2em] text-xs">FINED-SIM SECURE STORAGE</span>
                            <span className="text-white font-heading font-bold text-2xl tracking-tight">HSM-9000</span>
                        </div>

                        {/* LCD Screen */}
                        <div className="bg-[#1e293b] p-1 rounded border border-white/10 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
                            <div className="bg-[#0f172a] w-64 h-24 rounded p-3 font-mono text-green-500 text-xs shadow-inner overflow-hidden relative">
                                <div className="absolute inset-0 bg-green-500/5 pointer-events-none scanline" />
                                <div>&gt; SYSTEM READY</div>
                                <div>&gt; LMK: LOADED (KV 29)</div>
                                <div>&gt; TCP: 3006 LISTENING</div>
                                <div className="animate-pulse">&gt; _</div>
                            </div>
                        </div>

                        {/* Status LEDs */}
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]" />
                                <span className="text-[10px] text-slate-500 font-bold uppercase">Power</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
                                <span className="text-[10px] text-slate-500 font-bold uppercase">Ready</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-900 shadow-inner" />
                                <span className="text-[10px] text-slate-500 font-bold uppercase">Alarm</span>
                            </div>
                        </div>

                        {/* Physical Switches */}
                        <div className="flex flex-col gap-3 border-l border-white/10 pl-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-6 bg-slate-800 rounded-full border border-slate-600 relative cursor-pointer">
                                    <div className="absolute right-1 top-1 w-4 h-4 bg-slate-400 rounded-full shadow-lg" />
                                </div>
                                <span className="text-[10px] text-slate-400 uppercase">Tamper Clear</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-6 bg-slate-800 rounded-full border border-slate-600 relative cursor-pointer">
                                    <div className="absolute left-1 top-1 w-4 h-4 bg-red-600 rounded-full shadow-lg" />
                                </div>
                                <span className="text-[10px] text-slate-400 uppercase">Emergency OFF</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-card p-6 rounded-xl mt-8">
                <h3 className="font-bold text-white mb-4">Console Log</h3>
                <div className="h-48 bg-black rounded font-mono text-xs text-slate-300 p-4 overflow-y-auto border border-white/10">
                    <div className="text-slate-500">[10:00:01] Boot sequence initiated...</div>
                    <div className="text-slate-500">[10:00:02] Self-test passed.</div>
                    <div className="text-green-500">[10:00:03] LMK loaded successfully from smart card 1.</div>
                    <div>[10:42:00] Verify MAC request received (Source: 192.168.1.10)</div>
                    <div>[10:42:01] Response sent (OK)</div>
                </div>
            </div>
        </div>
    );
}
