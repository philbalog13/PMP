'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@shared/context/AuthContext';
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

type ToggleableCardFeature =
    | 'threedsEnrolled'
    | 'contactlessEnabled'
    | 'internationalEnabled'
    | 'ecommerceEnabled';

const initialCards: CardSecurity[] = [
    {
        id: '1',
        maskedPan: '4916****1234',
        cardType: 'VISA',
        threedsEnrolled: true,
        contactlessEnabled: true,
        internationalEnabled: false,
        ecommerceEnabled: true,
        status: 'ACTIVE',
    },
    {
        id: '2',
        maskedPan: '5412****5678',
        cardType: 'MASTERCARD',
        threedsEnrolled: false,
        contactlessEnabled: true,
        internationalEnabled: true,
        ecommerceEnabled: true,
        status: 'ACTIVE',
    },
];

export default function SecurityPage() {
    const { isLoading, isAuthenticated } = useAuth();
    const [cards, setCards] = useState<CardSecurity[]>(initialCards);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

    const toggleCardFeature = (cardId: string, feature: ToggleableCardFeature) => {
        setCards((prev) =>
            prev.map((card) => {
                if (card.id !== cardId) return card;
                return { ...card, [feature]: !card[feature] };
            }),
        );
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
                    <h1 className="text-2xl font-bold text-white">Session expiree</h1>
                    <p className="text-slate-400">Reconnectez-vous sur le portail pour acceder a votre espace client.</p>
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

    return (
        <div className="min-h-screen bg-slate-950 py-8 pb-12">
            <div className="max-w-4xl mx-auto px-6">
                <div className="mb-8">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                        <Link href="/" className="hover:text-amber-400">Dashboard</Link>
                        <ChevronRight size={14} />
                        <span className="text-white">Securite</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Parametres de securite</h1>
                    <p className="text-slate-400">
                        Gerez la securite de vos cartes et activez les protections supplementaires.
                    </p>
                </div>

                <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 mb-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl ${twoFactorEnabled ? 'bg-emerald-500/20' : 'bg-slate-700'}`}>
                                {twoFactorEnabled ? (
                                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                                ) : (
                                    <ShieldAlert className="w-6 h-6 text-slate-400" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white mb-1">Authentification a deux facteurs (2FA)</h2>
                                <p className="text-sm text-slate-400 mb-3">
                                    Ajoutez une couche de securite supplementaire lors de la connexion.
                                </p>
                                {twoFactorEnabled ? (
                                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm rounded-full">
                                        <CheckCircle2 size={14} /> Active
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-full">
                                        <AlertTriangle size={14} /> Non active
                                    </span>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => setTwoFactorEnabled((prev) => !prev)}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors"
                        >
                            {twoFactorEnabled ? 'Desactiver' : 'Activer'}
                        </button>
                    </div>
                </div>

                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-white mb-4">Securite des cartes</h2>

                    <div className="space-y-4">
                        {cards.map((card) => (
                            <div key={card.id} className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
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
                                    <span
                                        className={`px-3 py-1 rounded-full text-sm ${card.status === 'ACTIVE'
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : 'bg-red-500/20 text-red-400'
                                            }`}
                                    >
                                        {card.status === 'ACTIVE' ? 'Active' : 'Bloquee'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <Shield className="w-5 h-5 text-blue-400" />
                                            <div>
                                                <p className="text-sm font-medium text-white">3D Secure</p>
                                                <p className="text-xs text-slate-400">Authentification renforcee</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleCardFeature(card.id, 'threedsEnrolled')}
                                            className={`relative w-12 h-6 rounded-full transition-colors ${card.threedsEnrolled ? 'bg-emerald-500' : 'bg-slate-600'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${card.threedsEnrolled ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <Wifi className="w-5 h-5 text-purple-400" />
                                            <div>
                                                <p className="text-sm font-medium text-white">Sans contact</p>
                                                <p className="text-xs text-slate-400">Paiements NFC</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleCardFeature(card.id, 'contactlessEnabled')}
                                            className={`relative w-12 h-6 rounded-full transition-colors ${card.contactlessEnabled ? 'bg-emerald-500' : 'bg-slate-600'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${card.contactlessEnabled ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <Globe className="w-5 h-5 text-amber-400" />
                                            <div>
                                                <p className="text-sm font-medium text-white">International</p>
                                                <p className="text-xs text-slate-400">Paiements a l&apos;etranger</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleCardFeature(card.id, 'internationalEnabled')}
                                            className={`relative w-12 h-6 rounded-full transition-colors ${card.internationalEnabled ? 'bg-emerald-500' : 'bg-slate-600'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${card.internationalEnabled ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <ShoppingBag className="w-5 h-5 text-emerald-400" />
                                            <div>
                                                <p className="text-sm font-medium text-white">E-commerce</p>
                                                <p className="text-xs text-slate-400">Achats en ligne</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleCardFeature(card.id, 'ecommerceEnabled')}
                                            className={`relative w-12 h-6 rounded-full transition-colors ${card.ecommerceEnabled ? 'bg-emerald-500' : 'bg-slate-600'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${card.ecommerceEnabled ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <Link
                                        href="/cards"
                                        className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1"
                                    >
                                        Gerer cette carte <ChevronRight size={14} />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-400" />
                        Conseils de securite
                    </h3>
                    <ul className="space-y-3 text-sm text-slate-300">
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <span>Activez toujours 3D Secure pour vos achats en ligne</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <span>Desactivez les paiements internationaux si vous ne voyagez pas</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <span>Configurez l&apos;authentification a deux facteurs pour votre compte</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <span>Surveillez regulierement vos transactions</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
