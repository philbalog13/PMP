'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@shared/context/AuthContext';
import { Wallet, CreditCard, Activity, Building2, RefreshCcw, ArrowRight } from 'lucide-react';
import { clientApi } from '@/lib/api-client';

type DashboardState = {
    cards: {
        total: number;
        active: number;
        totalBalance: number;
    };
    today: {
        transactionCount: number;
        totalSpent: number;
    };
    activeCards: Array<{
        id: string;
        maskedPan: string;
        cardType: string;
        network: string;
        status: string;
        balance: number;
        dailyLimit: number;
        dailySpent: number;
        isAutoIssued: boolean;
    }>;
    recentTransactions: Array<{
        id: string;
        transactionId: string;
        amount: number;
        currency: string;
        type: string;
        status: string;
        merchantName: string;
        timestamp: string;
    }>;
};

type AccountState = {
    iban: string;
    bic: string;
    accountLabel: string;
    accountHolderName: string;
    balance: number;
    currency: string;
};

const asObject = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) return error.message;
    const candidate = asObject(error);
    return typeof candidate.message === 'string' ? candidate.message : fallback;
};

const toNumber = (value: unknown): number => {
    const parsed = Number.parseFloat(String(value ?? ''));
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value: number, currency = 'EUR') =>
    new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2
    }).format(value);

const normalizeDashboard = (payload: unknown): DashboardState => {
    const payloadObject = asObject(payload);
    const dashboard = asObject(payloadObject.dashboard);
    const cards = asObject(dashboard.cards);
    const today = asObject(dashboard.today);
    const activeCards = Array.isArray(dashboard.activeCards) ? dashboard.activeCards : [];
    const recentTransactions = Array.isArray(dashboard.recentTransactions) ? dashboard.recentTransactions : [];

    return {
        cards: {
            total: Number.parseInt(String(cards.total ?? ''), 10) || 0,
            active: Number.parseInt(String(cards.active ?? ''), 10) || 0,
            totalBalance: toNumber(cards.totalBalance)
        },
        today: {
            transactionCount: Number.parseInt(String(today.transactionCount ?? ''), 10) || 0,
            totalSpent: toNumber(today.totalSpent)
        },
        activeCards: activeCards.map((rawCard) => {
            const card = asObject(rawCard);
            return {
                id: String(card.id || ''),
                maskedPan: String(card.masked_pan || card.maskedPan || ''),
                cardType: String(card.card_type || card.cardType || 'DEBIT'),
                network: String(card.network || 'VISA'),
                status: String(card.status || 'ACTIVE'),
                balance: toNumber(card.balance),
                dailyLimit: toNumber(card.daily_limit || card.dailyLimit),
                dailySpent: toNumber(card.daily_spent || card.dailySpent),
                isAutoIssued: Boolean(card.is_auto_issued ?? card.isAutoIssued)
            };
        }),
        recentTransactions: recentTransactions.map((rawTransaction) => {
            const transaction = asObject(rawTransaction);
            return {
                id: String(transaction.id || ''),
                transactionId: String(transaction.transaction_id || transaction.transactionId || ''),
                amount: toNumber(transaction.amount),
                currency: String(transaction.currency || 'EUR'),
                type: String(transaction.type || 'PURCHASE'),
                status: String(transaction.status || 'PENDING'),
                merchantName: String(transaction.merchant_name || transaction.merchantName || '-'),
                timestamp: String(transaction.timestamp || '')
            };
        })
    };
};

const normalizeAccount = (payload: unknown): AccountState => {
    const payloadObject = asObject(payload);
    const account = asObject(payloadObject.account);
    return {
        iban: String(account.iban || ''),
        bic: String(account.bic || ''),
        accountLabel: String(account.accountLabel || account.account_label || 'Compte principal'),
        accountHolderName: String(account.accountHolderName || account.account_holder_name || ''),
        balance: toNumber(account.balance),
        currency: String(account.currency || 'EUR')
    };
};

