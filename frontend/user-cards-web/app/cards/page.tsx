'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@shared/context/AuthContext';
import { UserRole } from '@shared/types/user';
import { CreditCard, Lock, Unlock, Shield, Wifi, RefreshCcw, AlertTriangle, Plus } from 'lucide-react';
import { CardFeaturesUpdateBody, clientApi } from '@/lib/api-client';

type ClientCard = {
    id: string;
    maskedPan: string;
    cardholderName: string;
    expiryDate: string;
    cardType: string;
    network: string;
    status: string;
    balance: number;
    currency: string;
    dailyLimit: number;
    dailySpent: number;
    monthlyLimit: number;
    monthlySpent: number;
    threedsEnrolled: boolean;
    contactlessEnabled: boolean;
    internationalEnabled: boolean;
    ecommerceEnabled: boolean;
    isAutoIssued: boolean;
};

const asObject = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) return error.message;
    const candidate = asObject(error);
    return typeof candidate.message === 'string' ? candidate.message : fallback;
};

const toNumber = (value: unknown): number => {
    const parsed = Number.parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value: number, currency = 'EUR') =>
    new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2
    }).format(value);

const normalizeCard = (raw: unknown): ClientCard => {
    const card = asObject(raw);
    return {
        id: String(card.id || ''),
        maskedPan: String(card.masked_pan || card.maskedPan || ''),
        cardholderName: String(card.cardholder_name || card.cardholderName || ''),
        expiryDate: String(card.expiry_date || card.expiryDate || ''),
        cardType: String(card.card_type || card.cardType || 'DEBIT'),
        network: String(card.network || 'VISA'),
        status: String(card.status || 'ACTIVE'),
        balance: toNumber(card.balance),
        currency: String(card.currency || 'EUR'),
        dailyLimit: toNumber(card.daily_limit || card.dailyLimit),
        dailySpent: toNumber(card.daily_spent || card.dailySpent),
        monthlyLimit: toNumber(card.monthly_limit || card.monthlyLimit),
        monthlySpent: toNumber(card.monthly_spent || card.monthlySpent),
        threedsEnrolled: Boolean(card.threeds_enrolled ?? card.threedsEnrolled),
        contactlessEnabled: Boolean(card.contactless_enabled ?? card.contactlessEnabled),
        internationalEnabled: Boolean(card.international_enabled ?? card.internationalEnabled),
        ecommerceEnabled: Boolean(card.ecommerce_enabled ?? card.ecommerceEnabled),
        isAutoIssued: Boolean(card.is_auto_issued ?? card.isAutoIssued)
    };
};

