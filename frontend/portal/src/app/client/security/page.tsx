'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import {
    Shield,
    ShieldCheck,
    ShieldAlert,
    CreditCard,
    Globe,
    Wifi,
    ShoppingBag,
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

interface CardSecurity {
    id: string;
    maskedPan: string;
    cardType: string;
    threedsEnrolled: boolean;
    contactlessEnabled: boolean;
    internationalEnabled: boolean;
    ecommerceEnabled: boolean;
    status: string;
}

const inferCardType = (maskedPan: string): string => {
    const firstDigit = (maskedPan || '').trim().charAt(0);
    if (firstDigit === '4') return 'VISA';
    if (firstDigit === '5') return 'MASTERCARD';
    if (firstDigit === '3') return 'AMEX';
    return 'CARD';
};

type UnknownRecord = Record<string, unknown>;

const toRecord = (value: unknown): UnknownRecord => (
    value !== null && typeof value === 'object' ? (value as UnknownRecord) : {}
);

const normalizeCard = (raw: unknown): CardSecurity => {
    const r = toRecord(raw);
    const maskedPan = String(r.maskedPan ?? r.masked_pan ?? '');
    return {
        id: String(r.id || ''),
        maskedPan,
        cardType: String(r.cardType ?? r.card_type ?? inferCardType(maskedPan)),
        threedsEnrolled: Boolean(r.threedsEnrolled ?? r.threeds_enrolled),
        contactlessEnabled: Boolean(r.contactlessEnabled ?? r.contactless_enabled),
        internationalEnabled: Boolean(r.internationalEnabled ?? r.international_enabled),
        ecommerceEnabled: Boolean(r.ecommerceEnabled ?? r.ecommerce_enabled),
        status: String(r.status ?? 'ACTIVE')
    };
};

