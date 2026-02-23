'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@shared/context/AuthContext';
import { UserRole } from '@shared/types/user';
import { APP_URLS } from '@shared/lib/app-urls';
import { clientApi, type Merchant } from '@/lib/api-client';
import {
    AlertTriangle,
    ArrowRight,
    ArrowUpDown,
    Building2,
    CreditCard,
    Hash,
    MapPin,
    RefreshCcw,
    Search,
    ShieldCheck,
    Store,
    Tag,
    Terminal,
} from 'lucide-react';

type SortKey = 'name' | 'terminal';

// MCC → libellé lisible
const MCC_LABELS: Record<string, string> = {
    '5411': 'Supermarché / Épicerie',
    '5812': 'Restaurant',
    '5541': 'Station-service',
    '5912': 'Pharmacie',
    '5311': 'Grand magasin',
    '5999': 'Commerce divers',
    '7011': 'Hôtellerie',
    '4111': 'Transport local',
    '4121': 'Taxi / VTC',
    '5621': 'Prêt-à-porter',
    '5661': 'Chaussures',
    '5734': 'Informatique / High-tech',
    '7832': 'Cinéma',
    '5941': 'Articles de sport',
    '5045': 'Fournitures bureau',
};

const getMccLabel = (mcc: string): string => MCC_LABELS[mcc] || `Catégorie ${mcc}`;

type MerchantOption = {
    id: string;
    merchantName: string;
    location: string;
    city: string;
    mcc: string;
    terminalId: string | null;
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
        location: terminal?.locationName || 'Localisation indisponible',
        city: terminal?.city || '',
        mcc: terminal?.mcc || 'N/A',
        terminalId: terminal?.terminalId || null,
    };
};

const buildTpeUrl = (merchantId: string): string => {
    const base = APP_URLS.tpe.startsWith('http')
        ? new URL(APP_URLS.tpe)
        : new URL(APP_URLS.tpe, window.location.origin);

    base.searchParams.set('merchantId', merchantId);
    base.searchParams.set('from', 'client');

    const token = localStorage.getItem('token');
    if (token) base.searchParams.set('token', token);

    return base.toString();
};

// Initiales du marchand pour l'avatar
const getInitials = (name: string): string =>
    name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

// Couleur déterministe basée sur l'ID
const AVATAR_COLORS = [
    'from-blue-500 to-cyan-500',
    'from-violet-500 to-purple-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-amber-500',
    'from-rose-500 to-pink-500',
    'from-indigo-500 to-blue-500',
];
const getAvatarColor = (id: string): string =>
    AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];

