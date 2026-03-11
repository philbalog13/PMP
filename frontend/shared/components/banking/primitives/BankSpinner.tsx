/* ══════════════════════════════════════════════════════
   BankSpinner — inline et overlay
   ══════════════════════════════════════════════════════ */

interface BankSpinnerInlineProps {
  size?:  number;
  label?: string;  /* aria-label */
}

interface BankSpinnerOverlayProps {
  label?: string;
}

/* Spinner inline (dans un bouton, une section) */
export function BankSpinner({ size = 20, label = 'Chargement…' }: BankSpinnerInlineProps) {
  return (
    <span
      role="status"
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{
          animation: 'spin 0.7s linear infinite',
          color: 'var(--bank-accent)',
        }}
      >
        <circle
          cx="12" cy="12" r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeOpacity="0.25"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/* Spinner overlay pleine zone */
export function BankSpinnerOverlay({ label = 'Chargement…' }: BankSpinnerOverlayProps) {
  return (
    <div
      role="status"
      aria-label={label}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bank-bg-overlay)',
        borderRadius: 'inherit',
        zIndex: 'var(--bank-z-overlay)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
      }}
    >
      <BankSpinner size={32} label={label} />
    </div>
  );
}
