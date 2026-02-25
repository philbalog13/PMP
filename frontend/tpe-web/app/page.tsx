'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTerminalStore } from '@/lib/store';
import { getAvailableMerchants, simulateClientPayment, processTransaction } from '@/lib/api-client';
import type { MerchantApi } from '@/lib/api-client';
import type { SelectedMerchant } from '@/lib/store';
import type { CardData } from '@/types/transaction';
import { useAuth } from '@shared/context/AuthContext';
import { Permission, UserRole } from '@shared/types/user';
import { APP_URLS } from '@shared/lib/app-urls';
import { normalizeRole } from '@shared/utils/roleUtils';
import {
    AlertTriangle, Bug, FileText, Settings, Wifi, Activity,
    CreditCard, Store, ArrowRight, CheckCircle2, XCircle,
    ExternalLink, Home as HomeIcon
} from 'lucide-react';

import TerminalScreen from '@/components/terminal/TerminalScreen';
import Keypad from '@/components/terminal/Keypad';
import CardSelector from '@/components/terminal/CardSelector';
import CardReaderSim from '@/components/terminal/CardReaderSim';
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

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return null;
        }

        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

        try {
            const utf8Payload = decodeURIComponent(
                atob(padded)
                    .split('')
                    .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
                    .join('')
            );
            const parsed = JSON.parse(utf8Payload);
            return isRecord(parsed) ? parsed : null;
        } catch {
            const parsed = JSON.parse(atob(padded));
            return isRecord(parsed) ? parsed : null;
        }
    } catch {
        return null;
    }
};

