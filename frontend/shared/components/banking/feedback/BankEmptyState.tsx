/* ══════════════════════════════════════════════════════
   BankEmptyState — état vide contextualisé
   ══════════════════════════════════════════════════════ */

interface BankEmptyStateProps {
  icon?:        React.ReactNode;
  title:        string;
  description?: string;
  action?:      React.ReactNode;   /* BankButton de CTA */
}

export function BankEmptyState({ icon, title, description, action }: BankEmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'var(--bank-space-16) var(--bank-space-8)',
        gap: 'var(--bank-space-4)',
      }}
      role="region"
      aria-label={title}
    >
      {icon && (
        <div
          aria-hidden="true"
          style={{
            width: 56,
            height: 56,
            borderRadius: 'var(--bank-radius-xl)',
            background: 'var(--bank-bg-elevated)',
            border: '1px solid var(--bank-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--bank-text-tertiary)',
            marginBottom: 'var(--bank-space-2)',
          }}
        >
          {icon}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-2)' }}>
        <h3
          style={{
            fontSize: 'var(--bank-text-base)',
            fontWeight: 'var(--bank-font-semibold)',
            color: 'var(--bank-text-primary)',
            margin: 0,
          }}
        >
          {title}
        </h3>
        {description && (
          <p
            className="bk-body-sm"
            style={{ margin: 0, maxWidth: 320 }}
          >
            {description}
          </p>
        )}
      </div>

      {action && (
        <div style={{ marginTop: 'var(--bank-space-2)' }}>
          {action}
        </div>
      )}
    </div>
  );
}
