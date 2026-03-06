'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../auth/useAuth';
import { APP_URLS } from '@shared/lib/app-urls';
import {
  toRecord, toNumber, toText, formatMoney, formatDateTimeString,
} from '@shared/lib/formatting';
import {
  AlertCircle, CheckCircle2, ChevronRight, CreditCard,
  DollarSign, RefreshCw, Send, Store, Tablet, TrendingDown,
  TrendingUp, Wallet, XCircle,
} from 'lucide-react';

/* ── Composants Banking ── */
import { BankPageHeader }   from '@shared/components/banking/layout/BankPageHeader';
import { BankSkeleton }     from '@shared/components/banking/feedback/BankSkeleton';
import { BankEmptyState }   from '@shared/components/banking/feedback/BankEmptyState';
import { StatCard }         from '@shared/components/banking/data-display/StatCard';
import { TransactionList }  from '@shared/components/banking/data-display/TransactionList';
import { type BankTransaction } from '@shared/components/banking/data-display/TransactionRow';
import { TransactionBadge } from '@shared/components/banking/primitives/BankBadge';

/* ══════════════════════════════════════════════════════
   TYPES (inchangés)
   ══════════════════════════════════════════════════════ */
interface DashboardTransaction {
  id: string; transactionId: string; maskedPan: string;
  amount: number; currency: string; type: string; status: string;
  responseCode: string; timestamp: string; terminalId: string;
}
interface DashboardTerminal {
  id: string; terminalId: string; terminalName: string;
  status: string; locationName: string; lastTransactionAt: string | null;
}
interface DashboardAccount {
  accountNumber: string; currency: string; status: string;
  availableBalance: number; pendingBalance: number; reserveBalance: number;
  grossBalance: number; availableForPayout: number; feePercent: number;
  fixedFee: number; lastSettlementAt: string | null; lastPayoutAt: string | null;
}
interface DashboardToday {
  transactionCount: number; revenue: number; refunds: number;
  approvedCount: number; declinedCount: number; approvalRate: number;
}
interface DashboardData {
  today: DashboardToday;
  account: DashboardAccount | null;
  terminals: DashboardTerminal[];
  recentTransactions: DashboardTransaction[];
}
interface GenerationSummary {
  createdTransactions: number; approvedTransactions: number;
  declinedTransactions: number; refunds: number; voids: number;
  settlements: number; payouts: number; totalSales: number;
  totalRefunds: number; totalFees: number; netAfterFees: number;
}
interface ClearingBatch {
  id: string; terminalId: string; merchantId: string;
  submittedAt: string; processedAt: string | null; status: string;
  totalAmount: number; transactionCount: number;
  reconciledCount: number; discrepancyAmount: number;
}
interface TelecollecteResult {
  batchId: string | null; status: string; message?: string;
  transactionCount: number; totalAmount?: number; reconciledCount?: number;
}

const isDev = process.env.NODE_ENV === 'development';

/* ══════════════════════════════════════════════════════
   NORMALISERS (inchangés)
   ══════════════════════════════════════════════════════ */
