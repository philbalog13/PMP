'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth as useSharedAuth } from '@shared/context/AuthContext';
import { getRoleRedirectUrl, resolveSafeRedirectTarget } from '@shared/lib/app-urls';
import { UserRole } from '@shared/types/user';
import { normalizeRole as normalizeSharedRole } from '@shared/utils/roleUtils';

export type RoleTypeLegacy = 'client' | 'merchant' | 'student' | 'trainer';

export function normalizeRole(role: unknown): UserRole {
  return normalizeSharedRole(role) as UserRole;
}

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function useAuth(requireAuth: boolean = false) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useSharedAuth();

  const role = useMemo<UserRole | null>(() => {
    const normalized = normalizeSharedRole(user?.role);
    return normalized || null;
  }, [user?.role]);

  useEffect(() => {
    if (isLoading) return;

    if (requireAuth && !isAuthenticated) {
      const currentPath = typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : (pathname || '/');
      router.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (!requireAuth && isAuthenticated && pathname === '/login' && role) {
      const requestedRedirect = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('redirect')
        : null;

      const redirectUrl = resolveSafeRedirectTarget(
        requestedRedirect,
        role,
        typeof window !== 'undefined' ? window.location.origin : undefined
      ) || getRoleRedirectUrl(role);

      if (typeof window !== 'undefined' && isExternalUrl(redirectUrl)) {
        window.location.replace(redirectUrl);
        return;
      }

      router.replace(redirectUrl);
    }
  }, [isAuthenticated, isLoading, pathname, requireAuth, role, router]);

  return {
    user,
    role,
    isLoading,
    isAuthenticated,
    logout,
  };
}
