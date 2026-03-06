'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, type LucideIcon } from 'lucide-react';
import { useBankShell } from './BankShell';

/* ══════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════ */
export interface BankNavItem {
  href:    string;
  label:   string;
  icon:    LucideIcon;
  badge?:  string | number;   /* ex: nb de notifications */
  exact?:  boolean;           /* match exact sur href (défaut: startsWith) */
}

interface BankSidebarProps {
  logo:         React.ReactNode;   /* Logo ou nom de l'app */
  items:        BankNavItem[];
  bottomItems?: BankNavItem[];     /* Items en bas de sidebar (optionnel) */
  user?:        { name: string; email: string; avatarInitials?: string };
  onLogout?:    () => void;
}

/* ══════════════════════════════════════════════════════
   SOUS-COMPOSANT — NavItem
   ══════════════════════════════════════════════════════ */
function NavItem({ item }: { item: BankNavItem }) {
  const pathname = usePathname();
  const isActive = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + '/');

  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      prefetch={false}
      className={`bk-nav-item${isActive ? ' bk-nav-item--active' : ''}`}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon
        className="bk-nav-icon"
        size={18}
        aria-hidden="true"
        strokeWidth={isActive ? 2.2 : 1.8}
      />
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge !== undefined && item.badge !== '' && (
        <span
          className="bk-badge bk-badge--accent"
          aria-label={`${item.badge} notifications`}
          style={{ fontSize: '0.65rem', padding: '2px 6px' }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

/* ══════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ══════════════════════════════════════════════════════ */
export function BankSidebar({
  logo,
  items,
  bottomItems,
  user,
  onLogout,
}: BankSidebarProps) {
  const { sidebarOpen } = useBankShell();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflowX: 'hidden',
        overflowY: 'auto',
      }}
    >
      {/* ── Logo ── */}
      <div
        style={{
          padding: 'var(--bank-space-6) var(--bank-space-4)',
          borderBottom: '1px solid var(--bank-border-subtle)',
          flexShrink: 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        {logo}
      </div>

      {/* ── Navigation principale ── */}
      <nav
        aria-label="Navigation principale"
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: 'var(--bank-space-3) var(--bank-space-2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--bank-space-1)',
        }}
      >
        {items.map(item => (
          <NavItem key={item.href} item={item} />
        ))}
      </nav>

      {/* ── Items secondaires (bas de sidebar) ── */}
      {bottomItems && bottomItems.length > 0 && (
        <div
          style={{
            padding: 'var(--bank-space-2)',
            borderTop: '1px solid var(--bank-border-subtle)',
          }}
        >
          {bottomItems.map(item => (
            <NavItem key={item.href} item={item} />
          ))}
        </div>
      )}

      {/* ── Utilisateur + Déconnexion ── */}
      {(user || onLogout) && (
        <div
          style={{
            padding: 'var(--bank-space-3) var(--bank-space-2)',
            borderTop: '1px solid var(--bank-border-subtle)',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--bank-space-1)',
          }}
        >
          {/* Infos utilisateur */}
          {user && sidebarOpen && (
            <div
              style={{
                padding: 'var(--bank-space-2) var(--bank-space-3)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--bank-space-3)',
                overflow: 'hidden',
              }}
            >
              {/* Avatar initiales */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--bank-radius-full)',
                  background: 'var(--bank-accent-dim)',
                  color: 'var(--bank-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--bank-text-xs)',
                  fontWeight: 'var(--bank-font-bold)',
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                {user.avatarInitials ??
                  user.name
                    .split(' ')
                    .map(w => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 'var(--bank-text-sm)',
                    fontWeight: 'var(--bank-font-semibold)',
                    color: 'var(--bank-text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.name}
                </div>
                <div
                  className="bk-caption"
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.email}
                </div>
              </div>
            </div>
          )}

          {/* Bouton déconnexion */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="bk-nav-item"
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
              aria-label="Se déconnecter"
            >
              <LogOut
                className="bk-nav-icon"
                size={18}
                aria-hidden="true"
                strokeWidth={1.8}
              />
              {sidebarOpen && (
                <span style={{ color: 'var(--bank-danger-text)', fontSize: 'var(--bank-text-sm)' }}>
                  Déconnexion
                </span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
