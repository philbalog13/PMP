'use client';

import { CreditCard, Wifi } from 'lucide-react';

/* ══════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════ */
export interface CardVisualProps {
  /** PAN masqué, ex : •••• •••• •••• 4242 */
  maskedPan?:    string;
  cardHolder?:   string;
  expiry?:       string;   /* MM/YY */
  /** 'visa' | 'mastercard' | 'amex' | 'generic' */
  network?:      string;
  /** 'physical' | 'virtual' */
  cardType?:     'physical' | 'virtual';
  /** Variante de couleur (client=indigo, merchant=teal) */
  accent?:       'client' | 'merchant' | 'custom';
  /** Couleur de fond personnalisée (si accent='custom') */
  bgFrom?:       string;
  bgTo?:         string;
  /** Afficher l'état bloqué */
  isBlocked?:    boolean;
  /** Taille du rendu */
  size?:         'sm' | 'md' | 'lg';
  onClick?:      () => void;
  className?:    string;
  style?:        React.CSSProperties;
}

/* ══════════════════════════════════════════════════════
   DIMENSIONS
   ══════════════════════════════════════════════════════ */
const SIZES = {
  sm: { width: 260, height: 163, scale: 0.72 },
  md: { width: 360, height: 226, scale: 1 },
  lg: { width: 420, height: 264, scale: 1.17 },
} as const;

/* ══════════════════════════════════════════════════════
   NETWORK LOGO (SVG inline minimal)
   ══════════════════════════════════════════════════════ */
function NetworkLogo({ network }: { network?: string }) {
  const n = network?.toLowerCase() ?? 'generic';

  if (n === 'visa') {
    return (
      <span
        aria-label="Visa"
        style={{
          fontFamily:  '"Trebuchet MS", Arial, sans-serif',
          fontWeight:  700,
          fontSize:    22,
          color:       'rgba(255,255,255,0.9)',
          letterSpacing: '-1px',
          userSelect:  'none',
        }}
      >
        VISA
      </span>
    );
  }

  if (n === 'mastercard') {
    return (
      <svg width="44" height="28" viewBox="0 0 44 28" aria-label="Mastercard">
        <circle cx="16" cy="14" r="13" fill="rgba(235,0,27,0.85)" />
        <circle cx="28" cy="14" r="13" fill="rgba(255,163,0,0.85)" />
        <ellipse cx="22" cy="14" rx="5" ry="13" fill="rgba(255,95,0,0.60)" />
      </svg>
    );
  }

  if (n === 'amex') {
    return (
      <span
        aria-label="American Express"
        style={{
          fontFamily: 'Arial, sans-serif',
          fontWeight:  700,
          fontSize:    11,
          color:       'rgba(255,255,255,0.85)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          border:      '1px solid rgba(255,255,255,0.5)',
          padding:     '2px 5px',
          borderRadius: 3,
          userSelect:  'none',
        }}
      >
        AMEX
      </span>
    );
  }

  /* generic */
  return (
    <CreditCard size={28} strokeWidth={1.5} color="rgba(255,255,255,0.6)" aria-label="Carte bancaire" />
  );
}

/* ══════════════════════════════════════════════════════
   GRADIENTS PAR ACCENT
   ══════════════════════════════════════════════════════ */
function resolveGradient(accent: CardVisualProps['accent'], bgFrom?: string, bgTo?: string) {
  if (accent === 'custom' && bgFrom && bgTo) return { from: bgFrom, to: bgTo };
  if (accent === 'merchant') return { from: '#0F766E', to: '#042f2e' };
  /* client (default) */
  return { from: '#4F46E5', to: '#1e1b4b' };
}

