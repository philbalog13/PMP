'use client';

import { useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import {
    CreditCard,
    Shield,
    ShoppingBag,
    Wifi,
    CheckCircle2,
    AlertTriangle,
    ArrowRight,
    Lock,
    Globe,
    Smartphone,
    RefreshCw,
    Eye,
    Info
} from 'lucide-react';

type PaymentMethod = 'online' | 'contactless';
type PaymentStep = 'select' | 'details' | '3ds' | 'processing' | 'result';

interface Card {
    id: string;
    lastFour: string;
    type: 'visa' | 'mastercard';
    balance: number;
    is3dsEnabled: boolean;
}

const mockCards: Card[] = [
    { id: '1', lastFour: '4532', type: 'visa', balance: 2450.75, is3dsEnabled: true },
    { id: '2', lastFour: '8921', type: 'mastercard', balance: 890.50, is3dsEnabled: false },
];

export default function PayPage() {
    const { isLoading } = useAuth(true);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('online');
    const [step, setStep] = useState<PaymentStep>('select');
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);
    const [amount, setAmount] = useState('');
    const [merchant, setMerchant] = useState('');
    const [is3dsRequired, setIs3dsRequired] = useState(true);
    const [otp, setOtp] = useState('');
    const [paymentResult, setPaymentResult] = useState<'success' | 'failed' | null>(null);
    const [showIso8583, setShowIso8583] = useState(false);

    const handleStartPayment = () => {
        if (!selectedCard || !amount || !merchant) return;
        setStep('details');
    };

    const handleConfirmDetails = () => {
        if (selectedCard?.is3dsEnabled && is3dsRequired) {
            setStep('3ds');
        } else {
            processPayment();
        }
    };

    const handleVerify3DS = () => {
        if (otp === '123456') {
            processPayment();
        } else {
            setPaymentResult('failed');
            setStep('result');
        }
    };

    const processPayment = () => {
        setStep('processing');
        setTimeout(() => {
            const success = parseFloat(amount) <= (selectedCard?.balance || 0);
            setPaymentResult(success ? 'success' : 'failed');
            setStep('result');
        }, 2000);
    };

    const resetPayment = () => {
        setStep('select');
        setSelectedCard(null);
        setAmount('');
        setMerchant('');
        setOtp('');
        setPaymentResult(null);
    };

    // ISO 8583 Message simulation
    const generateIso8583 = () => {
        const now = new Date();
        return {
            mti: '0100',
            de2: `${selectedCard?.type === 'visa' ? '4' : '5'}xxxxxx${selectedCard?.lastFour}`,
            de3: '000000',
            de4: (parseFloat(amount) * 100).toString().padStart(12, '0'),
            de7: now.toISOString().replace(/[-:T]/g, '').slice(0, 10),
            de11: Math.floor(Math.random() * 999999).toString().padStart(6, '0'),
            de12: now.toTimeString().slice(0, 8).replace(/:/g, ''),
            de13: now.toISOString().slice(5, 10).replace('-', ''),
            de18: '5411',
            de22: paymentMethod === 'contactless' ? '071' : '812',
            de25: '00',
            de26: '12',
            de32: '123456',
            de37: Math.random().toString(36).substring(2, 14).toUpperCase(),
            de41: 'TERMINAL01',
            de42: merchant.slice(0, 15).padEnd(15, ' '),
            de43: `${merchant}           Paris         FR`,
            de49: '978',
            de55: selectedCard?.is3dsEnabled ? 'EMV_DATA_3DS_ENABLED' : '',
        };
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pt-24 pb-12">
            <div className="max-w-3xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Simuler un paiement</h1>
                    <p className="text-slate-400">
                        Testez le flux de paiement en ligne ou sans contact
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {['select', 'details', '3ds', 'processing', 'result'].map((s, index) => (
                        <div key={s} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                step === s
                                    ? 'bg-amber-500 text-white'
                                    : ['select', 'details', '3ds', 'processing', 'result'].indexOf(step) > index
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-700 text-slate-400'
                            }`}>
                                {index + 1}
                            </div>
                            {index < 4 && (
                                <div className={`w-12 h-0.5 ${
                                    ['select', 'details', '3ds', 'processing', 'result'].indexOf(step) > index
                                        ? 'bg-emerald-500'
                                        : 'bg-slate-700'
                                }`}></div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Step: Select Payment Method & Card */}
                {step === 'select' && (
                    <div className="space-y-6">
                        {/* Payment Method */}
                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-white mb-4">Type de paiement</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setPaymentMethod('online')}
                                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                                        paymentMethod === 'online'
                                            ? 'border-amber-500 bg-amber-500/10'
                                            : 'border-white/10 hover:border-white/30'
                                    }`}
                                >
                                    <Globe size={24} className={paymentMethod === 'online' ? 'text-amber-400' : 'text-slate-400'} />
                                    <p className="text-white font-medium mt-2">Paiement en ligne</p>
                                    <p className="text-sm text-slate-400">E-commerce, abonnements</p>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('contactless')}
                                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                                        paymentMethod === 'contactless'
                                            ? 'border-amber-500 bg-amber-500/10'
                                            : 'border-white/10 hover:border-white/30'
                                    }`}
                                >
                                    <Wifi size={24} className={`rotate-90 ${paymentMethod === 'contactless' ? 'text-amber-400' : 'text-slate-400'}`} />
                                    <p className="text-white font-medium mt-2">Sans contact</p>
                                    <p className="text-sm text-slate-400">NFC, terminal de paiement</p>
                                </button>
                            </div>
                        </div>

                        {/* Card Selection */}
                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-white mb-4">Carte à utiliser</h2>
                            <div className="space-y-3">
                                {mockCards.map((card) => (
                                    <button
                                        key={card.id}
                                        onClick={() => setSelectedCard(card)}
                                        className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center justify-between ${
                                            selectedCard?.id === card.id
                                                ? 'border-amber-500 bg-amber-500/10'
                                                : 'border-white/10 hover:border-white/30'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-lg ${
                                                card.type === 'visa' ? 'bg-blue-500/20' : 'bg-orange-500/20'
                                            }`}>
                                                <CreditCard size={20} className={
                                                    card.type === 'visa' ? 'text-blue-400' : 'text-orange-400'
                                                } />
                                            </div>
                                            <div>
                                                <p className="text-white font-mono">•••• {card.lastFour}</p>
                                                <p className="text-sm text-slate-400">
                                                    Solde: {card.balance.toLocaleString('fr-FR')} EUR
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {card.is3dsEnabled && (
                                                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full flex items-center gap-1">
                                                    <Shield size={12} /> 3DS
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Transaction Details */}
                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-white mb-4">Détails de la transaction</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-slate-400 mb-2 block">Marchand</label>
                                    <input
                                        type="text"
                                        value={merchant}
                                        onChange={(e) => setMerchant(e.target.value)}
                                        placeholder="Ex: Amazon, Carrefour, FNAC..."
                                        className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-slate-400 mb-2 block">Montant (EUR)</label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                    />
                                </div>
                                {paymentMethod === 'online' && selectedCard?.is3dsEnabled && (
                                    <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                                        <input
                                            type="checkbox"
                                            checked={is3dsRequired}
                                            onChange={(e) => setIs3dsRequired(e.target.checked)}
                                            className="w-4 h-4 accent-amber-500"
                                        />
                                        <div>
                                            <p className="text-sm text-white">Authentification 3D Secure</p>
                                            <p className="text-xs text-slate-400">Sécurité renforcée avec OTP</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleStartPayment}
                            disabled={!selectedCard || !amount || !merchant}
                            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            Continuer
                            <ArrowRight size={20} />
                        </button>
                    </div>
                )}

                {/* Step: Confirm Details */}
                {step === 'details' && (
                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 space-y-6">
                        <h2 className="text-lg font-semibold text-white">Confirmer le paiement</h2>

                        <div className="p-4 bg-slate-900/50 rounded-xl space-y-3">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Marchand</span>
                                <span className="text-white font-medium">{merchant}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Montant</span>
                                <span className="text-white font-bold text-xl">
                                    {parseFloat(amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Carte</span>
                                <span className="text-white font-mono">•••• {selectedCard?.lastFour}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Type</span>
                                <span className="text-white capitalize">{paymentMethod === 'online' ? 'En ligne' : 'Sans contact'}</span>
                            </div>
                            {is3dsRequired && selectedCard?.is3dsEnabled && (
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Sécurité</span>
                                    <span className="text-blue-400 flex items-center gap-1">
                                        <Shield size={14} /> 3D Secure activé
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* ISO 8583 Preview */}
                        <button
                            onClick={() => setShowIso8583(!showIso8583)}
                            className="w-full flex items-center justify-between p-3 bg-slate-900/50 rounded-xl text-slate-400 hover:text-white transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <Eye size={16} />
                                Voir le message ISO 8583
                            </span>
                            <span className="text-xs bg-slate-700 px-2 py-1 rounded">Pédagogique</span>
                        </button>

                        {showIso8583 && (
                            <div className="p-4 bg-slate-900 rounded-xl font-mono text-xs overflow-x-auto">
                                <div className="text-emerald-400 mb-2">// Message ISO 8583 - Authorization Request (0100)</div>
                                {Object.entries(generateIso8583()).map(([key, value]) => (
                                    <div key={key} className="flex gap-4">
                                        <span className="text-blue-400 w-12">{key}:</span>
                                        <span className="text-slate-300">{value || '-'}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button
                                onClick={() => setStep('select')}
                                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
                            >
                                Retour
                            </button>
                            <button
                                onClick={handleConfirmDetails}
                                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                                <Lock size={18} />
                                Payer
                            </button>
                        </div>
                    </div>
                )}

                {/* Step: 3D Secure */}
                {step === '3ds' && (
                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 space-y-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Shield size={32} className="text-blue-400" />
                            </div>
                            <h2 className="text-lg font-semibold text-white">Authentification 3D Secure</h2>
                            <p className="text-slate-400 mt-2">
                                Un code de vérification a été envoyé sur votre téléphone
                            </p>
                        </div>

                        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                            <div className="flex items-center gap-3 mb-3">
                                <Smartphone size={20} className="text-blue-400" />
                                <span className="text-white">Code SMS reçu : <span className="font-mono text-emerald-400">123456</span></span>
                            </div>
                            <p className="text-xs text-slate-400">
                                (Mode simulation - entrez ce code pour valider)
                            </p>
                        </div>

                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Code de vérification</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="Entrez le code à 6 chiffres"
                                maxLength={6}
                                className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white text-center text-2xl font-mono tracking-widest placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setStep('details')}
                                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
                            >
                                Retour
                            </button>
                            <button
                                onClick={handleVerify3DS}
                                disabled={otp.length !== 6}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Vérifier
                            </button>
                        </div>
                    </div>
                )}

                {/* Step: Processing */}
                {step === 'processing' && (
                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-12 text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-500/30 border-t-amber-500 mx-auto mb-6"></div>
                        <h2 className="text-lg font-semibold text-white mb-2">Traitement en cours...</h2>
                        <p className="text-slate-400">Communication avec le réseau bancaire</p>
                    </div>
                )}

                {/* Step: Result */}
                {step === 'result' && (
                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 space-y-6">
                        <div className="text-center">
                            {paymentResult === 'success' ? (
                                <>
                                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 size={40} className="text-emerald-400" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Paiement accepté !</h2>
                                    <p className="text-slate-400">
                                        Votre transaction de {parseFloat(amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR a été validée
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <AlertTriangle size={40} className="text-red-400" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Paiement refusé</h2>
                                    <p className="text-slate-400">
                                        {otp !== '123456' && otp.length === 6
                                            ? 'Code 3D Secure incorrect'
                                            : 'Solde insuffisant ou carte bloquée'}
                                    </p>
                                </>
                            )}
                        </div>

                        {paymentResult === 'success' && (
                            <div className="p-4 bg-slate-900/50 rounded-xl space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Numéro de transaction</span>
                                    <span className="text-white font-mono">{Math.random().toString(36).substring(2, 14).toUpperCase()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Code d'autorisation</span>
                                    <span className="text-white font-mono">{Math.random().toString(36).substring(2, 8).toUpperCase()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Date</span>
                                    <span className="text-white">{new Date().toLocaleString('fr-FR')}</span>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={resetPayment}
                            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={18} />
                            Nouvelle simulation
                        </button>
                    </div>
                )}

                {/* Info Box */}
                <div className="mt-8 p-4 bg-slate-800/30 border border-white/5 rounded-xl">
                    <div className="flex items-start gap-3">
                        <Info size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-slate-400">
                            <p className="font-medium text-white mb-1">Mode simulation</p>
                            <p>
                                Cette page simule le flux de paiement à des fins pédagogiques.
                                Aucune vraie transaction n'est effectuée. Le code 3D Secure est toujours <code className="text-emerald-400">123456</code>.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
