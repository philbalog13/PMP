'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShieldAlert, Fingerprint, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { getHsmLogs } from '@/lib/hsm-api';

export default function SecurityPage() {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);

    const fetchLogs = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const response = await getHsmLogs(token);
            if (response.success) {
                setLogs(response.logs || []);
            }
        } catch (error) {
            console.error('Failed to fetch security logs:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => {
        void fetchLogs();
    }, [fetchLogs]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-red-500">
                        <ShieldAlert size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold font-heading text-white">Security & Audit logs</h1>
                        <p className="text-slate-400 text-sm">Monitor physical security and access attempts.</p>
                    </div>
                </div>
                <button
                    onClick={() => void fetchLogs(true)}
                    disabled={refreshing}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition flex items-center gap-2 border border-white/5"
                >
                    {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    Refresh
                </button>
            </div>

            <div className="glass-card rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h3 className="font-bold text-white">Security Audit Trail</h3>
                    <button className="text-xs bg-slate-800 text-white px-3 py-1 rounded">Export CSV</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-white/5 bg-slate-900/50">
                                <th className="px-6 py-3 font-semibold text-slate-400">Timestamp</th>
                                <th className="px-6 py-3 font-semibold text-slate-400">Level</th>
                                <th className="px-6 py-3 font-semibold text-slate-400">Description</th>
                                <th className="px-6 py-3 font-semibold text-slate-400">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                                        Fetching security logs...
                                    </td>
                                </tr>
                            ) : logs.length > 0 ? logs.map((log, i) => (
                                <tr key={i} className={`hover:bg-white/5 transition ${log.level === 'warn' || log.level === 'error' ? 'bg-red-500/5' : ''}`}>
                                    <td className="px-6 py-3 font-mono text-slate-500 text-xs">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`px-2 py-0.5 rounded text-xs border ${log.level === 'info' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                            {log.level?.toUpperCase() || 'INFO'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-white font-medium">{log.message}</td>
                                    <td className="px-6 py-3 text-slate-400 font-mono text-xs max-w-xs truncate">
                                        {log.ctf_flag ? `FLAG: ${log.ctf_flag}` : JSON.stringify(Object.fromEntries(Object.entries(log).filter(([k]) => !['timestamp', 'level', 'message', 'ctf_flag'].includes(k))))}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">
                                        No security events recorded.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
