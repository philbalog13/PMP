'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@shared/context/AuthContext';
import {
  Wallet, CreditCard, Activity,
  RefreshCcw, ArrowRight, TrendingUp,
} from 'lucide-react';
import { clientApi } from '@/lib/api-client';

/* ── Composants Banking ── */
import { BankPageHeader }  from '@shared/components/banking/layout/BankPageHeader';
import { BankSkeleton }    from '@shared/components/banking/feedback/BankSkeleton';
import { BankEmptyState }  from '@shared/components/banking/feedback/BankEmptyState';
import { StatCard }        from '@shared/components/banking/data-display/StatCard';
import { BalanceDisplay }  from '@shared/components/banking/data-display/BalanceDisplay';
import { CardVisual }      from '@shared/components/banking/data-display/CardVisual';
import { TransactionList } from '@shared/components/banking/data-display/TransactionList';
import { type BankTransaction } from '@shared/components/banking/data-display/TransactionRow';

/* ══════════════════════════════════════════════════════
   TYPES (inchangés)
   ══════════════════════════════════════════════════════ */
type DashboardState = {
  cards: { total: number; active: number; totalBalance: number };
  today: { transactionCount: number; totalSpent: number };
  activeCards: Array<{
    id: string; maskedPan: string; cardType: string; network: string;
    status: string; balance: number; dailyLimit: number; dailySpent: number;
    isAutoIssued: boolean;
  }>;
  recentTransactions: Array<{
    id: string; transactionId: string; amount: number; currency: string;
    type: string; status: string; merchantName: string; timestamp: string;
  }>;
};

type AccountState = {
  iban: string; bic: string; accountLabel: string;
  accountHolderName: string; balance: number; currency: string;
};

/* ══════════════════════════════════════════════════════
   HELPERS (inchangés — logique métier préservée)
   ══════════════════════════════════════════════════════ */
const asObject = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : {};

const getErrorMessage = (e: unknown, fb: string): string => {
  if (e instanceof Error && e.message) return e.message;
  const c = asObject(e);
  return typeof c.message === 'string' ? c.message : fb;
};

const toNum = (v: unknown): number => {
  const p = Number.parseFloat(String(v ?? ''));
  return Number.isFinite(p) ? p : 0;
};

const fmt = (v: number, cur = 'EUR') =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(v);

const normalizeDashboard = (payload: unknown): DashboardState => {
  const p  = asObject(payload);
  const d  = asObject(p.dashboard);
  const c  = asObject(d.cards);
  const t  = asObject(d.today);
  const ac = Array.isArray(d.activeCards) ? d.activeCards : [];
  const rt = Array.isArray(d.recentTransactions) ? d.recentTransactions : [];
  return {
    cards: {
      total:        Number.parseInt(String(c.total ?? ''), 10) || 0,
      active:       Number.parseInt(String(c.active ?? ''), 10) || 0,
      totalBalance: toNum(c.totalBalance),
    },
    today: {
      transactionCount: Number.parseInt(String(t.transactionCount ?? ''), 10) || 0,
      totalSpent:       toNum(t.totalSpent),
    },
    activeCards: ac.map(raw => {
      const x = asObject(raw);
      return {
        id:           String(x.id || ''),
        maskedPan:    String(x.masked_pan || x.maskedPan || ''),
        cardType:     String(x.card_type || x.cardType || 'DEBIT'),
        network:      String(x.network || 'VISA'),
        status:       String(x.status || 'ACTIVE'),
        balance:      toNum(x.balance),
        dailyLimit:   toNum(x.daily_limit || x.dailyLimit),
        dailySpent:   toNum(x.daily_spent || x.dailySpent),
        isAutoIssued: Boolean(x.is_auto_issued ?? x.isAutoIssued),
      };
    }),
    recentTransactions: rt.map(raw => {
      const x = asObject(raw);
      return {
        id:            String(x.id || ''),
        transactionId: String(x.transaction_id || x.transactionId || ''),
        amount:        toNum(x.amount),
        currency:      String(x.currency || 'EUR'),
        type:          String(x.type || 'PURCHASE'),
        status:        String(x.status || 'PENDING'),
        merchantName:  String(x.merchant_name || x.merchantName || '-'),
        timestamp:     String(x.timestamp || ''),
      };
    }),
  };
};

