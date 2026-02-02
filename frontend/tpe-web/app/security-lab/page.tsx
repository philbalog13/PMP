'use client';

import Link from 'next/link';
import { AlertTriangle, ShieldOff, CreditCard, Lock, ChevronRight, Shield } from 'lucide-react';
import { useState } from 'react';

const scenarios = [
    { id: 'pan-harvesting', title: 'PAN Harvesting', description: 'Skimming card data from memory or magstripe', icon: CreditCard, severity: 'critical' as const, phases: ['Inject Skimmer', 'Capture PANs', 'Alert Detection', 'Memory Protection'] },
    { id: 'auth-bypass', title: 'EMV Auth Bypass', description: 'Bypass chip card authentication checks', icon: Lock, severity: 'high' as const, phases: ['Downgrade Attack', 'Bypass ARQC', 'Alert Detection', 'Enforce EMV'] },
];

export default function SecurityLabPage() {
    return (
        <div className="min-h-screen bg-slate-950 p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                        <AlertTriangle size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-orange-400">Security Lab</h1>
                        <p className="text-slate-400">Learn terminal attack vectors and defenses</p>
                    </div>
                </div>

                {/* Warning */}
                <div className="rounded-2xl p-6 border border-orange-500/30 bg-orange-950/20">
                    <div className="flex items-start gap-4">
                        <ShieldOff size={24} className="text-orange-400 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-bold text-white mb-1">⚠️ Educational Simulations Only</h3>
                            <p className="text-sm text-slate-400">These scenarios demonstrate real attack patterns. Never attempt on production systems.</p>
                        </div>
                    </div>
                </div>

                {/* Scenarios */}
                <div className="grid gap-6">
                    {scenarios.map((scenario) => (
                        <Link
                            key={scenario.id}
                            href={`/security-lab/${scenario.id}`}
                            className="group rounded-2xl p-6 border border-white/5 bg-slate-900/50 hover:border-orange-500/30 hover:bg-orange-950/10 transition-all"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 group-hover:bg-orange-500/20 transition">
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
                                    <ChevronRight size={24} className="text-slate-500 group-hover:text-orange-400 group-hover:translate-x-1 transition" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Quick Toggles */}
                <div className="rounded-2xl p-6 border border-white/5 bg-slate-900/30">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Shield size={20} className="text-green-400" />
                        Terminal Security Settings
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <SecurityToggle label="Memory Encryption" description="Encrypt PAN in RAM" />
                        <SecurityToggle label="EMV Enforcement" description="Reject magstripe for chip cards" />
                        <SecurityToggle label="PCI Audit Mode" description="Log all card operations" />
                        <SecurityToggle label="Tamper Detection" description="Monitor physical access" />
                    </div>
                </div>

                <Link href="/" className="inline-block text-slate-400 hover:text-white transition">
                    ← Back to Terminal
                </Link>
            </div>
        </div>
    );
}

function SecurityToggle({ label, description }: { label: string; description: string }) {
    const [enabled, setEnabled] = useState(true);
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
