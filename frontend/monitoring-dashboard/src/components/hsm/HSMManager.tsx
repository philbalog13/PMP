import { Server, Lock, Key, RefreshCw, Power } from 'lucide-react';

export default function HSMManager() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent flex items-center gap-3">
                        <Server className="text-emerald-400" /> Gestion HSM
                    </h2>
                    <p className="text-slate-400">Hardware Security Module Status & Keys</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-600/30 transition">
                    <Power className="w-4 h-4" />
                    Online
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* HSM Status */}
                <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Server className="w-5 h-5 text-slate-400" />
                        Statut Physique
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-slate-700">
                            <span className="text-slate-400">Modèle</span>
                            <span className="text-white font-mono">Thales payShield 10K</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-700">
                            <span className="text-slate-400">Firmware</span>
                            <span className="text-white font-mono">v4.2.1-SECURE</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-700">
                            <span className="text-slate-400">Température</span>
                            <span className="text-green-400 font-mono">42°C (Normal)</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-slate-400">Charge</span>
                            <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="w-[12%] h-full bg-blue-500" />
                                </div>
                                <span className="text-blue-400 font-mono">12%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* LMK Slots */}
                <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Key className="w-5 h-5 text-yellow-500" />
                        Status des Clés (LMK)
                    </h3>
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-yellow-500/10 flex items-center justify-center">
                                        <Lock className="w-4 h-4 text-yellow-500" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white">LMK Pair #{i}</div>
                                        <div className="text-xs text-slate-500">Variant • 3DES 192-bit</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">LOADED</span>
                                    <button className="p-1 hover:bg-slate-700 rounded text-slate-400">
                                        <RefreshCw className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
