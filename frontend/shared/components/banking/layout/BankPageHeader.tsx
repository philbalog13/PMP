/* ══════════════════════════════════════════════════════
   BankPageHeader — En-tête de page standard
   Titre H1 + subtitle optionnel + actions à droite
   ══════════════════════════════════════════════════════ */

interface BankPageHeaderProps {
  title:      string;
  subtitle?:  string;
  actions?:   React.ReactNode;
  back?:      React.ReactNode;   /* lien retour optionnel */
  className?: string;
  style?:     React.CSSProperties;
}

export function BankPageHeader({ title, subtitle, actions, back, className, style }: BankPageHeaderProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 'var(--bank-space-4)',
        marginBottom: 'var(--bank-space-8)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-1)' }}>
        {back && (
          <div style={{ marginBottom: 'var(--bank-space-2)' }}>
            {back}
          </div>
        )}
        <h1
          style={{
            fontSize: 'var(--bank-text-2xl)',
            fontWeight: 'var(--bank-font-bold)',
            letterSpacing: 'var(--bank-tracking-tight)',
            color: 'var(--bank-text-primary)',
            lineHeight: 'var(--bank-leading-tight)',
            margin: 0,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="bk-body-sm"
            style={{ margin: 0 }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--bank-space-3)',
            flexShrink: 0,
            marginTop: 'var(--bank-space-1)',
          }}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
