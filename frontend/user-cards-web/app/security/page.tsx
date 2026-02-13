'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@shared/context/AuthContext';
import { UserRole } from '@shared/types/user';
import { CheckCircle2, RefreshCcw, Shield, ShieldAlert, CreditCard, Globe, Wifi, ShoppingBag } from 'lucide-react';
import { CardFeaturesUpdateBody, clientApi } from '@/lib/api-client';

type CardSecurity = {
    id: string;
    maskedPan: string;
    cardType: string;
    status: string;
    threedsEnrolled: boolean;
    contactlessEnabled: boolean;
    internationalEnabled: boolean;
    ecommerceEnabled: boolean;
};

const asObject = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) return error.message;
    const candidate = asObject(error);
    return typeof candidate.message === 'string' ? candidate.message : fallback;
};

const normalizeCard = (raw: unknown): CardSecurity => {
    const card = asObject(raw);
    return {
        id: String(card.id || ''),
        maskedPan: String(card.masked_pan || card.maskedPan || ''),
        cardType: String(card.card_type || card.cardType || 'DEBIT'),
        status: String(card.status || 'ACTIVE'),
        threedsEnrolled: Boolean(card.threeds_enrolled ?? card.threedsEnrolled),
        contactlessEnabled: Boolean(card.contactless_enabled ?? card.contactlessEnabled),
        internationalEnabled: Boolean(card.international_enabled ?? card.internationalEnabled),
        ecommerceEnabled: Boolean(card.ecommerce_enabled ?? card.ecommerceEnabled)
    };
};

export default function SecurityPage() {
    const { isLoading, isAuthenticated, user } = useAuth();
    const [cards, setCards] = useState<CardSecurity[]>([]);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isClient = user?.role === UserRole.CLIENT;

    const loadSecurity = async () => {
        setIsRefreshing(true);
        setError(null);
        try {
            const response = await clientApi.getSecurity();
            const rawCards = Array.isArray(response?.security?.cards) ? response.security.cards : [];
            setTwoFactorEnabled(Boolean(response?.security?.twoFactorEnabled));
            setCards(rawCards.map(normalizeCard));
        } catch (loadError: unknown) {
            setError(getErrorMessage(loadError, 'Impossible de charger les paramètres de sécurité'));
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated || !isClient) return;
        loadSecurity();
    }, [isAuthenticated, isClient]);

    const toggleFeature = async (card: CardSecurity, feature: keyof CardSecurity) => {
        const body: CardFeaturesUpdateBody = {};

        if (feature === 'threedsEnrolled') body.threedsEnrolled = !card.threedsEnrolled;
        if (feature === 'contactlessEnabled') body.contactlessEnabled = !card.contactlessEnabled;
        if (feature === 'internationalEnabled') body.internationalEnabled = !card.internationalEnabled;
        if (feature === 'ecommerceEnabled') body.ecommerceEnabled = !card.ecommerceEnabled;

        setSavingId(card.id + feature);
        setError(null);
        try {
            await clientApi.updateCardFeatures(card.id, body);
            await loadSecurity();
        } catch (toggleError: unknown) {
            setError(getErrorMessage(toggleError, 'Mise à jour impossible'));
        } finally {
            setSavingId(null);
        }
    };

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
                <div className="max-w-lg w-full rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center text-slate-300">
                    Cette section est réservée aux clients.
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-8 pb-12">
            <div className="max-w-5xl mx-auto px-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">Sécurité des cartes</h1>
                        <p className="text-slate-400">Paramètres réels des protections client.</p>
                    </div>
                    <button
                        onClick={loadSecurity}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-white hover:bg-slate-700 disabled:opacity-60"
                    >
                        <RefreshCcw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                        Actualiser
                    </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-white font-semibold">Authentification 2FA</p>
                            <p className="text-sm text-slate-400">État courant récupéré depuis le compte utilisateur.</p>
                        </div>
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${twoFactorEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                            {twoFactorEnabled ? <CheckCircle2 size={14} /> : <ShieldAlert size={14} />}
                            {twoFactorEnabled ? 'Active' : 'Inactive'}
                        </span>
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
                                    <p className="text-xs text-slate-400">{card.cardType}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs ${card.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                                    {card.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <button
                                    onClick={() => toggleFeature(card, 'threedsEnrolled')}
                                    disabled={savingId === card.id + 'threedsEnrolled'}
                                    className={`flex items-center justify-between rounded-xl p-3 border ${card.threedsEnrolled ? 'border-blue-500/30 bg-blue-500/10 text-blue-200' : 'border-white/10 bg-slate-900/50 text-slate-300'} disabled:opacity-60`}
                                >
                                    <span className="inline-flex items-center gap-2"><Shield size={14} /> 3D Secure</span>
                                    <span>{card.threedsEnrolled ? 'ON' : 'OFF'}</span>
                                </button>
                                <button
                                    onClick={() => toggleFeature(card, 'contactlessEnabled')}
                                    disabled={savingId === card.id + 'contactlessEnabled'}
                                    className={`flex items-center justify-between rounded-xl p-3 border ${card.contactlessEnabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-slate-900/50 text-slate-300'} disabled:opacity-60`}
                                >
                                    <span className="inline-flex items-center gap-2"><Wifi size={14} /> Sans contact</span>
                                    <span>{card.contactlessEnabled ? 'ON' : 'OFF'}</span>
                                </button>
                                <button
                                    onClick={() => toggleFeature(card, 'internationalEnabled')}
                                    disabled={savingId === card.id + 'internationalEnabled'}
                                    className={`flex items-center justify-between rounded-xl p-3 border ${card.internationalEnabled ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-white/10 bg-slate-900/50 text-slate-300'} disabled:opacity-60`}
                                >
                                    <span className="inline-flex items-center gap-2"><Globe size={14} /> International</span>
                                    <span>{card.internationalEnabled ? 'ON' : 'OFF'}</span>
                                </button>
                                <button
                                    onClick={() => toggleFeature(card, 'ecommerceEnabled')}
                                    disabled={savingId === card.id + 'ecommerceEnabled'}
                                    className={`flex items-center justify-between rounded-xl p-3 border ${card.ecommerceEnabled ? 'border-purple-500/30 bg-purple-500/10 text-purple-200' : 'border-white/10 bg-slate-900/50 text-slate-300'} disabled:opacity-60`}
                                >
                                    <span className="inline-flex items-center gap-2"><ShoppingBag size={14} /> E-commerce</span>
                                    <span>{card.ecommerceEnabled ? 'ON' : 'OFF'}</span>
                                </button>
                            </div>
                        </div>
                    ))}

                    {cards.length === 0 && (
                        <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-8 text-center text-slate-400">
                            <div className="inline-flex items-center gap-2">
                                <CreditCard size={16} />
                                Aucune carte trouvée.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