export default function CardsPage() {
    const { isLoading, isAuthenticated, user } = useAuth();
    const [cards, setCards] = useState<ClientCard[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionId, setActionId] = useState<string | null>(null);

    const isClient = user?.role === UserRole.CLIENT;

    const loadCards = async () => {
        setIsRefreshing(true);
        setError(null);

        try {
            const response = await clientApi.getCards();
            setCards((response.cards || []).map(normalizeCard));
        } catch (loadError: unknown) {
            setError(getErrorMessage(loadError, 'Impossible de charger les cartes'));
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated || !isClient) return;
        loadCards();
    }, [isAuthenticated, isClient]);

    const updateCardFeature = async (card: ClientCard, body: CardFeaturesUpdateBody) => {
        setActionId(card.id);
        setError(null);
        try {
            await clientApi.updateCardFeatures(card.id, body);
            await loadCards();
        } catch (featureError: unknown) {
            setError(getErrorMessage(featureError, 'Mise à jour impossible'));
        } finally {
            setActionId(null);
        }
    };

    const toggleBlockStatus = async (card: ClientCard) => {
        setActionId(card.id);
        setError(null);

        try {
            await clientApi.toggleCardBlock(card.id, card.status === 'ACTIVE');
            await loadCards();
        } catch (statusError: unknown) {
            setError(getErrorMessage(statusError, 'Impossible de changer le statut de la carte'));
        } finally {
            setActionId(null);
        }
    };

    const totalBalance = useMemo(
        () => cards.reduce((sum, card) => sum + card.balance, 0),
        [cards]
    );

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
                <div className="max-w-md w-full rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center space-y-4">
                    <h1 className="text-2xl font-bold text-white">Session expirée</h1>
                    <p className="text-slate-400">Reconnectez-vous sur le portail pour accéder à votre espace client.</p>
                    <a
                        href={`${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}/login`}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 transition-colors"
                    >
                        Retour au login
                    </a>
                </div>
            </div>
        );
    }

    if (!isClient) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
                <div className="max-w-xl w-full rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center space-y-4">
                    <AlertTriangle className="w-10 h-10 mx-auto text-amber-400" />
                    <h1 className="text-2xl font-bold text-white">Cartes non disponibles</h1>
                    <p className="text-slate-400">
                        Les cartes bancaires sont réservées aux clients. Les comptes marchands n&apos;ont pas de carte.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-8 pb-12">
            <div className="max-w-6xl mx-auto px-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">Mes cartes</h1>
                        <p className="text-slate-400">Données synchronisées depuis l&apos;API client.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/cards/add"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 transition-colors"
                        >
                            <Plus size={16} />
                            Nouvelle carte
                        </Link>
                        <button
                            onClick={loadCards}
                            disabled={isRefreshing}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-white hover:bg-slate-700 disabled:opacity-60"
                        >
                            <RefreshCcw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                            Actualiser
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-5">
                        <p className="text-sm text-slate-400">Cartes totales</p>
                        <p className="text-2xl font-bold text-white">{cards.length}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-5">
                        <p className="text-sm text-slate-400">Cartes actives</p>
                        <p className="text-2xl font-bold text-white">{cards.filter((card) => card.status === 'ACTIVE').length}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
                        <p className="text-sm text-amber-300">Solde total cartes</p>
                        <p className="text-2xl font-bold text-white">{formatMoney(totalBalance, cards[0]?.currency || 'EUR')}</p>
                    </div>
                </div>

                {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    {cards.map((card) => (
                        <div key={card.id} className="rounded-2xl border border-white/10 bg-slate-800/50 p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-white font-semibold">{card.maskedPan}</p>
                                    <p className="text-xs text-slate-400">{card.network} - {card.cardType} - Exp {card.expiryDate}</p>
                                    {card.isAutoIssued && (
                                        <p className="text-xs text-emerald-300 mt-1">Carte auto (solde du compte)</p>
                                    )}
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs ${card.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                                    {card.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div className="rounded-xl bg-slate-900/50 p-3 border border-white/5">
                                    <p className="text-slate-400 mb-1">{card.isAutoIssued ? 'Solde compte' : 'Solde attribué'}</p>
                                    <p className="text-white font-semibold">{formatMoney(card.balance, card.currency)}</p>
                                </div>
                                <div className="rounded-xl bg-slate-900/50 p-3 border border-white/5">
                                    <p className="text-slate-400 mb-1">Dépense / limite jour</p>
                                    <p className="text-white font-semibold">
                                        {formatMoney(card.dailySpent, card.currency)} / {formatMoney(card.dailyLimit, card.currency)}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-slate-900/50 p-3 border border-white/5">
                                    <p className="text-slate-400 mb-1">Dépense / limite mois</p>
                                    <p className="text-white font-semibold">
                                        {formatMoney(card.monthlySpent, card.currency)} / {formatMoney(card.monthlyLimit, card.currency)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    onClick={() => toggleBlockStatus(card)}
                                    disabled={actionId === card.id}
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-60"
                                >
                                    {card.status === 'ACTIVE' ? <Lock size={14} /> : <Unlock size={14} />}
                                    {card.status === 'ACTIVE' ? 'Bloquer' : 'Débloquer'}
                                </button>
                                <button
                                    onClick={() => updateCardFeature(card, { threedsEnrolled: !card.threedsEnrolled })}
                                    disabled={actionId === card.id}
                                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl disabled:opacity-60 ${card.threedsEnrolled ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
                                >
                                    <Shield size={14} />
                                    3DS {card.threedsEnrolled ? 'ON' : 'OFF'}
                                </button>
                                <button
                                    onClick={() => updateCardFeature(card, { contactlessEnabled: !card.contactlessEnabled })}
                                    disabled={actionId === card.id}
                                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl disabled:opacity-60 ${card.contactlessEnabled ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
                                >
                                    <Wifi size={14} />
                                    NFC {card.contactlessEnabled ? 'ON' : 'OFF'}
                                </button>
                                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/60 text-slate-300 border border-white/10">
                                    <CreditCard size={14} />
                                    {card.cardholderName || 'Titulaire non renseigné'}
                                </span>
                            </div>
                        </div>
                    ))}

                    {cards.length === 0 && (
                        <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-8 text-center text-slate-400">
                            Aucune carte disponible.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


