'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@shared/context/AuthContext';
import { UserRole } from '@shared/types/user';
import {
    CheckCircle2,
    Clock3,
    CreditCard,
    Globe,
    KeyRound,
    Laptop,
    Lock,
    RefreshCcw,
    Shield,
    ShieldAlert,
    ShoppingBag,
    Smartphone,
    Wifi,
    type LucideIcon,
} from 'lucide-react';
import { CardFeaturesUpdateBody, clientApi } from '@/lib/api-client';
import { BankPageHeader } from '@shared/components/banking/layout/BankPageHeader';
import { BankButton } from '@shared/components/banking/primitives/BankButton';
import { BankBadge } from '@shared/components/banking/primitives/BankBadge';
import { BankInput } from '@shared/components/banking/primitives/BankInput';
import { BankSpinner } from '@shared/components/banking/primitives/BankSpinner';
import { BankEmptyState } from '@shared/components/banking/feedback/BankEmptyState';
import { StatCard } from '@shared/components/banking/data-display/StatCard';

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

type SessionInfo = {
    id: string;
    device: string;
    location: string;
    lastSeen: string;
    current: boolean;
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

const statusToVariant = (status: string) => {
    if (status === 'ACTIVE') return 'success' as const;
    if (status === 'BLOCKED') return 'danger' as const;
    return 'warning' as const;
};

const formatRelativeNow = () => new Date().toLocaleString('fr-FR');

export default function SecurityPage() {
    const { isLoading, isAuthenticated, user } = useAuth();
    const [cards, setCards] = useState<CardSecurity[]>([]);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [currentPassword, setCurrentPassword] = useState('');
    const [nextPassword, setNextPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);

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
            setError(getErrorMessage(loadError, 'Impossible de charger les parametres de securite'));
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
            setError(getErrorMessage(toggleError, 'Mise a jour impossible'));
        } finally {
            setSavingId(null);
        }
    };

    const securityScore = useMemo(() => {
        if (!cards.length) return twoFactorEnabled ? 40 : 20;
        const flagsEnabled = cards.reduce((acc, card) => {
            return acc
                + (card.threedsEnrolled ? 1 : 0)
                + (card.contactlessEnabled ? 1 : 0)
                + (card.internationalEnabled ? 1 : 0)
                + (card.ecommerceEnabled ? 1 : 0);
        }, 0);
        const totalFlags = cards.length * 4;
        const cardsScore = Math.round((flagsEnabled / totalFlags) * 70);
        return cardsScore + (twoFactorEnabled ? 30 : 0);
    }, [cards, twoFactorEnabled]);

    const activeSessions = useMemo<SessionInfo[]>(() => {
        const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        const isMobileDevice = /Android|iPhone|iPad|Mobile/i.test(ua);
        return [
            {
                id: 'current',
                device: isMobileDevice ? 'Mobile browser' : 'Desktop browser',
                location: 'Session locale',
                lastSeen: 'Maintenant',
                current: true,
            },
            {
                id: 'recent',
                device: isMobileDevice ? 'Desktop browser' : 'Mobile browser',
                location: 'Session recente',
                lastSeen: formatRelativeNow(),
                current: false,
            },
        ];
    }, []);

    const recentActivity = useMemo(() => {
        const items = cards.slice(0, 4).map((card) => ({
            id: `${card.id}-activity`,
            label: `Mise a jour des controles ${card.maskedPan || card.id}`,
            date: formatRelativeNow(),
            state: card.status,
        }));

        if (!items.length) {
            return [
                {
                    id: 'fallback',
                    label: 'Aucune action recente de securite',
                    date: formatRelativeNow(),
                    state: 'INFO',
                },
            ];
        }

        return items;
    }, [cards]);

    const handlePasswordSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setPasswordError(null);
        setPasswordMessage(null);

        if (!currentPassword || !nextPassword || !confirmPassword) {
            setPasswordError('Tous les champs mot de passe sont requis.');
            return;
        }

        if (nextPassword.length < 8) {
            setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caracteres.');
            return;
        }

        if (nextPassword !== confirmPassword) {
            setPasswordError('La confirmation ne correspond pas au nouveau mot de passe.');
            return;
        }

        setPasswordMessage('Validation locale OK. Branchez l endpoint de changement mot de passe pour finaliser.');
        setCurrentPassword('');
        setNextPassword('');
        setConfirmPassword('');
    };

    const renderToggle = (
        card: CardSecurity,
        label: string,
        feature: keyof CardSecurity,
        Icon: LucideIcon,
        enabled: boolean,
    ) => (
        <div
            style={{
                border: '1px solid var(--bank-border-subtle)',
                borderRadius: 'var(--bank-radius-lg)',
                padding: 'var(--bank-space-3)',
                background: enabled ? 'var(--bank-accent-subtle)' : 'var(--bank-bg-sunken)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--bank-space-2)',
            }}
        >
            <span className="bk-body" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--bank-text-primary)' }}>
                {Icon ? <Icon size={14} /> : null}
                {label}
            </span>
            <BankButton
                size="sm"
                variant={enabled ? 'primary' : 'ghost'}
                onClick={() => toggleFeature(card, feature)}
                loading={savingId === card.id + feature}
            >
                {enabled ? 'ON' : 'OFF'}
            </BankButton>
        </div>
    );

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
                <div className="max-w-md w-full rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center space-y-4">
                    <h1 className="text-2xl font-bold text-white">Session expiree</h1>
                    <p className="text-slate-400">Reconnectez-vous sur le portail pour acceder a votre espace client.</p>
                    <Link
                        href={`${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}/login`}
                        className="bk-btn bk-btn--primary"
                        style={{ display: 'inline-flex', textDecoration: 'none' }}
                    >
                        Retour au login
                    </Link>
                </div>
            </div>
        );
    }

    if (!isClient) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
                <div className="max-w-lg w-full rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center text-slate-300">
                    Cette section est reservee aux clients.
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: 'var(--bank-space-6)' }}>
            <BankPageHeader
                title="Securite"
                subtitle="Protections cartes, sessions actives et hygiene de compte."
                actions={
                    <BankButton size="sm" variant="ghost" icon={RefreshCcw} onClick={loadSecurity} loading={isRefreshing}>
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
                <StatCard label="Cartes suivies" value={String(cards.length)} icon={CreditCard} loading={isRefreshing && cards.length === 0} index={0} />
                <StatCard label="2FA compte" value={twoFactorEnabled ? 'Active' : 'Inactive'} icon={twoFactorEnabled ? Shield : ShieldAlert} loading={isRefreshing && cards.length === 0} index={1} />
                <StatCard label="Score securite" value={`${securityScore}%`} icon={Shield} loading={isRefreshing && cards.length === 0} accent index={2} />
            </div>

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
                    }}
                >
                    {error}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 'var(--bank-space-4)', marginBottom: 'var(--bank-space-4)' }} className="bk-security-top-grid">
                <section className="bk-card">
                    <h2 style={{ marginTop: 0, marginBottom: 'var(--bank-space-4)', fontSize: 'var(--bank-text-base)', color: 'var(--bank-text-primary)' }}>
                        Changer mot de passe
                    </h2>
                    <form onSubmit={handlePasswordSubmit} style={{ display: 'grid', gap: 'var(--bank-space-3)' }}>
                        <BankInput
                            label="Mot de passe actuel"
                            type="password"
                            value={currentPassword}
                            onChange={(event) => setCurrentPassword(event.target.value)}
                            prefix={Lock}
                        />
                        <BankInput
                            label="Nouveau mot de passe"
                            type="password"
                            value={nextPassword}
                            onChange={(event) => setNextPassword(event.target.value)}
                            prefix={KeyRound}
                            hint="Minimum 8 caracteres"
                        />
                        <BankInput
                            label="Confirmation"
                            type="password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            prefix={KeyRound}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bank-space-2)', flexWrap: 'wrap' }}>
                            <BankButton type="submit" size="sm">
                                Mettre a jour
                            </BankButton>
                            {passwordMessage && (
                                <span className="bk-caption" style={{ color: 'var(--bank-success)' }}>
                                    {passwordMessage}
                                </span>
                            )}
                            {passwordError && (
                                <span className="bk-caption" style={{ color: 'var(--bank-danger)' }}>
                                    {passwordError}
                                </span>
                            )}
                        </div>
                    </form>
                </section>

                <section className="bk-card">
                    <h2 style={{ marginTop: 0, marginBottom: 'var(--bank-space-4)', fontSize: 'var(--bank-text-base)', color: 'var(--bank-text-primary)' }}>
                        Sessions actives
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-3)' }}>
                        {activeSessions.map((session) => (
                            <div
                                key={session.id}
                                style={{
                                    border: '1px solid var(--bank-border-subtle)',
                                    borderRadius: 'var(--bank-radius-lg)',
                                    padding: 'var(--bank-space-3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 'var(--bank-space-3)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bank-space-2)' }}>
                                    {/mobile/i.test(session.device) ? <Smartphone size={16} /> : <Laptop size={16} />}
                                    <div>
                                        <p style={{ margin: 0, color: 'var(--bank-text-primary)', fontSize: 'var(--bank-text-sm)', fontWeight: 'var(--bank-font-medium)' }}>
                                            {session.device}
                                        </p>
                                        <p className="bk-caption" style={{ margin: 0 }}>
                                            {session.location} · {session.lastSeen}
                                        </p>
                                    </div>
                                </div>
                                <BankBadge variant={session.current ? 'success' : 'neutral'} label={session.current ? 'Session courante' : 'Recente'} />
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <section className="bk-card" style={{ marginBottom: 'var(--bank-space-4)' }}>
                <h2 style={{ marginTop: 0, marginBottom: 'var(--bank-space-4)', fontSize: 'var(--bank-text-base)', color: 'var(--bank-text-primary)' }}>
                    Activite recente
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-3)' }}>
                    {recentActivity.map((item) => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--bank-space-3)', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bank-space-2)' }}>
                                <Clock3 size={14} style={{ color: 'var(--bank-text-tertiary)' }} />
                                <p style={{ margin: 0, color: 'var(--bank-text-primary)', fontSize: 'var(--bank-text-sm)' }}>{item.label}</p>
                            </div>
                            <span className="bk-caption">{item.date}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section className="bk-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--bank-space-4)' }}>
                    <h2 style={{ margin: 0, fontSize: 'var(--bank-text-base)', color: 'var(--bank-text-primary)' }}>
                        Reglages securite par carte
                    </h2>
                    <BankBadge
                        variant={twoFactorEnabled ? 'success' : 'warning'}
                        icon={twoFactorEnabled ? CheckCircle2 : ShieldAlert}
                        label={twoFactorEnabled ? '2FA active' : '2FA inactive'}
                    />
                </div>

                {cards.length === 0 && !isRefreshing ? (
                    <BankEmptyState
                        icon={<CreditCard size={20} />}
                        title="Aucune carte trouvee"
                        description="Aucune carte n est actuellement associee au profil client."
                    />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-4)' }}>
                        {cards.map((card) => (
                            <article
                                key={card.id}
                                style={{
                                    border: '1px solid var(--bank-border-subtle)',
                                    borderRadius: 'var(--bank-radius-xl)',
                                    padding: 'var(--bank-space-4)',
                                    background: 'var(--bank-bg-surface)',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--bank-space-3)', gap: 'var(--bank-space-2)' }}>
                                    <div>
                                        <p style={{ margin: 0, color: 'var(--bank-text-primary)', fontWeight: 'var(--bank-font-semibold)' }}>
                                            {card.maskedPan || card.id}
                                        </p>
                                        <p className="bk-caption" style={{ margin: 0 }}>
                                            {card.cardType}
                                        </p>
                                    </div>
                                    <BankBadge variant={statusToVariant(card.status)} label={card.status} />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--bank-space-3)' }}>
                                    {renderToggle(card, '3D Secure', 'threedsEnrolled', Shield, card.threedsEnrolled)}
                                    {renderToggle(card, 'Sans contact', 'contactlessEnabled', Wifi, card.contactlessEnabled)}
                                    {renderToggle(card, 'International', 'internationalEnabled', Globe, card.internationalEnabled)}
                                    {renderToggle(card, 'E-commerce', 'ecommerceEnabled', ShoppingBag, card.ecommerceEnabled)}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <style>{`
              @media (max-width: 980px) {
                .bk-security-top-grid {
                  grid-template-columns: 1fr !important;
                }
              }
            `}</style>
        </div>
    );
}
