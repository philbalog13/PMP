'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, ExternalLink } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }>;
  external?: boolean;
  badge?: string | number;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

interface NotionSidebarProps {
  /** Logo/nom de l'app en haut de la sidebar */
  logo?: React.ReactNode;
  /** Sections de navigation groupées */
  sections: NavSection[];
  /** Infos utilisateur affichées en bas */
  user?: {
    name?: string;
    email?: string;
    role?: string;
    avatarLetter?: string;
  };
  /** Callback de déconnexion */
  onLogout?: () => void;
}

/**
 * NotionSidebar — Navigation minimaliste style Notion
 * Sections groupées, hover subtil, active state teinté accent
 */
export function NotionSidebar({ logo, sections, user, onLogout }: NotionSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string, external?: boolean) => {
    if (external) return false;
    // Exact match pour le dashboard, prefix match pour les sous-pages
    if (href === '/student' || href === '/instructor' || href === '/merchant') {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ fontFamily: 'var(--n-font-sans)' }}
    >
      {/* ── Logo / App name ─────────────────────────────── */}
      <div
        style={{
          height: 'var(--n-topbar-height)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 var(--n-space-4)',
          borderBottom: '1px solid var(--n-border)',
          flexShrink: 0,
        }}
      >
        {logo ?? (
          <span
            style={{
              fontSize: 'var(--n-text-sm)',
              fontWeight: 'var(--n-weight-semibold)',
              color: 'var(--n-text-primary)',
              letterSpacing: 'var(--n-tracking-tight)',
            }}
          >
            MoneTIC
          </span>
        )}
      </div>

      {/* ── Navigation ──────────────────────────────────── */}
      <nav
        className="flex-1 overflow-y-auto"
        style={{ padding: 'var(--n-space-3) var(--n-space-2)' }}
      >
        {sections.map((section, sIdx) => (
          <div
            key={sIdx}
            style={{ marginBottom: sIdx < sections.length - 1 ? 'var(--n-space-4)' : 0 }}
          >
            {/* Section header */}
            {section.title && (
              <div
                style={{
                  fontSize: 'var(--n-text-xs)',
                  fontWeight: 'var(--n-weight-semibold)',
                  letterSpacing: 'var(--n-tracking-widest)',
                  textTransform: 'uppercase',
                  color: 'var(--n-text-tertiary)',
                  padding: 'var(--n-space-1) var(--n-space-2)',
                  marginBottom: 'var(--n-space-1)',
                }}
              >
                {section.title}
              </div>
            )}

            {/* Separator between sections (except first) */}
            {sIdx > 0 && !section.title && (
              <hr
                style={{
                  border: 'none',
                  borderTop: '1px solid var(--n-divider)',
                  margin: 'var(--n-space-2) var(--n-space-2)',
                }}
              />
            )}

            {/* Nav items */}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {section.items.map((item) => {
                const active = isActive(item.href, item.external);
                const Icon = item.icon;

                const itemStyle: React.CSSProperties = {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--n-space-2)',
                  padding: '5px var(--n-space-2)',
                  borderRadius: 'var(--n-radius-sm)',
                  fontSize: 'var(--n-text-sm)',
                  fontWeight: active ? 'var(--n-weight-semibold)' : 'var(--n-weight-medium)',
                  color: active ? 'var(--n-accent)' : 'var(--n-text-secondary)',
                  background: active ? 'var(--n-accent-light)' : 'transparent',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: `background var(--n-duration-xs) var(--n-ease), color var(--n-duration-xs) var(--n-ease)`,
                  userSelect: 'none',
                };

                const content = (
                  <>
                    <Icon size={15} strokeWidth={1.75} style={{ flexShrink: 0, opacity: active ? 1 : 0.75 }} />
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </span>
                    {item.external && (
                      <ExternalLink
                        size={11}
                        strokeWidth={1.5}
                        style={{ flexShrink: 0, opacity: 0.4 }}
                      />
                    )}
                    {item.badge !== undefined && (
                      <span
                        style={{
                          fontSize: 'var(--n-text-xs)',
                          fontWeight: 'var(--n-weight-medium)',
                          background: active ? 'var(--n-accent)' : 'var(--n-bg-tertiary)',
                          color: active ? 'white' : 'var(--n-text-secondary)',
                          borderRadius: '999px',
                          padding: '0 6px',
                          lineHeight: '18px',
                          minWidth: '18px',
                          textAlign: 'center',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                );

                if (item.external) {
                  return (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={itemStyle}
                        onMouseEnter={e => {
                          if (!active) {
                            (e.currentTarget as HTMLAnchorElement).style.background = 'var(--n-bg-tertiary)';
                            (e.currentTarget as HTMLAnchorElement).style.color = 'var(--n-text-primary)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!active) {
                            (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                            (e.currentTarget as HTMLAnchorElement).style.color = 'var(--n-text-secondary)';
                          }
                        }}
                      >
                        {content}
                      </a>
                    </li>
                  );
                }

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      prefetch={false}
                      style={itemStyle}
                      onMouseEnter={e => {
                        if (!active) {
                          (e.currentTarget as HTMLAnchorElement).style.background = 'var(--n-bg-tertiary)';
                          (e.currentTarget as HTMLAnchorElement).style.color = 'var(--n-text-primary)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!active) {
                          (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                          (e.currentTarget as HTMLAnchorElement).style.color = 'var(--n-text-secondary)';
                        }
                      }}
                    >
                      {content}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── User footer ─────────────────────────────────── */}
      {user && (
        <div
          style={{
            borderTop: '1px solid var(--n-border)',
            padding: 'var(--n-space-3) var(--n-space-2)',
            flexShrink: 0,
          }}
        >
          {/* User info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--n-space-2)',
              padding: '5px var(--n-space-2)',
              borderRadius: 'var(--n-radius-sm)',
              marginBottom: '2px',
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'var(--n-accent-light)',
                border: '1px solid var(--n-accent-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--n-text-xs)',
                fontWeight: 'var(--n-weight-semibold)',
                color: 'var(--n-accent)',
                flexShrink: 0,
              }}
            >
              {user.avatarLetter ?? user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 'var(--n-text-sm)',
                  fontWeight: 'var(--n-weight-medium)',
                  color: 'var(--n-text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.name ?? user.email}
              </div>
              {user.role && (
                <div
                  style={{
                    fontSize: 'var(--n-text-xs)',
                    color: 'var(--n-text-tertiary)',
                    lineHeight: 1.3,
                  }}
                >
                  {user.role}
                </div>
              )}
            </div>
          </div>

          {/* Logout */}
          {onLogout && (
            <button
              onClick={onLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--n-space-2)',
                width: '100%',
                padding: '5px var(--n-space-2)',
                borderRadius: 'var(--n-radius-sm)',
                fontSize: 'var(--n-text-sm)',
                fontWeight: 'var(--n-weight-medium)',
                color: 'var(--n-danger)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: `background var(--n-duration-xs) var(--n-ease)`,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--n-danger-bg)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              <LogOut size={15} strokeWidth={1.75} style={{ flexShrink: 0 }} />
              <span>Déconnexion</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
