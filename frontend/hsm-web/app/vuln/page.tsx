'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Shield, ShieldOff, Wifi, Key, Zap, ChevronRight, type LucideIcon } from 'lucide-react';

interface Scenario {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    severity: 'critical' | 'high' | 'medium';
    phases: string[];
}

const scenarios: Scenario[] = [
    { id: 'mitm', title: 'Man-in-the-Middle', description: 'Intercept terminal-host communication', icon: Wifi, severity: 'critical', phases: ['Network Setup', 'Packet Capture', 'Alert Detection', 'TLS Defense'] },
    { id: 'weak-pin', title: 'Weak PIN Attack', description: 'Brute-force common PIN patterns', icon: Key, severity: 'high', phases: ['PIN Generation', 'Dictionary Attack', 'Lock Detection', 'PIN Policy'] },
    { id: 'dos', title: 'Denial of Service', description: 'Flood payment network with requests', icon: Zap, severity: 'high', phases: ['Traffic Setup', 'Flood Attack', 'Rate Limiting', 'DDoS Defense'] },
];

export default function VulnPage() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                    <AlertTriangle size={32} className="text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-red-400">Attack/Defense Lab</h1>
                    <p className="text-slate-400">Interactive security scenarios for payment systems</p>
                </div>
            </div>

            {/* Warning Banner */}
            <div className="rounded-2xl p-6 border border-red-500/30 bg-red-950/20">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <ShieldOff size={24} className="text-red-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white mb-1">Warning Educational Environment Only</h3>
                        <p className="text-sm text-slate-400">
                            These attack simulations are for learning purposes. Never attempt on real systems.
                        </p>
                    </div>
                </div>
            </div>

            {/* Scenarios Grid */}
            <div className="grid gap-6">
                {scenarios.map((scenario) => (
                    <Link
                        key={scenario.id}
                        href={`/vuln/${scenario.id}`}
                        className="group rounded-2xl p-6 border border-white/5 bg-slate-900/50 hover:border-red-500/30 hover:bg-red-950/10 transition-all"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 group-hover:bg-red-500/20 transition">
                                    <scenario.icon size={28} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                        {scenario.title}
                                        <span className={`text-xs px-2 py-0.5 rounded-full uppercase ${scenario.severity === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                            {scenario.severity}
                                        </span>
                                    </h3>
                                    <p className="text-sm text-slate-400">{scenario.description}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="hidden md:flex gap-2">
                                    {scenario.phases.map((phase, idx) => (
                                        <span key={idx} className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400">{phase}</span>
                                    ))}
                                </div>
                                <ChevronRight size={24} className="text-slate-500 group-hover:text-red-400 group-hover:translate-x-1 transition" />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Quick Config Section */}
            <div className="rounded-2xl p-6 border border-white/5 bg-slate-900/30">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Shield size={20} className="text-green-400" />
                    Quick Security Toggles
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <VulnToggle label="TLS Encryption" description="Encrypt all network traffic" defaultEnabled={true} />
                    <VulnToggle label="Rate Limiting" description="Limit requests per second" defaultEnabled={true} />
                    <VulnToggle label="PIN Policy" description="Block weak PIN patterns" defaultEnabled={true} />
                    <VulnToggle label="Audit Logging" description="Log all security events" defaultEnabled={true} />
                </div>
            </div>
        </div>
    );
}

function VulnToggle({ label, description, defaultEnabled }: { label: string; description: string; defaultEnabled: boolean }) {
    const [enabled, setEnabled] = useState(defaultEnabled);
    return (
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50">
            <div>
                <p className="font-medium text-white">{label}</p>
                <p className="text-xs text-slate-400">{description}</p>
            </div>
            <button
                onClick={() => setEnabled(!enabled)}
                className={`w-12 h-6 rounded-full transition-all ${enabled ? 'bg-green-500' : 'bg-red-500'}`}
            >
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-all ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>
    );
}

