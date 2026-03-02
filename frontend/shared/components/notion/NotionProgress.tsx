import React from 'react';

type ProgressVariant = 'accent' | 'success' | 'warning' | 'danger';
type ProgressSize   = 'thin' | 'default' | 'thick';

interface NotionProgressProps {
  /** Valeur entre 0 et 100 */
  value: number;
  variant?: ProgressVariant;
  size?: ProgressSize;
  /** Affiche le pourcentage à droite */
  showLabel?: boolean;
  /** Label personnalisé à la place du % */
  label?: string;
  /** Accessible label */
  'aria-label'?: string;
  className?: string;
}

const TRACK_HEIGHT: Record<ProgressSize, string> = {
  thin:    '2px',
  default: '4px',
  thick:   '6px',
};

const BAR_COLOR: Record<ProgressVariant, string> = {
  accent:  'var(--n-accent)',
  success: 'var(--n-success)',
  warning: 'var(--n-warning)',
  danger:  'var(--n-danger)',
};

/**
 * NotionProgress — Barre de progression fine et sobre
 *
 * Usage :
 * ```tsx
 * <NotionProgress value={65} showLabel />
 * <NotionProgress value={100} variant="success" size="thin" />
 * <NotionProgress value={30} variant="warning" label="3/10 modules" />
 * ```
 */
export function NotionProgress({
  value,
  variant = 'accent',
  size = 'default',
  showLabel = false,
  label,
  'aria-label': ariaLabel,
  className = '',
}: NotionProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const displayLabel = label ?? `${Math.round(clampedValue)}%`;

  return (
    <div
      className={className}
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)' }}
    >
      {/* Track */}
      <div
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
        style={{
          flex:         1,
          height:       TRACK_HEIGHT[size],
          background:   'var(--n-bg-tertiary)',
          borderRadius: 'var(--n-radius-xs)',
          overflow:     'hidden',
        }}
      >
        <div
          style={{
            height:       '100%',
            width:        `${clampedValue}%`,
            background:   BAR_COLOR[variant],
            borderRadius: 'var(--n-radius-xs)',
            transition:   'width var(--n-duration-lg) var(--n-ease-out)',
          }}
        />
      </div>

      {/* Label */}
      {(showLabel || label) && (
        <span
          style={{
            fontSize:   'var(--n-text-xs)',
            fontWeight: 'var(--n-weight-medium)' as React.CSSProperties['fontWeight'],
            color:      'var(--n-text-secondary)',
            whiteSpace: 'nowrap',
            minWidth:   '30px',
            textAlign:  'right',
            fontFamily: 'var(--n-font-sans)',
          }}
        >
          {displayLabel}
        </span>
      )}
    </div>
  );
}
