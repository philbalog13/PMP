'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@shared/context/AuthContext';
import { UserRole } from '@shared/types/user';
import { APP_URLS } from '@shared/lib/app-urls';
import { clientApi, type Merchant } from '@/lib/api-client';
import {
    AlertTriangle,
    ArrowRight,
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
import { BankPageHeader } from '@shared/components/banking/layout/BankPageHeader';
import { BankButton } from '@shared/components/banking/primitives/BankButton';
import { BankBadge } from '@shared/components/banking/primitives/BankBadge';
import { BankInput } from '@shared/components/banking/primitives/BankInput';
import { BankSpinner } from '@shared/components/banking/primitives/BankSpinner';
import { BankEmptyState } from '@shared/components/banking/feedback/BankEmptyState';
import { BankSkeleton } from '@shared/components/banking/feedback/BankSkeleton';
import { StatCard } from '@shared/components/banking/data-display/StatCard';
import { BankSelect, type BankSelectOption } from '@shared/components/banking/forms/BankSelect';

type SortKey = 'name' | 'terminal';

const MCC_LABELS: Record<string, string> = {
    '5411': 'Supermarche / Epicerie',
    '5812': 'Restaurant',
    '5541': 'Station-service',
    '5912': 'Pharmacie',
    '5311': 'Grand magasin',
    '5999': 'Commerce divers',
    '7011': 'Hotellerie',
    '4111': 'Transport local',
    '4121': 'Taxi / VTC',
    '5621': 'Pret-a-porter',
    '5661': 'Chaussures',
    '5734': 'Informatique / High-tech',
    '7832': 'Cinema',
    '5941': 'Articles de sport',
    '5045': 'Fournitures bureau',
};

const getMccLabel = (mcc: string): string => MCC_LABELS[mcc] || `Categorie ${mcc}`;

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

const getInitials = (name: string): string =>
    name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

const AVATAR_COLORS = [
    'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)',
    'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)',
    'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
    'linear-gradient(135deg, #F97316 0%, #F59E0B 100%)',
    'linear-gradient(135deg, #F43F5E 0%, #EC4899 100%)',
    'linear-gradient(135deg, #6366F1 0%, #3B82F6 100%)',
];

const getAvatarColor = (id: string): string =>
    AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];

