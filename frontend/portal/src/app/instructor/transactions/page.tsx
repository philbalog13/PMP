'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  GitBranch,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import {
  NotionBadge,
  NotionButton,
  NotionCard,
  NotionEmptyState,
  NotionPill,
  NotionSkeleton,
} from '@shared/components/notion';

interface PlatformTransaction {
  id: string;
  transaction_id: string;
  stan: string;
  masked_pan: string;
  client_id: string;
  merchant_id: string;
  amount: string;
  currency: string;
  type: string;
  status: string;
  response_code: string;
  authorization_code: string;
  merchant_name: string;
  merchant_mcc: string;
  terminal_id: string;
  threeds_status: string;
  fraud_score: string;
  timestamp: string;
  settled_at: string | null;
  client_username: string;
  client_first_name: string;
  client_last_name: string;
  merchant_username: string;
  merchant_first_name: string;
  merchant_last_name: string;
}

const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
  APPROVED: 'success',
  DECLINED: 'danger',
  PENDING: 'warning',
  REFUNDED: 'default',
  REVERSED: 'default',
};

const STATUS_LABEL: Record<string, string> = {
  APPROVED: 'Approuvee',
  DECLINED: 'Refusee',
  PENDING: 'En attente',
  REFUNDED: 'Remboursee',
  REVERSED: 'Annulee',
};

