'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import { getClientCards } from '@/lib/api-client';
import type { ClientCardApi } from '@/lib/api-client';
import type { SelectedCard } from '@/lib/store';

interface CardSelectorProps {
    selectedCard: SelectedCard | null;
    onSelect: (card: SelectedCard) => void;
}

const getErrorMessage = (error: unknown): string => {
    if (typeof error === 'object' && error !== null) {
        const maybeError = error as {
            response?: { data?: { error?: string } };
            message?: string;
        };
        if (maybeError.response?.data?.error) {
            return maybeError.response.data.error;
        }
        if (maybeError.message) {
            return maybeError.message;
        }
    }
    return 'Impossible de charger vos cartes';
};

const networkColors: Record<string, string> = {
    VISA: 'from-blue-600/30 to-blue-900/30 border-blue-500/30',
    MASTERCARD: 'from-orange-600/30 to-red-900/30 border-orange-500/30',
    CB: 'from-emerald-600/30 to-emerald-900/30 border-emerald-500/30',
    AMEX: 'from-slate-600/30 to-slate-900/30 border-slate-500/30',
};

const networkGlow: Record<string, string> = {
    VISA: 'shadow-[0_0_15px_rgba(59,130,246,0.15)]',
    MASTERCARD: 'shadow-[0_0_15px_rgba(249,115,22,0.15)]',
    CB: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    AMEX: 'shadow-[0_0_15px_rgba(100,116,139,0.15)]',
};

export default function CardSelector({ selectedCard, onSelect }: CardSelectorProps) {
    const [cards, setCards] = useState<ClientCardApi[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCards = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getClientCards();
            const cardsList = Array.isArray(data?.cards) ? data.cards : [];
            setCards(cardsList.filter((c): c is ClientCardApi => typeof c?.id === 'string').filter((c) => c.status === 'ACTIVE'));
        } catch (err: unknown) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCards(); }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                <span className="ml-3 text-sm text-slate-400">Chargement des cartes...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-6">
                <AlertTriangle size={24} className="mx-auto mb-2 text-amber-400" />
                <p className="text-sm text-amber-300 mb-3">{error}</p>
                <button onClick={fetchCards} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mx-auto">
                    <RefreshCw size={12} /> Réessayer
                </button>
            </div>
        );
    }

    if (cards.length === 0) {
        return (
            <div className="text-center py-6">
                <CreditCard size={24} className="mx-auto mb-2 text-slate-500" />
                <p className="text-sm text-slate-400">Aucune carte active trouvée</p>
                <p className="text-xs text-slate-500 mt-1">Générez une carte depuis votre espace client</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sélectionner une carte</h4>
                <button onClick={fetchCards} className="text-slate-500 hover:text-slate-300 transition">
                    <RefreshCw size={14} />
                </button>
            </div>
            <div className="grid gap-2 max-h-[280px] overflow-y-auto pr-1">
                {cards.map((card) => {
                    const network = card.network || 'VISA';
                    const isSelected = selectedCard?.id === card.id;
                    const balance = Number(card.balance ?? 0);
                    const maskedPan = card.masked_pan || '****';

                    return (
                        <button
                            key={card.id}
                            onClick={() => onSelect({
                                id: card.id,
                                maskedPan: maskedPan,
                                cardType: card.card_type || 'DEBIT',
                                network,
                                balance,
                                status: card.status || 'ACTIVE',
                                threedsEnrolled: card.threeds_enrolled || false,
                            })}
                            className={`
                                w-full text-left p-3 rounded-xl border transition-all duration-200
                                bg-gradient-to-br ${networkColors[network] || networkColors.VISA}
                                ${isSelected
                                    ? `ring-2 ring-blue-500/50 ${networkGlow[network] || ''}`
                                    : 'hover:bg-white/5 hover:scale-[1.01]'
                                }
                            `}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CreditCard size={20} className={isSelected ? 'text-blue-400' : 'text-slate-400'} />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-mono text-white">{maskedPan}</span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-slate-300">{network}</span>
                                        </div>
                                        <div className="text-xs text-slate-400 mt-0.5">
                                            {card.card_type || 'DEBIT'} {card.threeds_enrolled && '• 3DS'}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-white">{balance.toFixed(2)} EUR</div>
                                    {isSelected && <Check size={14} className="text-blue-400 ml-auto mt-1" />}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