export default function ClientSecurityPage() {
    const { isLoading } = useAuth(true);
    const [cards, setCards] = useState<CardSecurity[]>([]);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        fetchSecuritySettings();
    }, []);

    const fetchSecuritySettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/client/security', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setCards((data.security.cards || []).map(normalizeCard));
                setTwoFactorEnabled(data.security.twoFactorEnabled || false);
            } else {
                // Mock data for demo
                setCards([
                    {
                        id: '1',
                        maskedPan: '4916****1234',
                        cardType: 'VISA',
                        threedsEnrolled: true,
                        contactlessEnabled: true,
                        internationalEnabled: false,
                        ecommerceEnabled: true,
                        status: 'ACTIVE'
                    },
                    {
                        id: '2',
                        maskedPan: '5412****5678',
                        cardType: 'MASTERCARD',
                        threedsEnrolled: false,
                        contactlessEnabled: true,
                        internationalEnabled: true,
                        ecommerceEnabled: true,
                        status: 'ACTIVE'
                    }
                ]);
            }
        } catch (error) {
            console.error('Failed to fetch security settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleCardFeature = async (cardId: string, feature: string, currentValue: boolean) => {
        setSaving(cardId + feature);

        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/client/cards/${cardId}/features`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ [feature]: !currentValue })
            });

            // Update local state
            setCards(cards.map(card => {
                if (card.id === cardId) {
                    return { ...card, [feature]: !currentValue };
                }
                return card;
            }));
        } catch (error) {
            console.error('Failed to update feature:', error);
        } finally {
            setSaving(null);
        }
    };

    if (isLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pt-24 pb-12">
            <div className="max-w-4xl mx-auto px-6">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                        <Link href="/client" className="hover:text-amber-400">Dashboard</Link>
                        <ChevronRight size={14} />
                        <span className="text-white">Sécurité</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Paramètres de Sécurité</h1>
                    <p className="text-slate-400">
                        Gérez la sécurité de vos cartes et activez les protections supplémentaires.
                    </p>
                </div>

                {/* 2FA Section */}
                <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 mb-6">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl ${twoFactorEnabled ? 'bg-emerald-500/20' : 'bg-slate-700'}`}>
                                {twoFactorEnabled ? (
                                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                                ) : (
                                    <ShieldAlert className="w-6 h-6 text-slate-400" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white mb-1">Authentification à deux facteurs (2FA)</h2>
                                <p className="text-sm text-slate-400 mb-3">
                                    Ajoutez une couche de sécurité supplémentaire lors de la connexion.
                                </p>
                                {twoFactorEnabled ? (
                                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm rounded-full">
                                        <CheckCircle2 size={14} /> Activé
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-full">
                                        <AlertTriangle size={14} /> Non activé
                                    </span>
                                )}
                            </div>
                        </div>
                        <Link
                            href="/settings/security"
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors"
                        >
                            Configurer
                        </Link>
                    </div>
                </div>

                {/* Cards Security */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-white mb-4">Sécurité des cartes</h2>

                    <div className="space-y-4">
                        {cards.map((card) => (
                            <div key={card.id} className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                                {/* Card Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-xl">
                                            <CreditCard className="w-6 h-6 text-amber-400" />
                                        </div>
                                        <div>
                                            <p className="font-mono text-lg text-white">{card.maskedPan}</p>
                                            <p className="text-sm text-slate-400">{card.cardType}</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm ${
                                        card.status === 'ACTIVE'
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : 'bg-red-500/20 text-red-400'
                                    }`}>
                                        {card.status === 'ACTIVE' ? 'Active' : 'Bloquée'}
                                    </span>
                                </div>

                                {/* Security Features */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* 3D Secure */}
                                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <Shield className="w-5 h-5 text-blue-400" />
                                            <div>
                                                <p className="text-sm font-medium text-white">3D Secure</p>
                                                <p className="text-xs text-slate-400">Authentification renforcée</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleCardFeature(card.id, 'threedsEnrolled', card.threedsEnrolled)}
                                            disabled={saving === card.id + 'threedsEnrolled'}
                                            className={`relative w-12 h-6 rounded-full transition-colors ${
                                                card.threedsEnrolled ? 'bg-emerald-500' : 'bg-slate-600'
                                            }`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                                card.threedsEnrolled ? 'left-7' : 'left-1'
                                            }`} />
                                        </button>
                                    </div>

                                    {/* Contactless */}
                                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <Wifi className="w-5 h-5 text-purple-400" />
                                            <div>
                                                <p className="text-sm font-medium text-white">Sans contact</p>
                                                <p className="text-xs text-slate-400">Paiements NFC</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleCardFeature(card.id, 'contactlessEnabled', card.contactlessEnabled)}
                                            disabled={saving === card.id + 'contactlessEnabled'}
                                            className={`relative w-12 h-6 rounded-full transition-colors ${
                                                card.contactlessEnabled ? 'bg-emerald-500' : 'bg-slate-600'
                                            }`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                                card.contactlessEnabled ? 'left-7' : 'left-1'
                                            }`} />
                                        </button>
                                    </div>

                                    {/* International */}
                                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <Globe className="w-5 h-5 text-amber-400" />
                                            <div>
                                                <p className="text-sm font-medium text-white">International</p>
                                                <p className="text-xs text-slate-400">Paiements à l&apos;étranger</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleCardFeature(card.id, 'internationalEnabled', card.internationalEnabled)}
                                            disabled={saving === card.id + 'internationalEnabled'}
                                            className={`relative w-12 h-6 rounded-full transition-colors ${
                                                card.internationalEnabled ? 'bg-emerald-500' : 'bg-slate-600'
                                            }`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                                card.internationalEnabled ? 'left-7' : 'left-1'
                                            }`} />
                                        </button>
                                    </div>

                                    {/* E-commerce */}
                                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <ShoppingBag className="w-5 h-5 text-emerald-400" />
                                            <div>
                                                <p className="text-sm font-medium text-white">E-commerce</p>
                                                <p className="text-xs text-slate-400">Achats en ligne</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleCardFeature(card.id, 'ecommerceEnabled', card.ecommerceEnabled)}
                                            disabled={saving === card.id + 'ecommerceEnabled'}
                                            className={`relative w-12 h-6 rounded-full transition-colors ${
                                                card.ecommerceEnabled ? 'bg-emerald-500' : 'bg-slate-600'
                                            }`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                                card.ecommerceEnabled ? 'left-7' : 'left-1'
                                            }`} />
                                        </button>
                                    </div>
                                </div>

                                {/* Block Card Action */}
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <Link
                                        href={`/client/cards/${card.id}`}
                                        className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1"
                                    >
                                        Gérer cette carte <ChevronRight size={14} />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Security Tips */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-400" />
                        Conseils de sécurité
                    </h3>
                    <ul className="space-y-3 text-sm text-slate-300">
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <span>Activez toujours 3D Secure pour vos achats en ligne</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <span>Désactivez les paiements internationaux si vous ne voyagez pas</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <span>Configurez l&apos;authentification à deux facteurs pour votre compte</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <span>Surveillez régulièrement vos transactions</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
