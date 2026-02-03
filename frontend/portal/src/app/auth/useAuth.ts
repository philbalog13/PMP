'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { UserRole } from '@shared/types/user';

export type RoleTypeLegacy = 'client' | 'merchant' | 'student' | 'trainer';

/**
 * Robustly normalize role strings to UserRole enum values
 */
export function normalizeRole(role: any): UserRole {
    if (!role) return role as UserRole;
    const r = String(role).toUpperCase();
    if (r === 'STUDENT' || r === 'ETUDIANT' || r === 'ROLE_ETUDIANT') return UserRole.ETUDIANT;
    if (r === 'TRAINER' || r === 'FORMATEUR' || r === 'ROLE_FORMATEUR') return UserRole.FORMATEUR;
    if (r === 'CLIENT' || r === 'ROLE_CLIENT') return UserRole.CLIENT;
    if (r === 'MERCHANT' || r === 'MARCHAND' || r === 'ROLE_MARCHAND') return UserRole.MARCHAND;
    return role as UserRole;
}

export function useAuth(requireAuth: boolean = false) {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        // Small delay to ensure localStorage is available after navigation
        const checkAuth = () => {
            try {
                const token = localStorage.getItem('token');
                const storedUser = localStorage.getItem('user');
                const storedRoleStr = localStorage.getItem('role');
                const storedRole = storedRoleStr ? normalizeRole(storedRoleStr) : null;

                // Sync normalized role back to localStorage
                if (storedRoleStr && storedRole && storedRole !== storedRoleStr) {
                    localStorage.setItem('role', storedRole);
                }

                // Sync cookie if missing (Critical for middleware)
                if (token && !document.cookie.includes('token=')) {
                    console.log('[useAuth] Restoring missing session cookie from localStorage');
                    document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
                }

                console.log('[useAuth] Checking auth:', {
                    hasToken: !!token,
                    hasUser: !!storedUser,
                    storedRole,
                    requireAuth,
                    pathname: window.location.pathname
                });

                if (token && storedUser && storedRole) {
                    // Validate token format (should have 3 parts)
                    const tokenParts = token.split('.');
                    if (tokenParts.length !== 3) {
                        console.error('[useAuth] Invalid token format, clearing storage');
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        localStorage.removeItem('role');
                        if (requireAuth) {
                            router.replace('/login');
                        }
                        setIsLoading(false);
                        return;
                    }

                    setUser(JSON.parse(storedUser));
                    setRole(storedRole);
                    setIsAuthenticated(true);

                    // If we are on login page and already have a valid session, redirect
                    if (!requireAuth && window.location.pathname === '/login') {
                        const redirectUrl = getRedirectUrl(storedRole);
                        console.log('[useAuth] Already logged in, redirecting to:', redirectUrl);
                        router.replace(redirectUrl);
                    }
                } else if (requireAuth) {
                    // If we require auth but have no session, redirect to login
                    console.log('[useAuth] No valid session, redirecting to login');
                    const currentPath = window.location.pathname;
                    router.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
                }

                setIsLoading(false);
            } catch (error) {
                console.error('[useAuth] Error checking auth:', error);
                setIsLoading(false);
            }
        };

        // Run immediately
        checkAuth();
    }, [requireAuth, router]);

    return { user, role, isLoading, isAuthenticated };
}

function getRedirectUrl(role: UserRole): string {
    const normalized = normalizeRole(role);
    switch (normalized) {
        case UserRole.CLIENT: return 'http://localhost:3004';
        case UserRole.MARCHAND: return 'http://localhost:3001';
        case UserRole.ETUDIANT: return '/etudiant/dashboard';
        case UserRole.FORMATEUR: return '/formateur/dashboard';
        default: return '/';
    }
}
