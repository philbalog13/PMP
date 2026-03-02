'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Key,
    Search,
    Filter,
    Plus,
    RefreshCw,
    Download,
    Trash2,
    Lock,
    Eye,
    EyeOff,
    Loader2,
    Calculator,
    CheckCircle2,
    ShieldAlert
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { getHsmKeys, deleteHsmKey, calculateKcv, maskKeyValue, HsmKey } from '@/lib/hsm-api';

export default function KeysPage() {
    const { token } = useAuth();
    const [keys, setKeys] = useState<HsmKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [showValues, setShowValues] = useState<Record<string, boolean>>({});
    const [calculatedKcv, setCalculatedKcv] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState<Record<string, boolean>>({});

    const fetchKeys = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const data = await getHsmKeys(token);
            setKeys(data.keys || []);
        } catch (error) {
            console.error('Failed to fetch keys:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => {
        void fetchKeys();
    }, [fetchKeys]);

    const handleDestroy = async (label: string) => {
        if (!confirm(`Are you sure you want to permanently DESTROY key '${label}'? This action is irreversible.`)) {
            return;
        }

        setProcessing(prev => ({ ...prev, [label]: true }));
        try {
            const res = await deleteHsmKey(label, token);
            if (res.success) {
                setKeys(prev => prev.filter(k => k.label !== label));
            }
        } catch (error: any) {
            alert(`Failed to destroy key: ${error.message}`);
        } finally {
            setProcessing(prev => ({ ...prev, [label]: false }));
        }
    };

    const handleCalculateKcv = async (label: string) => {
        setProcessing(prev => ({ ...prev, [`kcv-${label}`]: true }));
        try {
            const res = await calculateKcv({ keyLabel: label }, token);
            if (res.success && res.kcv) {
                setCalculatedKcv(prev => ({ ...prev, [label]: res.kcv! }));
            }
        } catch (error: any) {
            alert(`Failed to calculate KCV: ${error.message}`);
        } finally {
            setProcessing(prev => ({ ...prev, [`kcv-${label}`]: false }));
        }
    };

    const toggleValue = (label: string) => {
        setShowValues(prev => ({ ...prev, [label]: !prev[label] }));
    };

    const filteredKeys = keys.filter(k => {
        const matchesSearch = k.label.toLowerCase().includes(search.toLowerCase());
        const matchesType = filterType === 'ALL' || k.type === filterType;
        return matchesSearch && matchesType;
    });

    const types = ['ALL', ...Array.from(new Set(keys.map(k => k.type)))];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-heading text-white">Key Management</h1>
                    <p className="text-slate-400 text-sm">Review, generate and manage HSM terminal keys.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => void fetchKeys(true)}
                        disabled={refreshing}
                        className="p-2.5 rounded-xl border border-white/5 bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
                    >
                        {refreshing ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-500/20">
                        <Plus size={18} /> Generate Key
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="grid md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search by label or check value..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition appearance-none"
                    >
                        {types.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition border border-white/5">
                    <Download size={18} /> Export List
                </button>
            </div>

            {/* Keys Table */}
            <div className="glass-card rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-900/80 border-b border-white/5">
                                <th className="px-6 py-4 font-semibold text-slate-400">Label</th>
                                <th className="px-6 py-4 font-semibold text-slate-400">Type</th>
                                <th className="px-6 py-4 font-semibold text-slate-400">Value</th>
                                <th className="px-6 py-4 font-semibold text-slate-400">KCV</th>
                                <th className="px-6 py-4 font-semibold text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && keys.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-24 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 size={32} className="text-blue-500 animate-spin" />
                                            <p className="font-medium">Accessing secure key store...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredKeys.length > 0 ? filteredKeys.map((key) => (
                                <tr key={key.label} className="group hover:bg-white/5 transition">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                                                <Key size={16} />
                                            </div>
                                            <span className="font-bold text-white">{key.label}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-white/5">
                                            {key.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-300">
                                                {showValues[key.label] ? key.value : maskKeyValue(key.value)}
                                            </span>
                                            <button
                                                onClick={() => toggleValue(key.label)}
                                                className="text-slate-600 hover:text-slate-400 transition"
                                            >
                                                {showValues[key.label] ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {calculatedKcv[key.label] ? (
                                            <div className="flex items-center gap-1.5 text-green-500 font-mono text-xs font-bold">
                                                <CheckCircle2 size={14} />
                                                {calculatedKcv[key.label]}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => void handleCalculateKcv(key.label)}
                                                disabled={processing[`kcv-${key.label}`]}
                                                className="flex items-center gap-1.5 text-slate-500 hover:text-blue-400 transition text-xs font-medium"
                                            >
                                                {processing[`kcv-${key.label}`] ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}
                                                Calculate
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                                            <button className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition">
                                                <Download size={16} />
                                            </button>
                                            <button
                                                onClick={() => void handleDestroy(key.label)}
                                                disabled={processing[key.label]}
                                                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition"
                                            >
                                                {processing[key.label] ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                                        {search ? `No keys matching "${search}"` : 'No keys in current security domain.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Security Warning */}
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-start gap-3">
                <ShieldAlert className="text-amber-500 shrink-0" size={20} />
                <p className="text-xs text-amber-500/80 leading-relaxed">
                    <strong>Notice:</strong> All key operations are audited. Avoid exporting clear-text components except for physical disaster recovery procedures.
                    Ensure terminal master keys are dual-controlled per PCI-DSS requirement 12.
                </p>
            </div>
        </div>
    );
}
