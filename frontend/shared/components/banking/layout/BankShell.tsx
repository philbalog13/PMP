'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type BankRole = 'client' | 'merchant';
export type BankTheme = 'dark' | 'light';

interface BankShellContextValue {
  role: BankRole;
  theme: BankTheme;
  toggleTheme: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const BankShellContext = createContext<BankShellContextValue | null>(null);

export function useBankShell(): BankShellContextValue {
  const ctx = useContext(BankShellContext);
  if (!ctx) throw new Error('useBankShell must be used inside BankShell');
  return ctx;
}

interface BankShellProps {
  role: BankRole;
  defaultTheme?: BankTheme;
  sidebar?: React.ReactNode;
  topbar?: React.ReactNode;
  mobileNav?: React.ReactNode;
  children: React.ReactNode;
}

export function BankShell({
  role,
  defaultTheme = 'dark',
  sidebar,
  topbar,
  mobileNav,
  children,
}: BankShellProps) {
  const [theme, setTheme] = useState<BankTheme>(defaultTheme);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Apply persisted user preference after initial render without blocking paint.
  useEffect(() => {
    const stored = localStorage.getItem('bank-theme') as BankTheme | null;
    if (stored === 'dark' || stored === 'light') {
      setTheme(stored);
    }
  }, []);

  const toggleTheme = () => {
    setTheme((previous) => {
      const next = previous === 'dark' ? 'light' : 'dark';
      localStorage.setItem('bank-theme', next);
      return next;
    });
  };

  const hasSidebar = Boolean(sidebar);

  return (
    <BankShellContext.Provider value={{ role, theme, toggleTheme, sidebarOpen, setSidebarOpen }}>
      <div data-bank-theme={theme} data-bank-role={role} className="bk-root">
        <a href="#bank-main" className="bk-skip-link">
          Aller au contenu principal
        </a>

        <div style={{ display: 'flex', minHeight: '100dvh' }}>
          {hasSidebar && (
            <div className={`bk-sidebar${sidebarOpen ? '' : ' bk-sidebar--collapsed'}`} aria-hidden={sidebarOpen ? undefined : 'true'}>
              {sidebar}
            </div>
          )}

          <div
            style={{
              flex: 1,
              minWidth: 0,
              marginLeft: hasSidebar
                ? sidebarOpen
                  ? 'var(--bank-sidebar-width)'
                  : 'var(--bank-sidebar-width-collapsed)'
                : 0,
              transition: 'margin-left var(--bank-t-base) var(--bank-ease)',
            }}
          >
            {topbar && (
              <header className="bk-topbar" role="banner">
                {topbar}
              </header>
            )}

            <main
              id="bank-main"
              style={{
                padding: 'var(--bank-space-8)',
              }}
              tabIndex={-1}
            >
              {children}
            </main>
          </div>
        </div>

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
            }}
          >
            {mobileNav}
          </nav>
        )}
      </div>
    </BankShellContext.Provider>
  );
}