export default function InstructorTransactionsPage() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth(true);

  const [transactions, setTransactions] = useState<PlatformTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedTxn, setSelectedTxn] = useState<PlatformTransaction | null>(null);

  const searchRef = useRef(searchTerm);
  useEffect(() => {
    searchRef.current = searchTerm;
  }, [searchTerm]);

  useEffect(() => {
    if (!selectedTxn) return;
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'contain';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, [selectedTxn]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
      const params = new URLSearchParams({ limit: '200', page: '1' });

      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      if (searchRef.current.trim()) params.set('search', searchRef.current.trim());

      const response = await fetch(`/api/platform/transactions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const text = await response.text();
        let message = `Erreur ${response.status}`;
        try {
          message = JSON.parse(text)?.error || message;
        } catch {
          // plain text response
        }
        throw new Error(message);
      }

      const payload = await response.json();
      setTransactions(payload.transactions || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      void fetchTransactions();
    }
  }, [isLoading, isAuthenticated, fetchTransactions]);

  const metrics = useMemo(() => {
    const approved = transactions.filter((transaction) => transaction.status === 'APPROVED').length;
    const declined = transactions.filter((transaction) => transaction.status === 'DECLINED').length;
    const volume = transactions
      .filter((transaction) => transaction.status === 'APPROVED')
      .reduce((sum, transaction) => sum + Number.parseFloat(transaction.amount || '0'), 0);

    return { approved, declined, volume };
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="n-page-container" style={{ maxWidth: '1200px' }}>
        <NotionSkeleton type="line" width="220px" height="28px" />
        <div style={{ marginTop: 'var(--n-space-2)' }}>
          <NotionSkeleton type="line" width="360px" height="14px" />
        </div>
        <div
          style={{
            marginTop: 'var(--n-space-6)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 'var(--n-space-3)',
          }}
        >
          {[...Array(4)].map((_, index) => (
            <NotionSkeleton key={index} type="stat" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="n-page-container" style={{ maxWidth: '1200px' }}>
      <NotionCard padding="lg">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--n-space-4)',
            alignItems: 'center',
          }}
        >
          <div>
            <NotionPill variant="accent" icon={<Activity size={12} />}>
              Monitor transactions
            </NotionPill>
            <h1
              style={{
                margin: 'var(--n-space-3) 0 var(--n-space-2)',
                color: 'var(--n-text-primary)',
                fontSize: 'var(--n-text-2xl)',
                fontWeight: 'var(--n-weight-bold)',
              }}
            >
              Transactions formateur
            </h1>
            <p style={{ margin: 0, color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>
              Vue complete des transactions PMP pour suivi pedagogique, audits et debrief des incidents.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <NotionButton variant="secondary" leftIcon={<RefreshCw size={13} />} onClick={() => void fetchTransactions()} loading={loading}>
              Actualiser
            </NotionButton>
          </div>
        </div>
      </NotionCard>

      <div
        style={{
          marginTop: 'var(--n-space-4)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 'var(--n-space-3)',
        }}
      >
        {[
          { label: 'Total', value: transactions.length, tone: 'var(--n-text-primary)' },
          { label: 'Approuvees', value: metrics.approved, tone: 'var(--n-success)' },
          { label: 'Refusees', value: metrics.declined, tone: 'var(--n-danger)' },
          { label: 'Volume EUR', value: metrics.volume.toFixed(2), tone: 'var(--n-accent)' },
        ].map((stat) => (
          <NotionCard key={stat.label} padding="md">
            <div style={{ color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)', textTransform: 'uppercase' }}>{stat.label}</div>
            <div
              style={{
                marginTop: 'var(--n-space-2)',
                color: stat.tone,
                fontFamily: 'var(--n-font-mono)',
                fontSize: 'var(--n-text-lg)',
                fontWeight: 'var(--n-weight-bold)',
              }}
            >
              {stat.value}
            </div>
          </NotionCard>
        ))}
      </div>

      <NotionCard padding="md" style={{ marginTop: 'var(--n-space-4)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 'var(--n-space-2)',
            alignItems: 'center',
          }}
        >
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--n-text-tertiary)' }} />
            <input
              type="text"
              className="n-input"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && void fetchTransactions()}
              placeholder="Rechercher ID, PAN, marchand"
              style={{ paddingLeft: '32px' }}
              aria-label="Recherche transaction"
            />
          </div>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="n-input" aria-label="Filtrer par statut">
            <option value="ALL">Tous statuts</option>
            <option value="APPROVED">Approuve</option>
            <option value="DECLINED">Refuse</option>
            <option value="PENDING">En attente</option>
            <option value="REFUNDED">Rembourse</option>
          </select>

          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="n-input" aria-label="Filtrer par type">
            <option value="ALL">Tous types</option>
            <option value="PURCHASE">Achat</option>
            <option value="REFUND">Remboursement</option>
            <option value="VOID">Annulation</option>
          </select>
        </div>
      </NotionCard>

      {error && (
        <div
          style={{
            marginTop: 'var(--n-space-4)',
            padding: 'var(--n-space-3) var(--n-space-4)',
            borderRadius: 'var(--n-radius-sm)',
            border: '1px solid var(--n-danger-border)',
            background: 'var(--n-danger-bg)',
            color: 'var(--n-danger)',
            fontSize: 'var(--n-text-sm)',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginTop: 'var(--n-space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--n-space-2)' }}>
        {loading ? (
          [...Array(6)].map((_, index) => <NotionSkeleton key={index} type="card" />)
        ) : transactions.length === 0 ? (
          <NotionEmptyState
            icon={<Activity size={24} />}
            title="Aucune transaction trouvee"
            description="Ajustez les filtres ou relancez la recherche."
          />
        ) : (
          transactions.map((transaction) => (
            <NotionCard key={transaction.id} variant="hover" padding="md" onClick={() => setSelectedTxn(transaction)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--n-space-3)', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-3)', minWidth: 0 }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: 'var(--n-radius-sm)',
                      border: '1px solid var(--n-border)',
                      background: 'var(--n-bg-secondary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {transaction.type === 'REFUND' ? (
                      <ArrowDownLeft size={14} style={{ color: 'var(--n-info)' }} />
                    ) : (
                      <ArrowUpRight size={14} style={{ color: 'var(--n-text-tertiary)' }} />
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 'var(--n-space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          color: 'var(--n-text-primary)',
                          fontSize: 'var(--n-text-sm)',
                          fontWeight: 'var(--n-weight-semibold)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {transaction.merchant_name || 'N/A'}
                      </span>
                      <NotionBadge variant={STATUS_VARIANT[transaction.status] || 'default'} size="sm">
                        {STATUS_LABEL[transaction.status] || transaction.status}
                      </NotionBadge>
                    </div>
                    <div style={{ marginTop: '4px', display: 'flex', gap: 'var(--n-space-2)', flexWrap: 'wrap' }}>
                      <NotionPill variant="default">{transaction.masked_pan || '-'}</NotionPill>
                      <NotionPill variant="default">
                        {transaction.client_first_name
                          ? `${transaction.client_first_name} ${transaction.client_last_name || ''}`
                          : transaction.client_username || 'Client'}
                      </NotionPill>
                    </div>
                  </div>
                </div>
                <span style={{ color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-mono)', fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-bold)', flexShrink: 0 }}>
                  {Number.parseFloat(transaction.amount || '0').toFixed(2)} {transaction.currency || 'EUR'}
                </span>
              </div>
            </NotionCard>
          ))
        )}
      </div>

      {selectedTxn && (
        <div
          className="n-modal-backdrop"
          onClick={() => setSelectedTxn(null)}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: 'max(12px, var(--n-space-4))',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
          }}
        >
          <div
            className="n-modal"
            style={{ width: '100%', maxWidth: '560px', maxHeight: 'calc(100vh - 24px)', display: 'flex', flexDirection: 'column' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ padding: 'var(--n-space-5)', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--n-space-4)' }}>
                <h2 style={{ margin: 0, color: 'var(--n-text-primary)', fontSize: 'var(--n-text-lg)' }}>Detail transaction</h2>
                <button
                  type="button"
                  onClick={() => setSelectedTxn(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--n-text-tertiary)' }}
                  aria-label="Fermer"
                >
                  <X size={16} />
                </button>
              </div>

              <div
                style={{
                  border: '1px solid var(--n-border)',
                  borderRadius: 'var(--n-radius-sm)',
                  background: 'var(--n-bg-secondary)',
                  padding: 'var(--n-space-4)',
                  marginBottom: 'var(--n-space-4)',
                  textAlign: 'center',
                }}
              >
                <div style={{ color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-mono)', fontSize: 'var(--n-text-xl)', fontWeight: 'var(--n-weight-bold)' }}>
                  {Number.parseFloat(selectedTxn.amount || '0').toFixed(2)} EUR
                </div>
                <div style={{ marginTop: 'var(--n-space-2)' }}>
                  <NotionBadge variant={STATUS_VARIANT[selectedTxn.status] || 'default'}>{STATUS_LABEL[selectedTxn.status] || selectedTxn.status}</NotionBadge>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 'var(--n-space-2)' }}>
                <TxnRow label="Transaction ID" value={selectedTxn.transaction_id} />
                <TxnRow label="STAN" value={selectedTxn.stan} />
                <TxnRow label="Code auth" value={selectedTxn.authorization_code} />
                <TxnRow label="Code reponse" value={selectedTxn.response_code} />
                <TxnRow label="Type" value={selectedTxn.type} />
                <TxnRow label="Carte" value={selectedTxn.masked_pan} />
                <TxnRow label="Terminal" value={selectedTxn.terminal_id} />
                <TxnRow label="Marchand" value={selectedTxn.merchant_name} />
                <TxnRow label="MCC" value={selectedTxn.merchant_mcc} />
                <TxnRow
                  label="Client"
                  value={
                    selectedTxn.client_first_name
                      ? `${selectedTxn.client_first_name} ${selectedTxn.client_last_name || ''}`
                      : selectedTxn.client_username
                  }
                />
                <TxnRow
                  label="Score fraude"
                  value={selectedTxn.fraud_score ? `${Number.parseFloat(selectedTxn.fraud_score).toFixed(1)}/100` : 'N/A'}
                />
                <TxnRow label="3DS" value={selectedTxn.threeds_status || 'N/A'} />
                <TxnRow
                  label="Date"
                  value={selectedTxn.timestamp ? new Date(selectedTxn.timestamp).toLocaleString('fr-FR') : 'N/A'}
                />
                <TxnRow
                  label="Reglement"
                  value={selectedTxn.settled_at ? new Date(selectedTxn.settled_at).toLocaleString('fr-FR') : 'Non regle'}
                />
              </div>

              <div style={{ marginTop: 'var(--n-space-4)', paddingBottom: 'var(--n-space-1)' }}>
                <NotionButton
                  fullWidth
                  leftIcon={<GitBranch size={14} />}
                  onClick={() => {
                    const id = selectedTxn.id;
                    setSelectedTxn(null);
                    router.push(`/instructor/transactions/${id}/timeline`);
                  }}
                >
                  Voir la timeline
                </NotionButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TxnRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'var(--n-space-2) 0',
        borderBottom: '1px solid var(--n-border)',
      }}
    >
      <span style={{ color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)' }}>{label}</span>
      <span
        style={{
          color: 'var(--n-text-primary)',
          fontFamily: 'var(--n-font-mono)',
          fontSize: 'var(--n-text-xs)',
          maxWidth: '280px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value || 'N/A'}
      </span>
    </div>
  );
}

