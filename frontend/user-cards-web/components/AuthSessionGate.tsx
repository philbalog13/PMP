'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@shared/context/AuthContext';
import { APP_URLS } from '@shared/lib/app-urls';

interface AuthSessionGateProps {
  children: ReactNode;
}

const PUBLIC_PREFIXES = ['/3ds', '/learn'];

const isPublicPath = (pathname: string): boolean =>
  PUBLIC_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));

export function AuthSessionGate({ children }: AuthSessionGateProps) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  const requiresAuth = useMemo(() => !isPublicPath(pathname || '/'), [pathname]);

  useEffect(() => {
    if (!requiresAuth || isLoading || isAuthenticated) return;
    window.location.replace(`${APP_URLS.portal}/login`);
  }, [isAuthenticated, isLoading, requiresAuth]);

  if (requiresAuth && (isLoading || !isAuthenticated)) {
    return null;
  }

  return <>{children}</>;
}
