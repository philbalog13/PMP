'use client';
import { useState, useEffect } from 'react';
import { Key, RefreshCw, Trash2, Plus, Lock } from 'lucide-react';

interface KeyData {
    label: string;
    type: string;
    scheme: string;
    checkValue: string;
}

export default function KeysPage() {
    const [keys, setKeys] = useState<KeyData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://localhost:8011/hsm/keys')
            .then(res => res.json())
            .then(data => {
                setKeys(data.keys || []);
                setLoading(false);
            })
            .catch(() => {
                // Fallback mock data for demo
                setKeys([
                    { label: 'LMK', type: 'Master', scheme: 'T', checkValue: 'A1B2C3' },
                    { label: 'ZPK', type: 'Zone PIN', scheme: 'T', checkValue: 'D4E5F6' },
                    { label: 'CVK', type: 'Card Verification', scheme: 'T', checkValue: '789ABC' },
                ]);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="animate-spin text-green-400" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <Key size={28} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white font-heading">Key Management</h1>
                        <p className="text-slate-400">Cryptographic key inventory</p>
                    </div>
                </div>
                <button className="bg-green-600 hover:bg-green-500 text-white px-5 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-green-500/20">
                    <Plus size={18} /> Generate Key
                </button>
            </div>

            {/* Keys Table */}
            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Label</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Scheme</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">KCV</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {keys.map((k) => (
                                <tr key={k.label} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                                <Lock size={14} className="text-blue-400" />
                                            </div>
                                            <span className="font-mono font-semibold text-white">{k.label}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-300">{k.type}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${k.scheme === 'T' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                            {k.scheme === 'T' ? 'Triple DES' : 'Single DES'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-blue-400">{k.checkValue}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
