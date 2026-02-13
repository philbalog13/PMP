'use client';

import { useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import {
    Plus,
    Shield,
    Eye,
    EyeOff,
    Settings,
    Lock,
    Unlock,
    CheckCircle2,
    AlertTriangle,
    Wifi
} from 'lucide-react';
import Link from 'next/link';

interface VirtualCard {
    id: string;
    lastFour: string;
    fullNumber: string;
    type: 'visa' | 'mastercard';
    expiryDate: string;
    cvv: string;
    balance: number;
    limit: number;
    status: 'active' | 'blocked' | 'expired';
    is3dsEnabled: boolean;
    dailyLimit: number;
    onlineLimit: number;
    contactlessEnabled: boolean;
    createdAt: string;
}

const mockCards: VirtualCard[] = [
    {
        id: '1',
        lastFour: '4532',
        fullNumber: '4532 8921 7654 4532',
        type: 'visa',
        expiryDate: '12/27',
        cvv: '123',
        balance: 2450.75,
        limit: 5000,
        status: 'active',
        is3dsEnabled: true,
        dailyLimit: 1000,
        onlineLimit: 500,
        contactlessEnabled: true,
        createdAt: '2024-01-01'
    },
    {
        id: '2',
        lastFour: '8921',
        fullNumber: '5432 1098 7654 8921',
        type: 'mastercard',
        expiryDate: '06/26',
        cvv: '456',
        balance: 890.50,
        limit: 2000,
        status: 'active',
        is3dsEnabled: false,
        dailyLimit: 500,
        onlineLimit: 250,
        contactlessEnabled: true,
        createdAt: '2024-01-10'
    },
    {
        id: '3',
        lastFour: '3456',
        fullNumber: '4111 1111 1111 3456',
        type: 'visa',
        expiryDate: '03/24',
        cvv: '789',
        balance: 0,
        limit: 1000,
        status: 'expired',
        is3dsEnabled: true,
        dailyLimit: 200,
        onlineLimit: 100,
        contactlessEnabled: false,
        createdAt: '2023-03-15'
    }
];

export default function CardsPage() {
    const { isLoading } = useAuth(true);
    const [cards, setCards] = useState<VirtualCard[]>(mockCards);
    const [showCardDetails, setShowCardDetails] = useState<Record<string, boolean>>({});
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newCardType, setNewCardType] = useState<'visa' | 'mastercard'>('visa');

    const toggleCardDetails = (cardId: string) => {
        setShowCardDetails(prev => ({
            ...prev,
            [cardId]: !prev[cardId]
        }));
    };

    const toggleCardStatus = (cardId: string) => {
        setCards(prev => prev.map(card => {
            if (card.id === cardId) {
                return {
                    ...card,
                    status: card.status === 'active' ? 'blocked' : 'active'
                };
            }
            return card;
        }));
    };

    const toggle3DS = (cardId: string) => {
        setCards(prev => prev.map(card => {
            if (card.id === cardId) {
                return {
                    ...card,
                    is3dsEnabled: !card.is3dsEnabled
                };
            }
            return card;
        }));
    };

    const createNewCard = () => {
        const newCard: VirtualCard = {
            id: Date.now().toString(),
            lastFour: Math.floor(1000 + Math.random() * 9000).toString(),
            fullNumber: `${newCardType === 'visa' ? '4' : '5'}${Math.random().toString().slice(2, 5)} ${Math.random().toString().slice(2, 6)} ${Math.random().toString().slice(2, 6)} ${Math.floor(1000 + Math.random() * 9000)}`,
            type: newCardType,
            expiryDate: '12/29',
            cvv: Math.floor(100 + Math.random() * 900).toString(),
            balance: 0,
            limit: 1000,
            status: 'active',
            is3dsEnabled: true,
            dailyLimit: 500,
            onlineLimit: 250,
            contactlessEnabled: true,
            createdAt: new Date().toISOString().split('T')[0]
        };
        setCards(prev => [...prev, newCard]);
        setIsCreateModalOpen(false);
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
            <div className="max-w-7xl mx-auto px-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Mes cartes virtuelles</h1>
                        <p className="text-slate-400">
                            Gérez vos cartes, limites et paramètres de sécurité
                        </p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25"
                    >
                        <Plus size={20} />
                        Nouvelle carte
                    </button>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {cards.map((card) => (
                        <div
                            key={card.id}
                            className={`bg-slate-800/50 border rounded-2xl overflow-hidden ${
                                card.status === 'expired'
                                    ? 'border-red-500/30 opacity-60'
                                    : card.status === 'blocked'
                                    ? 'border-yellow-500/30'
                                    : 'border-white/10'
                            }`}
                        >
                            {/* Card Visual */}
                            <div className={`relative p-6 ${
                                card.type === 'visa'
                                    ? 'bg-gradient-to-br from-slate-800 via-slate-800 to-blue-900'
                                    : 'bg-gradient-to-br from-slate-800 via-slate-800 to-orange-900'
                            }`}>
                                {/* Status Badge */}
                                <div className="absolute top-4 right-4">
                                    {card.status === 'active' && (
                                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                                            <CheckCircle2 size={12} /> Active
                                        </span>
                                    )}
                                    {card.status === 'blocked' && (
                                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full flex items-center gap-1">
                                            <Lock size={12} /> Bloquée
                                        </span>
                                    )}
                                    {card.status === 'expired' && (
                                        <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center gap-1">
                                            <AlertTriangle size={12} /> Expirée
                                        </span>
                                    )}
                                </div>

                                {/* Card Pattern */}
                                <div className="absolute inset-0 opacity-10">
                                    <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/20 blur-2xl"></div>
                                </div>

                                <div className="relative">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-7 rounded bg-gradient-to-br from-yellow-400 to-yellow-600"></div>
                                        {card.contactlessEnabled && (
                                            <Wifi size={20} className="text-white/60 rotate-90" />
                                        )}
                                    </div>

                                    <div className="mb-4">
                                        <p className="text-lg font-mono text-white/90 tracking-widest">
                                            {showCardDetails[card.id] ? card.fullNumber : `•••• •••• •••• ${card.lastFour}`}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-white/40 mb-1">CVV</p>
                                            <p className="text-white font-mono">
                                                {showCardDetails[card.id] ? card.cvv : '•••'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-white/40 mb-1">Expire</p>
                                            <p className="text-white font-mono">{card.expiryDate}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-white/40 mb-1">{card.type.toUpperCase()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Details & Actions */}
                            <div className="p-6 space-y-4">
                                {/* Balance & Limit */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-slate-400 mb-1">Solde disponible</p>
                                        <p className="text-xl font-bold text-white">
                                            {card.balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-400 mb-1">Limite</p>
                                        <p className="text-xl font-bold text-white">
                                            {card.limit.toLocaleString('fr-FR')} EUR
                                        </p>
                                    </div>
                                </div>

                                {/* Usage Bar */}
                                <div>
                                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                                        <span>Utilisation</span>
                                        <span>{((card.limit - card.balance) / card.limit * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                                            style={{ width: `${((card.limit - card.balance) / card.limit * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Limits */}
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="p-3 bg-slate-900/50 rounded-lg">
                                        <p className="text-slate-400 mb-1">Limite quotidienne</p>
                                        <p className="text-white font-medium">{card.dailyLimit} EUR</p>
                                    </div>
                                    <div className="p-3 bg-slate-900/50 rounded-lg">
                                        <p className="text-slate-400 mb-1">Limite en ligne</p>
                                        <p className="text-white font-medium">{card.onlineLimit} EUR</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                                    <button
                                        onClick={() => toggleCardDetails(card.id)}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                    >
                                        {showCardDetails[card.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                                        {showCardDetails[card.id] ? 'Masquer' : 'Afficher'}
                                    </button>

                                    {card.status !== 'expired' && (
                                        <>
                                            <button
                                                onClick={() => toggleCardStatus(card.id)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                                    card.status === 'active'
                                                        ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                                                        : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                                }`}
                                            >
                                                {card.status === 'active' ? <Lock size={16} /> : <Unlock size={16} />}
                                                {card.status === 'active' ? 'Bloquer' : 'Débloquer'}
                                            </button>

                                            <button
                                                onClick={() => toggle3DS(card.id)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                                    card.is3dsEnabled
                                                        ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                                                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                                }`}
                                            >
                                                <Shield size={16} />
                                                3DS {card.is3dsEnabled ? 'ON' : 'OFF'}
                                            </button>
                                        </>
                                    )}

                                    <Link
                                        href={`/client/cards/${card.id}`}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors ml-auto"
                                    >
                                        <Settings size={16} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Create Card Modal */}
                {isCreateModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 w-full max-w-md">
                            <h2 className="text-xl font-bold text-white mb-4">Créer une nouvelle carte</h2>
                            <p className="text-slate-400 mb-6">
                                Choisissez le type de carte que vous souhaitez créer.
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <button
                                    onClick={() => setNewCardType('visa')}
                                    className={`p-4 rounded-xl border-2 transition-all ${
                                        newCardType === 'visa'
                                            ? 'border-blue-500 bg-blue-500/10'
                                            : 'border-white/10 hover:border-white/30'
                                    }`}
                                >
                                    <div className="text-2xl font-bold text-white mb-2">VISA</div>
                                    <p className="text-sm text-slate-400">Acceptée partout</p>
                                </button>
                                <button
                                    onClick={() => setNewCardType('mastercard')}
                                    className={`p-4 rounded-xl border-2 transition-all ${
                                        newCardType === 'mastercard'
                                            ? 'border-orange-500 bg-orange-500/10'
                                            : 'border-white/10 hover:border-white/30'
                                    }`}
                                >
                                    <div className="text-2xl font-bold text-white mb-2">MC</div>
                                    <p className="text-sm text-slate-400">Mastercard</p>
                                </button>
                            </div>

                            <div className="p-4 bg-slate-900/50 rounded-xl mb-6">
                                <h3 className="text-sm font-medium text-white mb-2">Caractéristiques</h3>
                                <ul className="text-sm text-slate-400 space-y-1">
                                    <li>• Limite initiale : 1 000 EUR</li>
                                    <li>• 3D Secure activé par défaut</li>
                                    <li>• Paiement sans contact inclus</li>
                                    <li>• Valide 5 ans</li>
                                </ul>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={createNewCard}
                                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:opacity-90 transition-opacity font-semibold"
                                >
                                    Créer la carte
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
