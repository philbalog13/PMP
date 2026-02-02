'use client';

import React, { useState, useEffect } from 'react';
import { Terminal, Cpu, Clock, Key, AlertTriangle, ExternalLink } from 'lucide-react';

export default function MerchantAuthPage() {
    const [timeLeft, setTimeLeft] = useState(900); // 15 minutes
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-slate-950 font-mono text-green-500 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-slate-900 border-2 border-green-500/30 rounded-lg shadow-[0_0_30px_rgba(34,197,94,0.1)] overflow-hidden">
                {/* Status Bar */}
                <div className="bg-green-500/10 border-b border-green-500/30 px-6 py-2 flex items-center justify-between text-[10px] uppercase tracking-tighter">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1"><Terminal size={12} /> TPE-GW-004</span>
                        <span className="flex items-center gap-1 text-green-400"><Cpu size={12} /> SECURE_CORE_ON</span>
                    </div>
                    <div className="flex items-center gap-1 text-orange-400 font-bold">
                        <Clock size={12} /> SESSION_EXPIRES: {formatTime(timeLeft)}
                    </div>
                </div>

                <div className="p-10 space-y-8">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-black italic tracking-tighter">PMP_MERCHANT_PORTAL v2.4</h1>
                        <div className="h-1 w-20 bg-green-500" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Certificate Auth Section */}
                        <div className="space-y-4 p-6 bg-green-500/5 border border-green-500/20 rounded-md relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-100 transition-opacity">
                                <Key className="w-12 h-12 -rotate-12" />
                            </div>
                            <h2 className="text-sm font-bold uppercase">Authentification Certificat</h2>
                            <p className="text-[10px] text-green-700 leading-tight">Chargez votre fichier .p12 cryptographique pour accéder au tunnel PCI-DSS.</p>

                            <div className="mt-4 border-2 border-dashed border-green-500/30 rounded-md p-4 flex flex-col items-center justify-center gap-2 hover:bg-green-500/5 cursor-pointer transition-all">
                                <span className="text-[11px] font-bold">DÉPOSER CERTIFICAT</span>
                                <span className="text-[9px] opacity-50">SHA-256 IDENTIFIED</span>
                            </div>
                        </div>

                        {/* Standard Credentials */}
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-green-700">Merchant_ID</label>
                                <input
                                    type="text"
                                    className="w-full bg-black border border-green-500/40 rounded-sm px-3 py-2 text-green-400 focus:border-green-400 focus:outline-hidden transition-all placeholder:opacity-20"
                                    placeholder="MERCH_XXXX"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-green-700">Access_Key</label>
                                <input
                                    type="password"
                                    className="w-full bg-black border border-green-500/40 rounded-sm px-3 py-2 text-green-400 focus:border-green-400 focus:outline-hidden transition-all placeholder:opacity-20"
                                    placeholder="********"
                                />
                            </div>

                            <button
                                onClick={() => setIsAuthenticating(true)}
                                className="w-full bg-green-500 hover:bg-green-400 text-black font-black py-3 rounded-sm transition-all shadow-[0_4px_0_rgb(21,128,61)] active:translate-y-1 active:shadow-none"
                            >
                                {isAuthenticating ? 'SYNCHRONIZING...' : 'CONNECT_SECURE_LINK'}
                            </button>
                        </div>
                    </div>

                    {/* Security Alert Log */}
                    <div className="bg-black/50 border-l-4 border-orange-500 p-4 space-y-2">
                        <div className="flex items-center gap-2 text-orange-500">
                            <AlertTriangle size={14} />
                            <span className="text-[10px] font-bold uppercase">Système de Surveillance Actif</span>
                        </div>
                        <p className="text-[9px] text-green-800 leading-tight italic">
                            Avertissement pédagogique : Chaque tentative erronée déclenche un audit cryptographique automatique. La rotation des clés est imposée toutes les 4 heures.
                        </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-green-500/10">
                        <a href="#" className="text-[10px] flex items-center gap-1 hover:text-white transition-colors">
                            <ExternalLink size={10} /> PCI_DSS_GUIDELINES.PDF
                        </a>
                        <span className="text-[9px] opacity-20 italic">ENCRYPTED_SESSION_80Hz</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
