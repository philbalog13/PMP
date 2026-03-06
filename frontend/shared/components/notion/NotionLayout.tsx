'use client';

import React, { useEffect, useState } from 'react';

interface NotionLayoutProps {
  sidebar: React.ReactNode;
  topbar?: React.ReactNode;
  children: React.ReactNode;
}

export function NotionLayout({ sidebar, topbar, children }: NotionLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedSidebar = localStorage.getItem('notion-sidebar-collapsed');
    if (savedSidebar === 'true') setSidebarCollapsed(true);

    const savedTheme = localStorage.getItem('learning-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
    }
  }, []);

  const toggleSidebar = () => {
    const isMobileViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 1024px)').matches;
    if (isMobileViewport) {
      setMobileSidebarOpen((prev) => !prev);
      return;
    }

    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('notion-sidebar-collapsed', String(next));
      return next;
    });
  };

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('learning-theme', next);
      return next;
    });
  };

  return (
    <div
      className="n-surface-premium"
      data-learning-theme={theme}
      style={{
        color: 'var(--n-text-primary)',
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <aside
        className="n-layout-sidebar"
        style={{
          background: 'var(--n-bg-secondary)',
          borderRight: '1px solid var(--n-border)',
          display: 'flex',
          flexDirection: 'column',
          minWidth: sidebarCollapsed ? '0px' : 'var(--n-sidebar-width)',
          overflow: 'hidden',
          transition: 'width var(--n-duration-lg) var(--n-ease), min-width var(--n-duration-lg) var(--n-ease)',
          width: sidebarCollapsed ? '0px' : 'var(--n-sidebar-width)',
          zIndex: 40,
        }}
      >
        <div style={{ width: 'var(--n-sidebar-width)', height: '100%' }}>{sidebar}</div>
      </aside>

      {mobileSidebarOpen && (
        <>
          <div
            className="n-layout-mobile-backdrop"
            onClick={() => setMobileSidebarOpen(false)}
            style={{
              background: 'rgba(4, 9, 22, 0.62)',
              inset: 0,
              position: 'fixed',
              zIndex: 90,
            }}
          />
          <aside
            className="n-layout-mobile-sidebar"
            style={{
              background: 'var(--n-bg-secondary)',
              borderRight: '1px solid var(--n-border)',
              height: '100vh',
              inset: '0 auto 0 0',
              position: 'fixed',
              width: 'min(86vw, 320px)',
              zIndex: 95,
            }}
          >
            {sidebar}
          </aside>
        </>
      )}

      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {topbar && (
          <header
            style={{
              alignItems: 'center',
              backdropFilter: 'blur(8px)',
              background: 'color-mix(in oklab, var(--n-bg-primary) 92%, transparent)',
              borderBottom: '1px solid var(--n-border)',
              display: 'flex',
              flexShrink: 0,
              gap: 'var(--n-space-3)',
              height: 'var(--n-topbar-height)',
              paddingInline: 'var(--n-space-4)',
              position: 'sticky',
              top: 0,
              zIndex: 80,
            }}
          >
            <button
              onClick={toggleSidebar}
              aria-label={mobileSidebarOpen ? 'Close sidebar' : 'Toggle sidebar'}
              title={mobileSidebarOpen ? 'Close sidebar' : 'Toggle sidebar'}
              style={{
                alignItems: 'center',
                background: 'transparent',
                border: '1px solid var(--n-border)',
                borderRadius: 'var(--n-radius-sm)',
                color: 'var(--n-text-secondary)',
                cursor: 'pointer',
                display: 'inline-flex',
                flexShrink: 0,
                height: '32px',
                justifyContent: 'center',
                width: '32px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <rect x="2" y="4" width="12" height="1.5" rx="0.75" />
                <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" />
                <rect x="2" y="10.5" width="12" height="1.5" rx="0.75" />
              </svg>
            </button>

            <div style={{ alignItems: 'center', display: 'flex', flex: 1, gap: 'var(--n-space-2)', minWidth: 0 }}>
              {topbar}
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              style={{
                alignItems: 'center',
                background: 'var(--n-bg-elevated)',
                border: '1px solid var(--n-border)',
                borderRadius: 'var(--n-radius-sm)',
                color: 'var(--n-text-secondary)',
                cursor: 'pointer',
                display: 'inline-flex',
                flexShrink: 0,
                fontSize: 'var(--n-text-xs)',
                fontWeight: 'var(--n-weight-semibold)',
                gap: '6px',
                padding: '7px 10px',
              }}
            >
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </header>
        )}

        <main style={{ background: 'transparent', flex: 1, overflowY: 'auto', position: 'relative' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
