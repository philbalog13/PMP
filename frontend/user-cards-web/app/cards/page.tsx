'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@shared/context/AuthContext';
import { UserRole } from '@shared/types/user';
import {
    AlertTriangle,
    ArrowRight,
    CreditCard,
    Lock,
    Plus,
    RefreshCcw,
    Settings,
    Shield,
    Unlock,
    Wifi,
} from 'lucide-react';
import { CardFeaturesUpdateBody, clientApi } from '@/lib/api-client';
import { BankPageHeader } from '@shared/components/banking/layout/BankPageHeader';
import { BankButton } from '@shared/components/banking/primitives/BankButton';
import { BankBadge } from '@shared/components/banking/primitives/BankBadge';
import { BankModal } from '@shared/components/banking/feedback/BankModal';
import { BankEmptyState } from '@shared/components/banking/feedback/BankEmptyState';
import { BankSkeleton } from '@shared/components/banking/feedback/BankSkeleton';
import { StatCard } from '@shared/components/banking/data-display/StatCard';
import { CardVisual } from '@shared/components/banking/data-display/CardVisual';

type ClientCard = {
    id: string;
    maskedPan: string;
    cardholderName: string;
    expiryDate: string;
    cardType: string;
    network: string;
    status: string;
    balance: number;
    currency: string;
    dailyLimit: number;
    dailySpent: number;
    monthlyLimit: number;
    monthlySpent: number;
    threedsEnrolled: boolean;
    contactlessEnabled: boolean;
    internationalEnabled: boolean;
    ecommerceEnabled: boolean;
    isAutoIssued: boolean;
};

const asObject = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) return error.message;
    const candidate = asObject(error);
    return typeof candidate.message === 'string' ? candidate.message : fallback;
};

const toNumber = (value: unknown): number => {
    const parsed = Number.parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value: number, currency = 'EUR') =>
    new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2
    }).format(value);

const normalizeCard = (raw: unknown): ClientCard => {
    const card = asObject(raw);
    return {
        id: String(card.id || ''),
        maskedPan: String(card.masked_pan || card.maskedPan || ''),
        cardholderName: String(card.cardholder_name || card.cardholderName || ''),
        expiryDate: String(card.expiry_date || card.expiryDate || ''),
        cardType: String(card.card_type || card.cardType || 'DEBIT'),
        network: String(card.network || 'VISA'),
        status: String(card.status || 'ACTIVE'),
        balance: toNumber(card.balance),
        currency: String(card.currency || 'EUR'),
        dailyLimit: toNumber(card.daily_limit || card.dailyLimit),
        dailySpent: toNumber(card.daily_spent || card.dailySpent),
        monthlyLimit: toNumber(card.monthly_limit || card.monthlyLimit),
        monthlySpent: toNumber(card.monthly_spent || card.monthlySpent),
        threedsEnrolled: Boolean(card.threeds_enrolled ?? card.threedsEnrolled),
        contactlessEnabled: Boolean(card.contactless_enabled ?? card.contactlessEnabled),
        internationalEnabled: Boolean(card.international_enabled ?? card.internationalEnabled),
        ecommerceEnabled: Boolean(card.ecommerce_enabled ?? card.ecommerceEnabled),
        isAutoIssued: Boolean(card.is_auto_issued ?? card.isAutoIssued)
    };
};

