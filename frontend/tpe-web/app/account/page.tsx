'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@shared/context/AuthContext';
import { UserRole } from '@shared/types/user';
import { normalizeRole } from '@shared/utils/roleUtils';
import apiClient from '@/lib/api-client';
import { ArrowLeft, Building2, RefreshCcw, Send, Wallet, BadgeEuro } from 'lucide-react';

type MerchantAccount = {
    accountNumber: string;
    iban: string;
    bic: string;
    accountHolderName: string;
    currency: string;
    status: string;
    availableBalance: number;
    pendingBalance: number;
    reserveBalance: number;
    grossBalance: number;
    availableForPayout: number;
    cardEnabled: boolean;
};

type MerchantEntry = {
    id: string;
    type: string;
    direction: string;
    bucket: string;
    amount: number;
    currency: string;
    reference: string;
    description: string;
    createdAt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (isRecord(error)) {
        const response = isRecord(error.response) ? error.response : null;
        const data = response && isRecord(response.data) ? response.data : null;
        if (data && typeof data.error === 'string' && data.error.trim()) {
            return data.error;
        }
        if (typeof error.message === 'string' && error.message.trim()) {
            return error.message;
        }
    }
    return fallback;
};

const toNumber = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value: number, currency = 'EUR') =>
    new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2
    }).format(value);

const normalizeAccount = (raw: Record<string, unknown>): MerchantAccount => ({
    accountNumber: String(raw.accountNumber || raw.account_number || ''),
    iban: String(raw.iban || ''),
    bic: String(raw.bic || ''),
    accountHolderName: String(raw.accountHolderName || raw.account_holder_name || ''),
    currency: String(raw.currency || 'EUR'),
    status: String(raw.status || 'ACTIVE'),
    availableBalance: toNumber(raw.availableBalance || raw.available_balance),
    pendingBalance: toNumber(raw.pendingBalance || raw.pending_balance),
    reserveBalance: toNumber(raw.reserveBalance || raw.reserve_balance),
    grossBalance: toNumber(raw.grossBalance || raw.gross_balance),
    availableForPayout: toNumber(raw.availableForPayout || raw.available_for_payout),
    cardEnabled: Boolean(raw.cardEnabled ?? raw.card_enabled)
});

const normalizeEntry = (raw: Record<string, unknown>): MerchantEntry => ({
    id: String(raw.id),
    type: String(raw.type || raw.entry_type || ''),
    direction: String(raw.direction || ''),
    bucket: String(raw.bucket || raw.balance_bucket || ''),
    amount: toNumber(raw.amount),
    currency: String(raw.currency || 'EUR'),
    reference: String(raw.reference || ''),
    description: String(raw.description || ''),
    createdAt: String(raw.createdAt || raw.created_at || '')
});

