/* ══════════════════════════════════════════════════════
   BankAvatar — initiales ou photo
   ══════════════════════════════════════════════════════ */

export type BankAvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface BankAvatarProps {
  name:   string;    /* utilisé pour les initiales + aria-label */
  src?:   string;    /* URL photo optionnelle */
  size?:  BankAvatarSize;
}

const SIZE_PX: Record<BankAvatarSize, number> = {
  sm: 24,
  md: 32,
  lg: 40,
  xl: 56,
};

const FONT_SIZE: Record<BankAvatarSize, string> = {
  sm: '0.625rem',
  md: 'var(--bank-text-xs)',
  lg: 'var(--bank-text-sm)',
  xl: 'var(--bank-text-base)',
};

/* Génère une couleur stable depuis le nom (hue HSL) */
function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function getInitials(name: string): string {
  return name
    .split(/[\s_-]+/)
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function BankAvatar({ name, src, size = 'md' }: BankAvatarProps) {
  const px   = SIZE_PX[size];
  const hue  = nameToHue(name);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={px}
        height={px}
        style={{
          borderRadius: 'var(--bank-radius-full)',
          objectFit: 'cover',
          flexShrink: 0,
          display: 'block',
        }}
      />
    );
  }

  return (
    <div
      aria-label={name}
      role="img"
      style={{
        width: px,
        height: px,
        borderRadius: 'var(--bank-radius-full)',
        background: `hsl(${hue}, 60%, 20%)`,
        border: `1px solid hsl(${hue}, 50%, 30%)`,
        color: `hsl(${hue}, 80%, 75%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: FONT_SIZE[size],
        fontWeight: 'var(--bank-font-bold)',
        fontFamily: 'var(--bank-font-sans)',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {getInitials(name)}
    </div>
  );
}