const permissionValues = new Set<string>(Object.values(Permission));

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
    const { isLoading: isAuthLoading, isAuthenticated, token: authToken, user, login } = useAuth();
    const {
        amount,
        selectedType,
        selectedCard,
        selectedMerchant,
        cardData,
        setState,
        setSelectedCard,
        setSelectedMerchant,
        setCardData,
        setLastTransactionId,
        setCurrentTransaction,
        addToHistory,
        debugMode,
        toggleTechnicalDetails,
        reset,
    } = useTerminalStore();

    const requestedMerchantId = searchParams.get('merchantId')?.trim() || null;
    const fromParam = (searchParams.get('from') || '').toLowerCase();
    const urlToken = searchParams.get('token')?.trim() || null;
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
    const [tokenRestored, setTokenRestored] = useState(false);

    // Restore client auth token passed via URL (cross-origin checkout flow)
    useEffect(() => {
        if (!urlToken || tokenRestored) return;

        if (authToken && authToken === urlToken) {
            setTokenRestored(true);
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete('token');
            window.history.replaceState({}, '', cleanUrl.toString());
            return;
        }

        setTokenRestored(true);

        try {
            const payload = decodeJwtPayload(urlToken);
            const role = normalizeRole(payload?.role) || UserRole.CLIENT;
            const payloadPermissions = Array.isArray(payload?.permissions)
                ? payload.permissions.filter(
                    (permission): permission is Permission =>
                        typeof permission === 'string' && permissionValues.has(permission)
                )
                : [];

            const tokenUser = {
                id: (typeof payload?.userId === 'string' && payload.userId)
                    || (typeof payload?.sub === 'string' && payload.sub)
                    || (typeof payload?.id === 'string' && payload.id)
                    || '',
                email: (typeof payload?.email === 'string' && payload.email)
                    || '',
                role,
                permissions: payloadPermissions,
                firstName: (typeof payload?.firstName === 'string' && payload.firstName)
                    || 'Client',
                lastName: (typeof payload?.lastName === 'string' && payload.lastName)
                    || '',
            };

            login(urlToken, tokenUser, null);
        } catch {
            console.error('Failed to restore token from URL');
        } finally {
            // Clean token from URL to avoid leaking it in browser history
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete('token');
            window.history.replaceState({}, '', cleanUrl.toString());
        }
    }, [urlToken, tokenRestored, authToken, login]);

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

    // Auto-select the merchant's own profile when a merchant accesses TPE directly
    useEffect(() => {
        if (isAuthLoading || !isAuthenticated || isClientCheckoutFlow) {
            return;
        }

        if (isMerchantUser && !selectedMerchant && user?.id) {
            // Merchant accessing their own TPE — resolve their own merchant profile
            let active = true;
            const resolveSelf = async () => {
                try {
                    const payload = await getAvailableMerchants();
                    const merchantList = Array.isArray(payload?.merchants) ? payload.merchants : [];
                    // Try to find the merchant matching the authenticated user
                    const self = merchantList.find((m): m is MerchantApi =>
                        typeof m?.id === 'string' && m.id === user.id
                    ) || (merchantList.length > 0 ? merchantList[0] as MerchantApi : null);

                    if (self && active) {
                        setSelectedMerchant(toSelectedMerchant(self));
                    }
                } catch {
                    // Ignore — merchant selector will handle errors
                }
            };
            void resolveSelf();
            return () => { active = false; };
        }
    }, [isAuthLoading, isAuthenticated, isMerchantUser, isClientCheckoutFlow, selectedMerchant, user?.id, setSelectedMerchant]);

    const handleAmountComplete = () => {
        if (isClientCheckoutFlow) {
            // Client flow: card → merchant → amount → confirm
            if (!selectedCard) {
                setPaymentStep('card');
                return;
            }
            if (!selectedMerchant) {
                setPaymentStep('merchant');
                return;
            }
            setPaymentStep('confirm');
        } else {
            // Merchant standalone flow: amount entered on keypad → go straight to confirm
            // (card will be read via CardReaderSim, merchant is self)
            setPaymentStep('confirm');
        }
    };

    const canPay = isClientCheckoutFlow
        ? Boolean(selectedCard && selectedMerchant && amount > 0 && !isProcessing)
        : Boolean(cardData && amount > 0 && !isProcessing);

    // Handle card read from CardReaderSim (merchant standalone mode)
    const handleCardRead = (data: CardData) => {
        setCardData(data);
        setState('amount-input');
    };

    // Client checkout payment handler
    const handleProcessPayment = async () => {
        if (!selectedCard || !selectedMerchant || amount <= 0) {
            setPaymentResult({
                success: false,
                error: !selectedCard ? 'Carte non sélectionnée' : !selectedMerchant ? 'Marchand non sélectionné' : 'Montant invalide',
                responseCode: '99',
            });
            return;
        }

        if (isProcessing) return;

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

            const normalizedError = typeof response.error === 'string'
                ? response.error
                : (typeof response.message === 'string' ? response.message : undefined);
            const normalizedResponseCode = typeof response.responseCode === 'string'
                ? response.responseCode
                : (typeof response.response_code === 'string' ? response.response_code : '96');

            const normalizedResponse: PaymentResultPayload = response.success
                ? response
                : {
                    ...response,
                    success: false,
                    error: normalizedError || 'Aucune reponse exploitable du service paiement.',
                    responseCode: normalizedResponseCode,
                };

            setPaymentResult(normalizedResponse);

            if (normalizedResponse.success) {
                const txn = normalizedResponse.transaction;
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

                setSelectedCard({
                    ...selectedCard,
                    balance: selectedCard.balance - amount,
                });
            } else {
                const errorCode = typeof normalizedResponse.responseCode === 'string'
                    ? normalizedResponse.responseCode
                    : (typeof normalizedResponse.response_code === 'string' ? normalizedResponse.response_code : '05');
                const errorMsg = typeof normalizedResponse.error === 'string'
                    ? normalizedResponse.error
                    : (typeof normalizedResponse.message === 'string' ? normalizedResponse.message : 'Declined');
                const failedTxn = normalizedResponse.transaction;
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

    // Merchant standalone payment handler (uses processTransaction with raw card data)
    const handleMerchantProcessPayment = async () => {
        if (!cardData || amount <= 0) {
            setPaymentResult({
                success: false,
                error: !cardData ? 'Carte non présentée' : 'Montant invalide',
                responseCode: '99',
            });
            return;
        }

        if (isProcessing) return;

        setIsProcessing(true);
        setPaymentResult(null);

        try {
            const result = await processTransaction({
                pan: cardData.pan,
                amount,
                type: selectedType,
                merchantId: selectedMerchant?.id,
                mcc: selectedMerchant?.mcc,
            });

            const maskedPan = `**** **** **** ${cardData.pan.slice(-4)}`;

            if (result.approved) {
                setPaymentResult({
                    success: true,
                    responseCode: result.responseCode,
                    transaction: {
                        authorization_code: result.authorizationCode || result.authCode,
                        response_code: result.responseCode,
                    },
                });

                setCurrentTransaction({
                    approved: true,
                    responseCode: result.responseCode,
                    responseMessage: result.responseMessage,
                    authorizationCode: result.authorizationCode || result.authCode || '',
                    processingTime: result.processingTime,
                    matchedRules: [],
                    timestamp: new Date(),
                });

                addToHistory({
                    id: String(Date.now()),
                    amount,
                    type: selectedType,
                    status: 'APPROVED',
                    responseCode: result.responseCode,
                    authorizationCode: result.authorizationCode || result.authCode || '',
                    maskedPan,
                    timestamp: new Date(),
                    matchedRules: [],
                });

                setState('approved');
            } else {
                setPaymentResult({
                    success: false,
                    error: result.responseMessage,
                    responseCode: result.responseCode,
                });

                setCurrentTransaction({
                    approved: false,
                    responseCode: result.responseCode,
                    responseMessage: result.responseMessage,
                    matchedRules: [],
                    processingTime: result.processingTime,
                    timestamp: new Date(),
                });

                addToHistory({
                    id: `DECLINED-${Date.now()}`,
                    amount,
                    type: selectedType,
                    status: 'DECLINED',
                    responseCode: result.responseCode,
                    authorizationCode: '',
                    maskedPan,
                    timestamp: new Date(),
                    matchedRules: [],
                });

                setState('declined');
            }
        } catch (error: unknown) {
            console.error('Merchant payment error:', error);
            const errMsg = error instanceof Error ? error.message : 'Erreur système';
            setPaymentResult({ success: false, error: errMsg, responseCode: '96' });
            setCurrentTransaction({
                approved: false,
                responseCode: '96',
                responseMessage: errMsg,
                matchedRules: [],
                processingTime: 0,
                timestamp: new Date(),
            });
            setState('declined');
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

    // Wait for token restoration before rendering
    if (isAuthLoading || (urlToken && !tokenRestored)) {
        return (
            <main className="min-h-screen p-4 md:p-8 font-sans flex items-center justify-center">
                <GlassCard className="w-full max-w-xl p-8 border border-white/10 bg-slate-900/60 text-center">
                    <div className="mx-auto mb-5 h-12 w-12 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
                    <h1 className="text-white text-2xl font-bold mb-2">Chargement de la session</h1>
                    <p className="text-slate-300 text-sm">Vérification de l&apos;authentification...</p>
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

    // Client checkout flow without authentication → redirect user to login via user-cards-web
    if (isClientCheckoutFlow && !isAuthenticated) {
        const userCardsUrl = APP_URLS.userCards;
        return (
            <main className="min-h-screen p-4 md:p-8 font-sans flex items-center justify-center">
                <GlassCard className="w-full max-w-xl p-8 border border-white/10 bg-slate-900/60 text-center space-y-5">
                    <AlertTriangle size={48} className="mx-auto text-amber-400" />
                    <h1 className="text-white text-2xl font-bold">Session non authentifiée</h1>
                    <p className="text-slate-300 text-sm">
                        Pour effectuer un paiement client, vous devez être connecté.
                        Accédez à votre espace client pour sélectionner un marchand et payer.
                    </p>
                    <a
                        href={userCardsUrl}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 transition-colors"
                    >
                        Aller à l&apos;espace client
                        <ArrowRight size={18} />
                    </a>
                </GlassCard>
            </main>
        );
    }

    return (
        <main className="min-h-screen p-4 md:p-8 font-sans">
            {/* Status Bar */}
            {(bootError || lastBootCheckAt) && (
                <div className="max-w-7xl mx-auto mb-4 space-y-2">
                    {/* Bandeau marchand actif */}
                    {selectedMerchant && (
                        <div className="rounded-xl border border-blue-500/30 bg-blue-500/8 px-4 py-3 flex flex-wrap items-center gap-4 text-sm">
                            <div className="flex items-center gap-2 text-blue-200 font-semibold">
                                <Store size={16} className="text-blue-400" />
                                {selectedMerchant.merchantName}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                                {selectedMerchant.terminalId && (
                                    <span className="flex items-center gap-1">
                                        <span className="text-slate-500 uppercase tracking-wider">TID</span>
                                        <span className="font-mono text-slate-300">{selectedMerchant.terminalId}</span>
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <span className="text-slate-500 uppercase tracking-wider">MID</span>
                                    <span className="font-mono text-slate-300">{selectedMerchant.id.slice(0, 14)}…</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="text-slate-500 uppercase tracking-wider">MCC</span>
                                    <span className="font-mono text-slate-300">{selectedMerchant.mcc}</span>
                                </span>
                                {selectedMerchant.locationName && (
                                    <span className="text-slate-400">{selectedMerchant.locationName}</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Status système */}
                    <div className={`rounded-xl border px-4 py-2.5 text-sm flex items-center justify-between gap-4 ${bootError
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
                            {isClientCheckoutFlow ? (
                                <a
                                    href={APP_URLS.userCards}
                                    className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
                                >
                                    Dashboard client <ExternalLink size={10} />
                                </a>
                            ) : (
                                <Link
                                    href={process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}
                                    className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
                                >
                                    Portail <ExternalLink size={10} />
                                </Link>
                            )}
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
                                    // Only allow going BACK to completed steps, never forward.
                                    // Even in locked-merchant checkout, allow opening "Marchand" step to inspect it.
                                    const canNavigateBack = isDone;

                                    return (
                                        <div key={s.key} className="flex items-center gap-2">
                                            {i > 0 && <div className={`w-6 h-0.5 ${isDone ? 'bg-blue-500' : 'bg-slate-700'}`} />}
                                            <button
                                                onClick={() => { if (canNavigateBack) setPaymentStep(s.key); }}
                                                disabled={!canNavigateBack && !isActive}
                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition
                                                    ${isActive ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                        isDone ? 'bg-emerald-500/10 text-emerald-400 cursor-pointer hover:bg-emerald-500/20' :
                                                            'bg-slate-800/50 text-slate-500 cursor-not-allowed'}
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
                                        Utilisez le clavier du terminal pour entrer le montant puis appuyez sur VALIDER
                                    </p>
                                    <div className="flex items-center justify-center gap-3 text-sm flex-wrap">
                                        <span className="text-slate-400">Carte:</span>
                                        <span className="font-mono text-white">{selectedCard?.maskedPan || '—'}</span>
                                        <ArrowRight size={14} className="text-slate-600" />
                                        <span className="text-slate-400">Marchand:</span>
                                        <span className="font-medium text-white">{selectedMerchant?.merchantName || '—'}</span>
                                    </div>
                                    {amount > 0 && (
                                        <div className="mt-4 space-y-4">
                                            <div>
                                                <span className="text-3xl font-bold text-white">{amount.toFixed(2)}</span>
                                                <span className="text-lg text-slate-400 ml-2">EUR</span>
                                            </div>
                                            <button
                                                onClick={handleAmountComplete}
                                                className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg"
                                            >
                                                Continuer vers la confirmation
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {paymentStep === 'confirm' && !selectedCard && (
                                <div className="text-center py-6">
                                    <AlertTriangle size={32} className="mx-auto mb-3 text-amber-400" />
                                    <h3 className="text-lg font-bold text-white mb-2">Carte non sélectionnée</h3>
                                    <p className="text-sm text-slate-400 mb-4">
                                        Veuillez d&apos;abord sélectionner une carte pour continuer.
                                    </p>
                                    <button
                                        onClick={() => setPaymentStep('card')}
                                        className="px-6 py-3 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition font-medium"
                                    >
                                        Sélectionner une carte
                                    </button>
                                </div>
                            )}

                            {paymentStep === 'confirm' && selectedCard && !selectedMerchant && (
                                <div className="text-center py-6">
                                    <AlertTriangle size={32} className="mx-auto mb-3 text-amber-400" />
                                    <h3 className="text-lg font-bold text-white mb-2">Marchand non sélectionné</h3>
                                    <p className="text-sm text-slate-400 mb-4">
                                        Veuillez d&apos;abord sélectionner un marchand pour continuer.
                                    </p>
                                    <button
                                        onClick={() => setPaymentStep('merchant')}
                                        className="px-6 py-3 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 transition font-medium"
                                    >
                                        Sélectionner un marchand
                                    </button>
                                </div>
                            )}

                            {paymentStep === 'confirm' && selectedCard && selectedMerchant && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-white text-center mb-4">Confirmer le paiement</h3>
                                    <div className="bg-black/30 rounded-xl p-4 space-y-3 border border-white/5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-400">Carte</span>
                                            <span className="font-mono text-sm text-white">{selectedCard.maskedPan} ({selectedCard.network})</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-400">Solde disponible</span>
                                            <span className="text-sm text-emerald-400">{selectedCard.balance.toFixed(2)} EUR</span>
                                        </div>
                                        <div className="h-px bg-white/10" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-400">Marchand</span>
                                            <span className="text-sm text-white">{selectedMerchant.merchantName}</span>
                                        </div>
                                        {selectedMerchant.locationName && (
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
                                            className={`px-3 py-1 rounded-full text-xs font-bold transition ${use3DS ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-slate-700/50 text-slate-500 border border-slate-600'
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

                                <div className="flex flex-col gap-2">
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
                                    {isClientCheckoutFlow && (
                                        <a
                                            href={APP_URLS.userCards}
                                            className="w-full py-3 rounded-xl font-medium text-sm bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition flex items-center justify-center gap-2"
                                        >
                                            <HomeIcon size={15} />
                                            Retour au tableau de bord
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
