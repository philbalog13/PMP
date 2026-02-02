'use client';

import { useState } from 'react';
import { Hash, CreditCard, RefreshCw, Copy, CheckCircle, Shield, Eye, EyeOff, ArrowRightLeft } from 'lucide-react';

export default function TokenizationPage() {
    const [pan, setPan] = useState('4111111111111111');
    const [token, setToken] = useState('');
    const [detokenizedPan, setDetokenizedPan] = useState('');
    const [isTokenizing, setIsTokenizing] = useState(false);
    const [isDetokenizing, setIsDetokenizing] = useState(false);
    const [showPan, setShowPan] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const generateToken = () => {
        setIsTokenizing(true);
        setLogs(l => [...l, `[TOKENIZE] Input PAN: ${pan.slice(0, 6)}******${pan.slice(-4)}`]);

        setTimeout(() => {
            // Simulate format-preserving tokenization
            const tokenValue = 'TKN' + Math.random().toString(36).substring(2, 10).toUpperCase() + pan.slice(-4);
            setToken(tokenValue);
            setLogs(l => [...l, `[TOKENIZE] Generated token: ${tokenValue}`]);
            setLogs(l => [...l, `[VAULT] Token stored in secure vault`]);
            setIsTokenizing(false);
        }, 1500);
    };

    const detokenize = () => {
        if (!token) return;
        setIsDetokenizing(true);
        setLogs(l => [...l, `[DETOKENIZE] Request for token: ${token}`]);

        setTimeout(() => {
            setDetokenizedPan(pan);
            setLogs(l => [...l, `[VAULT] Token found, retrieving PAN`]);
            setLogs(l => [...l, `[DETOKENIZE] PAN retrieved: ${pan.slice(0, 6)}******${pan.slice(-4)}`]);
            setIsDetokenizing(false);
        }, 1200);
    };

    const copyToken = () => {
        navigator.clipboard.writeText(token);
        setLogs(l => [...l, `[COPY] Token copied to clipboard`]);
    };

    return (
        <div className="min-h-screen bg-slate-950 p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <Hash size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-purple-400">Tokenization Service</h1>
                        <p className="text-slate-400">PCI-DSS compliant card data vault</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Tokenize Panel */}
                    <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/50 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-white text-lg flex items-center gap-2"><CreditCard size={20} className="text-purple-400" /> Tokenize PAN</h3>
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Primary Account Number</label>
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-800 border border-white/5">
                                <input
                                    type={showPan ? 'text' : 'password'}
                                    value={pan}
                                    onChange={(e) => setPan(e.target.value)}
                                    className="flex-1 bg-transparent text-white outline-none font-mono"
                                    maxLength={16}
                                />
                                <button onClick={() => setShowPan(!showPan)} className="text-slate-500 hover:text-white transition">
                                    {showPan ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={generateToken}
                            disabled={isTokenizing || pan.length < 15}
                            className="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
                        >
                            {isTokenizing ? <><RefreshCw size={18} className="animate-spin" /> Tokenizing...</> : <><Hash size={18} /> Generate Token</>}
                        </button>

                        {token && (
                            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-400">Generated Token:</span>
                                    <button onClick={copyToken} className="text-purple-400 hover:text-purple-300 transition"><Copy size={16} /></button>
                                </div>
                                <p className="font-mono text-lg text-purple-400 mt-2">{token}</p>
                            </div>
                        )}
                    </div>

                    {/* Detokenize Panel */}
                    <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/50 space-y-6">
                        <h3 className="font-bold text-white text-lg flex items-center gap-2"><ArrowRightLeft size={20} className="text-green-400" /> Detokenize</h3>

                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Token</label>
                            <input
                                type="text"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                placeholder="Enter or generate a token"
                                className="w-full p-3 rounded-xl bg-slate-800 border border-white/5 text-white outline-none font-mono"
                            />
                        </div>

                        <button
                            onClick={detokenize}
                            disabled={isDetokenizing || !token}
                            className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
                        >
                            {isDetokenizing ? <><RefreshCw size={18} className="animate-spin" /> Retrieving...</> : <><Shield size={18} /> Retrieve PAN</>}
                        </button>

                        {detokenizedPan && (
                            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                                <span className="text-sm text-slate-400">Original PAN:</span>
                                <p className="font-mono text-lg text-green-400 mt-2">{detokenizedPan.slice(0, 6)}******{detokenizedPan.slice(-4)}</p>
                                <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
                                    <CheckCircle size={14} /> PCI-DSS audit logged
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Activity Log */}
                <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/50">
                    <h3 className="font-bold text-white mb-4">Vault Activity Log</h3>
                    <div className="h-40 overflow-y-auto space-y-1 font-mono text-sm">
                        {logs.length === 0 ? (
                            <p className="text-slate-500">No activity yet.</p>
                        ) : logs.map((log, idx) => (
                            <div key={idx} className={`${log.includes('TOKENIZE') ? 'text-purple-400' : log.includes('DETOKENIZE') ? 'text-green-400' : log.includes('VAULT') ? 'text-amber-400' : 'text-slate-400'}`}>
                                {log}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-white/5 bg-slate-900/30">
                        <h4 className="font-bold text-white mb-2">Format Preserving</h4>
                        <p className="text-sm text-slate-400">Tokens maintain PAN format for legacy system compatibility.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-white/5 bg-slate-900/30">
                        <h4 className="font-bold text-white mb-2">PCI-DSS Compliant</h4>
                        <p className="text-sm text-slate-400">Reduces scope by removing raw PAN from systems.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-white/5 bg-slate-900/30">
                        <h4 className="font-bold text-white mb-2">Secure Vault</h4>
                        <p className="text-sm text-slate-400">HSM-protected storage with audit logging.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
