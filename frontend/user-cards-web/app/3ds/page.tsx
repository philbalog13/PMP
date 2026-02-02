'use client';

import { useState } from 'react';
import { Shield, CheckCircle, XCircle, AlertTriangle, Smartphone, CreditCard, Lock, Eye, EyeOff, RefreshCw } from 'lucide-react';

interface ThreeDSResult {
    status: 'frictionless' | 'challenge' | 'failed';
    riskScore: number;
    recommendation: string;
    transId: string;
}

export default function ThreeDSPage() {
    const [cardNumber, setCardNumber] = useState('4111111111111111');
    const [amount, setAmount] = useState('99.99');
    const [merchant, setMerchant] = useState('FINED-SIM Store');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showChallenge, setShowChallenge] = useState(false);
    const [otp, setOtp] = useState('');
    const [result, setResult] = useState<ThreeDSResult | null>(null);

    const runAuthentication = () => {
        setIsProcessing(true);
        setResult(null);
        setShowChallenge(false);

        setTimeout(() => {
            const riskScore = Math.floor(Math.random() * 100);
            if (riskScore < 30) {
                // Frictionless
                setResult({
                    status: 'frictionless',
                    riskScore,
                    recommendation: 'Low risk - Frictionless authentication approved',
                    transId: `3DS-${Date.now()}`
                });
                setIsProcessing(false);
            } else if (riskScore < 80) {
                // Challenge required
                setShowChallenge(true);
                setIsProcessing(false);
            } else {
                // Failed
                setResult({
                    status: 'failed',
                    riskScore,
                    recommendation: 'High risk - Transaction declined',
                    transId: `3DS-${Date.now()}`
                });
                setIsProcessing(false);
            }
        }, 2000);
    };

    const submitChallenge = () => {
        setIsProcessing(true);
        setTimeout(() => {
            if (otp === '123456') {
                setResult({
                    status: 'challenge',
                    riskScore: 55,
                    recommendation: 'Challenge completed - Authentication successful',
                    transId: `3DS-${Date.now()}`
                });
            } else {
                setResult({
                    status: 'failed',
                    riskScore: 55,
                    recommendation: 'Challenge failed - Invalid OTP',
                    transId: `3DS-${Date.now()}`
                });
            }
            setShowChallenge(false);
            setIsProcessing(false);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-slate-950 p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <Shield size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-blue-400">3D-Secure 2.0 Simulator</h1>
                        <p className="text-slate-400">EMV 3DS Authentication Flow</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Input Panel */}
                    <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/50 space-y-6">
                        <h3 className="font-bold text-white text-lg">Transaction Details</h3>

                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Card Number</label>
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-800 border border-white/5">
                                <CreditCard size={18} className="text-slate-500" />
                                <input
                                    type="text"
                                    value={cardNumber}
                                    onChange={(e) => setCardNumber(e.target.value)}
                                    className="flex-1 bg-transparent text-white outline-none font-mono"
                                    maxLength={16}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Amount (EUR)</label>
                            <input
                                type="text"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full p-3 rounded-xl bg-slate-800 border border-white/5 text-white outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Merchant</label>
                            <input
                                type="text"
                                value={merchant}
                                onChange={(e) => setMerchant(e.target.value)}
                                className="w-full p-3 rounded-xl bg-slate-800 border border-white/5 text-white outline-none"
                            />
                        </div>

                        <button
                            onClick={runAuthentication}
                            disabled={isProcessing}
                            className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
                        >
                            {isProcessing ? <><RefreshCw size={18} className="animate-spin" /> Processing...</> : <><Shield size={18} /> Authenticate</>}
                        </button>
                    </div>

                    {/* Result / Challenge Panel */}
                    <div className="space-y-6">
                        {showChallenge && (
                            <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 space-y-4">
                                <div className="flex items-center gap-3">
                                    <Smartphone size={24} className="text-amber-400" />
                                    <h3 className="font-bold text-white">Challenge Required</h3>
                                </div>
                                <p className="text-slate-300 text-sm">A one-time password has been sent to your registered phone. Enter it below.</p>
                                <p className="text-xs text-amber-400">💡 Hint: Use 123456 for success</p>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="Enter OTP"
                                    className="w-full p-3 rounded-xl bg-slate-800 border border-white/5 text-white outline-none text-center text-2xl tracking-widest"
                                    maxLength={6}
                                />
                                <button
                                    onClick={submitChallenge}
                                    disabled={otp.length !== 6}
                                    className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition disabled:opacity-50"
                                >
                                    Verify OTP
                                </button>
                            </div>
                        )}

                        {result && (
                            <div className={`p-6 rounded-2xl border ${result.status === 'failed' ? 'border-red-500/30 bg-red-500/10' : 'border-green-500/30 bg-green-500/10'}`}>
                                <div className="flex items-center gap-3 mb-4">
                                    {result.status === 'failed' ? <XCircle size={28} className="text-red-400" /> : <CheckCircle size={28} className="text-green-400" />}
                                    <h3 className="font-bold text-white text-lg">{result.status === 'failed' ? 'Authentication Failed' : 'Authentication Successful'}</h3>
                                </div>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between"><span className="text-slate-400">Status:</span><span className={`font-bold uppercase ${result.status === 'failed' ? 'text-red-400' : 'text-green-400'}`}>{result.status}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Risk Score:</span><span className="text-white">{result.riskScore}/100</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Trans ID:</span><span className="font-mono text-slate-300">{result.transId}</span></div>
                                    <p className="text-slate-300 pt-2 border-t border-white/5">{result.recommendation}</p>
                                </div>
                            </div>
                        )}

                        {/* Flow Diagram */}
                        <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/50">
                            <h4 className="font-bold text-white mb-4">3DS 2.0 Flow</h4>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">1</div><span className="text-slate-300">Merchant initiates 3DS</span></div>
                                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">2</div><span className="text-slate-300">ACS receives device data</span></div>
                                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">3</div><span className="text-slate-300">Risk analysis performed</span></div>
                                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">4</div><span className="text-slate-300">Challenge or Frictionless</span></div>
                                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-bold">5</div><span className="text-slate-300">Auth result returned</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
