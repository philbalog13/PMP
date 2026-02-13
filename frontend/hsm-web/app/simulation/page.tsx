'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw, Server } from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { getHsmStatus, HsmApiError, HsmStatus, updateHsmConfig } from '@/lib/hsm-api';

function statusColor(state: 'OPERATIONAL' | 'TAMPERED'): string {
    return state === 'OPERATIONAL' ? 'bg-emerald-500' : 'bg-red-500';
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

export default function SimulationPage() {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [busyAction, setBusyAction] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<HsmStatus | null>(null);

    const refresh = useCallback(async () => {
        setError(null);
        try {
            const response = await getHsmStatus(token);
            setStatus(response.status);
        } catch (caughtError) {
            const message = caughtError instanceof HsmApiError ? caughtError.message : 'Failed to load HSM status.';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const runAction = async (action: 'simulateTamper' | 'resetTamper') => {
        setBusyAction(true);
        setError(null);
        try {
            await updateHsmConfig({ [action]: true }, token);
            await refresh();
        } catch (caughtError) {
            const message = caughtError instanceof HsmApiError ? caughtError.message : 'Action failed.';
            setError(message);
        } finally {
            setBusyAction(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-500/10 rounded-xl border border-slate-500/20 text-slate-400">
                        <Server size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold font-heading text-white">Hardware Simulation</h1>
                        <p className="text-slate-400 text-sm">Live front panel status from hsm-simulator runtime.</p>
                    </div>
                </div>
                <button
                    onClick={() => void refresh()}
                    disabled={loading || busyAction}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition flex items-center gap-2 border border-white/5"
                >
                    {(loading || busyAction) ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
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
                    Loading runtime status...
                </div>
            ) : (
                <>
                    <div className="glass-card p-6 rounded-xl border border-white/10">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="text-xs uppercase tracking-wide text-slate-500">HSM State</div>
                                <div className="mt-2 flex items-center gap-3">
                                    <span className={`w-3 h-3 rounded-full ${statusColor(status?.state ?? 'TAMPERED')} shadow-[0_0_12px_rgba(16,185,129,0.4)]`} />
                                    <span className={`text-2xl font-bold ${status?.state === 'OPERATIONAL' ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {status?.state ?? 'UNKNOWN'}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right text-sm text-slate-400">
                                <div>Uptime: {formatDuration(status?.uptimeSec ?? 0)}</div>
                                <div>Keys: {status?.keysLoaded ?? 0}</div>
                                <div>Commands: {status?.commandCount ?? 0}</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="glass-card p-6 rounded-xl border border-white/10">
                            <h3 className="font-bold text-white mb-4">LED Panel</h3>
                            <div className="space-y-3">
                                {Object.entries(status?.leds ?? {}).map(([name, value]) => (
                                    <div key={name} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-white/5">
                                        <div className="text-sm font-semibold text-slate-200">{name}</div>
                                        <div className="text-xs font-mono text-slate-300">{value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="glass-card p-6 rounded-xl border border-white/10">
                            <h3 className="font-bold text-white mb-4">Tamper Control</h3>
                            <div className="space-y-3 text-sm text-slate-300">
                                <div className="p-3 rounded-lg bg-slate-950/40 border border-white/5">
                                    <div>Active: {status?.tamper.tampered ? 'yes' : 'no'}</div>
                                    <div>Reason: {status?.tamper.reason ?? 'none'}</div>
                                    <div>Monitoring: {status?.tamper.monitoring ? 'on' : 'off'}</div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <button
                                        onClick={() => void runAction('simulateTamper')}
                                        disabled={busyAction}
                                        className="px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition disabled:opacity-60"
                                    >
                                        Trigger Tamper
                                    </button>
                                    <button
                                        onClick={() => void runAction('resetTamper')}
                                        disabled={busyAction}
                                        className="px-4 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition disabled:opacity-60"
                                    >
                                        Reset Tamper
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-xl border border-white/10">
                        <h3 className="font-bold text-white mb-4">Last Command</h3>
                        {status?.lastCommand ? (
                            <div className="p-4 rounded-lg bg-slate-950/40 border border-white/5 text-sm text-slate-300 space-y-1 font-mono">
                                <div>Code: {status.lastCommand.code}</div>
                                <div>At: {status.lastCommand.at}</div>
                                <div>Duration: {status.lastCommand.durationMs} ms</div>
                                <div>Success: {status.lastCommand.success ? 'true' : 'false'}</div>
                                {status.lastCommand.error ? <div>Error: {status.lastCommand.error}</div> : null}
                            </div>
                        ) : (
                            <div className="text-slate-500 text-sm">No command has been executed yet.</div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
