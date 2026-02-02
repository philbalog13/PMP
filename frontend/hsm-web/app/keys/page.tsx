'use client';

import { useState } from 'react';
import {
    Key,
    Search,
    Plus,
    Download,
    Trash2,
    RefreshCw,
    MoreVertical,
    Lock,
    Unlock
} from 'lucide-react';

const mockKeys = [
    { id: 'KEY-001', label: 'LMK-TEST-01', type: 'LMK', algorithm: 'AES-256', kcv: 'A1B2C3', status: 'active', expiry: '2028-01-01' },
    { id: 'KEY-002', label: 'ZMK-BNP-PARIS', type: 'ZMK', algorithm: '3DES', kcv: 'F9E8D7', status: 'active', expiry: '2024-12-31' },
    { id: 'KEY-003', label: 'TMK-STORE-001', type: 'TMK', algorithm: '3DES', kcv: '123456', status: 'active', expiry: '2025-06-15' },
    { id: 'KEY-004', label: 'PVK-VISA-DEBIT', type: 'PVK', algorithm: '3DES', kcv: '987654', status: 'active', expiry: '2026-03-20' },
    { id: 'KEY-005', label: 'CVK-MASTERCARD-A', type: 'CVK', algorithm: '3DES', kcv: 'ABCDEF', status: 'rotated', expiry: '2023-12-31' },
    { id: 'KEY-006', label: 'ZPK-NET-01', type: 'ZPK', algorithm: 'AES-128', kcv: '556677', status: 'active', expiry: '2025-01-01' },
];

export default function KeysPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState('ALL');

    const filteredKeys = mockKeys.filter(key =>
        (selectedType === 'ALL' || key.type === selectedType) &&
        (key.label.toLowerCase().includes(searchTerm.toLowerCase()) || key.kcv.includes(searchTerm))
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Key className="text-green-500" size={24} />
                        <h1 className="text-2xl font-bold font-heading text-white">Key Management</h1>
                    </div>
                    <p className="text-slate-400 text-sm">Manage LMK, ZMK, and data encryption keys securely.</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition flex items-center gap-2 border border-white/5">
                        <Download size={16} /> Import
                    </button>
                    <button className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-lg transition flex items-center gap-2 shadow-lg shadow-green-500/20">
                        <Plus size={16} /> Generate Key
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="glass-card p-4 rounded-xl flex flex-wrap gap-4 justify-between items-center">
                <div className="flex gap-2">
                    {['ALL', 'LMK', 'ZMK', 'TMK', 'PVK'].map(type => (
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
                        placeholder="Search by Label or KCV..."
                        className="pl-9 pr-4 py-2 rounded-lg bg-slate-950/50 border border-white/10 text-sm text-white focus:outline-none focus:border-green-500/50 w-64"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Keys Table */}
            <div className="glass-card rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/5">
                            <th className="px-6 py-4 font-semibold text-slate-300">Label / Name</th>
                            <th className="px-6 py-4 font-semibold text-slate-300">Type</th>
                            <th className="px-6 py-4 font-semibold text-slate-300">Algorithm</th>
                            <th className="px-6 py-4 font-semibold text-slate-300">KCV (Check Value)</th>
                            <th className="px-6 py-4 font-semibold text-slate-300">Expiry</th>
                            <th className="px-6 py-4 font-semibold text-slate-300">Status</th>
                            <th className="px-6 py-4 text-right font-semibold text-slate-300">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredKeys.map(key => (
                            <tr key={key.id} className="hover:bg-white/5 transition group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded bg-slate-900 border border-white/5 text-slate-400">
                                            <Key size={16} />
                                        </div>
                                        <div>
                                            <div className="font-medium text-white">{key.label}</div>
                                            <div className="text-xs text-slate-500 font-mono">{key.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold border ${key.type === 'LMK' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                            key.type === 'ZMK' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                'bg-slate-700/30 text-slate-300 border-slate-600/30'
                                        }`}>
                                        {key.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                                    {key.algorithm}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-mono text-xs bg-slate-950 px-2 py-1 rounded border border-white/5 text-green-400">
                                        {key.kcv}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-400">
                                    {key.expiry}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${key.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${key.status === 'active' ? 'bg-green-500' : 'bg-amber-500'}`} />
                                        {key.status.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                                        <button className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white" title="Rotate">
                                            <RefreshCw size={16} />
                                        </button>
                                        <button className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white" title="Export">
                                            <Lock size={16} />
                                        </button>
                                        <button className="p-1.5 hover:bg-red-500/10 rounded text-slate-400 hover:text-red-500" title="Destroy">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredKeys.length === 0 && (
                    <div className="p-12 text-center text-slate-500">
                        No keys found matching your search.
                    </div>
                )}
            </div>
        </div>
    );
}
