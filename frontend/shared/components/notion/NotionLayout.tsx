'use client';

import React, { useState, useEffect } from 'react';

interface NotionLayoutProps {
  sidebar: React.ReactNode;
  topbar?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * NotionLayout — Shell global pour les pages applicatives (student, instructor, merchant)
 * Structure : Sidebar fixe 240px + zone principale (topbar sticky + content scrollable)
 */
export function NotionLayout({ sidebar, topbar, children }: NotionLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hydration-safe — lire la préférence localStorage côté client uniquement
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('notion-sidebar-collapsed');
    if (saved === 'true') setSidebarCollapsed(true);
  }, []);

  const handleToggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('notion-sidebar-collapsed', String(next));
      return next;
    });
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: 'var(--n-bg-primary)', color: 'var(--n-text-primary)' }}
    >
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside
        style={{
          width: sidebarCollapsed ? '0px' : 'var(--n-sidebar-width)',
          minWidth: sidebarCollapsed ? '0px' : 'var(--n-sidebar-width)',
          borderRight: sidebarCollapsed ? 'none' : '1px solid var(--n-border)',
          background: 'var(--n-bg-secondary)',
          transition: 'width 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94), min-width 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          overflow: 'hidden',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 40,
        }}
      >
        <div style={{ width: 'var(--n-sidebar-width)', display: 'flex', flexDirection: 'column', height: '100%' }}>
          {sidebar}
        </div>
      </aside>

      {/* ── Zone principale ──────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Topbar sticky */}
        {topbar && (
          <header
            style={{
              height: 'var(--n-topbar-height)',
              borderBottom: '1px solid var(--n-border)',
              background: 'var(--n-bg-primary)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 'var(--n-space-4)',
              paddingRight: 'var(--n-space-4)',
              gap: 'var(--n-space-3)',
              position: 'sticky',
              top: 0,
              zIndex: 30,
            }}
          >
            {/* Toggle sidebar button */}
            <button
              onClick={handleToggleSidebar}
              title={sidebarCollapsed ? 'Ouvrir la sidebar' : 'Fermer la sidebar'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: 'var(--n-radius-sm)',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--n-text-tertiary)',
                flexShrink: 0,
                transition: 'background var(--n-duration-xs) var(--n-ease), color var(--n-duration-xs) var(--n-ease)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--n-bg-tertiary)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--n-text-primary)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--n-text-tertiary)';
              }}
            >
              {/* Hamburger icon inline SVG */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="2" y="4" width="12" height="1.5" rx="0.75" />
                <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" />
                <rect x="2" y="10.5" width="12" height="1.5" rx="0.75" />
              </svg>
            </button>

            {/* Contenu du topbar (breadcrumb, actions, etc.) */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
              {topbar}
            </div>
          </header>
        )}

        {/* Content scrollable */}
        <main
          className="flex-1 overflow-y-auto"
          style={{ background: 'var(--n-bg-primary)' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
