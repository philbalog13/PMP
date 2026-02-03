'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTerminalStore } from '@/lib/store';
import { processTransaction } from '@/lib/api-client';
import { Bug, FileText, Settings, Wifi, Activity, GraduationCap } from 'lucide-react';

import TerminalScreen from '@/components/terminal/TerminalScreen';
import Keypad from '@/components/terminal/Keypad';
import CardReaderSim from '@/components/terminal/CardReaderSim';
import TransactionLog from '@/components/terminal/TransactionLog';
import ConfigPanel from '@/components/config/ConfigPanel';
import DebugView from '@/components/pedagogy/DebugView';
import TechnicalDetail from '@/components/pedagogy/TechnicalDetail';
import GlassCard from '@shared/components/GlassCard';
import PremiumButton from '@shared/components/PremiumButton';

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
        toggleTechnicalDetails,
        reset,
    } = useTerminalStore();

    const [isBooting, setIsBooting] = useState(true);
    const [bootError, setBootError] = useState<string | null>(null);
    const [lastBootCheckAt, setLastBootCheckAt] = useState<Date | null>(null);

    useEffect(() => {
        const bootSequence = async () => {
            // Sequence Diagram Step: TPE->>GW: GET /api/health
            try {
                // Initial logic
                await new Promise(resolve => setTimeout(resolve, 800)); // UI boot animation delay

                // Real health check
                const { checkSystemHealth } = await import('@/lib/api-client');
                const isHealthy = await checkSystemHealth();
                setLastBootCheckAt(new Date());

                if (isHealthy) {
                    setIsBooting(false);
                    if (state === 'idle') {
                        setState('amount-input');
                    }
                } else {
                    setBootError("Erreur de connexion Gateway");
                    // Still boot to allow debug, but showing error
                    setTimeout(() => setIsBooting(false), 2000);
                }
            } catch (err) {
                console.error("Boot failed", err);
                setBootError("System Failure");
                setIsBooting(false);
            }
        };

        bootSequence();
    }, [setState]);

    const handleAmountComplete = (amt: number) => {
        setState('card-wait');
    };

    const handleCardRead = async (cardData: any) => {
        setState('processing');
        setCardData(cardData);

        try {
            // 1. Transaction Preparation (Offline Logic)
            // Dynamic Import to ensure client-side execution if needed, though here standard import works too.
            const { TransactionPreparationService } = await import('@/lib/services/TransactionPreparation.service');
            const preparationService = new TransactionPreparationService();

            // Input from Keypad
            const userInput = { amount, currency: 'EUR' };

            // Run the workflow: Card Read -> Offline Checks -> CVM -> ISO Build
            const preparedTx = await preparationService.prepareTransaction(userInput, {
                pan: cardData.pan,
                expiryDate: cardData.expiryDate,
                holderName: "CARDHOLDER", // Simulé, non capturé par l'UI actuel
                track2: undefined,
                serviceCode: "101"
            });

            // If we reach here, Offline Checks passed!

            const transactionRequest = {
                stan: preparedTx.isoMessage.auditNumber, // Use generated STAN from service
                pan: preparedTx.isoMessage.cardData.pan,
                mti: preparedTx.isoMessage.mti,
                processingCode: preparedTx.isoMessage.processingCode,
                amount,
                currency: 'EUR',
                type: selectedType,
                merchantId: 'MERCH_PED_001',
                terminalId: 'TPEWEB01',
                mcc: '5411',
                posEntryMode: '012',
                pinEntered: !!preparedTx.isoMessage.pinBlock, // Check if PIN was required/captured
                cvvProvided: !!cardData.cvv,
                threeDsAuthenticated: false,
                isRecurring: false,
                isEcommerce: true,
                location: { country: 'FR', city: 'Paris' },
                timestamp: preparedTx.timestamp,
                // Add extra debug info about the offline steps
                offlineAudit: preparedTx.riskAssessment.auditTrace
            };

            const response = await processTransaction(transactionRequest) as any;

            setCurrentTransaction({
                ...response,
                authorizationCode: response.authorizationCode || response.authCode,
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
                authorizationCode: response.authorizationCode || response.authCode || '______',
                maskedPan: `****${cardData.pan.slice(-4)}`,
                timestamp: new Date(),
                matchedRules: (response.matchedRules || []).map((r: { ruleId: string }) => r.ruleId),
            });

            setTimeout(() => {
                reset();
                setState('amount-input');
            }, 3000);
        } catch (error: any) {
            console.error('Transaction error:', error);

            // Handle Offline Declines specifically
            // The service throws standard Errors, we can improve this check
            const gatewayMessage = error?.response?.data?.error || error?.response?.data?.responseMessage;
            const errorMessage = gatewayMessage || error.message || 'System error';
            const isOfflineDecline = errorMessage.includes('(OFFLINE)');

            setState('declined');
            setCurrentTransaction({
                approved: false,
                responseCode: isOfflineDecline ? 'OF' : '96', // 'OF' for Offline Failure custom code
                responseMessage: isOfflineDecline ? errorMessage.replace('TRANSACTION REFUSED (OFFLINE): ', '') : 'System Error',
                matchedRules: [],
                processingTime: 0,
                timestamp: new Date(),
            });

            setTimeout(() => {
                reset();
                setState('amount-input');
            }, 3500); // Slightly longer to read error
        }
    };

    if (isBooting) {
        return (
            <main className="min-h-screen p-4 md:p-8 font-sans flex items-center justify-center">
                <GlassCard className="w-full max-w-xl p-8 border border-white/10 bg-slate-900/60 text-center">
                    <div className="mx-auto mb-5 h-12 w-12 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
                    <h1 className="text-white text-2xl font-bold mb-2">Initialisation du terminal</h1>
                    <p className="text-slate-300 text-sm">
                        Verification des services monétiques en cours...
                    </p>
                </GlassCard>
            </main>
        );
    }

    return (
        <main className="min-h-screen p-4 md:p-8 font-sans">
            {(bootError || lastBootCheckAt) && (
                <div className="max-w-7xl mx-auto mb-6">
                    <div className={`rounded-2xl border px-4 py-3 text-sm flex items-center justify-between gap-4 ${bootError
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                        }`}>
                        <span>
                            {bootError
                                ? `Mode degrade: ${bootError}`
                                : 'Connexion API validee. Terminal pret a encaisser.'}
                        </span>
                        {lastBootCheckAt && (
                            <span className="text-xs opacity-80">
                                Dernier check: {lastBootCheckAt.toLocaleTimeString('fr-FR')}
                            </span>
                        )}
                    </div>
                </div>
            )}
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
                    {/* Navigation Menu */}
                    <GlassCard className="p-4 border border-white/10 bg-slate-900/50">
                        <div className="grid grid-cols-4 gap-2">
                            <Link href="/transactions" className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-white/5 transition text-slate-400 hover:text-white gap-2">
                                <FileText size={20} className="text-blue-500" />
                                <span className="text-xs font-medium">Historique</span>
                            </Link>
                            <Link href="/settings" className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-white/5 transition text-slate-400 hover:text-white gap-2">
                                <Settings size={20} className="text-slate-400" />
                                <span className="text-xs font-medium">Réglages</span>
                            </Link>
                            <Link href="/simulation" className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-white/5 transition text-slate-400 hover:text-white gap-2">
                                <Activity size={20} className="text-purple-500" />
                                <span className="text-xs font-medium">Simuler</span>
                            </Link>
                            <Link href="/help" className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-white/5 transition text-slate-400 hover:text-white gap-2">
                                <div className="w-5 h-5 rounded-full border-2 border-slate-500 flex items-center justify-center text-xs font-bold">?</div>
                                <span className="text-xs font-medium">Aide</span>
                            </Link>
                            <Link href="/learn" className="col-span-4 mt-2 flex items-center justify-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition gap-2 group">
                                <GraduationCap size={20} className="group-hover:scale-110 transition" />
                                <span className="text-sm font-bold">Centre de Formation</span>
                            </Link>

                            <Link href={process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'} className="col-span-4 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition group">
                                <span className="text-sm font-medium">← Retour Portail</span>
                            </Link>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6 border border-white/10 bg-slate-900/50">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-bold text-xl text-white flex items-center gap-2">
                                <Settings size={20} className="text-blue-500" />
                                <span className="text-sm uppercase tracking-wider text-slate-400">Contrôles Rapides</span>
                            </h2>
                            <div className="flex gap-3">
                                <Link href="/debug">
                                    <PremiumButton
                                        variant="ghost"
                                        size="sm"
                                        className="text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20"
                                    >
                                        <Bug size={16} className="mr-2" />
                                        Advanced Debug
                                    </PremiumButton>
                                </Link>
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
                                <h3 className="font-semibold text-xs text-slate-400 uppercase tracking-wider mb-4">Simulation Carte</h3>
                                <CardReaderSim onCardRead={handleCardRead} />
                            </div>

                            <ConfigPanel />
                        </div>
                    </GlassCard>

                    {/* Transaction History / Logs */}
                    <GlassCard className="p-6 border border-white/10 bg-slate-900/50">
                        <h3 className="font-bold text-lg mb-4 text-white flex items-center gap-2">
                            <FileText size={18} className="text-green-500" />
                            Dernières Transactions
                        </h3>
                        <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                            <TransactionLog />
                        </div>
                        <Link href="/transactions" className="block mt-4 text-center text-sm text-blue-400 hover:text-blue-300 transition">
                            Voir tout l'historique →
                        </Link>
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
