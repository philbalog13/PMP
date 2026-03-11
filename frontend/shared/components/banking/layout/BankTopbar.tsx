'use client';

import { Moon, Sun, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useBankShell } from './BankShell';

/* ══════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════ */
interface BankTopbarProps {
  title?:     string;
  subtitle?:  string;
  actions?:   React.ReactNode;   /* boutons à droite */
  breadcrumb?: React.ReactNode;  /* breadcrumb custom */
}

/* ══════════════════════════════════════════════════════
   COMPOSANT
   ══════════════════════════════════════════════════════ */
export function BankTopbar({ title, subtitle, actions, breadcrumb }: BankTopbarProps) {
  const { theme, toggleTheme, sidebarOpen, setSidebarOpen } = useBankShell();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--bank-space-4)',
        width: '100%',
      }}
    >
      {/* ── Toggle sidebar (desktop) ── */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="bk-btn bk-btn--ghost bk-btn--icon"
        aria-label={sidebarOpen ? 'Réduire la navigation' : 'Ouvrir la navigation'}
        title={sidebarOpen ? 'Réduire' : 'Ouvrir'}
        style={{ flexShrink: 0 }}
      >
        {sidebarOpen
          ? <PanelLeftClose size={18} aria-hidden="true" />
          : <PanelLeftOpen  size={18} aria-hidden="true" />
        }
      </button>

      {/* ── Titre ou breadcrumb ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {breadcrumb ?? (
          title && (
            <div>
              <span
                style={{
                  fontSize: 'var(--bank-text-base)',
                  fontWeight: 'var(--bank-font-semibold)',
                  color: 'var(--bank-text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}
              >
                {title}
              </span>
              {subtitle && (
                <span className="bk-caption" style={{ display: 'block' }}>
                  {subtitle}
                </span>
              )}
            </div>
          )
        )}
      </div>

      {/* ── Actions custom ── */}
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bank-space-2)' }}>
          {actions}
        </div>
      )}

      {/* ── Theme toggle ── */}
      <button
        onClick={toggleTheme}
        className="bk-btn bk-btn--ghost bk-btn--icon"
        aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
        title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
        style={{ flexShrink: 0 }}
      >
        {theme === 'dark'
          ? <Sun  size={18} aria-hidden="true" />
          : <Moon size={18} aria-hidden="true" />
        }
      </button>
    </div>
  );
}
