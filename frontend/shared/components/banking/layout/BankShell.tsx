'use client';

import { createContext, useContext, useEffect, useState } from 'react';

/* ══════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════ */
export type BankRole  = 'client' | 'merchant';
export type BankTheme = 'dark' | 'light';

interface BankShellContextValue {
  role:         BankRole;
  theme:        BankTheme;
  toggleTheme:  () => void;
  sidebarOpen:  boolean;
  setSidebarOpen: (open: boolean) => void;
}

const BankShellContext = createContext<BankShellContextValue | null>(null);

export function useBankShell(): BankShellContextValue {
  const ctx = useContext(BankShellContext);
  if (!ctx) throw new Error('useBankShell must be used inside BankShell');
  return ctx;
}

/* ══════════════════════════════════════════════════════
   PROPS
   ══════════════════════════════════════════════════════ */
interface BankShellProps {
  role:          BankRole;
  defaultTheme?: BankTheme;
  sidebar?:      React.ReactNode;
  topbar?:       React.ReactNode;
  mobileNav?:    React.ReactNode;
  children:      React.ReactNode;
}

/* ══════════════════════════════════════════════════════
   COMPOSANT
   ══════════════════════════════════════════════════════ */
export function BankShell({
  role,
  defaultTheme = 'dark',
  sidebar,
  topbar,
  mobileNav,
  children,
}: BankShellProps) {
  const [theme, setTheme]             = useState<BankTheme>(defaultTheme);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted]         = useState(false);

  /* Lecture du thème persisté — côté client uniquement (évite hydration mismatch) */
  useEffect(() => {
    const stored = localStorage.getItem('bank-theme') as BankTheme | null;
    if (stored === 'dark' || stored === 'light') {
      setTheme(stored);
    }
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('bank-theme', next);
      return next;
    });
  };

  /*
   * Avant le mount côté client, on rend une coquille neutre sans couleurs thème
   * pour éviter un flash (FOUC). Le contenu réel arrive après.
   */
  if (!mounted) {
    return (
      <div
        data-bank-theme={defaultTheme}
        data-bank-role={role}
        className="bk-root"
        style={{ visibility: 'hidden' }}
        aria-hidden="true"
      />
    );
  }

  const hasSidebar = Boolean(sidebar);

  return (
    <BankShellContext.Provider
      value={{ role, theme, toggleTheme, sidebarOpen, setSidebarOpen }}
    >
      {/* Wrapper racine — porte les data-attributes qui activent les tokens CSS */}
      <div
        data-bank-theme={theme}
        data-bank-role={role}
        className="bk-root"
      >
        {/* Skip link — accessibilité clavier */}
        <a href="#bank-main" className="bk-skip-link">
          Aller au contenu principal
        </a>

        <div style={{ display: 'flex', minHeight: '100dvh' }}>

          {/* ── Sidebar (desktop) ── */}
          {hasSidebar && (
            <div
              className={`bk-sidebar${sidebarOpen ? '' : ' bk-sidebar--collapsed'}`}
              aria-hidden={sidebarOpen ? undefined : 'true'}
            >
              {sidebar}
            </div>
          )}

          {/* ── Colonne principale ── */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              marginLeft: hasSidebar
                ? (sidebarOpen ? 'var(--bank-sidebar-width)' : 'var(--bank-sidebar-width-collapsed)')
                : 0,
              transition: 'margin-left var(--bank-t-base) var(--bank-ease)',
            }}
          >
            {/* Topbar sticky */}
            {topbar && (
              <header className="bk-topbar" role="banner">
                {topbar}
              </header>
            )}

            {/* Contenu de la page avec animation d'entrée */}
            <main
              id="bank-main"
              style={{
                padding: 'var(--bank-space-8)',
                animation: 'bk-fade-up var(--bank-t-slow) var(--bank-ease-out) both',
              }}
              tabIndex={-1}
            >
              {children}
            </main>
          </div>
        </div>

        {/* ── Navigation mobile (bottom nav) ── */}
        {mobileNav && (
          <nav
            className="bk-mobile-nav"
            aria-label="Navigation mobile"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              height: 'var(--bank-mobile-nav-height)',
              background: 'var(--bank-bg-sidebar)',
              borderTop: '1px solid var(--bank-border-subtle)',
              zIndex: 'var(--bank-z-sticky)',
              display: 'flex',
            }}
          >
            {mobileNav}
          </nav>
        )}
      </div>
    </BankShellContext.Provider>
  );
}
