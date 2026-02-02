'use client';

import { useState, useEffect } from 'react';
import { Brain, AlertTriangle, CheckCircle, TrendingUp, Activity, Zap, RefreshCw, Play, Pause } from 'lucide-react';

interface Transaction {
    id: string;
    amount: number;
    merchant: string;
    location: string;
    time: string;
    riskScore: number;
    status: 'approved' | 'declined' | 'review';
    flags: string[];
}

const mockTransactions: Transaction[] = [
    { id: 'TXN001', amount: 25.99, merchant: 'Coffee Shop', location: 'Paris, FR', time: '09:15', riskScore: 12, status: 'approved', flags: [] },
    { id: 'TXN002', amount: 3499.00, merchant: 'Electronics Store', location: 'Lagos, NG', time: '09:18', riskScore: 87, status: 'declined', flags: ['High Amount', 'Unusual Location'] },
    { id: 'TXN003', amount: 149.99, merchant: 'Online Retailer', location: 'London, UK', time: '09:22', riskScore: 45, status: 'review', flags: ['New Merchant'] },
    { id: 'TXN004', amount: 12.50, merchant: 'Grocery Store', location: 'Paris, FR', time: '09:25', riskScore: 5, status: 'approved', flags: [] },
    { id: 'TXN005', amount: 999.00, merchant: 'Crypto Exchange', location: 'Unknown', time: '09:28', riskScore: 92, status: 'declined', flags: ['High Risk Category', 'Velocity'] },
];

export default function AIFraudPage() {
    const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
    const [isLive, setIsLive] = useState(false);
    const [stats, setStats] = useState({ total: 5, approved: 2, declined: 2, review: 1 });
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

    useEffect(() => {
        if (!isLive) return;
        const interval = setInterval(() => {
            const newTx: Transaction = {
                id: `TXN${String(transactions.length + 1).padStart(3, '0')}`,
                amount: Math.floor(Math.random() * 500) + 10,
                merchant: ['Coffee Shop', 'Gas Station', 'Online Store', 'Restaurant', 'ATM'][Math.floor(Math.random() * 5)],
                location: ['Paris, FR', 'London, UK', 'Berlin, DE', 'Lagos, NG', 'Unknown'][Math.floor(Math.random() * 5)],
                time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                riskScore: Math.floor(Math.random() * 100),
                status: 'review',
                flags: Math.random() > 0.7 ? ['Velocity', 'New Device'] : []
            };
            newTx.status = newTx.riskScore < 30 ? 'approved' : newTx.riskScore > 70 ? 'declined' : 'review';
            setTransactions(prev => [newTx, ...prev].slice(0, 20));
            setStats(prev => ({
                total: prev.total + 1,
                approved: prev.approved + (newTx.status === 'approved' ? 1 : 0),
                declined: prev.declined + (newTx.status === 'declined' ? 1 : 0),
                review: prev.review + (newTx.status === 'review' ? 1 : 0),
            }));
        }, 3000);
        return () => clearInterval(interval);
    }, [isLive, transactions.length]);

    return (
        <div className="min-h-screen bg-slate-950 p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                            <Brain size={32} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-cyan-400">AI Fraud Detection</h1>
                            <p className="text-slate-400">Real-time ML-powered transaction analysis</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsLive(!isLive)}
                        className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition ${isLive ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-green-600 hover:bg-green-500 text-white'}`}
                    >
                        {isLive ? <><Pause size={18} /> Stop Live</> : <><Play size={18} /> Start Live</>}
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl border border-white/5 bg-slate-900/50 text-center">
                        <p className="text-3xl font-bold text-white">{stats.total}</p>
                        <p className="text-sm text-slate-400">Total</p>
                    </div>
                    <div className="p-4 rounded-xl border border-green-500/20 bg-green-500/5 text-center">
                        <p className="text-3xl font-bold text-green-400">{stats.approved}</p>
                        <p className="text-sm text-slate-400">Approved</p>
                    </div>
                    <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-center">
                        <p className="text-3xl font-bold text-red-400">{stats.declined}</p>
                        <p className="text-sm text-slate-400">Declined</p>
                    </div>
                    <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center">
                        <p className="text-3xl font-bold text-amber-400">{stats.review}</p>
                        <p className="text-sm text-slate-400">Review</p>
                    </div>
                </div>

                {/* Transaction Feed */}
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 p-6 rounded-2xl border border-white/5 bg-slate-900/50">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-white">Transaction Feed</h3>
                            {isLive && <span className="flex items-center gap-2 text-green-400 text-sm"><Activity size={14} className="animate-pulse" /> Live</span>}
                        </div>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {transactions.map(tx => (
                                <div
                                    key={tx.id}
                                    onClick={() => setSelectedTx(tx)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] ${tx.status === 'approved' ? 'border-green-500/20 bg-green-500/5' : tx.status === 'declined' ? 'border-red-500/20 bg-red-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-white">{tx.merchant}</p>
                                            <p className="text-xs text-slate-400">{tx.location} • {tx.time}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-white">€{tx.amount.toFixed(2)}</p>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold uppercase ${tx.status === 'approved' ? 'text-green-400' : tx.status === 'declined' ? 'text-red-400' : 'text-amber-400'}`}>{tx.status}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded ${tx.riskScore < 30 ? 'bg-green-500/20 text-green-400' : tx.riskScore > 70 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{tx.riskScore}%</span>
                                            </div>
                                        </div>
                                    </div>
                                    {tx.flags.length > 0 && (
                                        <div className="mt-2 flex gap-2">
                                            {tx.flags.map((flag, idx) => (
                                                <span key={idx} className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/20">{flag}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Detail Panel */}
                    <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/50">
                        <h3 className="font-bold text-white mb-4">Risk Analysis</h3>
                        {selectedTx ? (
                            <div className="space-y-4">
                                <div className="text-center">
                                    <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center text-3xl font-bold ${selectedTx.riskScore < 30 ? 'bg-green-500/20 text-green-400' : selectedTx.riskScore > 70 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                        {selectedTx.riskScore}
                                    </div>
                                    <p className="text-sm text-slate-400 mt-2">Risk Score</p>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-slate-400">ID:</span><span className="text-white font-mono">{selectedTx.id}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Amount:</span><span className="text-white">€{selectedTx.amount.toFixed(2)}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Merchant:</span><span className="text-white">{selectedTx.merchant}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Location:</span><span className="text-white">{selectedTx.location}</span></div>
                                </div>
                                {selectedTx.flags.length > 0 && (
                                    <div className="pt-4 border-t border-white/5">
                                        <p className="text-sm text-slate-400 mb-2">Risk Flags:</p>
                                        {selectedTx.flags.map((flag, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-red-400 text-sm"><AlertTriangle size={14} /> {flag}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-center">Select a transaction to view details</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
