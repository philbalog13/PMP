import React from 'react';

type BadgeVariant =
  | 'default'
  | 'success' | 'warning' | 'danger' | 'info' | 'accent'
  | 'beginner' | 'inter' | 'advanced' | 'expert'
  | 'critical' | 'high' | 'medium' | 'low';

type BadgeSize = 'sm' | 'md';

interface NotionBadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Point coloré avant le label */
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  default:  { bg: 'var(--n-bg-tertiary)',           color: 'var(--n-text-secondary)',  border: 'transparent' },
  success:  { bg: 'var(--n-success-bg)',             color: 'var(--n-success)',          border: 'var(--n-success-border)' },
  warning:  { bg: 'var(--n-warning-bg)',             color: 'var(--n-warning)',          border: 'var(--n-warning-border)' },
  danger:   { bg: 'var(--n-danger-bg)',              color: 'var(--n-danger)',           border: 'var(--n-danger-border)' },
  info:     { bg: 'var(--n-info-bg)',                color: 'var(--n-info)',             border: 'var(--n-info-border)' },
  accent:   { bg: 'var(--n-accent-light)',           color: 'var(--n-accent)',           border: 'var(--n-accent-border)' },
  // Levels
  beginner: { bg: 'var(--n-level-beginner-bg)',      color: 'var(--n-level-beginner)',   border: 'var(--n-level-beginner-border)' },
  inter:    { bg: 'var(--n-level-inter-bg)',         color: 'var(--n-level-inter)',      border: 'var(--n-level-inter-border)' },
  advanced: { bg: 'var(--n-level-advanced-bg)',      color: 'var(--n-level-advanced)',   border: 'var(--n-level-advanced-border)' },
  expert:   { bg: 'var(--n-level-expert-bg)',        color: 'var(--n-level-expert)',     border: 'var(--n-level-expert-border)' },
  // Severity
  critical: { bg: 'var(--n-severity-critical-bg)',   color: 'var(--n-severity-critical)', border: 'var(--n-severity-critical-border)' },
  high:     { bg: 'var(--n-severity-high-bg)',       color: 'var(--n-severity-high)',    border: 'var(--n-severity-high-border)' },
  medium:   { bg: 'var(--n-severity-medium-bg)',     color: 'var(--n-severity-medium)',  border: 'var(--n-severity-medium-border)' },
  low:      { bg: 'var(--n-severity-low-bg)',        color: 'var(--n-severity-low)',     border: 'var(--n-severity-low-border)' },
};

/**
 * NotionBadge — Badge sémantique minimaliste
 *
 * Variants : default · success · warning · danger · info · accent
 *            beginner · inter · advanced · expert (levels)
 *            critical · high · medium · low (severity)
 *
 * Usage :
 * ```tsx
 * <NotionBadge variant="success" dot>Approuvé</NotionBadge>
 * <NotionBadge variant="expert" size="sm">Expert</NotionBadge>
 * <NotionBadge variant="critical">CRITICAL</NotionBadge>
 * ```
 */
export function NotionBadge({
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  className = '',
}: NotionBadgeProps) {
  const { bg, color, border } = VARIANT_STYLES[variant];

  return (
    <span
      className={className}
      style={{
        display:       'inline-flex',
        alignItems:    'center',
        gap:           '5px',
        padding:       size === 'sm' ? '1px 6px' : '2px 8px',
        borderRadius:  'var(--n-radius-xs)',
        fontSize:      size === 'sm' ? 'var(--n-text-xs)' : 'var(--n-text-xs)',
        fontWeight:    'var(--n-weight-medium)' as React.CSSProperties['fontWeight'],
        lineHeight:    'var(--n-leading-normal)',
        whiteSpace:    'nowrap',
        background:    bg,
        color:         color,
        border:        `1px solid ${border}`,
        fontFamily:    'var(--n-font-sans)',
      }}
    >
      {dot && (
        <span
          style={{
            display:      'inline-block',
            width:        '5px',
            height:       '5px',
            borderRadius: '50%',
            background:   color,
            flexShrink:   0,
          }}
        />
      )}
      {children}
    </span>
  );
}