export default function ClientDashboardHome() {
    const { user, isLoading, isAuthenticated } = useAuth();
    const [isRefreshing, setIsRefreshing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dashboard, setDashboard] = useState<DashboardState | null>(null);
    const [account, setAccount] = useState<AccountState | null>(null);

    const loadData = async () => {
        setIsRefreshing(true);
        setError(null);

        try {
            const [dashboardResponse, accountResponse] = await Promise.all([
                clientApi.getDashboard(),
                clientApi.getAccount()
            ]);

            setDashboard(normalizeDashboard(dashboardResponse));
            setAccount(normalizeAccount(accountResponse));
        } catch (loadError: unknown) {
            setError(getErrorMessage(loadError, 'Impossible de charger les données client'));
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;
        loadData();
    }, [isAuthenticated]);

    const welcomeName = useMemo(() => {
        if (!user) return 'Client';
        if (user.firstName) return user.firstName;
        if (user.name) return user.name;
        if (user.email) return user.email.split('@')[0];
        return 'Client';
    }, [user]);

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

    return (
        <div className="min-h-screen bg-slate-950 py-8 pb-12">
            <div className="max-w-6xl mx-auto px-6 space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                        <div className="shrink-0">
                            <Image src="/icons/bank_institution_icon.png" alt="Bank" width={64} height={64} className="rounded-2xl drop-shadow-[0_0_15px_rgba(255,180,0,0.4)]" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-1">Bonjour, {welcomeName}</h1>
                            <p className="text-slate-400">Données bancaires et cartes synchronisées en temps réel.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href="/pay"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 transition-colors"
                        >
                            Payer
                            <ArrowRight size={16} />
                        </Link>
                        <button
                            onClick={loadData}
                            disabled={isRefreshing}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-white hover:bg-slate-700 disabled:opacity-60"
                        >
                            <RefreshCcw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                            Actualiser
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
                        <p className="text-sm text-amber-300 mb-1">Solde compte bancaire</p>
                        <p className="text-2xl font-bold text-white">
                            {formatMoney(account?.balance || 0, account?.currency || 'EUR')}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-5">
                        <p className="text-sm text-slate-400 mb-1">Cartes actives</p>
                        <p className="text-2xl font-bold text-white">{dashboard?.cards.active || 0}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-5">
                        <p className="text-sm text-slate-400 mb-1">Transactions du jour</p>
                        <p className="text-2xl font-bold text-white">{dashboard?.today.transactionCount || 0}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-5">
                        <p className="text-sm text-slate-400 mb-1">Dépenses du jour</p>
                        <p className="text-2xl font-bold text-white">
                            {formatMoney(dashboard?.today.totalSpent || 0, account?.currency || 'EUR')}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-slate-800/50 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                                <Image src="/icons/virtual_card_icon.png" alt="Card" width={24} height={24} className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                Cartes actives
                            </h2>
                            <Link href="/cards" className="text-sm text-amber-400 hover:text-amber-300">
                                Gérer mes cartes
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {(dashboard?.activeCards || []).slice(0, 3).map((card) => (
                                <div key={card.id} className="rounded-xl border border-white/10 bg-slate-900/50 p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-white font-medium">{card.maskedPan}</p>
                                        <p className="text-xs text-slate-400">{card.network} - {card.cardType}</p>
                                        {card.isAutoIssued && <p className="text-xs text-emerald-300">Carte auto (solde compte)</p>}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white font-semibold">{formatMoney(card.balance, account?.currency || 'EUR')}</p>
                                        <p className="text-xs text-slate-400">
                                            {formatMoney(card.dailySpent, account?.currency || 'EUR')} / {formatMoney(card.dailyLimit, account?.currency || 'EUR')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {(dashboard?.activeCards || []).length === 0 && (
                                <p className="text-slate-400 text-sm">Aucune carte active trouvée.</p>
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-6 space-y-4">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <Building2 size={18} className="text-emerald-400" />
                            Compte bancaire
                        </h2>
                        <div className="text-sm text-slate-300 space-y-1">
                            <p className="text-slate-500">Intitulé</p>
                            <p className="text-white">{account?.accountLabel || '-'}</p>
                            <p className="text-slate-500 mt-2">Titulaire</p>
                            <p className="text-white">{account?.accountHolderName || '-'}</p>
                            <p className="text-slate-500 mt-2">IBAN</p>
                            <p className="text-white font-mono text-xs break-all">{account?.iban || '-'}</p>
                            <p className="text-slate-500 mt-2">BIC</p>
                            <p className="text-white font-mono text-xs">{account?.bic || '-'}</p>
                        </div>
                        <Link
                            href="/account"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                        >
                            <Wallet size={16} />
                            Gérer le compte
                        </Link>
                    </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <Activity size={18} className="text-purple-400" />
                            Dernières transactions
                        </h2>
                        <Link href="/transactions" className="text-sm text-purple-300 hover:text-purple-200">
                            Voir tout
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {(dashboard?.recentTransactions || []).slice(0, 6).map((tx) => (
                            <div key={tx.id} className="rounded-xl border border-white/10 bg-slate-900/50 p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-white font-medium">{tx.merchantName}</p>
                                    <p className="text-xs text-slate-400">{tx.type} - {tx.status} - {new Date(tx.timestamp).toLocaleString('fr-FR')}</p>
                                </div>
                                <p className="text-white font-semibold">{formatMoney(tx.amount, tx.currency)}</p>
                            </div>
                        ))}
                        {(dashboard?.recentTransactions || []).length === 0 && (
                            <p className="text-slate-400 text-sm">Aucune transaction récente.</p>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
