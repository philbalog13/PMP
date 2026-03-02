/* ══════════════════════════════════════════════════════
   BankDivider — séparateur horizontal avec label optionnel
   ══════════════════════════════════════════════════════ */
interface BankDividerProps {
  label?:  string;
  strong?: boolean;
}

export function BankDivider({ label, strong = false }: BankDividerProps) {
  if (!label) {
    return <hr className={`bk-divider${strong ? ' bk-divider--strong' : ''}`} aria-hidden="true" />;
  }

  return (
    <div
      role="separator"
      aria-label={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--bank-space-3)',
        margin: 'var(--bank-space-4) 0',
      }}
    >
      <div
        style={{
          flex: 1,
          height: 1,
          background: strong
            ? 'var(--bank-border-default)'
            : 'var(--bank-border-subtle)',
        }}
        aria-hidden="true"
      />
      <span className="bk-caption" aria-hidden="true">
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 1,
          background: strong
            ? 'var(--bank-border-default)'
            : 'var(--bank-border-subtle)',
        }}
        aria-hidden="true"
      />
    </div>
  );
}