const SORT_OPTIONS: BankSelectOption[] = [
    { value: 'name', label: 'Trier par nom' },
    { value: 'terminal', label: 'Trier par terminal' },
];

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
            <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BankSpinner size={40} />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
                <div className="max-w-md w-full rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center space-y-4">
                    <h1 className="text-2xl font-bold text-white">Session expiree</h1>
                    <p className="text-slate-400">Reconnectez-vous pour acceder a votre espace client.</p>
                    <Link
                        href={`${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}/login`}
                        className="bk-btn bk-btn--primary"
                        style={{ display: 'inline-flex', textDecoration: 'none' }}
                    >
                        Se connecter
                    </Link>
                </div>
            </div>
        );
    }

    if (!isClient) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
                <div className="max-w-lg w-full rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center text-slate-400">
                    Cette section est reservee aux titulaires de carte.
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: 'var(--bank-space-6)' }}>
            <BankPageHeader
                title="Payer chez un marchand"
                subtitle="Selectionnez un marchand partenaire puis ouvrez son terminal de paiement."
                actions={
                    <BankButton
                        variant="ghost"
                        size="sm"
                        icon={RefreshCcw}
                        onClick={loadMerchants}
                        loading={isRefreshing}
                    >
                        Actualiser
                    </BankButton>
                }
            />

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 'var(--bank-space-4)',
                    marginBottom: 'var(--bank-space-6)',
                }}
            >
                <StatCard
                    label="Marchands actifs"
                    value={String(merchants.length)}
                    icon={Store}
                    loading={isRefreshing && merchants.length === 0}
                    index={0}
                />
                <StatCard
                    label="Resultats filtres"
                    value={String(filteredMerchants.length)}
                    icon={Search}
                    loading={isRefreshing && merchants.length === 0}
                    index={1}
                />
                <StatCard
                    label="Mode paiement"
                    value="3DS active"
                    icon={ShieldCheck}
                    loading={isRefreshing && merchants.length === 0}
                    accent
                    index={2}
                />
            </div>

            <section className="bk-card" style={{ marginBottom: 'var(--bank-space-6)' }}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(260px, 1fr) minmax(220px, 300px)',
                        gap: 'var(--bank-space-3)',
                    }}
                    className="bk-pay-filters"
                >
                    <BankInput
                        label="Recherche"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Nom, ville, MCC, TID, MID..."
                        prefix={Search}
                    />
                    <BankSelect
                        label="Tri"
                        value={sortBy}
                        onChange={(value) => setSortBy(value as SortKey)}
                        options={SORT_OPTIONS}
                    />
                </div>
            </section>

            {error && (
                <div
                    style={{
                        marginBottom: 'var(--bank-space-4)',
                        borderRadius: 'var(--bank-radius-lg)',
                        border: '1px solid color-mix(in srgb, var(--bank-danger) 30%, transparent)',
                        background: 'color-mix(in srgb, var(--bank-danger) 8%, transparent)',
                        color: 'var(--bank-danger)',
                        padding: 'var(--bank-space-4)',
                        fontSize: 'var(--bank-text-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--bank-space-2)',
                    }}
                >
                    <AlertTriangle size={16} />
                    {error}
                </div>
            )}

            {isRefreshing && merchants.length === 0 ? (
                <div className="bk-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-2)' }}>
                    <BankSkeleton variant="transaction-row" count={4} />
                </div>
            ) : filteredMerchants.length === 0 ? (
                <div className="bk-card">
                    <BankEmptyState
                        icon={<Store size={22} />}
                        title="Aucun marchand trouve"
                        description="Ajustez la recherche ou rechargez la liste des partenaires disponibles."
                        action={
                            <BankButton variant="ghost" icon={RefreshCcw} onClick={loadMerchants}>
                                Recharger
                            </BankButton>
                        }
                    />
                </div>
            ) : (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: 'var(--bank-space-4)',
                    }}
                >
                    {filteredMerchants.map((merchant) => (
                        <article
                            key={merchant.id}
                            className="bk-card bk-card--interactive"
                            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-4)' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bank-space-3)' }}>
                                <div
                                    aria-hidden="true"
                                    style={{
                                        width: 46,
                                        height: 46,
                                        borderRadius: 'var(--bank-radius-lg)',
                                        background: getAvatarColor(merchant.id),
                                        color: 'white',
                                        display: 'grid',
                                        placeItems: 'center',
                                        fontWeight: 700,
                                        fontSize: 15,
                                        flexShrink: 0,
                                    }}
                                >
                                    {getInitials(merchant.merchantName)}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <h3
                                        style={{
                                            margin: 0,
                                            fontSize: 'var(--bank-text-base)',
                                            color: 'var(--bank-text-primary)',
                                            fontWeight: 'var(--bank-font-semibold)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {merchant.merchantName}
                                    </h3>
                                    <p className="bk-caption" style={{ margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <MapPin size={12} />
                                        {merchant.location}{merchant.city && merchant.location !== merchant.city ? ` - ${merchant.city}` : ''}
                                    </p>
                                </div>
                            </div>

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                    gap: 'var(--bank-space-3)',
                                }}
                            >
                                <div>
                                    <p className="bk-label-upper" style={{ marginBottom: 4 }}>MID</p>
                                    <p className="bk-body" style={{ margin: 0, fontFamily: 'var(--bank-font-mono)' }}>
                                        <Hash size={12} style={{ marginRight: 6 }} />
                                        {merchant.id.slice(0, 16)}
                                    </p>
                                </div>
                                <div>
                                    <p className="bk-label-upper" style={{ marginBottom: 4 }}>TID</p>
                                    <p className="bk-body" style={{ margin: 0, fontFamily: 'var(--bank-font-mono)' }}>
                                        <Terminal size={12} style={{ marginRight: 6 }} />
                                        {merchant.terminalId || '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="bk-label-upper" style={{ marginBottom: 4 }}>MCC</p>
                                    <p className="bk-body" style={{ margin: 0, fontFamily: 'var(--bank-font-mono)' }}>
                                        <Tag size={12} style={{ marginRight: 6 }} />
                                        {merchant.mcc}
                                    </p>
                                </div>
                                <div>
                                    <p className="bk-label-upper" style={{ marginBottom: 4 }}>Categorie</p>
                                    <p className="bk-body" style={{ margin: 0 }}>
                                        <Building2 size={12} style={{ marginRight: 6 }} />
                                        {getMccLabel(merchant.mcc)}
                                    </p>
                                </div>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--bank-space-2)',
                                    flexWrap: 'wrap',
                                }}
                            >
                                <BankBadge variant="success" label="3DS active" icon={ShieldCheck} />
                                <BankBadge variant="info" label="CB / Visa / MC" icon={CreditCard} />
                                <BankButton
                                    onClick={() => window.location.assign(buildTpeUrl(merchant.id))}
                                    iconRight={ArrowRight}
                                    size="sm"
                                    style={{ marginLeft: 'auto' }}
                                >
                                    Payer
                                </BankButton>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <style>{`
              @media (max-width: 820px) {
                .bk-pay-filters { grid-template-columns: 1fr !important; }
              }
            `}</style>
        </div>
    );
}
