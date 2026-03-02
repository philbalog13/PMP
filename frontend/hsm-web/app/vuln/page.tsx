'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Activity,
    Shield,
    Lock,
    Zap,
    ChevronRight,
    Wifi,
    Key,
    ShieldAlert,
    Loader2
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { getHsmConfig, updateHsmConfig, VulnerabilityConfig } from '@/lib/hsm-api';

const scenarios = [
    {
        id: 'mitm',
        title: 'Man-in-the-Middle',
        description: 'Intercept and modify PIN blocks in transit between terminal and host.',
        icon: Wifi,
        severity: 'Critical',
        status: 'Active'
    },
    {
        id: 'weak-pin',
        title: 'Weak PIN Attack',
        description: 'Brute-force attack against common PIN patterns like 1234 or 0000.',
        icon: Key,
        severity: 'High',
        status: 'Active'
    },
    {
        id: 'dos',
        title: 'Denial of Service',
        description: 'Flood the payment network with 10k requests/sec to crash the HSM.',
        icon: Zap,
        severity: 'Medium',
        status: 'Active'
    }
];

export default function VulnLab() {
    const { token } = useAuth();
    const [config, setConfig] = useState<VulnerabilityConfig | null>(null);
    const [updating, setUpdating] = useState<string | null>(null);

    const fetchConfig = useCallback(async () => {
        try {
            const res = await getHsmConfig(token);
            if (res.success) setConfig(res.vulnerabilities);
        } catch (error) {
            console.error('Failed to fetch vuln config:', error);
        }
    }, [token]);

    useEffect(() => {
        void fetchConfig();
    }, [fetchConfig]);

    const handleToggle = async (field: keyof VulnerabilityConfig, label: string) => {
        if (!config) return;
        setUpdating(label);
        try {
            // UI Toggle ON = Security ENABLED = Vulnerability DISABLED (false)
            const newVal = !config[field];
            const res = await updateHsmConfig({
                vulnerabilities: { [field]: newVal }
            }, token);
            if (res.success) {
                setConfig(res.vulnerabilities);
            }
        } catch (error) {
            console.error(`Failed to update ${label}:`, error);
        } finally {
            setUpdating(null);
        }
    };

    const VulnToggle = ({ label, icon: Icon, active, field }: { label: string, icon: any, active: boolean, field: keyof VulnerabilityConfig }) => (
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-white/5">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    <Icon size={18} />
                </div>
                <span className="text-sm font-medium text-white">{label}</span>
            </div>
            <button
                onClick={() => void handleToggle(field, label)}
                disabled={!!updating}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${active ? 'bg-green-600' : 'bg-slate-700'}`}
            >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
                {updating === label && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                        <Loader2 size={12} className="animate-spin text-white" />
                    </div>
                )}
            </button>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Vulnerability Lab</h1>
                    <p className="text-slate-400 mt-1">Simulate real-world attacks and test your defenses.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20">
                    <ShieldAlert size={18} />
                    <span className="text-sm font-bold animate-pulse">ATTACK SURFACE: ACTIVE</span>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Attack Scenarios */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Activity size={18} className="text-blue-400" />
                        Attack Scenarios
                    </h2>
                    <div className="grid md:grid-cols-1 gap-4">
                        {scenarios.map((scenario) => (
                            <Link
                                key={scenario.id}
                                href={`/vuln/${scenario.id}`}
                                className="group glass-card p-6 rounded-2xl flex items-center justify-between hover:border-red-500/30 transition shadow-lg"
                            >
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center text-slate-400 group-hover:bg-red-500/10 group-hover:text-red-400 transition transform group-hover:scale-110">
                                        <scenario.icon size={28} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-bold text-white text-lg">{scenario.title}</h3>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${scenario.severity === 'Critical' ? 'bg-red-500/20 text-red-500' :
                                                scenario.severity === 'High' ? 'bg-orange-500/20 text-orange-400' : 'bg-amber-500/20 text-amber-500'
                                                }`}>
                                                {scenario.severity}
                                            </span>
                                        </div>
                                        <p className="text-slate-400 text-sm">{scenario.description}</p>
                                    </div>
                                </div>
                                <ChevronRight className="text-slate-600 group-hover:text-white transition group-hover:translate-x-1" />
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Security Toggles */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Shield size={18} className="text-green-400" />
                        Quick Defense
                    </h2>
                    <div className="glass-card p-6 rounded-2xl space-y-4">
                        <VulnToggle
                            label="TLS Encryption"
                            icon={Lock}
                            active={config ? !config.verboseErrors : true}
                            field="verboseErrors"
                        />
                        <VulnToggle
                            label="Rate Limiting"
                            icon={Activity}
                            active={config ? !config.simulateDown : true}
                            field="simulateDown"
                        />
                        <VulnToggle
                            label="PIN Hardening"
                            icon={Lock}
                            active={config ? !config.weakKeysEnabled : true}
                            field="weakKeysEnabled"
                        />
                        <VulnToggle
                            label="Sanitized Logging"
                            icon={Shield}
                            active={config ? !config.keyLeakInLogs : true}
                            field="keyLeakInLogs"
                        />
                        <div className="pt-4 border-t border-white/5">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest text-center">
                                Defense-in-Depth Layer v2.1
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
