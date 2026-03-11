import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'reward';
type ButtonSize = 'sm' | 'md' | 'lg';

interface NotionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const SIZE_STYLE: Record<ButtonSize, React.CSSProperties> = {
  sm: { fontSize: 'var(--n-text-xs)', padding: '6px 10px' },
  md: { fontSize: 'var(--n-text-sm)', padding: '9px 14px' },
  lg: { fontSize: 'var(--n-text-base)', padding: '11px 18px' },
};

const VARIANT_STYLE: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    color: 'var(--n-text-inverse)',
    background: 'linear-gradient(135deg, var(--n-accent), var(--n-accent-hover))',
    border: '1px solid var(--n-accent-border)',
    boxShadow: 'var(--n-glow-accent)',
  },
  secondary: {
    color: 'var(--n-text-primary)',
    background: 'var(--n-bg-elevated)',
    border: '1px solid var(--n-border)',
  },
  ghost: {
    color: 'var(--n-text-secondary)',
    background: 'transparent',
    border: '1px solid transparent',
  },
  danger: {
    color: 'var(--n-danger)',
    background: 'var(--n-danger-bg)',
    border: '1px solid var(--n-danger-border)',
  },
  reward: {
    color: 'var(--n-text-inverse)',
    background: 'linear-gradient(135deg, var(--n-reward), #8d49ff)',
    border: '1px solid var(--n-reward-border)',
    boxShadow: 'var(--n-glow-reward)',
  },
};

export function NotionButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  children,
  style,
  ...props
}: NotionButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      style={{
        alignItems: 'center',
        borderRadius: 'var(--n-radius-sm)',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        fontFamily: 'var(--n-font-sans)',
        fontWeight: 'var(--n-weight-semibold)',
        gap: 'var(--n-space-2)',
        justifyContent: 'center',
        opacity: isDisabled ? 0.55 : 1,
        transition: 'all var(--n-duration-sm) var(--n-ease)',
        width: fullWidth ? '100%' : undefined,
        ...SIZE_STYLE[size],
        ...VARIANT_STYLE[variant],
        ...style,
      }}
    >
      {loading ? (
        <span
          aria-hidden="true"
          style={{
            animation: 'spin 0.8s linear infinite',
            border: '2px solid currentColor',
            borderRadius: '999px',
            borderTopColor: 'transparent',
            display: 'inline-block',
            height: size === 'sm' ? '12px' : '14px',
            width: size === 'sm' ? '12px' : '14px',
          }}
        />
      ) : leftIcon}
      <span>{children}</span>
      {rightIcon}
    </button>
  );
}
