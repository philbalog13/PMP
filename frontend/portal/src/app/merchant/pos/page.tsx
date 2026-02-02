'use client';

import { useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import {
    CreditCard,
    Wifi,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Smartphone,
    Keyboard,
    Eye,
    EyeOff,
    RotateCcw,
    Receipt,
    Printer,
    Info,
    ArrowRight,
    Clock,
    Shield
} from 'lucide-react';

type PaymentMode = 'chip' | 'contactless' | 'manual';
type TransactionStep = 'idle' | 'amount' | 'card' | 'pin' | 'processing' | 'result';

interface TransactionResult {
    success: boolean;
    authCode?: string;
    responseCode: string;
    responseMessage: string;
    rrn?: string;
    timestamp: string;
}

export default function POSTerminalPage() {
    const { isLoading } = useAuth(true);
    const [step, setStep] = useState<TransactionStep>('idle');
    const [amount, setAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('contactless');
    const [cardNumber, setCardNumber] = useState('');
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [result, setResult] = useState<TransactionResult | null>(null);
    const [showIso8583, setShowIso8583] = useState(false);

    const formatAmount = (value: string) => {
        const num = value.replace(/[^\d]/g, '');
        if (!num) return '';
        const cents = parseInt(num) / 100;
        return cents.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handleAmountInput = (digit: string) => {
        if (digit === 'clear') {
            setAmount('');
            return;
        }
        if (digit === 'backspace') {
            setAmount(prev => prev.slice(0, -1));
            return;
        }
        if (amount.replace(/[^\d]/g, '').length < 8) {
            const newAmount = amount.replace(/[^\d]/g, '') + digit;
            setAmount(formatAmount(newAmount));
        }
    };

    const handlePinInput = (digit: string) => {
        if (digit === 'clear') {
            setPin('');
            return;
        }
        if (digit === 'backspace') {
            setPin(prev => prev.slice(0, -1));
            return;
        }
        if (pin.length < 4) {
            setPin(prev => prev + digit);
        }
    };

    const startTransaction = () => {
        if (!amount || parseFloat(amount.replace(/\s/g, '').replace(',', '.')) === 0) return;
        setStep('card');
    };

    const processCard = () => {
        // Simulate card reading
        if (paymentMode === 'manual') {
            if (!cardNumber || cardNumber.length < 16) return;
        }
        setCardNumber(cardNumber || '4532892176544532');
        if (paymentMode === 'chip') {
            setStep('pin');
        } else {
            processTransaction();
        }
    };

    const verifyPin = () => {
        if (pin.length !== 4) return;
        processTransaction();
    };

    const processTransaction = () => {
        setStep('processing');

        // Simulate network delay
        setTimeout(() => {
            const amountNum = parseFloat(amount.replace(/\s/g, '').replace(',', '.'));
            const success = amountNum < 1000 && Math.random() > 0.1; // 90% success rate for < 1000 EUR

            setResult({
                success,
                authCode: success ? Math.random().toString(36).substring(2, 8).toUpperCase() : undefined,
                responseCode: success ? '00' : '51',
                responseMessage: success ? 'APPROUVEE' : 'FONDS INSUFFISANTS',
                rrn: Math.random().toString().slice(2, 14),
                timestamp: new Date().toISOString()
            });
            setStep('result');
        }, 2000);
    };

    const resetTerminal = () => {
        setStep('idle');
        setAmount('');
        setCardNumber('');
        setPin('');
        setResult(null);
    };

    const generateIso8583Request = () => {
        const amountCents = Math.round(parseFloat(amount.replace(/\s/g, '').replace(',', '.')) * 100);
        const now = new Date();
        return `MTI: 0100 (Authorization Request)
DE002: ${cardNumber.slice(0, 6)}******${cardNumber.slice(-4)} (PAN)
DE003: 000000 (Processing Code - Purchase)
DE004: ${amountCents.toString().padStart(12, '0')} (Amount)
DE007: ${now.toISOString().replace(/[-:T]/g, '').slice(0, 10)} (Transmission Date/Time)
DE011: ${Math.floor(Math.random() * 999999).toString().padStart(6, '0')} (STAN)
DE012: ${now.toTimeString().slice(0, 8).replace(/:/g, '')} (Local Time)
DE013: ${now.toISOString().slice(5, 10).replace('-', '')} (Local Date)
DE014: ${cardNumber ? '2712' : ''} (Expiration Date)
DE022: ${paymentMode === 'contactless' ? '071' : paymentMode === 'chip' ? '051' : '012'} (POS Entry Mode)
DE023: 001 (Card Sequence Number)
DE025: 00 (POS Condition Code)
DE026: 12 (PIN Capture Code)
DE032: 123456 (Acquiring Institution ID)
DE035: ${cardNumber}D2712... (Track 2 Data)
DE037: ${Math.random().toString(36).substring(2, 14).toUpperCase()} (RRN)
DE041: POS-001         (Terminal ID)
DE042: MERCHANT001     (Merchant ID)
DE043: PMP BAKERY            PARIS         FR
DE049: 978 (Currency Code - EUR)
DE052: ${paymentMode === 'chip' ? '****PIN_BLOCK****' : ''} (PIN Data)
DE055: 9F26...9F27... (EMV Data)`;
    };

    const generateIso8583Response = () => {
        if (!result) return '';
        return `MTI: 0110 (Authorization Response)
DE002: ${cardNumber.slice(0, 6)}******${cardNumber.slice(-4)} (PAN)
DE003: 000000 (Processing Code)
DE004: ${Math.round(parseFloat(amount.replace(/\s/g, '').replace(',', '.')) * 100).toString().padStart(12, '0')} (Amount)
DE011: ${result.rrn?.slice(0, 6)} (STAN)
DE037: ${result.rrn} (RRN)
DE038: ${result.authCode || ''} (Authorization Code)
DE039: ${result.responseCode} (Response Code - ${result.responseMessage})
DE041: POS-001         (Terminal ID)
DE042: MERCHANT001     (Merchant ID)
DE055: 91...9F27... (EMV Response Data)`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pt-24 pb-12">
            <div className="max-w-5xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Terminal de Paiement Électronique</h1>
                    <p className="text-slate-400">
                        Simulez un encaissement avec visualisation des messages ISO 8583
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* POS Terminal */}
                    <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-6 border border-white/10 shadow-2xl">
                        {/* Terminal Screen */}
                        <div className="bg-slate-950 rounded-2xl p-6 mb-6 min-h-[300px] border border-slate-700">
                            {/* Idle State */}
                            {step === 'idle' && (
                                <div className="h-full flex flex-col">
                                    <div className="text-center mb-6">
                                        <p className="text-slate-400 text-sm mb-2">Montant à encaisser</p>
                                        <p className="text-4xl font-bold text-white font-mono">
                                            {amount || '0,00'} <span className="text-2xl">EUR</span>
                                        </p>
                                    </div>

                                    {/* Payment Mode Selection */}
                                    <div className="grid grid-cols-3 gap-2 mb-6">
                                        <button
                                            onClick={() => setPaymentMode('contactless')}
                                            className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-colors ${
                                                paymentMode === 'contactless'
                                                    ? 'bg-purple-500/20 border-2 border-purple-500'
                                                    : 'bg-slate-800 border-2 border-transparent hover:border-slate-600'
                                            }`}
                                        >
                                            <Wifi size={20} className={`rotate-90 ${paymentMode === 'contactless' ? 'text-purple-400' : 'text-slate-400'}`} />
                                            <span className="text-xs text-slate-300">Sans contact</span>
                                        </button>
                                        <button
                                            onClick={() => setPaymentMode('chip')}
                                            className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-colors ${
                                                paymentMode === 'chip'
                                                    ? 'bg-purple-500/20 border-2 border-purple-500'
                                                    : 'bg-slate-800 border-2 border-transparent hover:border-slate-600'
                                            }`}
                                        >
                                            <CreditCard size={20} className={paymentMode === 'chip' ? 'text-purple-400' : 'text-slate-400'} />
                                            <span className="text-xs text-slate-300">Puce</span>
                                        </button>
                                        <button
                                            onClick={() => setPaymentMode('manual')}
                                            className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-colors ${
                                                paymentMode === 'manual'
                                                    ? 'bg-purple-500/20 border-2 border-purple-500'
                                                    : 'bg-slate-800 border-2 border-transparent hover:border-slate-600'
                                            }`}
                                        >
                                            <Keyboard size={20} className={paymentMode === 'manual' ? 'text-purple-400' : 'text-slate-400'} />
                                            <span className="text-xs text-slate-300">Manuel</span>
                                        </button>
                                    </div>

                                    {/* Keypad */}
                                    <div className="grid grid-cols-3 gap-2">
                                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'].map((key) => (
                                            <button
                                                key={key}
                                                onClick={() => handleAmountInput(key)}
                                                className={`p-4 rounded-xl font-bold text-lg transition-colors ${
                                                    key === 'clear'
                                                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                                        : key === 'backspace'
                                                        ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                                                        : 'bg-slate-800 text-white hover:bg-slate-700'
                                                }`}
                                            >
                                                {key === 'clear' ? 'C' : key === 'backspace' ? '←' : key}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Card Reading State */}
                            {step === 'card' && (
                                <div className="h-full flex flex-col items-center justify-center">
                                    {paymentMode === 'manual' ? (
                                        <div className="w-full">
                                            <p className="text-slate-400 text-sm text-center mb-4">Entrez le numéro de carte</p>
                                            <input
                                                type="text"
                                                value={cardNumber}
                                                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                                                placeholder="4532 8921 7654 4532"
                                                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white text-center font-mono text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            />
                                            <p className="text-xs text-slate-500 text-center mt-2">
                                                (Test: 4532892176544532)
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 animate-pulse">
                                                {paymentMode === 'contactless' ? (
                                                    <Wifi size={40} className="text-purple-400 rotate-90" />
                                                ) : (
                                                    <CreditCard size={40} className="text-purple-400" />
                                                )}
                                            </div>
                                            <p className="text-white text-lg font-medium mb-2">
                                                {paymentMode === 'contactless'
                                                    ? 'Présentez votre carte'
                                                    : 'Insérez votre carte'}
                                            </p>
                                            <p className="text-slate-400 text-sm">
                                                {amount} EUR
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* PIN Entry State */}
                            {step === 'pin' && (
                                <div className="h-full flex flex-col">
                                    <p className="text-slate-400 text-sm text-center mb-4">Entrez votre code PIN</p>
                                    <div className="flex justify-center gap-3 mb-6">
                                        {[0, 1, 2, 3].map((i) => (
                                            <div
                                                key={i}
                                                className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center ${
                                                    pin.length > i
                                                        ? 'border-purple-500 bg-purple-500/20'
                                                        : 'border-slate-600'
                                                }`}
                                            >
                                                {pin.length > i && (
                                                    showPin ? (
                                                        <span className="text-white font-bold">{pin[i]}</span>
                                                    ) : (
                                                        <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                                                    )
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => setShowPin(!showPin)}
                                        className="flex items-center justify-center gap-2 text-slate-400 text-sm mb-4"
                                    >
                                        {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                                        {showPin ? 'Masquer' : 'Afficher'}
                                    </button>

                                    <div className="grid grid-cols-3 gap-2">
                                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'].map((key) => (
                                            <button
                                                key={key}
                                                onClick={() => handlePinInput(key)}
                                                className={`p-3 rounded-xl font-bold transition-colors ${
                                                    key === 'clear'
                                                        ? 'bg-red-500/20 text-red-400'
                                                        : key === 'backspace'
                                                        ? 'bg-yellow-500/20 text-yellow-400'
                                                        : 'bg-slate-800 text-white hover:bg-slate-700'
                                                }`}
                                            >
                                                {key === 'clear' ? 'C' : key === 'backspace' ? '←' : key}
                                            </button>
                                        ))}
                                    </div>

                                    <p className="text-xs text-slate-500 text-center mt-4">(Test PIN: 1234)</p>
                                </div>
                            )}

                            {/* Processing State */}
                            {step === 'processing' && (
                                <div className="h-full flex flex-col items-center justify-center">
                                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500/30 border-t-purple-500 mb-6"></div>
                                    <p className="text-white text-lg font-medium mb-2">Traitement en cours...</p>
                                    <p className="text-slate-400 text-sm">Communication avec le réseau</p>
                                </div>
                            )}

                            {/* Result State */}
                            {step === 'result' && result && (
                                <div className="h-full flex flex-col items-center justify-center">
                                    {result.success ? (
                                        <>
                                            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                                                <CheckCircle2 size={40} className="text-emerald-400" />
                                            </div>
                                            <p className="text-2xl font-bold text-white mb-2">APPROUVÉE</p>
                                            <p className="text-emerald-400 font-mono mb-4">{amount} EUR</p>
                                            <div className="text-center text-sm text-slate-400 space-y-1">
                                                <p>Auth: <span className="text-white font-mono">{result.authCode}</span></p>
                                                <p>RRN: <span className="text-white font-mono">{result.rrn}</span></p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                                                <XCircle size={40} className="text-red-400" />
                                            </div>
                                            <p className="text-2xl font-bold text-white mb-2">REFUSÉE</p>
                                            <p className="text-red-400 mb-4">{result.responseMessage}</p>
                                            <p className="text-sm text-slate-400">Code: {result.responseCode}</p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Terminal Buttons */}
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={resetTerminal}
                                className="p-4 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
                            >
                                <RotateCcw size={20} />
                                Annuler
                            </button>

                            {step === 'idle' && (
                                <button
                                    onClick={startTransaction}
                                    disabled={!amount}
                                    className="col-span-2 p-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
                                >
                                    Valider
                                    <ArrowRight size={20} />
                                </button>
                            )}

                            {step === 'card' && (
                                <button
                                    onClick={processCard}
                                    className="col-span-2 p-4 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 font-semibold"
                                >
                                    {paymentMode === 'manual' ? 'Valider' : 'Simuler lecture'}
                                    <CreditCard size={20} />
                                </button>
                            )}

                            {step === 'pin' && (
                                <button
                                    onClick={verifyPin}
                                    disabled={pin.length !== 4}
                                    className="col-span-2 p-4 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
                                >
                                    Confirmer PIN
                                    <Shield size={20} />
                                </button>
                            )}

                            {step === 'result' && (
                                <>
                                    <button className="p-4 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors flex items-center justify-center gap-2">
                                        <Printer size={20} />
                                        Ticket
                                    </button>
                                    <button
                                        onClick={resetTerminal}
                                        className="p-4 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 font-semibold"
                                    >
                                        Nouvelle vente
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* ISO 8583 Messages Panel */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-white">Messages ISO 8583</h2>
                            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full flex items-center gap-1">
                                <Info size={12} /> Pédagogique
                            </span>
                        </div>

                        {/* Request Message */}
                        <div className="bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setShowIso8583(!showIso8583)}
                                className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/20 rounded-lg">
                                        <ArrowRight size={16} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">0100 - Authorization Request</p>
                                        <p className="text-xs text-slate-400">Message envoyé au réseau</p>
                                    </div>
                                </div>
                                <Eye size={18} className="text-slate-400" />
                            </button>

                            {showIso8583 && (step === 'processing' || step === 'result') && (
                                <div className="p-4 bg-slate-900 border-t border-white/5">
                                    <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">
                                        {generateIso8583Request()}
                                    </pre>
                                </div>
                            )}
                        </div>

                        {/* Response Message */}
                        {step === 'result' && result && (
                            <div className="bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setShowIso8583(!showIso8583)}
                                    className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${result.success ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                                            <ArrowRight size={16} className={`rotate-180 ${result.success ? 'text-emerald-400' : 'text-red-400'}`} />
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">0110 - Authorization Response</p>
                                            <p className={`text-xs ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                                Code {result.responseCode}: {result.responseMessage}
                                            </p>
                                        </div>
                                    </div>
                                    <Eye size={18} className="text-slate-400" />
                                </button>

                                {showIso8583 && (
                                    <div className="p-4 bg-slate-900 border-t border-white/5">
                                        <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">
                                            {generateIso8583Response()}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Response Codes Reference */}
                        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                            <h3 className="text-sm font-medium text-white mb-3">Codes de réponse courants</h3>
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-mono">00</span>
                                    <span className="text-slate-300">Approuvée</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded font-mono">51</span>
                                    <span className="text-slate-300">Fonds insuffisants</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded font-mono">14</span>
                                    <span className="text-slate-300">Numéro de carte invalide</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded font-mono">54</span>
                                    <span className="text-slate-300">Carte expirée</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded font-mono">05</span>
                                    <span className="text-slate-300">Ne pas honorer</span>
                                </div>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                            <div className="flex items-start gap-3">
                                <Info size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-slate-300">
                                    <p className="font-medium text-white mb-1">Mode simulation</p>
                                    <p>
                                        Les montants {'<'} 1000 EUR sont approuvés à 90%.
                                        Le PIN de test est <code className="text-purple-400">1234</code>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
