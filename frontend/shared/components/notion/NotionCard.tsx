import React from 'react';
import Link from 'next/link';

type CardVariant = 'default' | 'hover' | 'interactive' | 'selected';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface NotionCardProps {
  variant?: CardVariant;
  padding?: CardPadding;
  /** Rend la card cliquable via Next.js Link */
  href?: string;
  /** Rend la card cliquable via handler onClick */
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  /** Accessible label for interactive cards */
  'aria-label'?: string;
}

const PADDING: Record<CardPadding, string> = {
  none: '0',
  sm:   'var(--n-space-3)',
  md:   'var(--n-space-5)',
  lg:   'var(--n-space-8)',
};

/**
 * NotionCard — Surface atomique minimaliste
 *
 * Variants :
 * - `default`     : card statique, ombre légère
 * - `hover`       : lift -1px au survol, ombre accrue
 * - `interactive` : clickable, bg change au survol, press state
 * - `selected`    : fond teinté accent, border accent
 *
 * Usage :
 * ```tsx
 * <NotionCard variant="hover" padding="md">contenu</NotionCard>
 * <NotionCard variant="interactive" href="/student/cursus">card-link</NotionCard>
 * ```
 */
export function NotionCard({
  variant = 'default',
  padding = 'md',
  href,
  onClick,
  className = '',
  style,
  children,
  'aria-label': ariaLabel,
}: NotionCardProps) {
  const baseStyle: React.CSSProperties = {
    background:    variant === 'selected' ? 'var(--n-accent-light)' : 'var(--n-bg-elevated)',
    border:        variant === 'selected'
      ? '1px solid var(--n-accent-border)'
      : '1px solid var(--n-border)',
    borderRadius:  'var(--n-radius-md)',
    boxShadow:     'var(--n-shadow-sm)',
    padding:       PADDING[padding],
    display:       'block',
    textDecoration: 'none',
    color:         'inherit',
    position:      'relative',
    ...style,
  };

  const transitionStyle: React.CSSProperties =
    variant === 'hover' || variant === 'interactive'
      ? {
          transition: `box-shadow var(--n-duration-sm) var(--n-ease),
                       transform var(--n-duration-sm) var(--n-ease),
                       background var(--n-duration-xs) var(--n-ease),
                       border-color var(--n-duration-sm) var(--n-ease)`,
          cursor: variant === 'interactive' ? 'pointer' : 'default',
        }
      : {};

  const combinedStyle = { ...baseStyle, ...transitionStyle };

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    if (variant === 'hover') {
      el.style.boxShadow = 'var(--n-shadow-md)';
      el.style.transform = 'translateY(-1px)';
      el.style.borderColor = 'var(--n-border-strong)';
    }
    if (variant === 'interactive') {
      el.style.background = 'var(--n-bg-secondary)';
      el.style.boxShadow = 'var(--n-shadow-md)';
      el.style.transform = 'translateY(-1px)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    if (variant === 'hover') {
      el.style.boxShadow = 'var(--n-shadow-sm)';
      el.style.transform = 'translateY(0)';
      el.style.borderColor = 'var(--n-border)';
    }
    if (variant === 'interactive') {
      el.style.background = 'var(--n-bg-elevated)';
      el.style.boxShadow = 'var(--n-shadow-sm)';
      el.style.transform = 'translateY(0)';
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    if (variant === 'interactive') {
      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      (e.currentTarget as HTMLElement).style.boxShadow = 'var(--n-shadow-xs)';
    }
  };

  const eventHandlers =
    variant === 'hover' || variant === 'interactive'
      ? {
          onMouseEnter: handleMouseEnter,
          onMouseLeave: handleMouseLeave,
          onMouseDown:  handleMouseDown,
          onMouseUp:    handleMouseLeave,
        }
      : {};

  if (href) {
    return (
      <Link
        href={href}
        style={combinedStyle}
        className={className}
        aria-label={ariaLabel}
        {...eventHandlers}
      >
        {children}
      </Link>
    );
  }

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      style={combinedStyle}
      className={className}
      aria-label={ariaLabel}
      {...eventHandlers}
    >
      {children}
    </div>
  );
}
