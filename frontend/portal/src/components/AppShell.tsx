'use client';

import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import React from 'react';
import { AuthProvider } from '@shared/context/AuthContext';

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

const LEARNING_ROUTES = ['/student', '/instructor', '/etudiant', '/formateur'];
const APP_ROUTES = ['/student', '/instructor', '/merchant', '/client', '/admin', '/etudiant', '/formateur'];
const AUTH_ROUTES = ['/login', '/register', '/auth'];

const PublicNavbar = dynamic(() => import('./Navbar').then((module) => module.Navbar), { ssr: false });
const PublicFooter = dynamic(() => import('./Footer').then((module) => module.Footer), { ssr: false });

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isLearningRoute = LEARNING_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
  const isAppRoute = APP_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
  const isAuthRoute = AUTH_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));

  // Learning routes still require auth/session coherence with the rest of the app.
  if (isLearningRoute) {
    return <AuthProvider>{children}</AuthProvider>;
  }

  // Other app routes keep their own shell and still need shared auth context.
  if (isAppRoute) {
    return <AuthProvider>{children}</AuthProvider>;
  }

  // Auth routes: standalone but still use auth context.
  if (isAuthRoute) {
    return <AuthProvider>{children}</AuthProvider>;
  }

  // Public routes: with navbar/footer under shared auth context.
  return (
    <AuthProvider>
      <PublicNavbar />
      <main className="pt-20">
        {children}
      </main>
      <PublicFooter />
    </AuthProvider>
  );
}
