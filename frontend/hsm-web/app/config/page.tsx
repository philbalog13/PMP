'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw, Settings, ShieldAlert } from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import {
    getHsmConfig,
    HsmApiError,
    HsmStatus,
    updateHsmConfig,
    VulnerabilityConfig,
} from '@/lib/hsm-api';

const VULN_FIELDS: Array<{
    key: keyof VulnerabilityConfig;
    label: string;
    description: string;
}> = [
    {
        key: 'allowReplay',
        label: 'Allow Replay',
        description: 'Disables replay protections in educational scenarios.',
    },
    {
        key: 'weakKeysEnabled',
        label: 'Weak Keys',
        description: 'Allows weak cryptographic keys for workshop demonstrations.',
    },
    {
        key: 'verboseErrors',
        label: 'Verbose Errors',
        description: 'Exposes detailed internal errors (unsafe in production).',
    },
    {
        key: 'keyLeakInLogs',
        label: 'Key Leak In Logs',
        description: 'Simulates sensitive data leakage in logs.',
    },
];

function toDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

export default function ConfigPage() {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [vulnerabilities, setVulnerabilities] = useState<VulnerabilityConfig | null>(null);
    const [status, setStatus] = useState<HsmStatus | null>(null);

    const fetchConfig = useCallback(async () => {
        setError(null);
        try {
            const response = await getHsmConfig(token);
            setVulnerabilities(response.vulnerabilities);
            setStatus(response.status);
        } catch (caughtError) {
            const message = caughtError instanceof HsmApiError ? caughtError.message : 'Failed to load HSM config.';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        void fetchConfig();
    }, [fetchConfig]);

    const patchConfig = async (payload: Parameters<typeof updateHsmConfig>[0]) => {
        setSaving(true);
        setError(null);
        try {
            const response = await updateHsmConfig(payload, token);
            setVulnerabilities(response.vulnerabilities);
            setStatus(response.status);
        } catch (caughtError) {
            const message = caughtError instanceof HsmApiError ? caughtError.message : 'Failed to apply config.';
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    const toggleVulnerability = async (key: keyof VulnerabilityConfig) => {
        if (!vulnerabilities) return;
        await patchConfig({
            vulnerabilities: {
                [key]: !vulnerabilities[key],
            },
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-700/30 rounded-xl border border-white/10 text-slate-300">
                        <Settings size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold font-heading text-white">HSM Configuration</h1>
                        <p className="text-slate-400 text-sm">Runtime security controls and tamper actions.</p>
                    </div>
                </div>
                <button
                    onClick={() => void fetchConfig()}
                    disabled={loading || saving}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition flex items-center gap-2 border border-white/5"
                >
                    {(loading || saving) ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    Refresh
                </button>
            </div>

            {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm inline-flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {loading ? (
                <div className="glass-card p-8 rounded-xl text-slate-400 inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Loading HSM configuration...
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="glass-card p-5 rounded-xl border border-white/10">
                            <div className="text-xs text-slate-500 uppercase tracking-wide">State</div>
                            <div className={`mt-2 text-xl font-bold ${status?.state === 'OPERATIONAL' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {status?.state ?? 'UNKNOWN'}
                            </div>
                        </div>
                        <div className="glass-card p-5 rounded-xl border border-white/10">
                            <div className="text-xs text-slate-500 uppercase tracking-wide">Keys Loaded</div>
                            <div className="mt-2 text-xl font-bold text-white">{status?.keysLoaded ?? 0}</div>
                        </div>
                        <div className="glass-card p-5 rounded-xl border border-white/10">
                            <div className="text-xs text-slate-500 uppercase tracking-wide">Uptime</div>
                            <div className="mt-2 text-xl font-bold text-white">{toDuration(status?.uptimeSec ?? 0)}</div>
                        </div>
                    </div>

                    <div className="glass-card rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/5 bg-white/5">
                            <h3 className="font-bold text-white">Vulnerability Lab Flags</h3>
                            <p className="text-xs text-slate-400 mt-1">These flags are for simulation/training only.</p>
                        </div>
                        <div className="p-5 space-y-3">
                            {VULN_FIELDS.map((field) => {
                                const enabled = vulnerabilities ? vulnerabilities[field.key] : false;
                                return (
                                    <div key={field.key} className="flex items-center justify-between gap-4 p-3 rounded-lg border border-white/5 bg-slate-950/40">
                                        <div>
                                            <div className="text-sm font-semibold text-white">{field.label}</div>
                                            <div className="text-xs text-slate-400">{field.description}</div>
                                        </div>
                                        <button
                                            onClick={() => void toggleVulnerability(field.key)}
                                            disabled={saving}
                                            className={`px-3 py-1.5 rounded text-xs font-bold border transition ${enabled
                                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                                                }`}
                                        >
                                            {enabled ? 'ENABLED' : 'DISABLED'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                            onClick={() => void patchConfig({ simulateTamper: true })}
                            disabled={saving}
                            className="glass-card p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition text-left"
                        >
                            <div className="font-bold flex items-center gap-2">
                                <ShieldAlert size={16} />
                                Trigger Tamper
                            </div>
                            <div className="text-xs mt-1 text-red-200/80">Zeroizes keys and halts cryptographic operations.</div>
                        </button>

                        <button
                            onClick={() => void patchConfig({ resetTamper: true })}
                            disabled={saving}
                            className="glass-card p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition text-left"
                        >
                            <div className="font-bold">Reset Tamper</div>
                            <div className="text-xs mt-1 text-emerald-200/80">Recovers service from tamper mode.</div>
                        </button>

                        <button
                            onClick={() => void patchConfig({ reloadKeys: true })}
                            disabled={saving}
                            className="glass-card p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition text-left"
                        >
                            <div className="font-bold">Reload Default Keys</div>
                            <div className="text-xs mt-1 text-blue-200/80">Loads bootstrap keys from config/env.</div>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