const normalizeDashboard = (rawDashboard: unknown): DashboardData => {
  const dashboard = toRecord(rawDashboard);
  const today     = toRecord(dashboard.today);
  const account   = dashboard.account ? toRecord(dashboard.account) : null;
  const rawTxs    = Array.isArray(dashboard.recentTransactions) ? dashboard.recentTransactions : [];
  const rawTerms  = Array.isArray(dashboard.terminals) ? dashboard.terminals : [];
  return {
    today: {
      transactionCount: toNumber(today.transactionCount),
      revenue:          toNumber(today.revenue),
      refunds:          toNumber(today.refunds),
      approvedCount:    toNumber(today.approvedCount),
      declinedCount:    toNumber(today.declinedCount),
      approvalRate:     toNumber(today.approvalRate),
    },
    account: account ? {
      accountNumber:     toText(account.accountNumber),
      currency:          toText(account.currency, 'EUR'),
      status:            toText(account.status, 'ACTIVE'),
      availableBalance:  toNumber(account.availableBalance),
      pendingBalance:    toNumber(account.pendingBalance),
      reserveBalance:    toNumber(account.reserveBalance),
      grossBalance:      toNumber(account.grossBalance),
      availableForPayout: toNumber(account.availableForPayout),
      feePercent:        toNumber(account.feePercent),
      fixedFee:          toNumber(account.fixedFee),
      lastSettlementAt:  account.lastSettlementAt ? toText(account.lastSettlementAt) : null,
      lastPayoutAt:      account.lastPayoutAt     ? toText(account.lastPayoutAt)     : null,
    } : null,
    terminals: rawTerms.map(item => {
      const t = toRecord(item);
      return {
        id:               toText(t.id),
        terminalId:       toText(t.terminal_id || t.terminalId),
        terminalName:     toText(t.terminal_name || t.terminalName, 'Terminal'),
        status:           toText(t.status, 'ACTIVE'),
        locationName:     toText(t.location_name || t.locationName, '-'),
        lastTransactionAt: t.last_transaction_at
          ? toText(t.last_transaction_at)
          : (t.lastTransactionAt ? toText(t.lastTransactionAt) : null),
      };
    }),
    recentTransactions: rawTxs.map(item => {
      const tx = toRecord(item);
      return {
        id:            toText(tx.id),
        transactionId: toText(tx.transaction_id || tx.transactionId),
        maskedPan:     toText(tx.masked_pan || tx.maskedPan, '****'),
        amount:        toNumber(tx.amount),
        currency:      toText(tx.currency, 'EUR'),
        type:          toText(tx.type, 'PURCHASE'),
        status:        toText(tx.status, 'PENDING'),
        responseCode:  toText(tx.response_code || tx.responseCode, ''),
        timestamp:     toText(tx.timestamp),
        terminalId:    toText(tx.terminal_id || tx.terminalId, '-'),
      };
    }),
  };
};

