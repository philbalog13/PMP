'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@shared/context/AuthContext';
import { UserRole } from '@shared/types/user';
import { ArrowDownLeft, ArrowUpRight, Building2, RefreshCcw, Save, Wallet } from 'lucide-react';
import { clientApi } from '@/lib/api-client';

type Account = {
    iban: string;
    bic: string;
    accountLabel: string;
    accountHolderName: string;
    status: string;
    balance: number;
    availableBalance: number;
    currency: string;
    dailyTransferLimit: number;
    monthlyTransferLimit: number;
};

type Entry = {
    id: string;
    type: string;
    direction: string;
    amount: number;
    currency: string;
    reference: string;
    description: string;
    createdAt: string;
    balanceAfter: number;
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

const normalizeAccount = (raw: unknown): Account => {
    const source = asObject(raw);
    return {
        iban: String(source.iban || ''),
        bic: String(source.bic || ''),
        accountLabel: String(source.accountLabel || source.account_label || 'Compte principal'),
        accountHolderName: String(source.accountHolderName || source.account_holder_name || ''),
        status: String(source.status || 'ACTIVE'),
        balance: toNumber(source.balance),
        availableBalance: toNumber(source.availableBalance || source.available_balance || source.balance),
        currency: String(source.currency || 'EUR'),
        dailyTransferLimit: toNumber(source.dailyTransferLimit || source.daily_transfer_limit),
        monthlyTransferLimit: toNumber(source.monthlyTransferLimit || source.monthly_transfer_limit)
    };
};

const normalizeEntry = (raw: unknown): Entry => {
    const source = asObject(raw);
    return {
        id: String(source.id || ''),
        type: String(source.type || source.entry_type || ''),
        direction: String(source.direction || ''),
        amount: toNumber(source.amount),
        currency: String(source.currency || 'EUR'),
        reference: String(source.reference || ''),
        description: String(source.description || ''),
        createdAt: String(source.createdAt || source.created_at || ''),
        balanceAfter: toNumber(source.balanceAfter || source.balance_after)
    };
};

export default function AccountManagementPage() {
    const { isLoading, isAuthenticated, user } = useAuth();
    const [account, setAccount] = useState<Account | null>(null);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [savingSettings, setSavingSettings] = useState(false);
    const [submittingOperation, setSubmittingOperation] = useState(false);

    const [accountLabel, setAccountLabel] = useState('');
    const [dailyTransferLimit, setDailyTransferLimit] = useState('');
    const [monthlyTransferLimit, setMonthlyTransferLimit] = useState('');

    const [operationType, setOperationType] = useState<'deposit' | 'withdraw'>('deposit');
    const [operationAmount, setOperationAmount] = useState('');
    const [operationReference, setOperationReference] = useState('');

    const isClient = user?.role === UserRole.CLIENT;

    const loadAccountData = async () => {
        setIsRefreshing(true);
        setError(null);

        try {
            const [accountResponse, entriesResponse] = await Promise.all([
                clientApi.getAccount(),
                clientApi.getAccountEntries('limit=20&page=1')
            ]);

            const nextAccount = normalizeAccount(accountResponse.account || {});
            setAccount(nextAccount);
            setAccountLabel(nextAccount.accountLabel);
            setDailyTransferLimit(String(nextAccount.dailyTransferLimit || 0));
            setMonthlyTransferLimit(String(nextAccount.monthlyTransferLimit || 0));
            setEntries((entriesResponse.entries || []).map(normalizeEntry));
        } catch (loadError: unknown) {
            setError(getErrorMessage(loadError, 'Impossible de charger le compte bancaire'));
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated || !isClient) return;
        loadAccountData();
    }, [isAuthenticated, isClient]);

    const handleUpdateSettings = async (event: FormEvent) => {
        event.preventDefault();
        setSavingSettings(true);
        setError(null);

        try {
            await clientApi.updateAccount({
                accountLabel,
                dailyTransferLimit: Number(dailyTransferLimit),
                monthlyTransferLimit: Number(monthlyTransferLimit)
            });
            await loadAccountData();
        } catch (settingsError: unknown) {
            setError(getErrorMessage(settingsError, 'Impossible de mettre à jour les paramètres du compte'));
        } finally {
            setSavingSettings(false);
        }
    };

    const handleSubmitOperation = async (event: FormEvent) => {
        event.preventDefault();
        const amount = Number(operationAmount);

        if (!Number.isFinite(amount) || amount <= 0) {
            setError('Le montant doit être supérieur à zéro.');
            return;
        }

        setSubmittingOperation(true);
        setError(null);
        try {
            if (operationType === 'deposit') {
                await clientApi.deposit(amount, operationReference || 'DEPOSIT', 'Client deposit');
            } else {
                await clientApi.withdraw(amount, operationReference || 'WITHDRAWAL', 'Client withdrawal');
            }

            setOperationAmount('');
            setOperationReference('');
            await loadAccountData();
        } catch (operationError: unknown) {
            setError(getErrorMessage(operationError, 'Opération bancaire impossible'));
        } finally {
            setSubmittingOperation(false);
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
                <div className="max-w-xl w-full rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center text-slate-300">
                    La gestion de compte bancaire de cette interface est réservée aux clients.
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-8 pb-12">
            <div className="max-w-6xl mx-auto px-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">Gestion du compte bancaire</h1>
                        <p className="text-slate-400">IBAN distribué automatiquement à la création du compte client.</p>
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-slate-800/50 p-6 space-y-4">
                        <div className="flex items-center gap-2 text-white font-semibold">
                            <Wallet size={18} className="text-amber-400" />
                            Informations compte
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="rounded-xl bg-slate-900/50 border border-white/5 p-4">
                                <p className="text-slate-400 mb-1">IBAN</p>
                                <p className="text-white font-mono text-xs break-all">{account?.iban || '-'}</p>
                            </div>
                            <div className="rounded-xl bg-slate-900/50 border border-white/5 p-4">
                                <p className="text-slate-400 mb-1">BIC</p>
                                <p className="text-white font-mono text-xs">{account?.bic || '-'}</p>
                            </div>
                            <div className="rounded-xl bg-slate-900/50 border border-white/5 p-4">
                                <p className="text-slate-400 mb-1">Titulaire</p>
                                <p className="text-white">{account?.accountHolderName || '-'}</p>
                            </div>
                            <div className="rounded-xl bg-slate-900/50 border border-white/5 p-4">
                                <p className="text-slate-400 mb-1">Statut</p>
                                <p className="text-white">{account?.status || '-'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
                        <div className="inline-flex items-center gap-2 text-emerald-300 text-sm mb-2">
                            <Building2 size={16} />
                            Solde disponible
                        </div>
                        <p className="text-3xl font-bold text-white">
                            {formatMoney(account?.availableBalance || 0, account?.currency || 'EUR')}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <form onSubmit={handleUpdateSettings} className="rounded-2xl border border-white/10 bg-slate-800/50 p-6 space-y-4">
                        <h2 className="text-xl font-semibold text-white">Paramètres du compte</h2>
                        <label className="block text-sm text-slate-300">
                            Intitulé du compte
                            <input
                                value={accountLabel}
                                onChange={(event) => setAccountLabel(event.target.value)}
                                className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none"
                            />
                        </label>
                        <label className="block text-sm text-slate-300">
                            Limite journalière de virement
                            <input
                                value={dailyTransferLimit}
                                onChange={(event) => setDailyTransferLimit(event.target.value)}
                                type="number"
                                min="0"
                                step="0.01"
                                className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none"
                            />
                        </label>
                        <label className="block text-sm text-slate-300">
                            Limite mensuelle de virement
                            <input
                                value={monthlyTransferLimit}
                                onChange={(event) => setMonthlyTransferLimit(event.target.value)}
                                type="number"
                                min="0"
                                step="0.01"
                                className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none"
                            />
                        </label>
                        <button
                            type="submit"
                            disabled={savingSettings}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-400 disabled:opacity-60"
                        >
                            <Save size={16} />
                            Enregistrer
                        </button>
                    </form>

                    <form onSubmit={handleSubmitOperation} className="rounded-2xl border border-white/10 bg-slate-800/50 p-6 space-y-4">
                        <h2 className="text-xl font-semibold text-white">Opération bancaire</h2>
                        <label className="block text-sm text-slate-300">
                            Type
                            <select
                                value={operationType}
                                onChange={(event) => setOperationType(event.target.value as 'deposit' | 'withdraw')}
                                className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none"
                            >
                                <option value="deposit">Dépôt</option>
                                <option value="withdraw">Retrait</option>
                            </select>
                        </label>
                        <label className="block text-sm text-slate-300">
                            Montant
                            <input
                                value={operationAmount}
                                onChange={(event) => setOperationAmount(event.target.value)}
                                type="number"
                                min="0"
                                step="0.01"
                                className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none"
                            />
                        </label>
                        <label className="block text-sm text-slate-300">
                            Référence
                            <input
                                value={operationReference}
                                onChange={(event) => setOperationReference(event.target.value)}
                                placeholder="Optionnel"
                                className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none"
                            />
                        </label>
                        <button
                            type="submit"
                            disabled={submittingOperation}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white disabled:opacity-60 ${operationType === 'deposit' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-amber-500 hover:bg-amber-400'}`}
                        >
                            {operationType === 'deposit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                            {operationType === 'deposit' ? 'Valider dépôt' : 'Valider retrait'}
                        </button>
                    </form>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-6 space-y-3">
                    <h2 className="text-xl font-semibold text-white">Dernières écritures</h2>
                    {entries.map((entry) => (
                        <div key={entry.id} className="rounded-xl border border-white/10 bg-slate-900/50 p-4 flex items-center justify-between">
                            <div>
                                <p className="text-white font-medium">{entry.type}</p>
                                <p className="text-xs text-slate-400">{entry.reference || '-'} - {entry.description || '-'}</p>
                                <p className="text-xs text-slate-500">{entry.createdAt ? new Date(entry.createdAt).toLocaleString('fr-FR') : '-'}</p>
                            </div>
                            <div className="text-right">
                                <p className={`font-semibold ${entry.direction === 'CREDIT' ? 'text-emerald-300' : 'text-amber-300'}`}>
                                    {entry.direction === 'CREDIT' ? '+' : '-'} {formatMoney(entry.amount, entry.currency)}
                                </p>
                                <p className="text-xs text-slate-400">Solde: {formatMoney(entry.balanceAfter, entry.currency)}</p>
                            </div>
                        </div>
                    ))}

                    {entries.length === 0 && (
                        <div className="rounded-xl border border-white/10 bg-slate-900/50 p-6 text-center text-slate-400">
                            Aucune écriture disponible.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
