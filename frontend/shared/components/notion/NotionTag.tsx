import React from 'react';

type TagVariant =
  | 'default'
  | 'accent'
  | 'success' | 'warning' | 'danger' | 'info'
  | 'beginner' | 'inter' | 'advanced' | 'expert'
  | 'critical' | 'high' | 'medium' | 'low';

interface NotionTagProps {
  variant?: TagVariant;
  /** Point coloré devant le label */
  dot?: boolean;
  /** Icône optionnelle avant le label */
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Pour les tags cliquables */
  onClick?: () => void;
}

const VARIANT_STYLES: Record<TagVariant, { bg: string; color: string; border: string }> = {
  default:  { bg: 'var(--n-bg-tertiary)',              color: 'var(--n-text-secondary)',    border: 'var(--n-border)' },
  accent:   { bg: 'var(--n-accent-light)',             color: 'var(--n-accent)',            border: 'var(--n-accent-border)' },
  success:  { bg: 'var(--n-success-bg)',               color: 'var(--n-success)',           border: 'var(--n-success-border)' },
  warning:  { bg: 'var(--n-warning-bg)',               color: 'var(--n-warning)',           border: 'var(--n-warning-border)' },
  danger:   { bg: 'var(--n-danger-bg)',                color: 'var(--n-danger)',            border: 'var(--n-danger-border)' },
  info:     { bg: 'var(--n-info-bg)',                  color: 'var(--n-info)',              border: 'var(--n-info-border)' },
  beginner: { bg: 'var(--n-level-beginner-bg)',        color: 'var(--n-level-beginner)',    border: 'var(--n-level-beginner-border)' },
  inter:    { bg: 'var(--n-level-inter-bg)',           color: 'var(--n-level-inter)',       border: 'var(--n-level-inter-border)' },
  advanced: { bg: 'var(--n-level-advanced-bg)',        color: 'var(--n-level-advanced)',    border: 'var(--n-level-advanced-border)' },
  expert:   { bg: 'var(--n-level-expert-bg)',          color: 'var(--n-level-expert)',      border: 'var(--n-level-expert-border)' },
  critical: { bg: 'var(--n-severity-critical-bg)',     color: 'var(--n-severity-critical)', border: 'var(--n-severity-critical-border)' },
  high:     { bg: 'var(--n-severity-high-bg)',         color: 'var(--n-severity-high)',     border: 'var(--n-severity-high-border)' },
  medium:   { bg: 'var(--n-severity-medium-bg)',       color: 'var(--n-severity-medium)',   border: 'var(--n-severity-medium-border)' },
  low:      { bg: 'var(--n-severity-low-bg)',          color: 'var(--n-severity-low)',      border: 'var(--n-severity-low-border)' },
};

/**
 * NotionTag — Pill/chip atomique pour catégories, filtres, labels
 * Légèrement plus grand qu'un badge (padding horizontal plus généreux, radius plus grand)
 *
 * Usage :
 * ```tsx
 * <NotionTag variant="beginner" dot>Débutant</NotionTag>
 * <NotionTag variant="critical">HSM_ATTACK</NotionTag>
 * <NotionTag variant="accent" onClick={() => setFilter('ctf')}>CTF</NotionTag>
 * ```
 */
export function NotionTag({
  variant = 'default',
  dot = false,
  icon,
  children,
  className = '',
  onClick,
}: NotionTagProps) {
  const { bg, color, border } = VARIANT_STYLES[variant];
  const isClickable = !!onClick;

  return (
    <span
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter') onClick?.(); } : undefined}
      className={className}
      style={{
        display:       'inline-flex',
        alignItems:    'center',
        gap:           '5px',
        padding:       '3px 10px',
        borderRadius:  '999px',
        fontSize:      'var(--n-text-xs)',
        fontWeight:    'var(--n-weight-medium)' as React.CSSProperties['fontWeight'],
        lineHeight:    'var(--n-leading-normal)',
        whiteSpace:    'nowrap',
        userSelect:    'none',
        background:    bg,
        color:         color,
        border:        `1px solid ${border}`,
        fontFamily:    'var(--n-font-sans)',
        cursor:        isClickable ? 'pointer' : 'default',
        transition:    isClickable
          ? `filter var(--n-duration-xs) var(--n-ease)`
          : undefined,
      }}
      onMouseEnter={isClickable ? (e) => {
        (e.currentTarget as HTMLSpanElement).style.filter = 'brightness(0.94)';
      } : undefined}
      onMouseLeave={isClickable ? (e) => {
        (e.currentTarget as HTMLSpanElement).style.filter = 'brightness(1)';
      } : undefined}
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
      {icon && <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>}
      {children}
    </span>
  );
}
