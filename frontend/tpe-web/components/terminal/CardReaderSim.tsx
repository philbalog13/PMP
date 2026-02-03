'use client';

import { useState } from 'react';
import { useTerminalStore } from '@/lib/store';
import { CreditCard, QrCode, Smartphone, Clipboard, Sparkles } from 'lucide-react';
import type { CardData } from '@/types/transaction';
import { validateLuhn, validateExpiryDate, validateCVV } from '@/lib/utils/validation';

interface CardReaderSimProps {
    onCardRead: (cardData: CardData) => void;
}

const presetCards = [
    { name: 'Carte valide', pan: '4111111111111111', expiry: '12/26', cvv: '123' },
    { name: 'Solde insuffisant', pan: '4000056655665556', expiry: '06/29', cvv: '456' },
    { name: 'Carte expiree', pan: '4532015112830366', expiry: '01/20', cvv: '789' },
    { name: 'Carte volee', pan: '4916338506082832', expiry: '09/27', cvv: '321' },
];

export default function CardReaderSim({ onCardRead }: CardReaderSimProps) {
    const { state } = useTerminalStore();
    const [mode, setMode] = useState<'manual' | 'qr' | 'nfc'>('manual');
    const [pan, setPan] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [errors, setErrors] = useState<string[]>([]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const validationErrors: string[] = [];
        if (!validateLuhn(pan)) {
            validationErrors.push('Numero de carte invalide (Luhn).');
        }
        if (!validateExpiryDate(expiry)) {
            validationErrors.push('Date d expiration invalide ou expiree.');
        }
        if (cvv && !validateCVV(cvv)) {
            validationErrors.push('CVV invalide.');
        }

        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setErrors([]);
        onCardRead({ pan, expiryDate: expiry, cvv });
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
            const cleanPan = text.replace(/\D/g, '').slice(0, 19);
            if (cleanPan.length >= 13) {
                setPan(cleanPan);
                if (!expiry) setExpiry('12/28');
                if (!cvv) setCvv('123');
            }
        } catch (err) {
            console.error('Failed to read clipboard', err);
            setErrors(['Impossible de lire le presse-papiers.']);
        }
    };

    const isDisabled = state !== 'card-wait';

    return (
        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-5">
            <h3 className="text-lg font-bold text-white mb-4">Lecteur de carte virtuel</h3>

            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setMode('manual')}
                    className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition ${mode === 'manual'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                >
                    <CreditCard className="w-5 h-5" />
                    Manuel
                </button>
                <button
                    onClick={() => setMode('qr')}
                    className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition ${mode === 'qr'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                >
                    <QrCode className="w-5 h-5" />
                    QR
                </button>
                <button
                    onClick={() => setMode('nfc')}
                    className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition ${mode === 'nfc'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                >
                    <Smartphone className="w-5 h-5" />
                    NFC
                </button>
            </div>

            {mode === 'manual' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {presetCards.map((card) => (
                            <button
                                key={card.pan}
                                onClick={() => handlePresetCard(card)}
                                disabled={isDisabled}
                                className="p-3 text-left bg-slate-900 hover:bg-slate-800 hover:border-blue-400/40 border border-white/10 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition group"
                            >
                                <p className="font-semibold text-white group-hover:text-blue-300 flex items-center justify-between">
                                    {card.name}
                                    <Sparkles size={12} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </p>
                                <p className="text-xs text-slate-400 font-mono">**** **** **** {card.pan.slice(-4)}</p>
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
                        {errors.length > 0 && (
                            <div className="bg-red-500/10 border border-red-500/40 rounded p-3">
                                {errors.map((error, idx) => (
                                    <p key={idx} className="text-sm text-red-200">- {error}</p>
                                ))}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Numero de carte (PAN)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={pan}
                                    onChange={(e) => setPan(e.target.value.replace(/\D/g, '').slice(0, 19))}
                                    placeholder="4111111111111111"
                                    disabled={isDisabled}
                                    autoComplete="off"
                                    className="flex-1 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 border border-slate-700 font-mono font-semibold bg-slate-900 text-white"
                                />
                                <button
                                    type="button"
                                    onClick={handlePaste}
                                    disabled={isDisabled}
                                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-lg border border-slate-700 disabled:opacity-50 transition"
                                    title="Coller depuis le presse-papiers"
                                >
                                    <Clipboard size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
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
                                    className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 border border-slate-700 font-mono font-semibold bg-slate-900 text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    CVV
                                </label>
                                <input
                                    type="text"
                                    value={cvv}
                                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="123"
                                    disabled={isDisabled}
                                    className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 border border-slate-700 font-mono font-semibold bg-slate-900 text-white"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isDisabled || pan.length < 13 || expiry.length < 5}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            Lire la carte
                        </button>
                    </form>
                </div>
            )}

            {mode === 'qr' && (
                <div className="text-center py-8">
                    <QrCode className="w-24 h-24 mx-auto text-slate-500 mb-4" />
                    <p className="text-slate-300">Mode QR (bientot disponible)</p>
                    <p className="text-sm text-slate-500">Simulation webcam a ajouter.</p>
                </div>
            )}

            {mode === 'nfc' && (
                <div className="text-center py-8">
                    <Smartphone className="w-24 h-24 mx-auto text-slate-500 mb-4" />
                    <p className="text-slate-300">Mode NFC (bientot disponible)</p>
                    <p className="text-sm text-slate-500">Web NFC requis selon navigateur.</p>
                </div>
            )}
        </div>
    );
}
