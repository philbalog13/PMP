import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  RotateCcw,
  CreditCard,
} from 'lucide-react';
import { TransactionBadge } from '../primitives/BankBadge';

/* ══════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════ */
export interface BankTransaction {
  id:           string;
  transactionId?: string;
  maskedPan?:   string;
  masked_pan?:  string;
  amount:       number;
  currency?:    string;
  type:         string;   /* PURCHASE, REFUND, VOID, SETTLEMENT … */
  status:       string;
  responseCode?: string;
  timestamp:    string;
  terminalId?:  string;
  description?: string;   /* label marchand ou description */
}

interface TransactionRowProps {
  transaction:  BankTransaction;
  onClick?:     (tx: BankTransaction) => void;
  locale?:      string;
}

/* ══════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════ */
function getTypeIcon(type: string) {
  const t = type?.toUpperCase() ?? '';
  if (t === 'REFUND' || t === 'REFUNDED')         return { Icon: ArrowDownLeft, color: 'var(--bank-info)' };
  if (t === 'VOID'   || t === 'VOIDED')            return { Icon: RotateCcw,    color: 'var(--bank-text-tertiary)' };
  if (t === 'SETTLEMENT' || t === 'PAYOUT')        return { Icon: RefreshCw,    color: 'var(--bank-success)' };
  /* PURCHASE / default */
  return { Icon: ArrowUpRight, color: 'var(--bank-accent)' };
}

function getAmountSign(type: string): '+' | '-' | '' {
  const t = type?.toUpperCase() ?? '';
  if (t === 'REFUND' || t === 'SETTLEMENT' || t === 'PAYOUT') return '+';
  if (t === 'PURCHASE' || t === 'VOID') return '-';
  return '';
}

function formatAmount(amount: number, currency = 'EUR', locale = 'fr-FR'): string {
  return new Intl.NumberFormat(locale, {
    style:    'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
}

function formatDate(ts: string, locale = 'fr-FR'): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day:    '2-digit',
      month:  'short',
      hour:   '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return ts;
  }
}

/* ══════════════════════════════════════════════════════
   COMPOSANT
   ══════════════════════════════════════════════════════ */
export function TransactionRow({ transaction: tx, onClick, locale = 'fr-FR' }: TransactionRowProps) {
  const { Icon, color } = getTypeIcon(tx.type);
  const sign            = getAmountSign(tx.type);
  const pan             = tx.maskedPan ?? tx.masked_pan ?? '';
  const label           = tx.description ?? pan ?? tx.terminalId ?? tx.transactionId ?? tx.id;
  const isClickable     = Boolean(onClick);

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `Détail transaction ${label}` : undefined}
      onClick={isClickable ? () => onClick?.(tx) : undefined}
      onKeyDown={isClickable ? e => { if (e.key === 'Enter' || e.key === ' ') onClick?.(tx); } : undefined}
      className={isClickable ? 'bk-card--interactive' : ''}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--bank-space-3)',
        padding: 'var(--bank-space-3) var(--bank-space-4)',
        borderRadius: 'var(--bank-radius-md)',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'background-color var(--bank-t-fast) var(--bank-ease)',
      }}
    >
      {/* Icône type transaction */}
      <div
        aria-hidden="true"
        style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--bank-radius-full)',
          background: 'var(--bank-bg-elevated)',
          border: '1px solid var(--bank-border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color,
        }}
      >
        <Icon size={16} strokeWidth={2} aria-hidden="true" />
      </div>

      {/* Label + date */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 'var(--bank-text-sm)',
            fontWeight: 'var(--bank-font-medium)',
            color: 'var(--bank-text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={label}
        >
          {pan ? (
            <span className="bk-text-pan">{pan}</span>
          ) : label}
        </div>
        <div className="bk-caption" style={{ marginTop: 2 }}>
          {formatDate(tx.timestamp, locale)}
          {tx.terminalId && (
            <span style={{ marginLeft: 'var(--bank-space-2)', opacity: 0.7 }}>
              · {tx.terminalId}
            </span>
          )}
        </div>
      </div>

      {/* Montant + badge */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 'var(--bank-space-1)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 'var(--bank-text-sm)',
            fontWeight: 'var(--bank-font-semibold)',
            color: sign === '+'
              ? 'var(--bank-success)'
              : sign === '-'
              ? 'var(--bank-text-primary)'
              : 'var(--bank-text-primary)',
            whiteSpace: 'nowrap',
          }}
        >
          {sign}{formatAmount(tx.amount, tx.currency, locale)}
        </span>
        <TransactionBadge status={tx.status} />
      </div>
    </div>
  );
}
