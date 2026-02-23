'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth as useSharedAuth } from '@shared/context/AuthContext';
import { getRoleRedirectUrl, resolveSafeRedirectTarget } from '@shared/lib/app-urls';
import { UserRole } from '@shared/types/user';
import { normalizeRole as normalizeSharedRole } from '@shared/utils/roleUtils';

export type RoleTypeLegacy = 'client' | 'merchant' | 'student' | 'trainer';

/**
 * Backward-compatible export used by older portal modules.
 */
export function normalizeRole(role: unknown): UserRole {
    return normalizeSharedRole(role) as UserRole;
}

function isExternalUrl(url: string): boolean {
    return /^https?:\/\//i.test(url);
}

export function useAuth(requireAuth: boolean = false) {
    const router = useRouter();
    const pathname = usePathname();
    const auth = useSharedAuth();

    const role = useMemo<UserRole | null>(() => {
        const normalized = normalizeSharedRole(auth.user?.role);
        return normalized || null;
    }, [auth.user?.role]);

    useEffect(() => {
        if (auth.isLoading) {
            return;
        }

        if (requireAuth && !auth.isAuthenticated) {
            // Before redirecting, check if a raw token exists in localStorage.
            // This handles the race condition where auth.login() has already
            // persisted the token in storage but the React context state hasn't
            // propagated to this component yet (e.g., during the page transition
            // immediately after login). The context will update shortly after.
            if (typeof window !== 'undefined' && localStorage.getItem('token')) {
                return;
            }
            const currentPath = typeof window !== 'undefined'
                ? `${window.location.pathname}${window.location.search}`
                : (pathname || '/');
            router.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
            return;
        }

        if (!requireAuth && auth.isAuthenticated && pathname === '/login' && role) {
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
    }, [auth.isAuthenticated, auth.isLoading, pathname, requireAuth, role, router]);

    return {
        user: auth.user,
        role,
        isLoading: auth.isLoading,
        isAuthenticated: auth.isAuthenticated,
        logout: auth.logout,
    };
}
