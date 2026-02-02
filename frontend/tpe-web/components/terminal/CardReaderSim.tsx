'use client';

import { useState } from 'react';
import { useTerminalStore } from '@/lib/store';
import { CreditCard, QrCode, Smartphone, Clipboard, Sparkles } from 'lucide-react';
import type { CardData } from '@/types/transaction';
import { validateLuhn, validateExpiryDate, validateCVV } from '@/lib/utils/validation';

interface CardReaderSimProps {
    onCardRead: (cardData: CardData) => void;
}

export default function CardReaderSim({ onCardRead }: CardReaderSimProps) {
    const { state } = useTerminalStore();
    const [mode, setMode] = useState<'manual' | 'qr' | 'nfc'>('manual');
    const [pan, setPan] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [errors, setErrors] = useState<string[]>([]);

    const presetCards = [
        { name: 'Carte Valide', pan: '4111111111111111', expiry: '12/26', cvv: '123' },
        { name: 'Solde Insuffisant', pan: '4000056655665556', expiry: '06/25', cvv: '456' },
        { name: 'Carte Expirée', pan: '4532015112830366', expiry: '01/20', cvv: '789' },
        { name: 'Carte Volée', pan: '4916338506082832', expiry: '09/27', cvv: '321' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors: string[] = [];

        if (!validateLuhn(pan)) {
            validationErrors.push('Numéro de carte invalide (échec validation Luhn)');
        }
        if (!validateExpiryDate(expiry)) {
            validationErrors.push('Date d\'expiration invalide ou expirée');
        }
        if (cvv && !validateCVV(cvv)) {
            validationErrors.push('CVV invalide');
        }

        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setErrors([]);
        onCardRead({ pan, expiryDate: expiry, cvv });
        // Reset form
        setPan('');
        setExpiry('');
        setCvv('');
    };

    const handlePresetCard = (card: typeof presetCards[0]) => {
        setPan(card.pan);
        setExpiry(card.expiry);
        setCvv(card.cvv);
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            // Simple clean up
            const cleanPan = text.replace(/\D/g, '').slice(0, 19);
            if (cleanPan.length >= 13) {
                setPan(cleanPan);
                // Try to infer standard test card details if missing
                if (!expiry) setExpiry('12/28');
                if (!cvv) setCvv('123');
            }
        } catch (err) {
            console.error('Failed to read clipboard', err);
            // Fallback or error msg
            setErrors(['Impossible de lire le presse-papier (Check permissions)']);
        }
    };

    const isDisabled = state !== 'card-wait';

    return (
        <div className="bg-white rounded-lg shadow-xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Lecteur de Carte Virtuel</h3>

            {/* Mode Selector */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setMode('manual')}
                    className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition ${mode === 'manual'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                >
                    <CreditCard className="w-5 h-5" />
                    Manuel
                </button>
                <button
                    onClick={() => setMode('qr')}
                    className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition ${mode === 'qr'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                >
                    <QrCode className="w-5 h-5" />
                    QR Code
                </button>
                <button
                    onClick={() => setMode('nfc')}
                    className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition ${mode === 'nfc'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                >
                    <Smartphone className="w-5 h-5" />
                    NFC
                </button>
            </div>

            {/* Manual Input Mode */}
            {mode === 'manual' && (
                <div className="space-y-4">
                    {/* Preset Cards */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {presetCards.map((card) => (
                            <button
                                key={card.pan}
                                onClick={() => handlePresetCard(card)}
                                disabled={isDisabled}
                                className="p-3 text-left bg-slate-100 hover:bg-blue-50 hover:border-blue-200 border border-transparent rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition group"
                            >
                                <p className="font-semibold text-slate-800 group-hover:text-blue-700 flex items-center justify-between">
                                    {card.name}
                                    <Sparkles size={12} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </p>
                                <p className="text-xs text-slate-600 font-mono">**** **** **** {card.pan.slice(-4)}</p>
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
                        {errors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded p-3">
                                {errors.map((error, idx) => (
                                    <p key={idx} className="text-sm text-red-700">• {error}</p>
                                ))}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Numéro de carte (PAN)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={pan}
                                    onChange={(e) => setPan(e.target.value.replace(/\D/g, '').slice(0, 19))}
                                    placeholder="4111111111111111"
                                    disabled={isDisabled}
                                    autoComplete="off"
                                    className="flex-1 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 border-2 border-slate-400 font-mono font-semibold"
                                    style={{ color: 'rgba(0,0,0,1)', backgroundColor: 'rgb(255,255,255)', WebkitTextFillColor: 'rgba(0,0,0,1)' }}
                                />
                                <button
                                    type="button"
                                    onClick={handlePaste}
                                    disabled={isDisabled}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-lg border border-slate-300 disabled:opacity-50 transition"
                                    title="Coller depuis le presse-papier"
                                >
                                    <Clipboard size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Expiration (MM/AA)
                                </label>
                                <input
                                    type="text"
                                    value={expiry}
                                    onChange={(e) => {
                                        let value = e.target.value.replace(/\D/g, '');
                                        if (value.length >= 2) {
                                            value = value.slice(0, 2) + '/' + value.slice(2, 4);
                                        }
                                        setExpiry(value.slice(0, 5));
                                    }}
                                    placeholder="12/26"
                                    disabled={isDisabled}
                                    className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 border-2 border-slate-400 font-mono font-semibold"
                                    style={{ color: 'rgba(0,0,0,1)', backgroundColor: 'rgb(255,255,255)', WebkitTextFillColor: 'rgba(0,0,0,1)' }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    CVV
                                </label>
                                <input
                                    type="text"
                                    value={cvv}
                                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="123"
                                    disabled={isDisabled}
                                    className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 border-2 border-slate-400 font-mono font-semibold"
                                    style={{ color: 'rgba(0,0,0,1)', backgroundColor: 'rgb(255,255,255)', WebkitTextFillColor: 'rgba(0,0,0,1)' }}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isDisabled || pan.length < 13 || expiry.length < 5}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            Lire la carte
                        </button>
                    </form>
                </div>
            )}

            {/* QR Code Mode */}
            {mode === 'qr' && (
                <div className="text-center py-8">
                    <QrCode className="w-24 h-24 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-600">Fonctionnalité QR Code</p>
                    <p className="text-sm text-slate-500">À implémenter avec webcam</p>
                </div>
            )}

            {/* NFC Mode */}
            {mode === 'nfc' && (
                <div className="text-center py-8">
                    <Smartphone className="w-24 h-24 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-600">Fonctionnalité NFC</p>
                    <p className="text-sm text-slate-500">Requiert Web NFC API</p>
                </div>
            )}
        </div>
    );
}
