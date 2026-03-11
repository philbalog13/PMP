import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { BankSkeleton } from '../feedback/BankSkeleton';

interface StatCardDelta {
  value: number;
  period: string;
  positive?: boolean;
  displayValue?: string;
}

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: StatCardDelta;
  icon?: LucideIcon;
  loading?: boolean;
  accent?: boolean;
  index?: number;
}

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  loading = false,
  accent = false,
  index = 0,
}: StatCardProps) {
  if (loading) {
    return <BankSkeleton variant="stat-card" />;
  }

  const deltaPositive = delta ? (delta.positive ?? delta.value >= 0) : false;
  const DeltaIcon = deltaPositive ? TrendingUp : TrendingDown;
  const deltaValueText = delta?.displayValue
    ?? `${delta && delta.value > 0 ? '+' : ''}${delta?.value.toFixed(1)}%`;

  return (
    <div
      className={`bk-card bk-animate-fade-up${accent ? ' bk-card--accent' : ''}`}
      style={{
        animationDelay: `${index * 80}ms`,
      }}
    >
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

      <div
        className="bk-stat-value"
        style={{ marginBottom: delta ? 'var(--bank-space-2)' : 0 }}
      >
        {value}
      </div>

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
            {deltaValueText}
          </span>
          <span className="bk-caption">{delta.period}</span>
        </div>
      )}
    </div>
  );
}
