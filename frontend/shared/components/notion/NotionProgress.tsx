import React from 'react';

type ProgressVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger';
type ProgressSize   = 'thin' | 'default' | 'thick';

interface NotionProgressProps {
  /** Valeur courante */
  value: number;
  max?: number;
  variant?: ProgressVariant;
  size?: ProgressSize;
  /** Affiche le pourcentage à droite */
  showLabel?: boolean;
  /** Label personnalisé à la place du % */
  label?: string;
  /** Accessible label */
  'aria-label'?: string;
  className?: string;
  style?: React.CSSProperties;
}

const TRACK_HEIGHT: Record<ProgressSize, string> = {
  thin:    '2px',
  default: '4px',
  thick:   '6px',
};

const BAR_COLOR: Record<ProgressVariant, string> = {
  default: 'var(--n-border-strong)',
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
  max = 100,
  variant = 'accent',
  size = 'default',
  showLabel = false,
  label,
  'aria-label': ariaLabel,
  className = '',
  style,
}: NotionProgressProps) {
  const safeMax = max > 0 ? max : 100;
  const clampedValue = Math.min(safeMax, Math.max(0, value));
  const percent = (clampedValue / safeMax) * 100;
  const displayLabel = label ?? `${Math.round(percent)}%`;
  const progressAriaLabel = ariaLabel ?? label ?? 'Progress';

  return (
    <div
      className={className}
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', ...style }}
    >
      {/* Track */}
      <div
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-label={progressAriaLabel}
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
            width:        `${percent}%`,
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
