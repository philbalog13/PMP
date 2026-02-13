'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@shared/context/AuthContext';
import { UserRole } from '@shared/types/user';
import { APP_URLS } from '@shared/lib/app-urls';
import { clientApi, type Merchant } from '@/lib/api-client';
import { AlertTriangle, ArrowRight, MapPin, RefreshCcw, Search, Store } from 'lucide-react';

type MerchantOption = {
    id: string;
    merchantName: string;
    location: string;
    mcc: string;
};

const asObject = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) return error.message;
    const candidate = asObject(error);
    return typeof candidate.message === 'string' ? candidate.message : fallback;
};

const normalizeMerchant = (merchant: Merchant): MerchantOption => {
    const terminal = Array.isArray(merchant.terminals) && merchant.terminals.length > 0
        ? merchant.terminals[0]
        : undefined;

    return {
        id: merchant.id,
        merchantName: terminal?.merchantName || merchant.displayName || merchant.username || 'Marchand',
        location: terminal?.locationName || terminal?.city || 'Localisation indisponible',
        mcc: terminal?.mcc || 'N/A'
    };
};

const buildTpeUrl = (merchantId: string): string => {
    const base = APP_URLS.tpe.startsWith('http')
        ? new URL(APP_URLS.tpe)
        : new URL(APP_URLS.tpe, window.location.origin);

    base.searchParams.set('merchantId', merchantId);
    base.searchParams.set('from', 'client');
    return base.toString();
};

export default function ClientPayPage() {
    const { isLoading, isAuthenticated, user } = useAuth();
    const [isRefreshing, setIsRefreshing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [merchants, setMerchants] = useState<MerchantOption[]>([]);

    const isClient = user?.role === UserRole.CLIENT;

    const loadMerchants = async () => {
        setIsRefreshing(true);
        setError(null);
        try {
            const response = await clientApi.getAvailableMerchants();
            const merchantRows = Array.isArray(response.merchants) ? response.merchants : [];
            const normalized = merchantRows
                .filter((merchant): merchant is Merchant => Boolean(merchant?.id))
                .map(normalizeMerchant);
            setMerchants(normalized);
        } catch (loadError: unknown) {
            setError(getErrorMessage(loadError, 'Impossible de charger les marchands'));
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated || !isClient) return;
        loadMerchants();
    }, [isAuthenticated, isClient]);

    const filteredMerchants = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return merchants;

        return merchants.filter((merchant) =>
            merchant.merchantName.toLowerCase().includes(query) ||
            merchant.location.toLowerCase().includes(query) ||
            merchant.mcc.toLowerCase().includes(query)
        );
    }, [merchants, searchTerm]);

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
            <div className="max-w-6xl mx-auto px-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">Choisir un marchand</h1>
                        <p className="text-slate-400">Sélectionnez un marchand pour ouvrir son terminal de paiement.</p>
                    </div>
                    <button
                        onClick={loadMerchants}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-white hover:bg-slate-700 disabled:opacity-60"
                    >
                        <RefreshCcw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                        Actualiser
                    </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-4">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Rechercher un marchand (nom, lieu, MCC)"
                            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                        />
                    </div>
                </div>

                {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                        {error}
                    </div>
                )}

                {isRefreshing && merchants.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-8 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500" />
                    </div>
                ) : filteredMerchants.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-8 text-center">
                        <Store size={22} className="mx-auto mb-2 text-slate-500" />
                        <p className="text-slate-300">Aucun marchand trouvé</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredMerchants.map((merchant) => (
                            <div
                                key={merchant.id}
                                className="rounded-2xl border border-white/10 bg-slate-800/50 p-5 space-y-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-lg font-semibold text-white">{merchant.merchantName}</p>
                                        <p className="text-xs text-slate-500">ID {merchant.id}</p>
                                    </div>
                                    <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-slate-300">
                                        MCC {merchant.mcc}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-400 flex items-center gap-2">
                                    <MapPin size={14} className="text-slate-500" />
                                    {merchant.location}
                                </p>
                                <button
                                    onClick={() => {
                                        window.location.assign(buildTpeUrl(merchant.id));
                                    }}
                                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 transition-colors"
                                >
                                    Payer chez ce marchand
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100 flex items-start gap-3">
                    <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                    <p>
                        Cette page ne montre que la sélection du marchand. Le compte et l&apos;historique marchand restent
                        accessibles uniquement dans l&apos;espace marchand.
                    </p>
                </div>
            </div>
        </div>
    );
}