export default function ClientPayPage() {
    const { isLoading, isAuthenticated, user } = useAuth();
    const [isRefreshing, setIsRefreshing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<SortKey>('name');
    const [merchants, setMerchants] = useState<MerchantOption[]>([]);

    const isClient = user?.role === UserRole.CLIENT;

    const loadMerchants = async () => {
        setIsRefreshing(true);
        setError(null);
        try {
            const response = await clientApi.getAvailableMerchants();
            const merchantRows = Array.isArray(response.merchants) ? response.merchants : [];
            const normalized = merchantRows
                .filter((m): m is Merchant => Boolean(m?.id))
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
        const q = searchTerm.trim().toLowerCase();
        const filtered = q
            ? merchants.filter((m) =>
                m.merchantName.toLowerCase().includes(q) ||
                m.location.toLowerCase().includes(q) ||
                m.city.toLowerCase().includes(q) ||
                m.mcc.includes(q) ||
                getMccLabel(m.mcc).toLowerCase().includes(q) ||
                (m.terminalId || '').toLowerCase().includes(q) ||
                m.id.toLowerCase().includes(q)
            )
            : [...merchants];

        if (sortBy === 'name') {
            filtered.sort((a, b) => a.merchantName.localeCompare(b.merchantName, 'fr'));
        } else {
            filtered.sort((a, b) => (a.terminalId || '').localeCompare(b.terminalId || '', undefined, { numeric: true }));
        }

        return filtered;
    }, [merchants, searchTerm, sortBy]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-500" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
                <div className="max-w-md w-full rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center space-y-4">
                    <h1 className="text-2xl font-bold text-white">Session expirée</h1>
                    <p className="text-slate-400">Reconnectez-vous pour accéder à votre espace client.</p>
                    <a
                        href={`${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}/login`}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 transition-colors"
                    >
                        Se connecter
                    </a>
                </div>
            </div>
        );
    }

    if (!isClient) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
                <div className="max-w-lg w-full rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center text-slate-400">
                    Cette section est réservée aux titulaires de carte.
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-8 pb-16">
            <div className="max-w-5xl mx-auto px-6 space-y-7">

                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Payer chez un marchand</h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Sélectionnez un marchand partenaire pour ouvrir son terminal de paiement.
                        </p>
                    </div>
                    <button
                        onClick={loadMerchants}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-sm text-white hover:bg-slate-700 disabled:opacity-50 transition"
                    >
                        <RefreshCcw size={15} className={isRefreshing ? 'animate-spin' : ''} />
                        Actualiser
                    </button>
                </div>

                {/* Recherche + Tri */}
                <div className="flex gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Rechercher par nom, ville, MCC, TID, MID…"
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-800/70 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition"
                        />
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/70 border border-white/10 text-sm text-white">
                        <ArrowUpDown size={14} className="text-slate-400 shrink-0" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortKey)}
                            className="bg-transparent text-sm text-white focus:outline-none cursor-pointer"
                        >
                            <option value="name">Trier par nom</option>
                            <option value="terminal">Trier par terminal</option>
                        </select>
                    </div>
                </div>

                {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-center gap-2">
                        <AlertTriangle size={15} className="shrink-0" />
                        {error}
                    </div>
                )}

                {/* Stats rapides */}
                {merchants.length > 0 && (
                    <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-800/50 px-3 py-1.5">
                            <Store size={12} />
                            {merchants.length} marchand{merchants.length > 1 ? 's' : ''} disponible{merchants.length > 1 ? 's' : ''}
                        </span>
                        {searchTerm && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-cyan-300">
                                {filteredMerchants.length} résultat{filteredMerchants.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                )}

                {/* Liste marchands */}
                {isRefreshing && merchants.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-12 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500" />
                    </div>
                ) : filteredMerchants.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-12 text-center space-y-2">
                        <Store size={28} className="mx-auto text-slate-600" />
                        <p className="text-slate-400 text-sm">Aucun marchand trouvé</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredMerchants.map((merchant) => (
                            <div
                                key={merchant.id}
                                className="rounded-2xl border border-white/8 bg-slate-900/60 hover:border-white/20 transition-all overflow-hidden group"
                            >
                                {/* Top: avatar + nom */}
                                <div className="flex items-center gap-4 px-5 pt-5 pb-4 border-b border-white/5">
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarColor(merchant.id)} flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg`}>
                                        {getInitials(merchant.merchantName)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-base font-semibold text-white truncate">{merchant.merchantName}</p>
                                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                            <MapPin size={11} />
                                            {merchant.location}{merchant.city && merchant.location !== merchant.city ? ` — ${merchant.city}` : ''}
                                        </p>
                                    </div>
                                </div>

                                {/* Identifiants techniques */}
                                <div className="px-5 py-4 grid grid-cols-2 gap-3 text-xs">
                                    <div className="flex items-start gap-2">
                                        <Hash size={12} className="text-slate-500 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-slate-500 uppercase tracking-wider text-[10px]">MID</p>
                                            <p className="font-mono text-slate-200 mt-0.5 break-all">{merchant.id.slice(0, 16)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Terminal size={12} className="text-slate-500 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-slate-500 uppercase tracking-wider text-[10px]">TID</p>
                                            <p className="font-mono text-slate-200 mt-0.5">{merchant.terminalId || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Tag size={12} className="text-slate-500 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-slate-500 uppercase tracking-wider text-[10px]">MCC</p>
                                            <p className="font-mono text-slate-200 mt-0.5">{merchant.mcc}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Building2 size={12} className="text-slate-500 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-slate-500 uppercase tracking-wider text-[10px]">Catégorie</p>
                                            <p className="text-slate-200 mt-0.5 leading-tight">{getMccLabel(merchant.mcc)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* 3DS badge + bouton */}
                                <div className="px-5 pb-5 flex items-center gap-3">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
                                        <ShieldCheck size={10} />
                                        3DS activé
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-800/60 border border-white/5 rounded-full px-2.5 py-1">
                                        <CreditCard size={10} />
                                        CB / Visa / MC
                                    </span>
                                    <button
                                        onClick={() => window.location.assign(buildTpeUrl(merchant.id))}
                                        className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-colors shadow-md shadow-cyan-500/20"
                                    >
                                        Payer
                                        <ArrowRight size={15} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
