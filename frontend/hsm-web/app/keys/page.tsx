'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Key,
    Loader2,
    MoreVertical,
    RefreshCw,
    Search,
    ShieldCheck,
    Trash2
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { calculateKcv, getHsmKeys, HsmApiError, HsmKey, maskKeyValue } from '@/lib/hsm-api';

type KcvMap = Record<string, string>;

export default function KeysPage() {
    const { token } = useAuth();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState('ALL');
    const [keys, setKeys] = useState<HsmKey[]>([]);
    const [kcvByLabel, setKcvByLabel] = useState<KcvMap>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastSync, setLastSync] = useState<string | null>(null);

    const fetchKeys = useCallback(
        async (isRefresh = false) => {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            try {
                const keysResponse = await getHsmKeys(token);
                const fetchedKeys = keysResponse.keys || [];
                setKeys(fetchedKeys);

                const kcvEntries = await Promise.allSettled(
                    fetchedKeys.map(async (key) => {
                        const response = await calculateKcv({ keyLabel: key.label }, token);
                        return [key.label, response.kcv || 'N/A'] as const;
                    })
                );

                const nextMap: KcvMap = {};
                for (const entry of kcvEntries) {
                    if (entry.status === 'fulfilled') {
                        const [label, kcv] = entry.value;
                        nextMap[label] = kcv;
                    }
                }

                setKcvByLabel(nextMap);
                setLastSync(new Date().toLocaleTimeString());
            } catch (caughtError) {
                const message =
                    caughtError instanceof HsmApiError
                        ? caughtError.message
                        : 'Impossible de charger les cles HSM.';
                setError(message);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [token]
    );

    useEffect(() => {
        void fetchKeys(false);
    }, [fetchKeys]);

    const availableTypes = useMemo(() => {
        const dynamicTypes = Array.from(new Set(keys.map((key) => key.type))).sort();
        return ['ALL', ...dynamicTypes];
    }, [keys]);

    const filteredKeys = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return keys.filter((key) => {
            const matchesType = selectedType === 'ALL' || key.type === selectedType;
            if (!term) {
                return matchesType;
            }

            const kcv = kcvByLabel[key.label] || '';
            const valuePreview = maskKeyValue(key.value).toLowerCase();
            const searchable = `${key.label} ${key.type} ${kcv} ${valuePreview}`.toLowerCase();
            return matchesType && searchable.includes(term);
        });
    }, [keys, kcvByLabel, searchTerm, selectedType]);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Key className="text-green-400" size={24} />
                        <h1 className="text-2xl font-bold font-heading text-white">Key Management</h1>
                    </div>
                    <p className="text-slate-400 text-sm">Inventaire reel des cles stockees dans le HSM simulateur.</p>
                </div>
                <div className="flex items-center gap-3">
                    {lastSync && (
                        <span className="px-3 py-1 rounded-full bg-slate-900 border border-white/10 text-xs text-slate-400">
                            Sync: {lastSync}
                        </span>
                    )}
                    <button
                        onClick={() => void fetchKeys(true)}
                        disabled={refreshing}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition flex items-center gap-2 border border-white/5"
                    >
                        {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        Refresh
                    </button>
                </div>
            </div>

            {!token && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200 text-sm">
                    Aucun token detecte. Le chargement des cles peut etre refuse par l&apos;API Gateway.
                </div>
            )}

            {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm inline-flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            <div className="glass-card p-4 rounded-xl flex flex-wrap gap-4 justify-between items-center">
                <div className="flex flex-wrap gap-2">
                    {availableTypes.map((type) => (
                        <button
                            key={type}
                            onClick={() => setSelectedType(type)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selectedType === type
                                ? 'bg-green-500 text-white'
                                : 'bg-slate-900/50 text-slate-400 hover:bg-slate-900 hover:text-white'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by label, type, KCV..."
                        className="pl-9 pr-4 py-2 rounded-lg bg-slate-950/50 border border-white/10 text-sm text-white focus:outline-none focus:border-green-500/50 w-72 max-w-full"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />
                </div>
            </div>

            <div className="glass-card rounded-xl overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-400 inline-flex items-center justify-center w-full gap-2">
                        <Loader2 size={18} className="animate-spin" />
                        Loading keys...
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/5">
                                    <th className="px-6 py-4 font-semibold text-slate-300">Label</th>
                                    <th className="px-6 py-4 font-semibold text-slate-300">Type</th>
                                    <th className="px-6 py-4 font-semibold text-slate-300">Masked Value</th>
                                    <th className="px-6 py-4 font-semibold text-slate-300">KCV</th>
                                    <th className="px-6 py-4 font-semibold text-slate-300">Status</th>
                                    <th className="px-6 py-4 text-right font-semibold text-slate-300">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredKeys.map((key) => (
                                    <tr key={key.label} className="hover:bg-white/5 transition group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded bg-slate-900 border border-white/5 text-slate-400">
                                                    <Key size={16} />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-white">{key.label}</div>
                                                    <div className="text-xs text-slate-500 font-mono">HSM Slot</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded text-xs font-bold border bg-indigo-500/10 text-indigo-300 border-indigo-500/20">
                                                {key.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-300 font-mono text-xs">
                                            {maskKeyValue(key.value)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-xs bg-slate-950 px-2 py-1 rounded border border-white/5 text-green-400">
                                                {kcvByLabel[key.label] || '...'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                                                <ShieldCheck size={12} />
                                                ACTIVE
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                                                <button className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white" title="Details">
                                                    <MoreVertical size={16} />
                                                </button>
                                                <button className="p-1.5 hover:bg-red-500/10 rounded text-slate-400 hover:text-red-400" title="Destroy">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && filteredKeys.length === 0 && (
                    <div className="p-12 text-center text-slate-500">
                        No keys found matching your filters.
                    </div>
                )}
            </div>
        </div>
    );
}
