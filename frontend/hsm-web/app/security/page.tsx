'use client';

import { ShieldAlert, Fingerprint } from 'lucide-react';

export default function SecurityPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-red-500">
                    <ShieldAlert size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold font-heading text-white">Security & Audit logs</h1>
                    <p className="text-slate-400 text-sm">Monitor physical security and access attempts.</p>
                </div>
            </div>

            <div className="glass-card rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h3 className="font-bold text-white">Security Audit Trail</h3>
                    <button className="text-xs bg-slate-800 text-white px-3 py-1 rounded">Export CSV</button>
                </div>
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/5 bg-slate-900/50">
                            <th className="px-6 py-3 font-semibold text-slate-400">Timestamp</th>
                            <th className="px-6 py-3 font-semibold text-slate-400">Event Type</th>
                            <th className="px-6 py-3 font-semibold text-slate-400">User / Actor</th>
                            <th className="px-6 py-3 font-semibold text-slate-400">Description</th>
                            <th className="px-6 py-3 font-semibold text-slate-400">Severity</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <tr key={i} className="hover:bg-white/5 transition">
                                <td className="px-6 py-3 font-mono text-slate-500 text-xs">2026-01-29 10:4{i}:00</td>
                                <td className="px-6 py-3 text-white">KEY_GENERATION</td>
                                <td className="px-6 py-3 text-slate-300 flex items-center gap-2">
                                    <Fingerprint size={12} /> admin
                                </td>
                                <td className="px-6 py-3 text-slate-400">Generated new TMK under ZMK-01</td>
                                <td className="px-6 py-3">
                                    <span className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded text-xs border border-green-500/20">INFO</span>
                                </td>
                            </tr>
                        ))}
                        <tr className="hover:bg-white/5 transition bg-red-500/5">
                            <td className="px-6 py-3 font-mono text-slate-500 text-xs">2026-01-29 09:12:00</td>
                            <td className="px-6 py-3 text-white">PHYSICAL_TAMPER</td>
                            <td className="px-6 py-3 text-slate-300 flex items-center gap-2">
                                <ShieldAlert size={12} className="text-red-500" /> SYSTEM
                            </td>
                            <td className="px-6 py-3 text-red-300">Chassis opened detection triggered</td>
                            <td className="px-6 py-3">
                                <span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded text-xs border border-red-500/20 animate-pulse">CRITICAL</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