/* ══════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ══════════════════════════════════════════════════════ */
export default function MerchantDashboard() {
  const { user, isLoading }                   = useAuth(true);
  const [dashboard,          setDashboard]    = useState<DashboardData | null>(null);
  const [fetchError,         setFetchError]   = useState<string | null>(null);
  const [isRefreshing,       setIsRefreshing] = useState(false);
  const [isGenerating,       setIsGenerating] = useState(false);
  const [generationSummary,  setGenSummary]   = useState<GenerationSummary | null>(null);
  const [isTelecollecting,   setIsTelecol]    = useState(false);
  const [telecollecteResult, setTeleResult]   = useState<TelecollecteResult | null>(null);
  const [clearingBatches,    setBatches]      = useState<ClearingBatch[]>([]);

  /* ── Data fetchers (logique métier inchangée) ── */
  const fetchDashboard = useCallback(async () => {
    const token = localStorage.getItem('token');
    const res   = await fetch('/api/merchant/dashboard', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Impossible de charger le dashboard marchand');
    const payload = await res.json();
    setDashboard(normalizeDashboard(payload.dashboard));
  }, []);

  const refreshDashboard = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await fetchDashboard();
      setFetchError(null);
    } catch (e: unknown) { setFetchError(e instanceof Error ? e.message : 'Erreur de chargement'); }
    finally              { setIsRefreshing(false); }
  }, [fetchDashboard]);

  const fetchClearingBatches = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch('/api/merchant/clearing/batches', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const payload = await res.json();
      const batches: ClearingBatch[] = (Array.isArray(payload.data) ? payload.data : []).slice(0, 5).map((b: Record<string, unknown>) => ({
        id:                String(b.id || ''),
        terminalId:        String(b.terminal_id || b.terminalId || ''),
        merchantId:        String(b.merchant_id || b.merchantId || ''),
        submittedAt:       String(b.submitted_at || b.submittedAt || ''),
        processedAt:       (b.processed_at || b.processedAt) ? String(b.processed_at || b.processedAt) : null,
        status:            String(b.status || 'PENDING'),
        totalAmount:       Number(b.total_amount || b.totalAmount || 0),
        transactionCount:  Number(b.transaction_count || b.transactionCount || 0),
        reconciledCount:   Number(b.reconciled_count || b.reconciledCount || 0),
        discrepancyAmount: Number(b.discrepancy_amount || b.discrepancyAmount || 0),
      }));
      setBatches(batches);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    refreshDashboard();
    fetchClearingBatches();
  }, [isLoading, refreshDashboard, fetchClearingBatches]);

  const generateRealHistory = async () => {
    try {
      setIsGenerating(true); setFetchError(null);
      const token = localStorage.getItem('token');
      const res   = await fetch('/api/merchant/account/generate-history', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ days: 14, transactionsPerDay: 12, includeRefunds: true, includeVoids: true, includeSettlements: true, includePayouts: true }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Échec de génération');
      const s = toRecord(payload.summary);
      setGenSummary({
        createdTransactions: toNumber(s.createdTransactions), approvedTransactions: toNumber(s.approvedTransactions),
        declinedTransactions: toNumber(s.declinedTransactions), refunds: toNumber(s.refunds),
        voids: toNumber(s.voids), settlements: toNumber(s.settlements), payouts: toNumber(s.payouts),
        totalSales: toNumber(s.totalSales), totalRefunds: toNumber(s.totalRefunds),
        totalFees: toNumber(s.totalFees), netAfterFees: toNumber(s.netAfterFees),
      });
      await refreshDashboard();
    } catch (e: unknown) { setFetchError(e instanceof Error ? e.message : 'Erreur pendant la génération'); }
    finally              { setIsGenerating(false); }
  };

  const launchTelecollecte = async () => {
    try {
      setIsTelecol(true); setTeleResult(null);
      const token      = localStorage.getItem('token');
      const terminalId = dashboard?.terminals[0]?.terminalId || 'POS001';
      const res        = await fetch('/api/merchant/telecollecte', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ terminalId, transactions: [] }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Échec de la télécollecte');
      const data = toRecord(payload.data || payload);
      setTeleResult({
        batchId:          data.batchId ? String(data.batchId) : null,
        status:           String(data.status || 'COMPLETED'),
        message:          data.message ? String(data.message) : undefined,
        transactionCount: Number(data.transactionCount || data.transaction_count || 0),
        totalAmount:      data.totalAmount ? Number(data.totalAmount) : undefined,
        reconciledCount:  data.reconciledCount ? Number(data.reconciledCount) : undefined,
      });
      await fetchClearingBatches();
    } catch (e: unknown) {
      setTeleResult({ batchId: null, status: 'ERROR', message: e instanceof Error ? e.message : 'Erreur pendant la télécollecte', transactionCount: 0 });
    } finally { setIsTelecol(false); }
  };

  const stats = useMemo(() => {
    const today = dashboard?.today;
    if (!today) return { avgTicket: 0, netToday: 0 };
    return { avgTicket: today.transactionCount > 0 ? today.revenue / today.transactionCount : 0, netToday: today.revenue - today.refunds };
  }, [dashboard]);

  /* Adapte les transactions pour TransactionList */
  const bankTransactions: BankTransaction[] = useMemo(() =>
    (dashboard?.recentTransactions ?? []).map(tx => ({
      id: tx.id, transactionId: tx.transactionId,
      maskedPan: tx.maskedPan, amount: tx.amount, currency: tx.currency,
      type: tx.type, status: tx.status, terminalId: tx.terminalId, timestamp: tx.timestamp,
    })),
  [dashboard]);

  const welcomeName = user?.firstName || 'Marchand';
  const accountCurrency = dashboard?.account?.currency || 'EUR';

  /* ── Loading ── */
  if (isLoading || !dashboard) {
    return (
      <div style={{ padding: 'var(--bank-space-6)', maxWidth: 1280, margin: '0 auto' }}>
        <BankSkeleton variant="full-page" />
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════
     RENDU PRINCIPAL
     ══════════════════════════════════════════════════════ */
  return (
    <div style={{ padding: 'var(--bank-space-6)', paddingBottom: 'var(--bank-space-12)', maxWidth: 1280, margin: '0 auto' }}>

      {/* ── En-tête ── */}
      <BankPageHeader
        title="Dashboard Marchand"
        subtitle={`Bienvenue, ${welcomeName}. Résumé de votre activité du jour.`}
        style={{ marginBottom: 'var(--bank-space-6)' }}
        actions={
          <div style={{ display: 'flex', gap: 'var(--bank-space-2)', flexWrap: 'wrap' }}>
            <button onClick={refreshDashboard} disabled={isRefreshing}
              className="bk-btn bk-btn--ghost bk-btn--sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={14} className={isRefreshing ? 'bk-spin' : ''} aria-hidden="true" />
              Actualiser
            </button>
            {isDev && (
              <button onClick={generateRealHistory} disabled={isGenerating}
                className="bk-btn bk-btn--ghost bk-btn--sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: 'var(--bank-accent)' }}>
                <Store size={14} aria-hidden="true" />
                {isGenerating ? 'Génération…' : 'Générer historique réel'}
              </button>
            )}
          </div>
        }
      />

      {/* ── Alerts ── */}
      {fetchError && (
        <div style={{ padding: 'var(--bank-space-4)', borderRadius: 'var(--bank-radius-lg)', border: '1px solid color-mix(in srgb, var(--bank-danger) 30%, transparent)', background: 'color-mix(in srgb, var(--bank-danger) 8%, transparent)', color: 'var(--bank-danger)', fontSize: 'var(--bank-text-sm)', marginBottom: 'var(--bank-space-5)' }}>
          {fetchError}
        </div>
      )}
      {isDev && generationSummary && (
        <div style={{ padding: 'var(--bank-space-4)', borderRadius: 'var(--bank-radius-lg)', border: '1px solid color-mix(in srgb, var(--bank-success) 30%, transparent)', background: 'color-mix(in srgb, var(--bank-success) 8%, transparent)', color: 'var(--bank-success)', fontSize: 'var(--bank-text-sm)', marginBottom: 'var(--bank-space-5)' }}>
          Historique créé : {generationSummary.createdTransactions} transactions ({generationSummary.approvedTransactions} approuvées, {generationSummary.declinedTransactions} refusées), {generationSummary.refunds} remboursements.
        </div>
      )}

      {/* ══ STATS DU JOUR ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--bank-space-4)', marginBottom: 'var(--bank-space-5)' }}>
        <StatCard label="CA du jour"           value={formatMoney(dashboard.today.revenue, accountCurrency)}       icon={DollarSign}   loading={isRefreshing} accent index={0} />
        <StatCard label="Remboursements"        value={formatMoney(dashboard.today.refunds, accountCurrency)}       icon={TrendingDown}  loading={isRefreshing} index={1} />
        <StatCard label="Transactions"          value={String(dashboard.today.transactionCount)}                     icon={CreditCard}    loading={isRefreshing} index={2} />
        <StatCard label="Taux d'approbation"   value={`${dashboard.today.approvalRate}%`}                           icon={CheckCircle2}  loading={isRefreshing} index={3}
          delta={dashboard.today.approvalRate >= 90 ? { value: dashboard.today.approvalRate - 90, period: 'vs objectif 90%' } : undefined} />
      </div>

      {/* ══ SOLDES COMPTE ══ */}
      {dashboard.account && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--bank-space-4)', marginBottom: 'var(--bank-space-6)' }}>
          <StatCard label="Solde disponible" value={formatMoney(dashboard.account.availableBalance,  dashboard.account.currency)} icon={Wallet}       loading={isRefreshing} index={4} />
          <StatCard label="En attente"        value={formatMoney(dashboard.account.pendingBalance,    dashboard.account.currency)} icon={TrendingUp}   loading={isRefreshing} index={5} />
          <StatCard label="Réserve"           value={formatMoney(dashboard.account.reserveBalance,   dashboard.account.currency)} icon={AlertCircle}  loading={isRefreshing} index={6} />
          <StatCard label="Net du jour"       value={formatMoney(stats.netToday, dashboard.account.currency)}                     icon={DollarSign}   loading={isRefreshing} index={7}
            delta={{ value: stats.avgTicket, displayValue: formatMoney(stats.avgTicket, dashboard.account.currency), period: 'panier moyen', positive: true }} />
        </div>
      )}

      {/* ══ GRILLE : TRANSACTIONS + SIDEBAR ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 'var(--bank-space-6)', alignItems: 'start' }}
        className="bk-merchant-grid">

        {/* Transactions récentes */}
        <div style={{ borderRadius: 'var(--bank-radius-2xl)', border: '1px solid var(--bank-border-subtle)', background: 'var(--bank-bg-surface)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--bank-space-4) var(--bank-space-5)', borderBottom: '1px solid var(--bank-border-subtle)' }}>
            <h2 style={{ fontSize: 'var(--bank-text-base)', fontWeight: 'var(--bank-font-semibold)', color: 'var(--bank-text-primary)' }}>
              Transactions récentes
            </h2>
            <Link href="/merchant/transactions" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--bank-text-sm)', color: 'var(--bank-accent)', textDecoration: 'none' }}>
              Voir tout <ChevronRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <TransactionList
            transactions={bankTransactions.slice(0, 10)}
            loading={isRefreshing}
            skeletonCount={6}
            locale="fr-FR"
            label="Transactions récentes"
            onClickRow={tx => { window.location.href = `/merchant/transactions?id=${tx.id}`; }}
            emptyState={
              <BankEmptyState
                icon={<Tablet size={20} />}
                title="Aucune transaction"
                description="Effectuez votre première transaction depuis le terminal POS."
                action={
                  <button
                    onClick={() => {
                      const token = localStorage.getItem('token');
                      const base  = APP_URLS.tpe;
                      window.open(token ? `${base}/?token=${encodeURIComponent(token)}` : base, '_blank');
                    }}
                    className="bk-btn bk-btn--primary bk-btn--sm"
                  >
                    Ouvrir le POS →
                  </button>
                }
              />
            }
          />
        </div>

        {/* ── Sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-5)' }}>

          {/* Actions rapides */}
          <div style={{ borderRadius: 'var(--bank-radius-2xl)', border: '1px solid var(--bank-border-subtle)', background: 'var(--bank-bg-surface)', overflow: 'hidden' }}>
            <h3 style={{ padding: 'var(--bank-space-4) var(--bank-space-5)', fontSize: 'var(--bank-text-sm)', fontWeight: 'var(--bank-font-semibold)', color: 'var(--bank-text-secondary)', borderBottom: '1px solid var(--bank-border-subtle)' }}>
              Actions rapides
            </h3>
            <div style={{ padding: 'var(--bank-space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-2)' }}>
              <button
                onClick={() => {
                  const token = localStorage.getItem('token');
                  const base  = APP_URLS.tpe;
                  window.open(token ? `${base}/?token=${encodeURIComponent(token)}` : base, '_blank');
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--bank-space-3)', padding: 'var(--bank-space-3) var(--bank-space-4)', borderRadius: 'var(--bank-radius-lg)', border: '1px solid var(--bank-border-default)', background: 'transparent', cursor: 'pointer', color: 'var(--bank-text-primary)', fontSize: 'var(--bank-text-sm)', fontWeight: 'var(--bank-font-medium)', transition: 'background var(--bank-t-fast)', textAlign: 'left', width: '100%' }}
                className="bk-card--interactive"
              >
                <div style={{ width: 36, height: 36, borderRadius: 'var(--bank-radius-md)', background: 'color-mix(in srgb, var(--bank-accent) 12%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Tablet size={18} style={{ color: 'var(--bank-accent)' }} aria-hidden="true" />
                </div>
                <div>
                  <p style={{ fontWeight: 'var(--bank-font-medium)' }}>Terminal POS</p>
                  <p style={{ fontSize: 'var(--bank-text-xs)', color: 'var(--bank-text-tertiary)' }}>Ouvrir le TPE-Web</p>
                </div>
                <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--bank-text-tertiary)', flexShrink: 0 }} aria-hidden="true" />
              </button>

              <Link
                href="/merchant/reports"
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--bank-space-3)', padding: 'var(--bank-space-3) var(--bank-space-4)', borderRadius: 'var(--bank-radius-lg)', border: '1px solid var(--bank-border-default)', background: 'transparent', color: 'var(--bank-text-primary)', fontSize: 'var(--bank-text-sm)', fontWeight: 'var(--bank-font-medium)', textDecoration: 'none', transition: 'background var(--bank-t-fast)' }}
                className="bk-card--interactive"
              >
                <div style={{ width: 36, height: 36, borderRadius: 'var(--bank-radius-md)', background: 'color-mix(in srgb, var(--bank-info) 12%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Wallet size={18} style={{ color: 'var(--bank-info)' }} aria-hidden="true" />
                </div>
                <div>
                  <p>Rapports</p>
                  <p style={{ fontSize: 'var(--bank-text-xs)', color: 'var(--bank-text-tertiary)' }}>CA, remboursements, réconciliation</p>
                </div>
                <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--bank-text-tertiary)', flexShrink: 0 }} aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Télécollecte */}
          <div style={{ borderRadius: 'var(--bank-radius-2xl)', border: '1px solid var(--bank-border-subtle)', background: 'var(--bank-bg-surface)', overflow: 'hidden' }}>
            <h3 style={{ padding: 'var(--bank-space-4) var(--bank-space-5)', fontSize: 'var(--bank-text-sm)', fontWeight: 'var(--bank-font-semibold)', color: 'var(--bank-text-secondary)', borderBottom: '1px solid var(--bank-border-subtle)' }}>
              Télécollecte
            </h3>
            <div style={{ padding: 'var(--bank-space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-3)' }}>
              <button
                onClick={launchTelecollecte}
                disabled={isTelecollecting}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--bank-space-3)', padding: 'var(--bank-space-3) var(--bank-space-4)', borderRadius: 'var(--bank-radius-lg)', border: '1px solid color-mix(in srgb, var(--bank-success) 40%, transparent)', background: 'color-mix(in srgb, var(--bank-success) 6%, transparent)', cursor: isTelecollecting ? 'not-allowed' : 'pointer', opacity: isTelecollecting ? 0.6 : 1, color: 'var(--bank-text-primary)', fontSize: 'var(--bank-text-sm)', fontWeight: 'var(--bank-font-medium)', textAlign: 'left', width: '100%', transition: 'opacity var(--bank-t-fast)' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 'var(--bank-radius-md)', background: 'color-mix(in srgb, var(--bank-success) 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isTelecollecting
                    ? <div style={{ width: 18, height: 18, border: '2px solid color-mix(in srgb, var(--bank-success) 80%, transparent)', borderTopColor: 'var(--bank-success)', borderRadius: '50%' }} className="bk-spin" />
                    : <Send size={18} style={{ color: 'var(--bank-success)' }} aria-hidden="true" />}
                </div>
                <div>
                  <p>Lancer la Télécollecte</p>
                  <p style={{ fontSize: 'var(--bank-text-xs)', color: 'var(--bank-text-tertiary)' }}>ISO 8583 TC33 — Batch J+1</p>
                </div>
              </button>

              {telecollecteResult && (() => {
                const isErr    = telecollecteResult.status === 'ERROR';
                const isEmpty  = telecollecteResult.status === 'EMPTY';
                const bgColor  = isErr ? 'color-mix(in srgb, var(--bank-danger) 8%, transparent)' : isEmpty ? 'color-mix(in srgb, var(--bank-warning) 8%, transparent)' : 'color-mix(in srgb, var(--bank-success) 8%, transparent)';
                const bdColor  = isErr ? 'color-mix(in srgb, var(--bank-danger) 30%, transparent)' : isEmpty ? 'color-mix(in srgb, var(--bank-warning) 30%, transparent)' : 'color-mix(in srgb, var(--bank-success) 30%, transparent)';
                return (
                  <div style={{ padding: 'var(--bank-space-3) var(--bank-space-4)', borderRadius: 'var(--bank-radius-lg)', border: `1px solid ${bdColor}`, background: bgColor, display: 'flex', alignItems: 'flex-start', gap: 'var(--bank-space-2)' }}>
                    {isErr ? <XCircle size={16} style={{ color: 'var(--bank-danger)', flexShrink: 0 }} aria-hidden="true" /> : <CheckCircle2 size={16} style={{ color: 'var(--bank-success)', flexShrink: 0 }} aria-hidden="true" />}
                    <div>
                      <p style={{ fontSize: 'var(--bank-text-sm)', fontWeight: 'var(--bank-font-medium)', color: 'var(--bank-text-primary)' }}>
                        {isErr ? 'Erreur' : isEmpty ? 'Aucune transaction' : 'Télécollecte envoyée'}
                      </p>
                      {telecollecteResult.message && <p style={{ fontSize: 'var(--bank-text-xs)', color: 'var(--bank-text-tertiary)', marginTop: 2 }}>{telecollecteResult.message}</p>}
                      {!isErr && !isEmpty && <p style={{ fontSize: 'var(--bank-text-xs)', color: 'var(--bank-text-tertiary)', marginTop: 2 }}>{telecollecteResult.transactionCount} txn{telecollecteResult.transactionCount > 1 ? 's' : ''}{telecollecteResult.reconciledCount !== undefined ? ` · ${telecollecteResult.reconciledCount} rapprochées` : ''}</p>}
                    </div>
                  </div>
                );
              })()}

              {clearingBatches.length > 0 ? (
                <div style={{ borderRadius: 'var(--bank-radius-lg)', border: '1px solid var(--bank-border-subtle)', overflow: 'hidden' }}>
                  <p style={{ padding: 'var(--bank-space-2) var(--bank-space-4)', fontSize: 'var(--bank-text-xs)', fontWeight: 'var(--bank-font-semibold)', color: 'var(--bank-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--bank-border-subtle)' }}>
                    Historique des batchs
                  </p>
                  {clearingBatches.map(batch => (
                    <div key={batch.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--bank-space-2) var(--bank-space-4)', borderBottom: '1px solid var(--bank-border-subtle)' }}>
                      <div>
                        <p style={{ fontSize: 'var(--bank-text-xs)', fontFamily: '"Courier New", monospace', color: 'var(--bank-text-primary)' }}>{batch.terminalId}</p>
                        <p style={{ fontSize: 'var(--bank-text-xs)', color: 'var(--bank-text-tertiary)', marginTop: 1 }}>{formatDateTimeString(batch.submittedAt)}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <TransactionBadge status={batch.status} />
                        <p style={{ fontSize: 'var(--bank-text-xs)', color: 'var(--bank-text-tertiary)', marginTop: 2 }}>{batch.transactionCount} txn</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 'var(--bank-text-xs)', color: 'var(--bank-text-tertiary)', textAlign: 'center', padding: 'var(--bank-space-3) var(--bank-space-2)' }}>
                  Aucune télécollecte effectuée.
                </p>
              )}
            </div>
          </div>

          {/* Alertes */}
          <div style={{ borderRadius: 'var(--bank-radius-2xl)', border: '1px solid var(--bank-border-subtle)', background: 'var(--bank-bg-surface)', overflow: 'hidden' }}>
            <h3 style={{ padding: 'var(--bank-space-4) var(--bank-space-5)', fontSize: 'var(--bank-text-sm)', fontWeight: 'var(--bank-font-semibold)', color: 'var(--bank-text-secondary)', borderBottom: '1px solid var(--bank-border-subtle)' }}>
              Alertes
            </h3>
            <div style={{ padding: 'var(--bank-space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-2)' }}>
              {dashboard.account && dashboard.account.pendingBalance > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--bank-space-3)', padding: 'var(--bank-space-3) var(--bank-space-4)', borderRadius: 'var(--bank-radius-lg)', border: '1px solid color-mix(in srgb, var(--bank-warning) 30%, transparent)', background: 'color-mix(in srgb, var(--bank-warning) 8%, transparent)' }}>
                  <AlertCircle size={16} style={{ color: 'var(--bank-warning)', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                  <div>
                    <p style={{ fontSize: 'var(--bank-text-sm)', fontWeight: 'var(--bank-font-medium)', color: 'var(--bank-text-primary)' }}>En attente de règlement</p>
                    <p style={{ fontSize: 'var(--bank-text-xs)', color: 'var(--bank-text-tertiary)', marginTop: 2 }}>
                      Solde pending : {formatMoney(dashboard.account.pendingBalance, dashboard.account.currency)}
                    </p>
                  </div>
                </div>
              )}
              {dashboard.today.declinedCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--bank-space-3)', padding: 'var(--bank-space-3) var(--bank-space-4)', borderRadius: 'var(--bank-radius-lg)', border: '1px solid color-mix(in srgb, var(--bank-danger) 30%, transparent)', background: 'color-mix(in srgb, var(--bank-danger) 8%, transparent)' }}>
                  <XCircle size={16} style={{ color: 'var(--bank-danger)', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                  <div>
                    <p style={{ fontSize: 'var(--bank-text-sm)', fontWeight: 'var(--bank-font-medium)', color: 'var(--bank-text-primary)' }}>Transactions refusées</p>
                    <p style={{ fontSize: 'var(--bank-text-xs)', color: 'var(--bank-text-tertiary)', marginTop: 2 }}>Aujourd&apos;hui : {dashboard.today.declinedCount}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Terminaux */}
          <div style={{ borderRadius: 'var(--bank-radius-2xl)', border: '1px solid var(--bank-border-subtle)', background: 'var(--bank-bg-surface)', overflow: 'hidden' }}>
            <h3 style={{ padding: 'var(--bank-space-4) var(--bank-space-5)', fontSize: 'var(--bank-text-sm)', fontWeight: 'var(--bank-font-semibold)', color: 'var(--bank-text-secondary)', borderBottom: '1px solid var(--bank-border-subtle)' }}>
              Terminaux
            </h3>
            <div style={{ padding: 'var(--bank-space-3) var(--bank-space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-3)' }}>
              {dashboard.terminals.length === 0 ? (
                <p style={{ fontSize: 'var(--bank-text-sm)', color: 'var(--bank-text-tertiary)' }}>Aucun terminal disponible.</p>
              ) : dashboard.terminals.map(terminal => (
                <div key={terminal.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bank-space-3)' }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: terminal.status === 'ACTIVE' ? 'var(--bank-success)' : 'var(--bank-text-tertiary)', boxShadow: terminal.status === 'ACTIVE' ? '0 0 0 3px color-mix(in srgb, var(--bank-success) 20%, transparent)' : 'none', flexShrink: 0 }} />
                    <span style={{ fontSize: 'var(--bank-text-sm)', fontFamily: '"Courier New", monospace', color: 'var(--bank-text-primary)' }}>{terminal.terminalId}</span>
                  </div>
                  <span style={{ fontSize: 'var(--bank-text-xs)', color: terminal.status === 'ACTIVE' ? 'var(--bank-success)' : 'var(--bank-text-tertiary)' }}>
                    {terminal.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Infos compte */}
          {dashboard.account && (
            <div style={{ padding: 'var(--bank-space-4)', borderRadius: 'var(--bank-radius-xl)', border: '1px solid var(--bank-border-subtle)', background: 'var(--bank-bg-elevated)', fontSize: 'var(--bank-text-xs)', color: 'var(--bank-text-tertiary)', display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-2)' }}>
              <div>Compte : <span style={{ color: 'var(--bank-text-primary)', fontFamily: '"Courier New", monospace' }}>{dashboard.account.accountNumber}</span></div>
              <div>Dernier settlement : <span style={{ color: 'var(--bank-text-primary)' }}>{formatDateTimeString(dashboard.account.lastSettlementAt)}</span></div>
              <div>Dernier payout : <span style={{ color: 'var(--bank-text-primary)' }}>{formatDateTimeString(dashboard.account.lastPayoutAt)}</span></div>
            </div>
          )}
        </div>
      </div>

      {/* Responsive + keyframe spin */}
      <style>{`
        @media (max-width: 960px) {
          .bk-merchant-grid { grid-template-columns: 1fr !important; }
        }
        .bk-spin { animation: bk-rotate 1s linear infinite; }
        @keyframes bk-rotate { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
