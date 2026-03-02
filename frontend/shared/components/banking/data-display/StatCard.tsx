import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { BankSkeleton } from '../feedback/BankSkeleton';

/* ══════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════ */
interface StatCardDelta {
  value:  number;   /* positif = hausse, négatif = baisse */
  period: string;   /* ex: "vs hier", "ce mois" */
}

interface StatCardProps {
  label:    string;
  value:    string | number;
  delta?:   StatCardDelta;
  icon?:    LucideIcon;
  loading?: boolean;
  accent?:  boolean;   /* bordure accent */
  /** Indexe pour l'animation stagger (0-based) */
  index?:   number;
}

/* ══════════════════════════════════════════════════════
   COMPOSANT
   ══════════════════════════════════════════════════════ */
export function StatCard({ label, value, delta, icon: Icon, loading = false, accent = false, index = 0 }: StatCardProps) {
  if (loading) {
    return <BankSkeleton variant="stat-card" />;
  }

  const deltaPositive = delta && delta.value >= 0;
  const DeltaIcon     = deltaPositive ? TrendingUp : TrendingDown;

  return (
    <div
      className={`bk-card bk-animate-fade-up${accent ? ' bk-card--accent' : ''}`}
      style={{
        animationDelay: `${index * 80}ms`,
      }}
    >
      {/* Header : label + icône */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 'var(--bank-space-3)',
        }}
      >
        <span className="bk-label-upper">{label}</span>
        {Icon && (
          <div
            aria-hidden="true"
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--bank-radius-md)',
              background: 'var(--bank-accent-subtle)',
              border: '1px solid var(--bank-accent-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--bank-accent)',
              flexShrink: 0,
            }}
          >
            <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Valeur */}
      <div
        className="bk-stat-value"
        style={{ marginBottom: delta ? 'var(--bank-space-2)' : 0 }}
      >
        {value}
      </div>

      {/* Delta */}
      {delta && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--bank-space-1)',
          }}
        >
          <DeltaIcon
            size={13}
            aria-hidden="true"
            style={{ color: deltaPositive ? 'var(--bank-success)' : 'var(--bank-danger)', flexShrink: 0 }}
          />
          <span
            style={{
              fontSize: 'var(--bank-text-xs)',
              fontWeight: 'var(--bank-font-semibold)',
              color: deltaPositive ? 'var(--bank-success-text)' : 'var(--bank-danger-text)',
            }}
          >
            {deltaPositive ? '+' : ''}{delta.value.toFixed(1)}%
          </span>
          <span className="bk-caption">{delta.period}</span>
        </div>
      )}
    </div>
  );
}
