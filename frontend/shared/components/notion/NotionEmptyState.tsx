import React from 'react';

interface NotionEmptyStateProps {
  /** Emoji ou icône SVG */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** Bouton d'action optionnel */
  action?: React.ReactNode;
  /** Taille du composant */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * NotionEmptyState — État vide sobre et informatif
 *
 * Usage :
 * ```tsx
 * <NotionEmptyState
 *   icon="📚"
 *   title="Aucun cursus disponible"
 *   description="Contactez votre formateur pour accéder aux contenus."
 *   action={<button>Actualiser</button>}
 * />
 * ```
 */
export function NotionEmptyState({
  icon,
  title,
  description,
  action,
  size = 'md',
  className = '',
}: NotionEmptyStateProps) {
  const paddingY = size === 'sm' ? 'var(--n-space-8)' : size === 'lg' ? 'var(--n-space-20)' : 'var(--n-space-12)';
  const iconSize = size === 'sm' ? '28px' : size === 'lg' ? '48px' : '36px';
  const titleSize = size === 'sm' ? 'var(--n-text-base)' : 'var(--n-text-lg)';

  return (
    <div
      className={className}
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        textAlign:      'center',
        paddingTop:     paddingY,
        paddingBottom:  paddingY,
        paddingLeft:    'var(--n-space-6)',
        paddingRight:   'var(--n-space-6)',
        fontFamily:     'var(--n-font-sans)',
      }}
    >
      {/* Icône */}
      {icon && (
        <div
          style={{
            fontSize:     iconSize,
            lineHeight:   1,
            marginBottom: 'var(--n-space-4)',
            opacity:      0.35,
            userSelect:   'none',
          }}
        >
          {icon}
        </div>
      )}

      {/* Titre */}
      <p
        style={{
          fontSize:     titleSize,
          fontWeight:   'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'],
          color:        'var(--n-text-primary)',
          marginBottom: description ? 'var(--n-space-2)' : action ? 'var(--n-space-4)' : '0',
          lineHeight:   'var(--n-leading-snug)',
        }}
      >
        {title}
      </p>

      {/* Description */}
      {description && (
        <p
          style={{
            fontSize:     'var(--n-text-sm)',
            color:        'var(--n-text-secondary)',
            lineHeight:   'var(--n-leading-relaxed)',
            maxWidth:     '360px',
            marginBottom: action ? 'var(--n-space-5)' : '0',
          }}
        >
          {description}
        </p>
      )}

      {/* Action */}
      {action && <div>{action}</div>}
    </div>
  );
}