export default function MerchantAccountPage() {
    const { isLoading, isAuthenticated, user } = useAuth();
    const [account, setAccount] = useState<MerchantAccount | null>(null);
    const [entries, setEntries] = useState<MerchantEntry[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSettling, setIsSettling] = useState(false);
    const [isPayingOut, setIsPayingOut] = useState(false);
    const [settleAmount, setSettleAmount] = useState('');
    const [payoutAmount, setPayoutAmount] = useState('');

    const isMerchant = normalizeRole(user?.role) === UserRole.MARCHAND;

    const loadAccountData = async () => {
        setIsRefreshing(true);
        setError(null);
        try {
            const [accountResponse, entriesResponse] = await Promise.all([
                apiClient.get('/api/merchant/account'),
                apiClient.get('/api/merchant/account/entries?limit=30&page=1')
            ]);

            const accountPayload = isRecord(accountResponse.data) && isRecord(accountResponse.data.account)
                ? accountResponse.data.account
                : {};
            const entriesPayload = isRecord(entriesResponse.data) && Array.isArray(entriesResponse.data.entries)
                ? entriesResponse.data.entries
                : [];

            setAccount(normalizeAccount(accountPayload));
            setEntries(entriesPayload.filter(isRecord).map(normalizeEntry));
        } catch (loadError: unknown) {
            setError(getErrorMessage(loadError, 'Impossible de charger le compte marchand'));
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated || !isMerchant) return;
        loadAccountData();
    }, [isAuthenticated, isMerchant]);

    const handleSettle = async (event: FormEvent) => {
        event.preventDefault();
        setIsSettling(true);
        setError(null);
        try {
            const payload: { amount?: number } = {};
            if (settleAmount.trim() !== '') payload.amount = Number(settleAmount);
            await apiClient.post('/api/merchant/account/settle', payload);
            setSettleAmount('');
            await loadAccountData();
        } catch (settleError: unknown) {
            setError(getErrorMessage(settleError, 'Settlement impossible'));
        } finally {
            setIsSettling(false);
        }
    };

    const handlePayout = async (event: FormEvent) => {
        event.preventDefault();
        setIsPayingOut(true);
        setError(null);
        try {
            await apiClient.post('/api/merchant/account/payout', {
                amount: Number(payoutAmount),
                reference: `PAYOUT-${Date.now()}`
            });
            setPayoutAmount('');
            await loadAccountData();
        } catch (payoutError: unknown) {
            setError(getErrorMessage(payoutError, 'Payout impossible'));
        } finally {
            setIsPayingOut(false);
        }
    };

    if (isLoading) {
        return (
            <main className="min-h-screen p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </main>
        );
    }

    if (!isAuthenticated) {
        return (
            <main className="min-h-screen p-8 flex items-center justify-center">
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center max-w-lg">
                    <p className="text-white mb-4">Session expirée.</p>
                    <a href={`${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}/login`} className="text-blue-400 hover:text-blue-300">
                        Retour au login
                    </a>
                </div>
            </main>
        );
    }

    if (!isMerchant) {
        return (
            <main className="min-h-screen p-8 flex items-center justify-center">
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center max-w-xl text-slate-300">
                    Cette page de gestion bancaire est réservée aux marchands.
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen p-6 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition mb-2">
                            <ArrowLeft size={14} />
                            Retour au Terminal
                        </Link>
                        <h1 className="text-3xl font-bold text-white">Gestion du compte marchand</h1>
                        <p className="text-slate-400 text-sm mt-1">Compte bancaire avec IBAN et opérations settlement / payout</p>
                    </div>
                    <button
                        onClick={loadAccountData}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-white hover:bg-slate-700 disabled:opacity-60"
                    >
                        <RefreshCcw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                        Actualiser
                    </button>
                </div>

                {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                        <p className="text-sm text-slate-400">Disponible</p>
                        <p className="text-2xl font-bold text-white">{formatMoney(account?.availableBalance || 0, account?.currency || 'EUR')}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                        <p className="text-sm text-slate-400">Pending</p>
                        <p className="text-2xl font-bold text-white">{formatMoney(account?.pendingBalance || 0, account?.currency || 'EUR')}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                        <p className="text-sm text-slate-400">Reserve</p>
                        <p className="text-2xl font-bold text-white">{formatMoney(account?.reserveBalance || 0, account?.currency || 'EUR')}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                        <p className="text-sm text-emerald-300">Disponible au payout</p>
                        <p className="text-2xl font-bold text-white">{formatMoney(account?.availableForPayout || 0, account?.currency || 'EUR')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 space-y-3">
                        <div className="flex items-center gap-2 text-white font-semibold">
                            <Building2 size={18} className="text-blue-400" />
                            Coordonnées bancaires
                        </div>
                        <p className="text-sm text-slate-400">Numéro interne: <span className="text-slate-200 font-mono">{account?.accountNumber || '-'}</span></p>
                        <p className="text-sm text-slate-400">IBAN: <span className="text-slate-200 font-mono break-all">{account?.iban || '-'}</span></p>
                        <p className="text-sm text-slate-400">BIC: <span className="text-slate-200 font-mono">{account?.bic || '-'}</span></p>
                        <p className="text-sm text-slate-400">Titulaire: <span className="text-slate-200">{account?.accountHolderName || '-'}</span></p>
                        <p className="text-sm text-slate-400">Statut: <span className="text-slate-200">{account?.status || '-'}</span></p>
                        <p className="text-sm text-amber-300 mt-2">
                            Cartes bancaires marchandes : {account?.cardEnabled ? 'ACTIVÉES' : 'DÉSACTIVÉES'}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 space-y-4">
                        <div className="flex items-center gap-2 text-white font-semibold">
                            <Wallet size={18} className="text-emerald-400" />
                            Opérations de gestion
                        </div>
                        <form onSubmit={handleSettle} className="space-y-2">
                            <label className="text-sm text-slate-300 block">
                                Settlement (laisser vide pour tout le pending)
                                <input
                                    value={settleAmount}
                                    onChange={(event) => setSettleAmount(event.target.value)}
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white"
                                />
                            </label>
                            <button
                                type="submit"
                                disabled={isSettling}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-400 disabled:opacity-60"
                            >
                                <Send size={14} />
                                Lancer settlement
                            </button>
                        </form>
                        <form onSubmit={handlePayout} className="space-y-2">
                            <label className="text-sm text-slate-300 block">
                                Montant payout
                                <input
                                    value={payoutAmount}
                                    onChange={(event) => setPayoutAmount(event.target.value)}
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white"
                                />
                            </label>
                            <button
                                type="submit"
                                disabled={isPayingOut}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-60"
                            >
                                <BadgeEuro size={14} />
                                Creer payout
                            </button>
                        </form>
                    </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 space-y-3">
                    <h2 className="text-xl font-semibold text-white">Dernières écritures</h2>
                    {entries.map((entry) => (
                        <div key={entry.id} className="rounded-xl border border-white/10 bg-slate-800/50 p-4 flex items-center justify-between">
                            <div>
                                <p className="text-white font-medium">{entry.type} - {entry.bucket}</p>
                                <p className="text-xs text-slate-400">{entry.reference || '-'} - {entry.description || '-'}</p>
                                <p className="text-xs text-slate-500">{entry.createdAt ? new Date(entry.createdAt).toLocaleString('fr-FR') : '-'}</p>
                            </div>
                            <div className="text-right">
                                <p className={`font-semibold ${entry.direction === 'CREDIT' ? 'text-emerald-300' : 'text-amber-300'}`}>
                                    {entry.direction === 'CREDIT' ? '+' : '-'} {formatMoney(entry.amount, entry.currency)}
                                </p>
                            </div>
                        </div>
                    ))}
                    {entries.length === 0 && (
                        <div className="rounded-xl border border-white/10 bg-slate-800/50 p-6 text-center text-slate-400">
                            Aucune écriture disponible.
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