export default function CardsPage() {
    const { isLoading, isAuthenticated, user } = useAuth();
    const [cards, setCards] = useState<ClientCard[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionId, setActionId] = useState<string | null>(null);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [confirmTarget, setConfirmTarget] = useState<ClientCard | null>(null);

    const isClient = user?.role === UserRole.CLIENT;

    const loadCards = async () => {
        setIsRefreshing(true);
        setError(null);

        try {
            const response = await clientApi.getCards();
            setCards((response.cards || []).map(normalizeCard));
        } catch (loadError: unknown) {
            setError(getErrorMessage(loadError, 'Impossible de charger les cartes'));
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated || !isClient) return;
        loadCards();
    }, [isAuthenticated, isClient]);

    const updateCardFeature = async (card: ClientCard, body: CardFeaturesUpdateBody) => {
        setActionId(card.id);
        setError(null);
        try {
            await clientApi.updateCardFeatures(card.id, body);
            await loadCards();
        } catch (featureError: unknown) {
            setError(getErrorMessage(featureError, 'Mise a jour impossible'));
        } finally {
            setActionId(null);
        }
    };

    const toggleBlockStatus = async (card: ClientCard) => {
        setActionId(card.id);
        setError(null);

        try {
            await clientApi.toggleCardBlock(card.id, card.status === 'ACTIVE');
            await loadCards();
        } catch (statusError: unknown) {
            setError(getErrorMessage(statusError, 'Impossible de changer le statut de la carte'));
        } finally {
            setActionId(null);
        }
    };

    const totalBalance = useMemo(
        () => cards.reduce((sum, card) => sum + card.balance, 0),
        [cards]
    );

    const selectedCard = useMemo(
        () => cards.find((card) => card.id === selectedCardId) || cards[0] || null,
        [cards, selectedCardId]
    );

    useEffect(() => {
        if (!cards.length) {
            setSelectedCardId(null);
            return;
        }
        if (!selectedCardId || !cards.some((card) => card.id === selectedCardId)) {
            setSelectedCardId(cards[0].id);
        }
    }, [cards, selectedCardId]);

    const statusToVariant = (status: string) => {
        if (status === 'ACTIVE') return 'success' as const;
        if (status === 'BLOCKED') return 'danger' as const;
        return 'warning' as const;
    };

    const getLimitProgress = (spent: number, limit: number) => {
        if (limit <= 0) return 0;
        return Math.min(100, Math.max(0, (spent / limit) * 100));
    };

    const confirmBlockToggle = async () => {
        if (!confirmTarget) return;
        await toggleBlockStatus(confirmTarget);
        setConfirmTarget(null);
    };

    if (isLoading) {
        return (
            <div style={{ padding: 'var(--bank-space-6)', maxWidth: 1150, margin: '0 auto' }}>
                <BankSkeleton variant="full-page" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--bank-space-6)', background: 'var(--bank-bg-base)' }}>
                <div style={{ maxWidth: 420, width: '100%', borderRadius: 'var(--bank-radius-2xl)', border: '1px solid var(--bank-border-subtle)', background: 'var(--bank-bg-surface)', padding: 'var(--bank-space-8)', textAlign: 'center' }}>
                    <h1 style={{ fontSize: 'var(--bank-text-2xl)', fontWeight: 'var(--bank-font-bold)', color: 'var(--bank-text-primary)', marginBottom: 'var(--bank-space-3)' }}>Session expirée</h1>
                    <p style={{ color: 'var(--bank-text-tertiary)', marginBottom: 'var(--bank-space-6)', fontSize: 'var(--bank-text-sm)' }}>Reconnectez-vous sur le portail pour accéder à votre espace client.</p>
                    <Link
                        href={`${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}/login`}
                        prefetch={false}
                        className="bk-btn bk-btn--primary bk-btn--md"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
                    >
                        Retour au login
                        <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                </div>
            </div>
        );
    }

    if (!isClient) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--bank-space-6)', background: 'var(--bank-bg-base)' }}>
                <div style={{ maxWidth: 520, width: '100%', borderRadius: 'var(--bank-radius-2xl)', border: '1px solid var(--bank-border-subtle)', background: 'var(--bank-bg-surface)', padding: 'var(--bank-space-8)', textAlign: 'center' }}>
                    <AlertTriangle style={{ width: 40, height: 40, margin: '0 auto var(--bank-space-4)', color: 'var(--bank-warning)' }} aria-hidden="true" />
                    <h1 style={{ fontSize: 'var(--bank-text-2xl)', fontWeight: 'var(--bank-font-bold)', color: 'var(--bank-text-primary)', marginBottom: 'var(--bank-space-3)' }}>Cartes non disponibles</h1>
                    <p style={{ color: 'var(--bank-text-tertiary)', fontSize: 'var(--bank-text-sm)' }}>
                        Les cartes bancaires sont réservées aux clients. Les comptes marchands n&apos;ont pas de carte.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1150, margin: '0 auto', padding: 'var(--bank-space-6)' }}>
            <BankPageHeader
                title="Mes cartes"
                subtitle="Gestion des cartes bancaires et des fonctionnalites de securite."
                actions={
                    <div style={{ display: 'flex', gap: 'var(--bank-space-2)' }}>
                        <Link
                            href="/cards/add"
                            prefetch={false}
                            className="bk-btn bk-btn--primary bk-btn--sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                        >
                            <Plus size={14} aria-hidden="true" />
                            Nouvelle carte
                        </Link>
                        <BankButton
                            size="sm"
                            variant="ghost"
                            icon={RefreshCcw}
                            onClick={loadCards}
                            loading={isRefreshing}
                        >
                            Actualiser
                        </BankButton>
                    </div>
                }
            />

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

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 'var(--bank-space-4)',
                    marginBottom: 'var(--bank-space-6)',
                }}
            >
                <StatCard label="Cartes totales" value={String(cards.length)} icon={CreditCard} loading={isRefreshing} index={0} />
                <StatCard
                    label="Cartes actives"
                    value={String(cards.filter((card) => card.status === 'ACTIVE').length)}
                    icon={Shield}
                    loading={isRefreshing}
                    index={1}
                />
                <StatCard
                    label="Solde total cartes"
                    value={formatMoney(totalBalance, cards[0]?.currency || 'EUR')}
                    icon={CreditCard}
                    loading={isRefreshing}
                    accent
                    index={2}
                />
            </div>

            <section className="bk-card" style={{ marginBottom: 'var(--bank-space-6)' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 'var(--bank-space-4)',
                    }}
                >
                    <h2
                        style={{
                            fontSize: 'var(--bank-text-base)',
                            fontWeight: 'var(--bank-font-semibold)',
                            color: 'var(--bank-text-primary)',
                            margin: 0,
                        }}
                    >
                        Cartes disponibles
                    </h2>
                    <span className="bk-caption">Selectionnez une carte pour afficher le detail.</span>
                </div>

                {isRefreshing ? (
                    <BankSkeleton variant="card-visual" count={2} />
                ) : cards.length === 0 ? (
                    <BankEmptyState
                        icon={<CreditCard size={24} />}
                        title="Aucune carte disponible"
                        description="Ajoutez une carte ou demandez une emission pour commencer."
                        action={
                            <Link
                                href="/cards/add"
                                prefetch={false}
                                className="bk-btn bk-btn--primary bk-btn--sm"
                                style={{ textDecoration: 'none' }}
                            >
                                Ajouter une carte
                            </Link>
                        }
                    />
                ) : (
                    <div
                        style={{
                            display: 'flex',
                            gap: 'var(--bank-space-4)',
                            overflowX: 'auto',
                            paddingBottom: 'var(--bank-space-2)',
                        }}
                    >
                        {cards.map((card) => {
                            const isSelected = selectedCard?.id === card.id;
                            return (
                                <div key={card.id}>
                                    <button
                                        onClick={() => setSelectedCardId(card.id)}
                                        type="button"
                                        className="bk-card--interactive"
                                        style={{
                                            border: isSelected
                                                ? '1px solid var(--bank-accent)'
                                                : '1px solid var(--bank-border-subtle)',
                                            borderRadius: 'var(--bank-radius-xl)',
                                            padding: 'var(--bank-space-2)',
                                            background: isSelected ? 'var(--bank-accent-subtle)' : 'transparent',
                                            transition: 'all var(--bank-t-fast) var(--bank-ease)',
                                        }}
                                    >
                                        <CardVisual
                                            maskedPan={card.maskedPan}
                                            cardHolder={card.cardholderName || ''}
                                            expiry={card.expiryDate || '--/--'}
                                            network={card.network.toLowerCase()}
                                            cardType={card.cardType === 'VIRTUAL' ? 'virtual' : 'physical'}
                                            isBlocked={card.status !== 'ACTIVE'}
                                            accent="client"
                                            size="sm"
                                        />
                                    </button>
                                    <div style={{ marginTop: 'var(--bank-space-2)', textAlign: 'center' }}>
                                        <BankBadge
                                            variant={isSelected ? 'accent' : statusToVariant(card.status)}
                                            label={isSelected ? 'Carte active' : card.status}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {selectedCard && (
                <section className="bk-card">
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 'var(--bank-space-5)',
                            gap: 'var(--bank-space-3)',
                        }}
                    >
                        <div>
                            <p className="bk-label-upper" style={{ marginBottom: 4 }}>
                                Detail carte
                            </p>
                            <h3
                                style={{
                                    margin: 0,
                                    fontSize: 'var(--bank-text-lg)',
                                    color: 'var(--bank-text-primary)',
                                    fontWeight: 'var(--bank-font-semibold)',
                                }}
                            >
                                {selectedCard.maskedPan}
                            </h3>
                        </div>
                        <BankBadge variant={statusToVariant(selectedCard.status)} label={selectedCard.status} />
                    </div>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: 'var(--bank-space-4)',
                            marginBottom: 'var(--bank-space-5)',
                        }}
                    >
                        <div>
                            <p className="bk-label-upper" style={{ marginBottom: 6 }}>
                                Titulaire
                            </p>
                            <p className="bk-body" style={{ margin: 0, color: 'var(--bank-text-primary)' }}>
                                {selectedCard.cardholderName || 'Non renseigne'}
                            </p>
                        </div>
                        <div>
                            <p className="bk-label-upper" style={{ marginBottom: 6 }}>
                                Reseau / Type
                            </p>
                            <p className="bk-body" style={{ margin: 0, color: 'var(--bank-text-primary)' }}>
                                {selectedCard.network} - {selectedCard.cardType}
                            </p>
                        </div>
                        <div>
                            <p className="bk-label-upper" style={{ marginBottom: 6 }}>
                                Expiration
                            </p>
                            <p className="bk-body" style={{ margin: 0, color: 'var(--bank-text-primary)' }}>
                                {selectedCard.expiryDate || '--/--'}
                            </p>
                        </div>
                        <div>
                            <p className="bk-label-upper" style={{ marginBottom: 6 }}>
                                CVV
                            </p>
                            <p className="bk-body" style={{ margin: 0, color: 'var(--bank-text-primary)' }}>
                                ***
                            </p>
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                            gap: 'var(--bank-space-4)',
                            marginBottom: 'var(--bank-space-5)',
                        }}
                    >
                        <div
                            style={{
                                border: '1px solid var(--bank-border-subtle)',
                                background: 'var(--bank-bg-sunken)',
                                borderRadius: 'var(--bank-radius-lg)',
                                padding: 'var(--bank-space-4)',
                            }}
                        >
                            <p className="bk-label-upper" style={{ marginBottom: 6 }}>
                                Solde
                            </p>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 'var(--bank-text-xl)',
                                    fontWeight: 'var(--bank-font-semibold)',
                                    color: 'var(--bank-text-primary)',
                                }}
                            >
                                {formatMoney(selectedCard.balance, selectedCard.currency)}
                            </p>
                            {selectedCard.isAutoIssued && (
                                <p className="bk-caption" style={{ marginTop: 6 }}>
                                    Carte auto-issuee (solde compte principal)
                                </p>
                            )}
                        </div>

                        <div
                            style={{
                                border: '1px solid var(--bank-border-subtle)',
                                background: 'var(--bank-bg-sunken)',
                                borderRadius: 'var(--bank-radius-lg)',
                                padding: 'var(--bank-space-4)',
                            }}
                        >
                            <p className="bk-label-upper" style={{ marginBottom: 'var(--bank-space-2)' }}>
                                Plafond journalier
                            </p>
                            <p className="bk-caption" style={{ marginTop: 0, marginBottom: 'var(--bank-space-2)' }}>
                                {formatMoney(selectedCard.dailySpent, selectedCard.currency)} / {formatMoney(selectedCard.dailyLimit, selectedCard.currency)}
                            </p>
                            <div
                                style={{
                                    height: 6,
                                    borderRadius: 'var(--bank-radius-full)',
                                    background: 'var(--bank-bg-elevated)',
                                    overflow: 'hidden',
                                }}
                            >
                                <div
                                    style={{
                                        height: '100%',
                                        width: `${getLimitProgress(selectedCard.dailySpent, selectedCard.dailyLimit)}%`,
                                        background: 'var(--bank-accent)',
                                        borderRadius: 'var(--bank-radius-full)',
                                        transition: 'width var(--bank-t-base) var(--bank-ease)',
                                    }}
                                />
                            </div>

                            <p className="bk-label-upper" style={{ marginBottom: 'var(--bank-space-2)', marginTop: 'var(--bank-space-4)' }}>
                                Plafond mensuel
                            </p>
                            <p className="bk-caption" style={{ marginTop: 0, marginBottom: 'var(--bank-space-2)' }}>
                                {formatMoney(selectedCard.monthlySpent, selectedCard.currency)} / {formatMoney(selectedCard.monthlyLimit, selectedCard.currency)}
                            </p>
                            <div
                                style={{
                                    height: 6,
                                    borderRadius: 'var(--bank-radius-full)',
                                    background: 'var(--bank-bg-elevated)',
                                    overflow: 'hidden',
                                }}
                            >
                                <div
                                    style={{
                                        height: '100%',
                                        width: `${getLimitProgress(selectedCard.monthlySpent, selectedCard.monthlyLimit)}%`,
                                        background: 'var(--bank-success)',
                                        borderRadius: 'var(--bank-radius-full)',
                                        transition: 'width var(--bank-t-base) var(--bank-ease)',
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 'var(--bank-space-2)',
                        }}
                    >
                        <BankButton
                            variant={selectedCard.status === 'ACTIVE' ? 'danger' : 'primary'}
                            icon={selectedCard.status === 'ACTIVE' ? Lock : Unlock}
                            onClick={() => setConfirmTarget(selectedCard)}
                            loading={actionId === selectedCard.id}
                        >
                            {selectedCard.status === 'ACTIVE' ? 'Bloquer la carte' : 'Debloquer la carte'}
                        </BankButton>
                        <BankButton
                            variant="ghost"
                            icon={Shield}
                            onClick={() =>
                                updateCardFeature(selectedCard, { threedsEnrolled: !selectedCard.threedsEnrolled })
                            }
                            loading={actionId === selectedCard.id}
                        >
                            3DS {selectedCard.threedsEnrolled ? 'ON' : 'OFF'}
                        </BankButton>
                        <BankButton
                            variant="ghost"
                            icon={Wifi}
                            onClick={() =>
                                updateCardFeature(selectedCard, { contactlessEnabled: !selectedCard.contactlessEnabled })
                            }
                            loading={actionId === selectedCard.id}
                        >
                            NFC {selectedCard.contactlessEnabled ? 'ON' : 'OFF'}
                        </BankButton>
                        <Link
                            href="/security"
                            prefetch={false}
                            className="bk-btn bk-btn--ghost"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                        >
                            <Settings size={14} aria-hidden="true" />
                            Gerer securite
                        </Link>
                    </div>
                </section>
            )}

            <BankModal
                open={Boolean(confirmTarget)}
                onClose={() => setConfirmTarget(null)}
                title={confirmTarget?.status === 'ACTIVE' ? 'Bloquer cette carte ?' : 'Debloquer cette carte ?'}
                footer={
                    <>
                        <BankButton variant="ghost" onClick={() => setConfirmTarget(null)}>
                            Annuler
                        </BankButton>
                        <BankButton
                            variant={confirmTarget?.status === 'ACTIVE' ? 'danger' : 'primary'}
                            onClick={confirmBlockToggle}
                            loading={Boolean(confirmTarget && actionId === confirmTarget.id)}
                        >
                            {confirmTarget?.status === 'ACTIVE' ? 'Confirmer le blocage' : 'Confirmer le deblocage'}
                        </BankButton>
                    </>
                }
            >
                <p className="bk-body" style={{ margin: 0 }}>
                    {confirmTarget?.status === 'ACTIVE'
                        ? 'Cette action bloque les paiements en ligne et en terminal pour la carte selectionnee.'
                        : 'Cette action reactive les paiements et rend la carte de nouveau utilisable.'}
                </p>
            </BankModal>
        </div>
    );
}