/* ══════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ══════════════════════════════════════════════════════ */
export function CardVisual({
  maskedPan  = '•••• •••• •••• ••••',
  cardHolder = '',
  expiry     = '••/••',
  network    = 'generic',
  cardType   = 'physical',
  accent     = 'client',
  bgFrom,
  bgTo,
  isBlocked  = false,
  size       = 'md',
  onClick,
  className  = '',
  style,
}: CardVisualProps) {
  const { width, height } = SIZES[size];
  const gradient = resolveGradient(accent, bgFrom, bgTo);
  const isClickable = Boolean(onClick);

  const cardStyle: React.CSSProperties = {
    position:     'relative',
    width,
    height,
    borderRadius: 16,
    background:   `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
    overflow:     'hidden',
    cursor:       isClickable ? 'pointer' : 'default',
    userSelect:   'none',
    boxShadow:    isBlocked
      ? '0 4px 24px rgba(0,0,0,0.5)'
      : `0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)`,
    transition:   'transform var(--bank-t-normal) var(--bank-ease), box-shadow var(--bank-t-normal) var(--bank-ease)',
    flexShrink:   0,
    ...style,
  };

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `Carte ${maskedPan}` : undefined}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={isClickable ? e => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); } : undefined}
      className={`bk-card-visual ${className}`}
      style={cardStyle}
    >
      {/* ── Overlay glows ── */}
      <div
        aria-hidden="true"
        style={{
          position:     'absolute',
          top:          -40,
          right:        -40,
          width:        200,
          height:       200,
          borderRadius: '50%',
          background:   'rgba(255,255,255,0.07)',
          pointerEvents:'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position:     'absolute',
          bottom:       -60,
          left:         -20,
          width:        180,
          height:       180,
          borderRadius: '50%',
          background:   'rgba(255,255,255,0.04)',
          pointerEvents:'none',
        }}
      />

      {/* ── Bande holographique subtile ── */}
      <div
        aria-hidden="true"
        style={{
          position:   'absolute',
          top:        0,
          left:       0,
          right:      0,
          height:     '40%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Badge bloquée ── */}
      {isBlocked && (
        <div
          aria-label="Carte bloquée"
          style={{
            position:   'absolute',
            inset:      0,
            background: 'rgba(0,0,0,0.55)',
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 16,
            backdropFilter: 'blur(2px)',
            zIndex:     10,
          }}
        >
          <span style={{
            fontSize:   'var(--bank-text-sm)',
            fontWeight: 'var(--bank-font-semibold)',
            color:      'var(--bank-danger)',
            border:     '1px solid var(--bank-danger)',
            padding:    '4px 12px',
            borderRadius: 6,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            Bloquée
          </span>
        </div>
      )}

      {/* ── Contenu ── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        padding:  '18px 20px',
        display:  'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        opacity:  isBlocked ? 0.35 : 1,
        transition: 'opacity var(--bank-t-normal)',
      }}>

        {/* Row 1 : logo bank + badge virtuelle + NFC */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize:   'var(--bank-text-sm)',
            fontWeight: 'var(--bank-font-semibold)',
            color:      'rgba(255,255,255,0.9)',
            letterSpacing: '0.04em',
          }}>
            {accent === 'merchant' ? 'SoluBank' : 'MoneBank'}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {cardType === 'virtual' && (
              <span style={{
                fontSize: 9,
                fontWeight: 'var(--bank-font-semibold)',
                color: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(255,255,255,0.4)',
                padding: '1px 6px',
                borderRadius: 4,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}>
                Virtuelle
              </span>
            )}
            <Wifi
              size={18}
              strokeWidth={1.5}
              color="rgba(255,255,255,0.7)"
              style={{ transform: 'rotate(90deg)' }}
              aria-label="Paiement sans contact"
            />
          </div>
        </div>

        {/* Row 2 : Puce EMV */}
        <div style={{ height: 36, width: 48 }}>
          <svg
            viewBox="0 0 48 36"
            width={48}
            height={36}
            aria-hidden="true"
            fill="none"
          >
            {/* corps puce */}
            <rect x="1" y="1" width="46" height="34" rx="5" fill="rgba(255,215,0,0.75)" stroke="rgba(180,150,0,0.5)" strokeWidth="1" />
            {/* lignes de contact */}
            <line x1="16" y1="1"  x2="16" y2="35" stroke="rgba(180,150,0,0.4)" strokeWidth="1" />
            <line x1="32" y1="1"  x2="32" y2="35" stroke="rgba(180,150,0,0.4)" strokeWidth="1" />
            <line x1="1"  y1="13" x2="47" y2="13" stroke="rgba(180,150,0,0.4)" strokeWidth="1" />
            <line x1="1"  y1="23" x2="47" y2="23" stroke="rgba(180,150,0,0.4)" strokeWidth="1" />
          </svg>
        </div>

        {/* Row 3 : PAN */}
        <div
          className="bk-text-pan"
          style={{
            fontSize:      size === 'sm' ? 13 : 15,
            letterSpacing: '0.22em',
            color:         'rgba(255,255,255,0.95)',
            fontFamily:    '"Courier New", Courier, monospace',
          }}
          aria-label={`Numéro de carte ${maskedPan}`}
        >
          {maskedPan}
        </div>

        {/* Row 4 : titulaire + expiry + network */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            {cardHolder && (
              <div style={{
                fontSize: 9,
                color: 'rgba(255,255,255,0.55)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 2,
              }}>
                Titulaire
              </div>
            )}
            <div style={{
              fontSize: size === 'sm' ? 11 : 13,
              fontWeight: 'var(--bank-font-medium)',
              color: 'rgba(255,255,255,0.88)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              maxWidth: 150,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {cardHolder || ' '}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 4 }}>
                Exp
              </span>
              <span style={{ fontSize: size === 'sm' ? 11 : 13, color: 'rgba(255,255,255,0.88)', letterSpacing: '0.05em' }}>
                {expiry}
              </span>
            </div>
            <NetworkLogo network={network} />
          </div>
        </div>
      </div>
    </div>
  );
}
