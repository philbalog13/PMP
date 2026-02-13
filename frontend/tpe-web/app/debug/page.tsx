'use client';

import Link from 'next/link';
import { ArrowLeft, Bug, Code, Lock, Network, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useTerminalStore } from '@/lib/store';

export default function DebugPage() {
    const [activeTab, setActiveTab] = useState<'iso' | 'crypto' | 'network'>('iso');
    const [copied, setCopied] = useState(false);
    const { currentTransaction, transactionHistory, selectedCard, selectedMerchant, amount } = useTerminalStore();

    // Build ISO fields from last real transaction or use defaults
    const lastTx = transactionHistory.length > 0 ? transactionHistory[0] : null;
    const isoFields: Record<string, string> = {
        mti: currentTransaction?.approved ? '0110' : (lastTx ? '0110' : '0100'),
        'DE2 (PAN)': lastTx?.maskedPan || selectedCard?.maskedPan || '4532********1234',
        'DE3 (Processing Code)': '000000',
        'DE4 (Amount)': String(lastTx?.amount || amount || 0).padStart(12, '0'),
        'DE11 (STAN)': lastTx?.id?.slice(-6) || '000000',
        'DE22 (POS Entry)': '012',
        'DE25 (POS Condition)': '00',
        'DE39 (Response Code)': currentTransaction?.responseCode || lastTx?.responseCode || '--',
        'DE38 (Auth Code)': currentTransaction?.authorizationCode || lastTx?.authorizationCode || '------',
        'DE41 (Terminal ID)': selectedMerchant?.terminalId || 'TERM_WEB',
        'DE42 (Merchant ID)': selectedMerchant?.id?.slice(0, 15) || 'MERCHANT_PED',
        'DE49 (Currency)': '978',
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(JSON.stringify(isoFields, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const tabs = [
        { key: 'iso' as const, label: 'Messages ISO 8583', icon: Code, color: 'blue' },
        { key: 'crypto' as const, label: 'Debug Crypto', icon: Lock, color: 'purple' },
        { key: 'network' as const, label: 'Trace Réseau', icon: Network, color: 'emerald' },
    ];

    // Determine network trace status from last transaction
    const traceSteps = lastTx ? [
        { from: 'TPE', to: 'API Gateway', protocol: 'HTTPS POST /simulate', time: '12ms', status: '200 OK', ok: true },
        { from: 'Gateway', to: 'Fraud Engine', protocol: 'Internal RPC', time: '8ms', status: `Score: ${currentTransaction?.matchedRules?.length || 0} rules`, ok: true },
        { from: 'Gateway', to: '3DS Server', protocol: 'HTTPS', time: '15ms', status: 'Challenge/Frictionless', ok: true },
        { from: 'Gateway', to: 'Issuer Auth', protocol: 'ISO 8583', time: '23ms', status: `RC: ${lastTx.responseCode}`, ok: lastTx.status === 'APPROVED' },
        { from: 'Gateway', to: 'Ledger', protocol: 'Internal', time: '5ms', status: 'Booked', ok: true },
    ] : [
        { from: 'TPE', to: 'API Gateway', protocol: 'HTTPS', time: '--', status: 'En attente', ok: false },
        { from: 'Gateway', to: 'Fraud Engine', protocol: '--', time: '--', status: 'En attente', ok: false },
        { from: 'Gateway', to: 'Issuer', protocol: '--', time: '--', status: 'En attente', ok: false },
    ];

    return (
        <div className="min-h-screen p-6">
            <header className="mb-8">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Retour au Terminal
                </Link>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Bug className="w-8 h-8 text-amber-500" />
                    Mode Debug
                </h1>
                <p className="text-slate-400 mt-2">
                    {lastTx
                        ? `Dernière transaction: ${lastTx.maskedPan} — ${lastTx.status} (${lastTx.responseCode})`
                        : 'Effectuez une transaction pour voir les données de debug'}
                </p>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-5 py-3 rounded-xl font-medium transition flex items-center gap-2 ${activeTab === tab.key
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ISO Messages */}
            {activeTab === 'iso' && (
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-white">Analyseur de Messages ISO 8583</h2>
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-400 hover:text-white transition"
                        >
                            {copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
                            {copied ? 'Copié' : 'Copier'}
                        </button>
                    </div>

                    <div className="rounded-xl bg-slate-950 border border-white/5 p-6 font-mono text-sm">
                        <div className="text-slate-500 mb-4">
                            {`// ${lastTx ? `Transaction ${lastTx.id?.slice(0, 8)}` : 'Template message'}`}
                        </div>
                        <div className="space-y-1">
                            {Object.entries(isoFields).map(([key, value]) => (
                                <div key={key} className="flex">
                                    <span className="text-blue-400 w-56 shrink-0">{key}:</span>
                                    <span className={value === '--' || value === '------' ? 'text-slate-600' : 'text-yellow-300'}>
                                        {`"${value}"`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <div className="text-sm text-blue-300">
                            <strong>MTI {isoFields.mti}</strong> : {isoFields.mti === '0100' ? 'Demande d\'autorisation' : 'Réponse d\'autorisation'}
                        </div>
                        <div className="text-sm text-slate-400 mt-1">
                            Code réponse <strong>{isoFields['DE39 (Response Code)']}</strong> : {
                                isoFields['DE39 (Response Code)'] === '00' ? 'Transaction approuvée' :
                                isoFields['DE39 (Response Code)'] === '51' ? 'Fonds insuffisants' :
                                isoFields['DE39 (Response Code)'] === '05' ? 'Ne pas honorer' :
                                isoFields['DE39 (Response Code)'] === '54' ? 'Carte expirée' :
                                isoFields['DE39 (Response Code)'] === '96' ? 'Erreur système' :
                                'En attente de transaction'
                            }
                        </div>
                    </div>
                </div>
            )}

            {/* Crypto Debug */}
            {activeTab === 'crypto' && (
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Debug Cryptographique</h2>
                    <p className="text-slate-400 mb-6">
                        Opérations cryptographiques simulées pour la dernière transaction
                    </p>

                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-slate-950 border border-white/5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-amber-400">PIN Block (Format ISO 9564-0)</span>
                                <span className="text-[10px] text-slate-600 uppercase">Simulé</span>
                            </div>
                            <div className="font-mono text-green-300">
                                {lastTx ? `0${lastTx.id?.slice(-14) || '412AC34B5E67F89'}` : '-- en attente --'}
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-950 border border-white/5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-amber-400">MAC (HMAC-SHA256)</span>
                                <span className="text-[10px] text-slate-600 uppercase">Simulé</span>
                            </div>
                            <div className="font-mono text-green-300">
                                {lastTx ? `${(lastTx.authorizationCode || 'A3B2C1D0').padEnd(16, '0')}` : '-- en attente --'}
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-950 border border-white/5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-amber-400">CVV / CVC</span>
                                <span className="text-[10px] text-slate-600 uppercase">Masqué</span>
                            </div>
                            <div className="font-mono text-green-300">***</div>
                        </div>
                    </div>

                    <div className="mt-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-sm text-purple-300">
                        Les valeurs cryptographiques affichées sont des simulations pédagogiques.
                        En production, le PIN Block est chiffré par le HSM et le MAC est vérifié par le switch réseau.
                    </div>
                </div>
            )}

            {/* Network Trace */}
            {activeTab === 'network' && (
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Trace Réseau</h2>
                    <p className="text-slate-400 mb-6">
                        Parcours du message à travers les services
                    </p>

                    <div className="space-y-3">
                        {traceSteps.map((step, i) => (
                            <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border ${
                                step.ok ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-800/50 border-white/10'
                            }`}>
                                <div className={`w-2 h-2 rounded-full ${step.ok ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                                <div className="flex-1">
                                    <div className="font-medium text-white">{step.from} → {step.to}</div>
                                    <div className="text-sm text-slate-400">{step.protocol} — {step.time}</div>
                                </div>
                                <div className={`text-sm ${step.ok ? 'text-emerald-400' : 'text-slate-500'}`}>{step.status}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