const normalizeAccount = (payload: unknown): AccountState => {
  const p = asObject(payload);
  const a = asObject(p.account);
  return {
    iban:              String(a.iban || ''),
    bic:               String(a.bic || ''),
    accountLabel:      String(a.accountLabel || a.account_label || 'Compte principal'),
    accountHolderName: String(a.accountHolderName || a.account_holder_name || ''),
    balance:           toNum(a.balance),
    currency:          String(a.currency || 'EUR'),
  };
};

/* ══════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ══════════════════════════════════════════════════════ */
export default function ClientDashboardHome() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [dashboard,    setDashboard]    = useState<DashboardState | null>(null);
  const [account,      setAccount]      = useState<AccountState | null>(null);

  const loadData = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const [dr, ar] = await Promise.all([clientApi.getDashboard(), clientApi.getAccount()]);
      setDashboard(normalizeDashboard(dr));
      setAccount(normalizeAccount(ar));
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Impossible de charger les données client'));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => { if (!isAuthenticated) return; loadData(); }, [isAuthenticated]);

  const welcomeName = useMemo(() => {
    if (!user) return 'Client';
    return user.firstName || user.name || user.email?.split('@')[0] || 'Client';
  }, [user]);

  /* Adapte les transactions pour le composant BankTransaction */
  const bankTransactions: BankTransaction[] = useMemo(() =>
    (dashboard?.recentTransactions ?? []).map(tx => ({
      id: tx.id, transactionId: tx.transactionId,
      amount: tx.amount, currency: tx.currency,
      type: tx.type, status: tx.status,
      description: tx.merchantName, timestamp: tx.timestamp,
    })),
  [dashboard]);

  const currency = account?.currency || 'EUR';

  /* ── Skeleton global (premier chargement) ── */
  if (isLoading) {
    return (
      <div style={{ padding: 'var(--bank-space-6)', maxWidth: 1100, margin: '0 auto' }}>
        <BankSkeleton variant="full-page" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--bank-space-6)', background: 'var(--bank-bg-base)' }}>
        <div style={{ maxWidth: 420, width: '100%', borderRadius: 'var(--bank-radius-2xl)', border: '1px solid var(--bank-border-subtle)', background: 'var(--bank-bg-surface)', padding: 'var(--bank-space-8)', textAlign: 'center' }}>
          <h1 style={{ fontSize: 'var(--bank-text-2xl)', fontWeight: 'var(--bank-font-bold)', color: 'var(--bank-text-primary)', marginBottom: 'var(--bank-space-3)' }}>
            Session expirée
          </h1>
          <p style={{ color: 'var(--bank-text-tertiary)', marginBottom: 'var(--bank-space-6)', fontSize: 'var(--bank-text-sm)' }}>
            Reconnectez-vous sur le portail pour accéder à votre espace client.
          </p>
          <a
            href={`${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}/login`}
            className="bk-btn bk-btn--primary bk-btn--md"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
          >
            Retour au login
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════
     DASHBOARD PRINCIPAL
     ══════════════════════════════════════════════════════ */
  return (
    <div style={{ padding: 'var(--bank-space-6)', paddingBottom: 'var(--bank-space-12)', maxWidth: 1100, margin: '0 auto' }}>

      {/* ── En-tête ── */}
      <BankPageHeader
        title={`Bonjour, ${welcomeName}`}
        subtitle="Données bancaires et cartes synchronisées en temps réel."
        style={{ marginBottom: 'var(--bank-space-6)' }}
        actions={
          <div style={{ display: 'flex', gap: 'var(--bank-space-2)' }}>
            <Link
              href="/pay"
              className="bk-btn bk-btn--primary bk-btn--sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
            >
              Payer <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <button
              onClick={loadData}
              disabled={isRefreshing}
              className="bk-btn bk-btn--ghost bk-btn--sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCcw size={14} className={isRefreshing ? 'bk-spin' : ''} aria-hidden="true" />
              Actualiser
            </button>
          </div>
        }
      />

      {/* ── Erreur ── */}
      {error && (
        <div style={{ padding: 'var(--bank-space-4)', borderRadius: 'var(--bank-radius-lg)', border: '1px solid color-mix(in srgb, var(--bank-danger) 30%, transparent)', background: 'color-mix(in srgb, var(--bank-danger) 8%, transparent)', color: 'var(--bank-danger)', fontSize: 'var(--bank-text-sm)', marginBottom: 'var(--bank-space-5)' }}>
          {error}
        </div>
      )}

      {/* ══ STATS ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--bank-space-4)', marginBottom: 'var(--bank-space-6)' }}>
        <StatCard label="Solde compte" value={fmt(account?.balance ?? 0, currency)} icon={Wallet}    loading={isRefreshing} accent index={0} />
        <StatCard label="Cartes actives" value={String(dashboard?.cards.active ?? 0)}                icon={CreditCard}  loading={isRefreshing} index={1} />
        <StatCard label="Transactions du jour" value={String(dashboard?.today.transactionCount ?? 0)} icon={Activity}   loading={isRefreshing} index={2} />
        <StatCard label="Dépenses du jour" value={fmt(dashboard?.today.totalSpent ?? 0, currency)}   icon={TrendingUp}  loading={isRefreshing} index={3} />
      </div>

      {/* ══ CARTES + COMPTE ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--bank-space-6)', marginBottom: 'var(--bank-space-6)', alignItems: 'start' }}
        className="bk-grid-cards-account">
        {/* Cartes actives */}
        <div style={{ borderRadius: 'var(--bank-radius-2xl)', border: '1px solid var(--bank-border-subtle)', background: 'var(--bank-bg-surface)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--bank-space-4) var(--bank-space-5)', borderBottom: '1px solid var(--bank-border-subtle)' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--bank-space-2)', fontSize: 'var(--bank-text-base)', fontWeight: 'var(--bank-font-semibold)', color: 'var(--bank-text-primary)' }}>
              <CreditCard size={16} strokeWidth={2} style={{ color: 'var(--bank-accent)' }} aria-hidden="true" />
              Cartes actives
            </h2>
            <Link href="/cards" style={{ fontSize: 'var(--bank-text-sm)', color: 'var(--bank-accent)', textDecoration: 'none' }}>
              Gérer mes cartes →
            </Link>
          </div>

          <div style={{ padding: 'var(--bank-space-5)', display: 'flex', gap: 'var(--bank-space-5)', overflowX: 'auto' }}>
            {isRefreshing ? (
              <BankSkeleton variant="card-visual" count={2} />
            ) : (dashboard?.activeCards ?? []).length === 0 ? (
              <div style={{ padding: 'var(--bank-space-8)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--bank-space-3)', width: '100%' }}>
                <CreditCard size={24} style={{ color: 'var(--bank-text-tertiary)' }} aria-hidden="true" />
                <div>
                  <p style={{ fontSize: 'var(--bank-text-sm)', fontWeight: 'var(--bank-font-semibold)', color: 'var(--bank-text-primary)', marginBottom: 4 }}>Aucune carte active</p>
                  <p style={{ fontSize: 'var(--bank-text-xs)', color: 'var(--bank-text-tertiary)' }}>Commandez votre première carte pour commencer à payer.</p>
                </div>
                <Link href="/cards" className="bk-btn bk-btn--primary bk-btn--sm" style={{ textDecoration: 'none' }}>
                  Demander une carte →
                </Link>
              </div>
            ) : (
              (dashboard?.activeCards ?? []).slice(0, 3).map(card => (
                <div key={card.id}>
                  <CardVisual
                    maskedPan={card.maskedPan}
                    network={card.network.toLowerCase()}
                    accent="client"
                    size="md"
                    isBlocked={card.status !== 'ACTIVE'}
                  />
                  <div style={{ marginTop: 'var(--bank-space-3)', maxWidth: 360 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--bank-text-sm)', fontWeight: 'var(--bank-font-semibold)', color: 'var(--bank-text-primary)' }}>
                        {fmt(card.balance, currency)}
                      </span>
                      {card.isAutoIssued && (
                        <span style={{ fontSize: 'var(--bank-text-xs)', color: 'var(--bank-success)', background: 'color-mix(in srgb, var(--bank-success) 12%, transparent)', padding: '1px 8px', borderRadius: 'var(--bank-radius-full)', border: '1px solid color-mix(in srgb, var(--bank-success) 25%, transparent)' }}>
                          Compte lié
                        </span>
                      )}
                    </div>
                    {card.dailyLimit > 0 && (
                      <div style={{ marginTop: 'var(--bank-space-2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 'var(--bank-text-xs)', color: 'var(--bank-text-tertiary)' }}>{fmt(card.dailySpent, currency)} dépensés</span>
                          <span style={{ fontSize: 'var(--bank-text-xs)', color: 'var(--bank-text-tertiary)' }}>/ {fmt(card.dailyLimit, currency)}</span>
                        </div>
                        <div style={{ height: 4, background: 'var(--bank-bg-elevated)', borderRadius: 'var(--bank-radius-full)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, (card.dailySpent / card.dailyLimit) * 100)}%`, background: 'var(--bank-accent)', borderRadius: 'var(--bank-radius-full)', transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Compte bancaire */}
        <div style={{ borderRadius: 'var(--bank-radius-2xl)', border: '1px solid var(--bank-border-subtle)', background: 'var(--bank-bg-surface)', padding: 'var(--bank-space-5)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--bank-space-2)', fontSize: 'var(--bank-text-base)', fontWeight: 'var(--bank-font-semibold)', color: 'var(--bank-text-primary)', marginBottom: 'var(--bank-space-4)' }}>
            <Wallet size={16} strokeWidth={2} style={{ color: 'var(--bank-success)' }} aria-hidden="true" />
            Compte bancaire
          </h2>

          {isRefreshing ? (
            <BankSkeleton variant="text-line" count={5} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-3)' }}>
              <BalanceDisplay amount={account?.balance ?? 0} currency={currency} />
              {[
                { label: 'Intitulé',  value: account?.accountLabel },
                { label: 'Titulaire', value: account?.accountHolderName },
                { label: 'IBAN',      value: account?.iban, mono: true },
                { label: 'BIC',       value: account?.bic,  mono: true },
              ].map(row => (
                <div key={row.label}>
                  <p style={{ fontSize: 'var(--bank-text-xs)', color: 'var(--bank-text-tertiary)', marginBottom: 2 }}>{row.label}</p>
                  <p style={{ fontSize: row.mono ? 'var(--bank-text-xs)' : 'var(--bank-text-sm)', color: 'var(--bank-text-primary)', fontFamily: row.mono ? '"Courier New", monospace' : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.value || '—'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ TRANSACTIONS RÉCENTES ══ */}
      <div style={{ borderRadius: 'var(--bank-radius-2xl)', border: '1px solid var(--bank-border-subtle)', background: 'var(--bank-bg-surface)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--bank-space-4) var(--bank-space-5)', borderBottom: '1px solid var(--bank-border-subtle)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--bank-space-2)', fontSize: 'var(--bank-text-base)', fontWeight: 'var(--bank-font-semibold)', color: 'var(--bank-text-primary)' }}>
            <Activity size={16} strokeWidth={2} style={{ color: 'var(--bank-accent)' }} aria-hidden="true" />
            Dernières transactions
          </h2>
          <Link href="/transactions" style={{ fontSize: 'var(--bank-text-sm)', color: 'var(--bank-accent)', textDecoration: 'none' }}>
            Voir tout →
          </Link>
        </div>

        <TransactionList
          transactions={bankTransactions.slice(0, 8)}
          loading={isRefreshing}
          skeletonCount={6}
          locale="fr-FR"
          label="Dernières transactions"
          onClickRow={tx => { window.location.href = `/transactions?id=${tx.id}`; }}
          emptyState={
            <BankEmptyState
              icon={<Activity size={20} />}
              title="Aucune transaction"
              description="Simulez votre premier paiement pour voir vos opérations ici."
              action={
                <Link href="/pay" className="bk-btn bk-btn--primary bk-btn--sm" style={{ textDecoration: 'none' }}>
                  Simuler un paiement →
                </Link>
              }
            />
          }
        />
      </div>

      {/* Responsive overrides */}
      <style>{`
        @media (max-width: 900px) {
          .bk-grid-cards-account { grid-template-columns: 1fr !important; }
        }
        .bk-spin { animation: bk-rotate 1s linear infinite; }
        @keyframes bk-rotate { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
