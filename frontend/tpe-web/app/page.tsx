'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTerminalStore } from '@/lib/store';
import { getAvailableMerchants, simulateClientPayment } from '@/lib/api-client';
import type { MerchantApi } from '@/lib/api-client';
import type { SelectedMerchant } from '@/lib/store';
import { useAuth } from '@shared/context/AuthContext';
import { UserRole } from '@shared/types/user';
import { APP_URLS } from '@shared/lib/app-urls';
import { normalizeRole } from '@shared/utils/roleUtils';
import {
    Bug, FileText, Settings, Wifi, Activity,
    CreditCard, Store, ArrowRight, CheckCircle2, XCircle,
    ExternalLink
} from 'lucide-react';

import TerminalScreen from '@/components/terminal/TerminalScreen';
import Keypad from '@/components/terminal/Keypad';
import CardSelector from '@/components/terminal/CardSelector';
import MerchantSelector from '@/components/terminal/MerchantSelector';
import ConfigPanel from '@/components/config/ConfigPanel';
import DebugView from '@/components/pedagogy/DebugView';
import TechnicalDetail from '@/components/pedagogy/TechnicalDetail';
import GlassCard from '@shared/components/GlassCard';
import PremiumButton from '@shared/components/PremiumButton';

type PaymentStep = 'card' | 'merchant' | 'amount' | 'confirm';

type PaymentTransaction = {
    id?: string;
    transaction_id?: string;
    transactionId?: string;
    stan?: string;
    authorization_code?: string;
    authorizationCode?: string;
    response_code?: string;
};

type PaymentResultPayload = {
    success: boolean;
    transaction?: PaymentTransaction;
    error?: string;
    message?: string;
    responseCode?: string;
    response_code?: string;
    ledgerBooked?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (isRecord(error)) {
        const response = isRecord(error.response) ? error.response : null;
        const data = response && isRecord(response.data) ? response.data : null;
        if (data && typeof data.error === 'string' && data.error.trim()) {
            return data.error;
        }
        if (typeof error.message === 'string' && error.message.trim()) {
            return error.message;
        }
    }
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return fallback;
};

const toSelectedMerchant = (merchant: MerchantApi): SelectedMerchant => {
    const terminal = merchant.terminals?.[0];
    return {
        id: merchant.id,
        displayName: merchant.displayName || merchant.username || 'Merchant',
        merchantName: terminal?.merchantName || merchant.displayName || merchant.username || 'Merchant',
        mcc: terminal?.mcc || '5411',
        terminalId: terminal?.terminalId || null,
        locationName: terminal?.locationName || null,
        city: terminal?.city || null,
    };
};

