import React from 'react';

type PillVariant = 'default' | 'accent' | 'reward' | 'success' | 'warning' | 'danger';

interface NotionPillProps {
  children: React.ReactNode;
  variant?: PillVariant;
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const STYLES: Record<PillVariant, React.CSSProperties> = {
  default: {
    background: 'var(--n-bg-elevated)',
    border: '1px solid var(--n-border)',
    color: 'var(--n-text-secondary)',
  },
  accent: {
    background: 'var(--n-accent-light)',
    border: '1px solid var(--n-accent-border)',
    color: 'var(--n-accent)',
  },
  reward: {
    background: 'var(--n-reward-bg)',
    border: '1px solid var(--n-reward-border)',
    color: 'var(--n-reward)',
  },
  success: {
    background: 'var(--n-success-bg)',
    border: '1px solid var(--n-success-border)',
    color: 'var(--n-success)',
  },
  warning: {
    background: 'var(--n-warning-bg)',
    border: '1px solid var(--n-warning-border)',
    color: 'var(--n-warning)',
  },
  danger: {
    background: 'var(--n-danger-bg)',
    border: '1px solid var(--n-danger-border)',
    color: 'var(--n-danger)',
  },
};

export function NotionPill({
  children,
  variant = 'default',
  icon,
  className = '',
  style,
}: NotionPillProps) {
  return (
    <span
      className={className}
      style={{
        alignItems: 'center',
        borderRadius: '999px',
        display: 'inline-flex',
        fontFamily: 'var(--n-font-sans)',
        fontSize: 'var(--n-text-xs)',
        fontWeight: 'var(--n-weight-semibold)',
        gap: 'var(--n-space-1)',
        letterSpacing: '0.04em',
        padding: '4px 10px',
        textTransform: 'uppercase',
        ...STYLES[variant],
        ...style,
      }}
    >
      {icon}
      {children}
    </span>
  );
}
