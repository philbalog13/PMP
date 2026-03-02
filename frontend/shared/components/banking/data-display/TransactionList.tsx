'use client';

import { useRef }             from 'react';
import { TransactionRow, type BankTransaction } from './TransactionRow';
import { BankSkeleton }       from '../feedback/BankSkeleton';
import { BankEmptyState }     from '../feedback/BankEmptyState';
import { CreditCard }         from 'lucide-react';

/* ══════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════ */
interface TransactionListProps {
  transactions:  BankTransaction[];
  loading?:      boolean;
  onClickRow?:   (tx: BankTransaction) => void;
  locale?:       string;
  /** Label accessible pour le groupe (sr-only utilisé si absent) */
  label?:        string;
  /** Afficher un séparateur de date entre les jours */
  groupByDate?:  boolean;
  /** Nombre de lignes skeleton à afficher en loading */
  skeletonCount?: number;
  /** Remplace le BankEmptyState par défaut quand transactions.length === 0 */
  emptyState?:   React.ReactNode;
  className?:    string;
  style?:        React.CSSProperties;
}

/* ══════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════ */
function toDateKey(ts: string): string {
  try { return new Date(ts).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return ts.slice(0, 10); }
}

function groupTransactions(
  txs: BankTransaction[],
): Array<{ dateKey: string; items: BankTransaction[] }> {
  const map = new Map<string, BankTransaction[]>();
  for (const tx of txs) {
    const key = toDateKey(tx.timestamp);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }
  return Array.from(map.entries()).map(([dateKey, items]) => ({ dateKey, items }));
}

/* ══════════════════════════════════════════════════════
   COMPOSANT
   ══════════════════════════════════════════════════════ */
export function TransactionList({
  transactions,
  loading        = false,
  onClickRow,
  locale         = 'fr-FR',
  label          = 'Liste des transactions',
  groupByDate    = false,
  skeletonCount  = 5,
  emptyState,
  className      = '',
  style,
}: TransactionListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  /* ── Loading ── */
  if (loading) {
    return (
      <div
        ref={listRef}
        role="status"
        aria-label="Chargement des transactions…"
        aria-busy="true"
        className={className}
        style={style}
      >
        <BankSkeleton variant="transaction-row" count={skeletonCount} />
      </div>
    );
  }

  /* ── Empty ── */
  if (transactions.length === 0) {
    return (
      <div className={className} style={style}>
        {emptyState ?? (
          <BankEmptyState
            icon={<CreditCard size={20} />}
            title="Aucune transaction"
            description="Vos opérations apparaîtront ici dès qu'une transaction sera effectuée."
          />
        )}
      </div>
    );
  }

  /* ── Grouped ── */
  if (groupByDate) {
    const groups = groupTransactions(transactions);
    return (
      <div
        ref={listRef}
        role="list"
        aria-label={label}
        className={className}
        style={{ display: 'flex', flexDirection: 'column', gap: 0, ...style }}
      >
        {groups.map(({ dateKey, items }) => (
          <section key={dateKey} aria-label={dateKey}>
            {/* Séparateur de date */}
            <div
              style={{
                padding:         'var(--bank-space-2) var(--bank-space-4)',
                fontSize:        'var(--bank-text-xs)',
                fontWeight:      'var(--bank-font-semibold)',
                color:           'var(--bank-text-tertiary)',
                textTransform:   'uppercase',
                letterSpacing:   '0.08em',
                borderBottom:    '1px solid var(--bank-border-subtle)',
                marginBottom:    'var(--bank-space-1)',
              }}
              aria-hidden="true"
            >
              {dateKey}
            </div>
            {items.map(tx => (
              <div key={tx.id} role="listitem">
                <TransactionRow
                  transaction={tx}
                  onClick={onClickRow}
                  locale={locale}
                />
              </div>
            ))}
          </section>
        ))}
      </div>
    );
  }

  /* ── Flat list ── */
  return (
    <div
      ref={listRef}
      role="list"
      aria-label={label}
      className={className}
      style={{ display: 'flex', flexDirection: 'column', gap: 0, ...style }}
    >
      {transactions.map(tx => (
        <div key={tx.id} role="listitem">
          <TransactionRow
            transaction={tx}
            onClick={onClickRow}
            locale={locale}
          />
        </div>
      ))}
    </div>
  );
}
