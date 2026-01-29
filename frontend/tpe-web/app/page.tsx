'use client';

import { useEffect, useState } from 'react';
import { useTerminalStore } from '@/lib/store';
import { processTransaction } from '@/lib/api-client';
import { generateSTAN } from '@/lib/utils';
import { Bug, FileText, Settings, Wifi, Activity } from 'lucide-react';

import TerminalScreen from '@/components/terminal/TerminalScreen';
import Keypad from '@/components/terminal/Keypad';
import CardReaderSim from '@/components/terminal/CardReaderSim';
import TransactionLog from '@/components/terminal/TransactionLog';
import ConfigPanel from '@/components/config/ConfigPanel';
import DebugView from '@/components/pedagogy/DebugView';
import StepFlow from '@/components/pedagogy/StepFlow';
import TechnicalDetail from '@/components/pedagogy/TechnicalDetail';
import GlassCard from '@/components/ui/GlassCard';
import PremiumButton from '@/components/ui/PremiumButton';

export default function Home() {
    const {
        state,
        amount,
        selectedType,
        setState,
        setCardData,
        setCurrentTransaction,
        addToHistory,
        debugMode,
        toggleDebugMode,
        setDebugData,
        toggleTechnicalDetails,
        reset,
    } = useTerminalStore();

    const [isBooting, setIsBooting] = useState(true);

    useEffect(() => {
        setTimeout(() => setIsBooting(false), 2000);
        if (state === 'idle') {
            setState('amount-input');
        }
    }, [state, setState]);

    const handleAmountComplete = (amt: number) => {
        setState('card-wait');
    };

    const handleCardRead = async (cardData: any) => {
        setState('processing');
        setCardData(cardData);

        try {
            const transactionRequest = {
                stan: generateSTAN(),
                pan: cardData.pan,
                mti: '0100',
                processingCode: '000000',
                amount,
                currency: 'EUR',
                type: selectedType,
                merchantId: 'MERCH_PED_001',
                terminalId: 'TERM_WEB_01',
                mcc: '5411',
                posEntryMode: '012',
                pinEntered: false,
                cvvProvided: !!cardData.cvv,
                threeDsAuthenticated: false,
                isRecurring: false,
                isEcommerce: true,
                location: { country: 'FR', city: 'Paris' },
                timestamp: new Date(),
            };

            const response = await processTransaction(transactionRequest) as any;

            setCurrentTransaction({
                ...response,
                matchedRules: response.matchedRules || [],
                timestamp: new Date()
            });
            setState(response.approved ? 'approved' : 'declined');

            addToHistory({
                id: transactionRequest.stan,
                amount,
                type: selectedType,
                status: response.approved ? 'APPROVED' : 'DECLINED',
                responseCode: response.responseCode || '00',
                authorizationCode: response.authorizationCode || '______',
                maskedPan: `****${cardData.pan.slice(-4)}`,
                timestamp: new Date(),
                matchedRules: (response.matchedRules || []).map((r: { ruleId: string }) => r.ruleId),
            });

            setTimeout(() => {
                reset();
                setState('amount-input');
            }, 3000);
        } catch (error) {
            console.error('Transaction error:', error);
            setState('declined');
            setCurrentTransaction({
                approved: false,
                responseCode: '96',
                responseMessage: 'System error',
                matchedRules: [],
                processingTime: 0,
                timestamp: new Date(),
            });

            setTimeout(() => {
                reset();
                setState('amount-input');
            }, 3000);
        }
    };

    return (
        <main className="min-h-screen p-4 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-start">

                {/* LEFT COLUMN: THE PHYSICAL TERMINAL */}
                <div className="flex flex-col items-center">
                    {/* HOLOGRAPHIC TERMINAL CONTAINER */}
                    <GlassCard
                        className="p-8 rounded-[3rem] w-full max-w-md relative border-t border-white/20 shadow-2xl shadow-blue-900/40 backdrop-blur-2xl bg-black/40"
                        glowColor="blue"
                    >
                        {/* Device Texture Light */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent rounded-[2.5rem] pointer-events-none" />
                        <div className="absolute -inset-1 rounded-[3rem] bg-gradient-to-b from-blue-500/20 to-transparent opacity-50 blur-sm -z-10" />

                        {/* Top Bar (Brand & Status) */}
                        <div className="flex justify-between items-center mb-8 px-2 text-blue-200/60">
                            <span className="font-bold tracking-[0.2em] text-xs uppercase flex items-center gap-2">
                                <Activity size={14} className="text-blue-500" />
                                Ingenico PMP • <span className="text-blue-400">NEO</span>
                            </span>
                            <div className="flex items-center gap-3">
                                <Wifi size={16} className="text-blue-400 animate-pulse" />
                                <div className="w-8 h-4 bg-slate-900/80 rounded-sm border border-slate-700 relative overflow-hidden flex items-center px-0.5">
                                    <div className="h-[80%] w-[90%] bg-gradient-to-r from-green-500 to-green-400 rounded-sm shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                                </div>
                            </div>
                        </div>

                        {/* Screen */}
                        <div className="bg-slate-950 rounded-xl p-1 mb-8 shadow-[inset_0_0_20px_rgba(0,0,0,1)] border border-white/5 relative overflow-hidden">
                            {/* Screen Glare */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                            <TerminalScreen />
                        </div>

                        {/* Keypad */}
                        <div className="mb-10">
                            <Keypad onAmountComplete={handleAmountComplete} />
                        </div>

                        {/* Card Slot Overlay (Visual only) */}
                        <div className="text-center pb-2 relative">
                            <div className="h-2 w-32 bg-black mx-auto rounded-full shadow-[inset_0_1px_3px_rgba(255,255,255,0.1)] border-b border-white/10" />
                            <div className="absolute left-1/2 -translate-x-1/2 top-4 w-4 h-4 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
                            <p className="text-[10px] text-blue-300/50 mt-3 uppercase tracking-widest font-semibold">Insérer Carte - NFC Ready</p>
                        </div>
                    </GlassCard>

                    <p className="text-slate-400 text-sm mt-8 text-center max-w-sm">
                        Utilisez ce terminal virtuel comme un vrai TPE. Entrez le montant, validez, et présentez la carte générée.
                    </p>
                </div>

                {/* RIGHT COLUMN: CONTROLS & LOGS */}
                <div className="space-y-6">
                    <GlassCard className="p-6 border border-white/10 bg-slate-900/50">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-bold text-xl text-white flex items-center gap-2">
                                <Settings size={20} className="text-blue-500" />
                                Panneau de Contrôle
                            </h2>
                            <div className="flex gap-3">
                                <PremiumButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={toggleDebugMode}
                                    className={debugMode ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20' : ''}
                                >
                                    <Bug size={16} className="mr-2" />
                                    Debug
                                </PremiumButton>
                                <PremiumButton
                                    variant="secondary"
                                    size="sm"
                                    onClick={toggleTechnicalDetails}
                                >
                                    <FileText size={16} className="mr-2" />
                                    Logs
                                </PremiumButton>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-5 bg-black/40 rounded-xl border border-white/5">
                                <h3 className="font-semibold text-xs text-slate-400 uppercase tracking-wider mb-4">Simulation</h3>
                                <CardReaderSim onCardRead={handleCardRead} />
                            </div>

                            <ConfigPanel />
                        </div>
                    </GlassCard>

                    {/* Transaction History / Logs */}
                    <GlassCard className="p-6 border border-white/10 bg-slate-900/50">
                        <h3 className="font-bold text-lg mb-4 text-white flex items-center gap-2">
                            <FileText size={18} className="text-purple-500" />
                            Historique des Transactions
                        </h3>
                        <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                            <TransactionLog />
                        </div>
                    </GlassCard>

                    {debugMode && (
                        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-500/30">
                            <h3 className="font-mono font-bold text-indigo-400 mb-4 flex items-center gap-2">
                                <Bug /> Debug Output
                            </h3>
                            <DebugView />
                        </div>
                    )}
                </div>

                {/* Technical Detail Modal */}
                <TechnicalDetail />
            </div>
        </main>
    );
}