function HomeContent() {
    const searchParams = useSearchParams();
    const { isLoading: isAuthLoading, isAuthenticated, user } = useAuth();
    const {
        amount,
        selectedType,
        selectedCard,
        selectedMerchant,
        setState,
        setSelectedCard,
        setSelectedMerchant,
        setLastTransactionId,
        setCurrentTransaction,
        addToHistory,
        debugMode,
        toggleTechnicalDetails,
        reset,
    } = useTerminalStore();

    const requestedMerchantId = searchParams.get('merchantId')?.trim() || null;
    const fromParam = (searchParams.get('from') || '').toLowerCase();
    const isClientCheckoutFlow = fromParam === 'client' || Boolean(requestedMerchantId);
    const isMerchantLocked = Boolean(requestedMerchantId);
    const isMerchantUser = normalizeRole(user?.role) === UserRole.MARCHAND;

    const [isBooting, setIsBooting] = useState(true);
    const [bootError, setBootError] = useState<string | null>(null);
    const [lastBootCheckAt, setLastBootCheckAt] = useState<Date | null>(null);
    const [paymentStep, setPaymentStep] = useState<PaymentStep>('card');
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentResult, setPaymentResult] = useState<PaymentResultPayload | null>(null);
    const [use3DS, setUse3DS] = useState(true);
    const [merchantPrefillLoading, setMerchantPrefillLoading] = useState(false);
    const [merchantPrefillError, setMerchantPrefillError] = useState<string | null>(null);

    useEffect(() => {
        const bootSequence = async () => {
            try {
                await new Promise(resolve => setTimeout(resolve, 800));

                const { checkSystemHealth } = await import('@/lib/api-client');
                const isHealthy = await checkSystemHealth();
                setLastBootCheckAt(new Date());

                if (isHealthy) {
                    setIsBooting(false);
                    setState('amount-input');
                } else {
                    setBootError("Erreur de connexion Gateway");
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

    useEffect(() => {
        if (!requestedMerchantId || selectedMerchant?.id === requestedMerchantId) {
            return;
        }

        let active = true;
        const resolveMerchant = async () => {
            setMerchantPrefillLoading(true);
            setMerchantPrefillError(null);
            try {
                const payload = await getAvailableMerchants();
                const merchantList = Array.isArray(payload?.merchants) ? payload.merchants : [];
                const match = merchantList.find((merchant): merchant is MerchantApi => (
                    typeof merchant?.id === 'string' && merchant.id === requestedMerchantId
                ));

                if (!match) {
                    if (active) {
                        setMerchantPrefillError('Marchand introuvable pour ce lien de paiement.');
                    }
                    return;
                }

                if (active) {
                    setSelectedMerchant(toSelectedMerchant(match));
                    setMerchantPrefillError(null);
                }
            } catch (error: unknown) {
                if (active) {
                    setMerchantPrefillError(getErrorMessage(error, 'Impossible de charger ce marchand.'));
                }
            } finally {
                if (active) {
                    setMerchantPrefillLoading(false);
                }
            }
        };

        void resolveMerchant();

        return () => {
            active = false;
        };
    }, [requestedMerchantId, selectedMerchant?.id, setSelectedMerchant]);

    useEffect(() => {
        if (!isClientCheckoutFlow || paymentStep !== 'merchant' || !selectedMerchant) {
            return;
        }
        setPaymentStep('amount');
    }, [isClientCheckoutFlow, paymentStep, selectedMerchant, setPaymentStep]);

    useEffect(() => {
        if (isAuthLoading || !isAuthenticated) {
            return;
        }

        if (isMerchantUser && !isClientCheckoutFlow) {
            window.location.replace(`${APP_URLS.portal}/merchant`);
        }
    }, [isAuthLoading, isAuthenticated, isMerchantUser, isClientCheckoutFlow]);

    const handleAmountComplete = () => {
        setPaymentStep('confirm');
    };

    const handleProcessPayment = async () => {
        if (!selectedCard || !selectedMerchant || amount <= 0 || isProcessing) return;

        setIsProcessing(true);
        setPaymentResult(null);

        try {
            const response = await simulateClientPayment({
                cardId: selectedCard.id,
                merchantId: selectedMerchant.id,
                amount,
                use3DS: use3DS && selectedCard.threedsEnrolled,
                paymentType: selectedType,
            });

            setPaymentResult(response);

            if (response.success) {
                const txn = response.transaction;
                setLastTransactionId(txn?.id || null);

                const authCode = txn?.authorization_code || txn?.authorizationCode || '';
                const txnId = txn?.transaction_id || txn?.transactionId || txn?.stan || '';

                setCurrentTransaction({
                    approved: true,
                    responseCode: txn?.response_code || '00',
                    responseMessage: 'Approved',
                    authorizationCode: authCode,
                    processingTime: 0,
                    matchedRules: [],
                    timestamp: new Date(),
                });

                addToHistory({
                    id: txnId || txn?.id || String(Date.now()),
                    amount,
                    type: selectedType,
                    status: 'APPROVED',
                    responseCode: txn?.response_code || '00',
                    authorizationCode: authCode,
                    maskedPan: selectedCard.maskedPan,
                    timestamp: new Date(),
                    matchedRules: [],
                });

                // Update selected card balance locally after successful payment
                setSelectedCard({
                    ...selectedCard,
                    balance: selectedCard.balance - amount,
                });
            } else {
                // Extract error info from 400 responses (backend returns success:false with details)
                const errorCode = typeof response.responseCode === 'string'
                    ? response.responseCode
                    : (typeof response.response_code === 'string' ? response.response_code : '05');
                const errorMsg = typeof response.error === 'string'
                    ? response.error
                    : (typeof response.message === 'string' ? response.message : 'Declined');
                const failedTxn = response.transaction;
                const failedTxnId = failedTxn?.transaction_id || failedTxn?.id || '';

                setCurrentTransaction({
                    approved: false,
                    responseCode: errorCode,
                    responseMessage: errorMsg,
                    matchedRules: [],
                    processingTime: 0,
                    timestamp: new Date(),
                });

                addToHistory({
                    id: failedTxnId || `DECLINED-${Date.now()}`,
                    amount,
                    type: selectedType,
                    status: 'DECLINED',
                    responseCode: errorCode,
                    authorizationCode: '',
                    maskedPan: selectedCard.maskedPan,
                    timestamp: new Date(),
                    matchedRules: [],
                });
            }
        } catch (error: unknown) {
            console.error('Payment error:', error);
            // Extract structured error from axios 400/500 responses
            const responseData = isRecord(error) && isRecord(error.response) && isRecord(error.response.data)
                ? error.response.data
                : null;
            const errMsg = responseData && typeof responseData.error === 'string'
                ? responseData.error
                : (error instanceof Error ? error.message : 'Erreur systeme');
            const errCode = responseData && typeof responseData.responseCode === 'string'
                ? responseData.responseCode
                : '96';
            setPaymentResult({ success: false, error: errMsg, responseCode: errCode });
            setCurrentTransaction({
                approved: false,
                responseCode: errCode,
                responseMessage: errMsg,
                matchedRules: [],
                processingTime: 0,
                timestamp: new Date(),
            });

            addToHistory({
                id: `ERR-${Date.now()}`,
                amount,
                type: selectedType,
                status: 'DECLINED',
                responseCode: errCode,
                authorizationCode: '',
                maskedPan: selectedCard?.maskedPan || '****',
                timestamp: new Date(),
                matchedRules: [],
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleNewTransaction = () => {
        const lockedMerchant = isClientCheckoutFlow ? selectedMerchant : null;
        setPaymentResult(null);
        setPaymentStep('card');
        setLastTransactionId(null);
        reset();
        if (lockedMerchant) {
            setSelectedMerchant(lockedMerchant);
        }
        setState('amount-input');
    };

    if (isAuthLoading || (isAuthenticated && isMerchantUser && !isClientCheckoutFlow)) {
        return (
            <main className="min-h-screen p-4 md:p-8 font-sans flex items-center justify-center">
                <GlassCard className="w-full max-w-xl p-8 border border-white/10 bg-slate-900/60 text-center">
                    <div className="mx-auto mb-5 h-12 w-12 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
                    <h1 className="text-white text-2xl font-bold mb-2">Redirection en cours</h1>
                    <p className="text-slate-300 text-sm">
                        Chargement du dashboard marchand...
                    </p>
                </GlassCard>
            </main>
        );
    }

    if (isBooting) {
        return (
            <main className="min-h-screen p-4 md:p-8 font-sans flex items-center justify-center">
                <GlassCard className="w-full max-w-xl p-8 border border-white/10 bg-slate-900/60 text-center">
                    <div className="mx-auto mb-5 h-12 w-12 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
                    <h1 className="text-white text-2xl font-bold mb-2">Initialisation du terminal</h1>
                    <p className="text-slate-300 text-sm">
                        Vérification des services monétiques en cours...
                    </p>
                </GlassCard>
            </main>
        );
    }

    return (
        <main className="min-h-screen p-4 md:p-8 font-sans">
            {/* Status Bar */}
            {(bootError || lastBootCheckAt) && (
                <div className="max-w-7xl mx-auto mb-6">
                    <div className={`rounded-xl border px-4 py-3 text-sm flex items-center justify-between gap-4 ${bootError
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                        }`}>
                        <span className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${bootError ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                            {bootError
                                ? `Mode dégradé : ${bootError}`
                                : 'Terminal connecté. Prêt à encaisser.'}
                        </span>
                        <div className="flex items-center gap-4">
                            {lastBootCheckAt && (
                                <span className="text-xs opacity-80">
                                    {lastBootCheckAt.toLocaleTimeString('fr-FR')}
                                </span>
                            )}
                            <Link
                                href={process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}
                                className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
                            >
                                Portail <ExternalLink size={10} />
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-start">

                {/* LEFT COLUMN: THE PHYSICAL TERMINAL */}
                <div className="flex flex-col items-center">
                    <GlassCard
                        className="p-8 rounded-[3rem] w-full max-w-md relative border-t border-white/20 shadow-2xl shadow-blue-900/40 backdrop-blur-2xl bg-black/40"
                        glowColor="blue"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent rounded-[2.5rem] pointer-events-none" />
                        <div className="absolute -inset-1 rounded-[3rem] bg-gradient-to-b from-blue-500/20 to-transparent opacity-50 blur-sm -z-10" />

                        <div className="flex justify-between items-center mb-8 px-2 text-blue-200/60">
                            <span className="font-bold tracking-[0.2em] text-xs uppercase flex items-center gap-2">
                                <Activity size={14} className="text-blue-500" />
                                Ingenico PMP  <span className="text-blue-400">NEO</span>
                            </span>
                            <div className="flex items-center gap-3">
                                <Wifi size={16} className="text-blue-400 animate-pulse" />
                                <div className="w-8 h-4 bg-slate-900/80 rounded-sm border border-slate-700 relative overflow-hidden flex items-center px-0.5">
                                    <div className="h-[80%] w-[90%] bg-gradient-to-r from-green-500 to-green-400 rounded-sm shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-950 rounded-xl p-1 mb-8 shadow-[inset_0_0_20px_rgba(0,0,0,1)] border border-white/5 relative overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                            <TerminalScreen />
                        </div>

                        <div className="mb-10">
                            <Keypad onAmountComplete={handleAmountComplete} />
                        </div>

                        <div className="text-center pb-2 relative">
                            <div className="h-2 w-32 bg-black mx-auto rounded-full shadow-[inset_0_1px_3px_rgba(255,255,255,0.1)] border-b border-white/10" />
                            <div className="absolute left-1/2 -translate-x-1/2 top-4 w-4 h-4 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
                            <p className="text-[10px] text-blue-300/50 mt-3 uppercase tracking-widest font-semibold">NFC Ready</p>
                        </div>
                    </GlassCard>

                    <p className="text-slate-400 text-sm mt-8 text-center max-w-sm">
                        Sélectionnez votre carte et le marchand, entrez le montant, puis validez le paiement.
                    </p>
                </div>

                {/* RIGHT COLUMN: PAYMENT FLOW */}
                <div className="space-y-6">
                    {isClientCheckoutFlow && (
                        <GlassCard className="p-4 border border-amber-500/30 bg-amber-500/10">
                            <p className="text-sm text-amber-100">
                                Mode paiement client: cette page sert uniquement à effectuer le paiement.
                                Les données de compte et l&apos;historique marchand sont disponibles uniquement dans l&apos;espace marchand.
                            </p>
                        </GlassCard>
                    )}

                    {/* PAYMENT FLOW */}
                    {!paymentResult ? (
                        <GlassCard className="p-6 border border-white/10 bg-slate-900/50">
                            {/* Step indicators */}
                            <div className="flex items-center justify-center gap-2 mb-6">
                                {([
                                    { key: 'card', icon: CreditCard, label: 'Carte' },
                                    { key: 'merchant', icon: Store, label: 'Marchand' },
                                    { key: 'amount', icon: Activity, label: 'Montant' },
                                    { key: 'confirm', icon: CheckCircle2, label: 'Confirmer' },
                                ] as Array<{ key: PaymentStep; icon: typeof CreditCard; label: string }>).map((s, i) => {
                                    const steps: PaymentStep[] = ['card', 'merchant', 'amount', 'confirm'];
                                    const currentIdx = steps.indexOf(paymentStep);
                                    const stepIdx = steps.indexOf(s.key);
                                    const isActive = stepIdx === currentIdx;
                                    const isDone = stepIdx < currentIdx;
                                    const canNavigateBack = isDone && !(isMerchantLocked && s.key === 'merchant');

                                    return (
                                        <div key={s.key} className="flex items-center gap-2">
                                            {i > 0 && <div className={`w-6 h-0.5 ${isDone ? 'bg-blue-500' : 'bg-slate-700'}`} />}
                                            <button
                                                onClick={() => { if (canNavigateBack) setPaymentStep(s.key); }}
                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition
                                                    ${isActive ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                    canNavigateBack ? 'bg-emerald-500/10 text-emerald-400 cursor-pointer hover:bg-emerald-500/20' :
                                                    'bg-slate-800/50 text-slate-500'}
                                                `}
                                            >
                                                <s.icon size={14} />
                                                {s.label}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {paymentStep === 'card' && (
                                <CardSelector
                                    selectedCard={selectedCard}
                                    onSelect={(card) => {
                                        setSelectedCard(card);
                                        setPaymentStep(selectedMerchant ? 'amount' : 'merchant');
                                    }}
                                />
                            )}

                            {paymentStep === 'merchant' && (
                                <>
                                    {merchantPrefillLoading && (
                                        <div className="flex items-center justify-center py-6">
                                            <div className="h-5 w-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                                            <span className="ml-3 text-sm text-slate-400">Chargement du marchand sélectionné...</span>
                                        </div>
                                    )}
                                    {!merchantPrefillLoading && merchantPrefillError && (
                                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 mb-3">
                                            {merchantPrefillError}
                                        </div>
                                    )}
                                    {isMerchantLocked && selectedMerchant && !merchantPrefillError ? (
                                        <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                                            <p className="text-sm text-slate-300">
                                                Marchand imposé par le parcours client.
                                            </p>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-400">Marchand</span>
                                                <span className="text-white font-medium">{selectedMerchant.merchantName}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-400">MCC</span>
                                                <span className="text-slate-300">{selectedMerchant.mcc}</span>
                                            </div>
                                            <button
                                                onClick={() => setPaymentStep('amount')}
                                                className="w-full mt-2 py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 transition"
                                            >
                                                Continuer
                                            </button>
                                        </div>
                                    ) : (
                                        <MerchantSelector
                                            selectedMerchant={selectedMerchant}
                                            onSelect={(merchant) => {
                                                setSelectedMerchant(merchant);
                                                setMerchantPrefillError(null);
                                                setPaymentStep('amount');
                                            }}
                                        />
                                    )}
                                </>
                            )}
                            {paymentStep === 'amount' && (
                                <div className="text-center py-4">
                                    <Activity size={32} className="mx-auto mb-3 text-blue-400" />
                                    <h3 className="text-lg font-bold text-white mb-2">Saisir le montant</h3>
                                    <p className="text-sm text-slate-400 mb-4">
                                        Utilisez le clavier du terminal pour entrer le montant puis validez avec OK
                                    </p>
                                    <div className="flex items-center justify-center gap-3 text-sm">
                                        <span className="text-slate-400">Carte:</span>
                                        <span className="font-mono text-white">{selectedCard?.maskedPan}</span>
                                        <ArrowRight size={14} className="text-slate-600" />
                                        <span className="text-slate-400">Marchand:</span>
                                        <span className="font-medium text-white">{selectedMerchant?.merchantName}</span>
                                    </div>
                                    {amount > 0 && (
                                        <div className="mt-4">
                                            <span className="text-3xl font-bold text-white">{amount.toFixed(2)}</span>
                                            <span className="text-lg text-slate-400 ml-2">EUR</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {paymentStep === 'confirm' && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-white text-center mb-4">Confirmer le paiement</h3>
                                    <div className="bg-black/30 rounded-xl p-4 space-y-3 border border-white/5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-400">Carte</span>
                                            <span className="font-mono text-sm text-white">{selectedCard?.maskedPan} ({selectedCard?.network})</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-400">Solde disponible</span>
                                            <span className="text-sm text-emerald-400">{selectedCard?.balance.toFixed(2)} EUR</span>
                                        </div>
                                        <div className="h-px bg-white/10" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-400">Marchand</span>
                                            <span className="text-sm text-white">{selectedMerchant?.merchantName}</span>
                                        </div>
                                        {selectedMerchant?.locationName && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-slate-400">Localisation</span>
                                                <span className="text-sm text-slate-300">{selectedMerchant.locationName}</span>
                                            </div>
                                        )}
                                        <div className="h-px bg-white/10" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-400">Montant</span>
                                            <span className="text-xl font-bold text-white">{amount.toFixed(2)} EUR</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between bg-black/20 rounded-lg p-3 border border-white/5">
                                        <span className="text-sm text-slate-400">3D Secure</span>
                                        <button
                                            onClick={() => setUse3DS(!use3DS)}
                                            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                                                use3DS ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-slate-700/50 text-slate-500 border border-slate-600'
                                            }`}
                                        >
                                            {use3DS ? 'ACTIF' : 'INACTIF'}
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleProcessPayment}
                                        disabled={isProcessing}
                                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${isProcessing
                                            ? 'bg-slate-700 text-slate-400 cursor-wait'
                                            : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-blue-900/30 hover:shadow-blue-800/50 active:scale-[0.98]'
                                        }`}
                                    >
                                        {isProcessing ? (
                                            <span className="flex items-center justify-center gap-3">
                                                <div className="h-5 w-5 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
                                                Traitement en cours...
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-2">
                                                Payer {amount.toFixed(2)} EUR
                                                <ArrowRight size={20} />
                                            </span>
                                        )}
                                    </button>
                                </div>
                            )}
                        </GlassCard>
                    ) : (
                        <GlassCard className={`p-6 border ${paymentResult.success ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                            <div className="text-center py-4">
                                {paymentResult.success ? (
                                    <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-400" />
                                ) : (
                                    <XCircle size={48} className="mx-auto mb-4 text-red-400" />
                                )}

                                <h3 className={`text-2xl font-bold mb-2 ${paymentResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {paymentResult.success ? 'Paiement Approuvé' : 'Paiement Refusé'}
                                </h3>

                                <p className="text-slate-400 mb-1">{amount.toFixed(2)} EUR</p>
                                <p className="text-sm text-slate-500 mb-4">
                                    {selectedMerchant?.merchantName} - {selectedCard?.maskedPan}
                                </p>

                                {paymentResult.success && paymentResult.transaction && (
                                    <div className="bg-black/30 rounded-xl p-3 mb-4 text-left space-y-1 border border-white/5">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Code auth.</span>
                                            <span className="font-mono text-white">{paymentResult.transaction.authorization_code}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Transaction ID</span>
                                            <span className="font-mono text-xs text-slate-300">{paymentResult.transaction.transaction_id}</span>
                                        </div>
                                        {paymentResult.ledgerBooked !== undefined && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">Ledger marchand</span>
                                                <span className={paymentResult.ledgerBooked ? 'text-emerald-400' : 'text-amber-400'}>
                                                    {paymentResult.ledgerBooked ? 'Enregistré' : 'En attente'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!paymentResult.success && (
                                    <div className="bg-black/30 rounded-xl p-3 mb-4 text-left space-y-1 border border-white/5">
                                        {paymentResult.responseCode && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">Code réponse</span>
                                                <span className="font-mono text-red-300">{paymentResult.responseCode}</span>
                                            </div>
                                        )}
                                        {paymentResult.error && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">Motif</span>
                                                <span className="text-red-300">{paymentResult.error}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleNewTransaction}
                                        className="flex-1 py-3 rounded-xl font-medium text-sm bg-white/5 border border-white/10 text-white hover:bg-white/10 transition"
                                    >
                                        Nouvelle transaction
                                    </button>
                                    {paymentResult.success && paymentResult.transaction?.id && (
                                        <a
                                            href={`${process.env.NEXT_PUBLIC_USER_CARDS_URL || 'http://localhost:3004'}/transactions/${paymentResult.transaction.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 py-3 rounded-xl font-medium text-sm bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition flex items-center justify-center gap-2"
                                        >
                                            Voir détails <ExternalLink size={14} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </GlassCard>
                    )}

                    {!isClientCheckoutFlow && (
                        <GlassCard className="p-6 border border-white/10 bg-slate-900/50">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-bold text-sm uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                    <Settings size={16} className="text-blue-500" />
                                    Contrôles terminal
                                </h2>
                                <PremiumButton variant="secondary" size="sm" onClick={toggleTechnicalDetails}>
                                    <FileText size={16} className="mr-2" />
                                    Logs
                                </PremiumButton>
                            </div>
                            <ConfigPanel />
                        </GlassCard>
                    )}

                    {debugMode && (
                        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-500/30">
                            <h3 className="font-mono font-bold text-indigo-400 mb-4 flex items-center gap-2">
                                <Bug /> Debug Output
                            </h3>
                            <DebugView />
                        </div>
                    )}
                </div>

                <TechnicalDetail />
            </div>
        </main>
    );
}

function TerminalPageFallback() {
    return (
        <main className="min-h-screen p-4 md:p-8 font-sans flex items-center justify-center">
            <GlassCard className="w-full max-w-xl p-8 border border-white/10 bg-slate-900/60 text-center">
                <div className="mx-auto mb-5 h-12 w-12 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
                <h1 className="text-white text-2xl font-bold mb-2">Chargement du terminal</h1>
                <p className="text-slate-300 text-sm">
                    Initialisation de l&apos;interface de paiement...
                </p>
            </GlassCard>
        </main>
    );
}

export default function Home() {
    return (
        <Suspense fallback={<TerminalPageFallback />}>
            <HomeContent />
        </Suspense>
    );
}
