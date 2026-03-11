import { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';

/* ══════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════ */
export type BankButtonVariant = 'primary' | 'ghost' | 'danger' | 'link';
export type BankButtonSize    = 'sm' | 'md' | 'lg';

export interface BankButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  BankButtonVariant;
  size?:     BankButtonSize;
  loading?:  boolean;
  icon?:     LucideIcon;
  iconRight?: LucideIcon;
  /** Rend le bouton en pleine largeur */
  fullWidth?: boolean;
}

/* ══════════════════════════════════════════════════════
   COMPOSANT
   ══════════════════════════════════════════════════════ */
export const BankButton = forwardRef<HTMLButtonElement, BankButtonProps>(
  function BankButton(
    {
      variant   = 'primary',
      size      = 'md',
      loading   = false,
      icon:      IconLeft,
      iconRight: IconRight,
      fullWidth  = false,
      disabled,
      children,
      className = '',
      style,
      ...rest
    },
    ref,
  ) {
    const isDisabled = disabled || loading;

    /* Classes utilitaires */
    const sizeClass: Record<BankButtonSize, string> = {
      sm: 'bk-btn--sm',
      md: '',
      lg: 'bk-btn--lg',
    };

    const variantClass: Record<BankButtonVariant, string> = {
      primary: 'bk-btn--primary',
      ghost:   'bk-btn--ghost',
      danger:  'bk-btn--danger',
      link:    'bk-btn--link',
    };

    const classes = [
      'bk-btn',
      variantClass[variant],
      sizeClass[size],
      fullWidth ? 'bk-btn--full' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={classes}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        data-loading={loading ? 'true' : undefined}
        style={{ width: fullWidth ? '100%' : undefined, ...style }}
        {...rest}
      >
        {/* Spinner inline quand loading */}
        {loading ? (
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: size === 'sm' ? 12 : size === 'lg' ? 18 : 15,
              height: size === 'sm' ? 12 : size === 'lg' ? 18 : 15,
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
              flexShrink: 0,
            }}
          />
        ) : (
          IconLeft && (
            <IconLeft
              size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16}
              aria-hidden="true"
              strokeWidth={2}
              style={{ flexShrink: 0 }}
            />
          )
        )}

        {children && <span>{children}</span>}

        {!loading && IconRight && (
          <IconRight
            size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16}
            aria-hidden="true"
            strokeWidth={2}
            style={{ flexShrink: 0 }}
          />
        )}
      </button>
    );
  },
);
