'use client';

import Link from 'next/link';
import { ArrowLeft, Bug, Code, Lock, Network } from 'lucide-react';
import { useState } from 'react';

export default function DebugPage() {
    const [activeTab, setActiveTab] = useState<'iso' | 'crypto' | 'network'>('iso');

    const mockISO = {
        mti: '0100',
        pan: '4532********1234',
        processingCode: '000000',
        amount: '000000004250',
        transmissionDateTime: '0129103245',
        stan: '000123',
        posEntryMode: '012',
        networkInternationalId: '000',
        responseCode: '00'
    };

    return (
        <div className="min-h-screen p-6">
            {/* Header */}
            <header className="mb-8">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Retour au Terminal
                </Link>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Bug className="w-8 h-8 text-amber-500" />
                    Mode Debug
                </h1>
                <p className="text-slate-400 mt-2">Outils de débogage et de trace pour les développeurs</p>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('iso')}
                    className={`px-6 py-3 rounded-xl font-medium transition ${activeTab === 'iso'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                        }`}
                >
                    <Code className="w-4 h-4 inline mr-2" />
                    Messages ISO 8583
                </button>
                <button
                    onClick={() => setActiveTab('crypto')}
                    className={`px-6 py-3 rounded-xl font-medium transition ${activeTab === 'crypto'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                        }`}
                >
                    <Lock className="w-4 h-4 inline mr-2" />
                    Debug Cryptographique
                </button>
                <button
                    onClick={() => setActiveTab('network')}
                    className={`px-6 py-3 rounded-xl font-medium transition ${activeTab === 'network'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                        }`}
                >
                    <Network className="w-4 h-4 inline mr-2" />
                    Trace Réseau
                </button>
            </div>

            {/* ISO Messages */}
            {activeTab === 'iso' && (
                <div className="rounded-2xl bg-white/5 border border-white/5 p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Analyseur de Messages ISO 8583</h2>
                    <p className="text-slate-400 mb-6">
                        Visualisez et déboguez les messages ISO 8583 échangés avec le système d'autorisation
                    </p>

                    <div className="rounded-xl bg-slate-950 border border-white/5 p-6 font-mono text-sm">
                        <div className="text-green-400 mb-4">// Dernier message d'autorisation</div>
                        <div className="space-y-1 text-slate-300">
                            {Object.entries(mockISO).map(([key, value]) => (
                                <div key={key} className="flex">
                                    <span className="text-blue-400 w-48">{key}:</span>
                                    <span className="text-yellow-300">"{value}"</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <div className="text-sm text-blue-300">
                            <strong>MTI 0100</strong> : Demande d'autorisation financière
                        </div>
                        <div className="text-sm text-slate-400 mt-1">
                            Code réponse <strong>00</strong> : Transaction approuvée
                        </div>
                    </div>
                </div>
            )}

            {/* Crypto Debug */}
            {activeTab === 'crypto' && (
                <div className="rounded-2xl bg-white/5 border border-white/5 p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Debug Cryptographique</h2>
                    <p className="text-slate-400 mb-6">
                        Visualisez les opérations cryptographiques (PIN Block, MAC, CVV)
                    </p>

                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-slate-950 border border-white/5">
                            <div className="text-sm text-amber-400 mb-2">PIN Block (Format ISO-0)</div>
                            <div className="font-mono text-green-300">0412AC34B5E67F89</div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-950 border border-white/5">
                            <div className="text-sm text-amber-400 mb-2">MAC (Message Authentication Code)</div>
                            <div className="font-mono text-green-300">A3B2C1D0E4F56789</div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-950 border border-white/5">
                            <div className="text-sm text-amber-400 mb-2">CVV</div>
                            <div className="font-mono text-green-300">***</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Network Trace */}
            {activeTab === 'network' && (
                <div className="rounded-2xl bg-white/5 border border-white/5 p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Trace Réseau</h2>
                    <p className="text-slate-400 mb-6">
                        Suivez le parcours des messages à travers les différents services
                    </p>

                    <div className="space-y-3">
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <div className="flex-1">
                                <div className="font-medium text-white">TPE → Acquirer</div>
                                <div className="text-sm text-slate-400">HTTP POST /authorize - 45ms</div>
                            </div>
                            <div className="text-green-400 text-sm">200 OK</div>
                        </div>

                        <div className="flex items-center gap-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <div className="flex-1">
                                <div className="font-medium text-white">Acquirer → Network Switch</div>
                                <div className="text-sm text-slate-400">ISO 8583 - 23ms</div>
                            </div>
                            <div className="text-green-400 text-sm">MTI: 0100</div>
                        </div>

                        <div className="flex items-center gap-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <div className="flex-1">
                                <div className="font-medium text-white">Network Switch → Issuer</div>
                                <div className="text-sm text-slate-400">ISO 8583 - 18ms</div>
                            </div>
                            <div className="text-green-400 text-sm">MTI: 0110</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
