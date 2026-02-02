'use client';

import { Calculator } from 'lucide-react';

export default function OperationsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-500">
                    <Calculator size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold font-heading text-white">Cryptographic Operations</h1>
                    <p className="text-slate-400 text-sm">Perform on-demand crypto calculations.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* PIN Block Form */}
                <div className="glass-card p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-white mb-4 border-b border-white/5 pb-2">PIN Block Calculator</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">PAN (Primary Account Number)</label>
                            <input type="text" placeholder="Card Number" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm font-mono text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">PIN (Clear Text)</label>
                            <input type="password" placeholder="****" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm font-mono text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Format</label>
                            <select className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white">
                                <option>ISO-0 (Format 0)</option>
                                <option>ISO-1 (Format 1)</option>
                                <option>ISO-3 (Format 3)</option>
                            </select>
                        </div>
                        <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded transition">
                            Generate PIN Block
                        </button>
                        <div className="mt-4 p-3 bg-slate-950 rounded border border-white/10">
                            <div className="text-xs text-slate-500 mb-1">Result (Hex):</div>
                            <div className="font-mono text-green-400 text-sm tracking-wider">READY</div>
                        </div>
                    </div>
                </div>

                {/* MAC Generator Form */}
                <div className="glass-card p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-white mb-4 border-b border-white/5 pb-2">MAC Generator</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Input Data (Hex)</label>
                            <textarea rows={4} placeholder="Raw Message Data" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm font-mono text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Algorithm</label>
                            <select className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white">
                                <option>ISO 9797-1 MAC Alg 3 (Retail MAC)</option>
                                <option>CMAC (AES)</option>
                                <option>HMAC-SHA256</option>
                            </select>
                        </div>
                        <button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded transition">
                            Generate MAC
                        </button>
                        <div className="mt-4 p-3 bg-slate-950 rounded border border-white/10">
                            <div className="text-xs text-slate-500 mb-1">Result (Hex):</div>
                            <div className="font-mono text-purple-400 text-sm tracking-wider">READY</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
