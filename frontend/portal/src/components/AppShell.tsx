'use client';

import { usePathname } from 'next/navigation';
import React from 'react';

/**
 * AppShell — Wrapper conditionnel Navbar/Footer
 *
 * Stratégie de migration progressive :
 * - Routes applicatives (/student/*, /instructor/*, /merchant/*, /client/*)
 *   → PAS de Navbar/Footer publique (le NotionLayout gère sa propre nav)
 * - Routes publiques (/, /about, /documentation, etc.)
 *   → Navbar + <main pt-20> + Footer
 * - Routes auth (/login, /register, /auth/*)
 *   → Ni Navbar, ni Footer
 */

const APP_ROUTES = ['/student', '/instructor', '/merchant', '/client', '/admin', '/etudiant', '/formateur'];
const AUTH_ROUTES = ['/login', '/register', '/auth'];

interface AppShellProps {
  navbar: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ navbar, footer, children }: AppShellProps) {
  const pathname = usePathname();

  const isAppRoute = APP_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
  const isAuthRoute = AUTH_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));

  // Routes applicatives : NotionLayout dans student/layout.tsx prend le relais
  if (isAppRoute) {
    return <>{children}</>;
  }

  // Routes auth : page standalone, sans chrome
  if (isAuthRoute) {
    return <>{children}</>;
  }

  // Routes publiques : Navbar + pt-20 + Footer
  return (
    <>
      {navbar}
      <main className="pt-20">
        {children}
      </main>
      {footer}
    </>
  );
}
