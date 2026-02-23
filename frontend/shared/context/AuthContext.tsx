'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthState, UserRole, Permission } from '../types/user';
import { normalizeRole } from '../utils/roleUtils';

interface AuthContextType extends AuthState {
    login: (token: string, user: User, refreshToken?: string | null) => void;
    logout: () => void;
    updateUser: (user: User) => void;
    hasPermission: (permission: Permission) => boolean;
    hasRole: (role: UserRole) => boolean;
    isTokenValid: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const ACCESS_TOKEN_COOKIE = 'token';
const REFRESH_TOKEN_COOKIE = 'refreshToken';
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 2;   // 2h — aligned with backend JWT_EXPIRES_IN
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * AuthProvider Component
 * Manages authentication state across all frontend applications
 * Replaces localStorage-based auth with centralized React Context
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true,
    });

    /**
     * Decode JWT token to extract payload
     */
    const decodeToken = (token: string): any => {
        try {
            if (!token || typeof token !== 'string') {
                return null;
            }
            const parts = token.split('.');
            if (parts.length !== 3) {
                console.error('Invalid JWT format: expected 3 parts');
                return null;
            }
            const base64Url = parts[1];
            if (!base64Url) {
                return null;
            }
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Failed to decode token:', error);
            return null;
        }
    };

    const normalizeUserRole = (userRole: UserRole | string | null | undefined): UserRole | null => {
        const normalized = normalizeRole(userRole);
        return normalized || null;
    };

    const parseStoredUser = (rawUser: string | null): User | null => {
        if (!rawUser) return null;
        try {
            const parsed = JSON.parse(rawUser) as User;
            const normalized = normalizeUserRole(parsed?.role);
            if (!normalized) {
                return null;
            }

            return {
                ...parsed,
                role: normalized,
                permissions: Array.isArray(parsed.permissions) ? parsed.permissions : []
            };
        } catch {
            return null;
        }
    };

    const buildUserFromPayload = (payload: any, existingUser: User | null): User | null => {
        const normalizedRole = normalizeUserRole(payload?.role || existingUser?.role);
        if (!normalizedRole) {
            return existingUser;
        }

        return {
            id: payload?.userId || payload?.sub || payload?.id || existingUser?.id || '',
            email: payload?.email || existingUser?.email || '',
            role: normalizedRole,
            permissions: Array.isArray(payload?.permissions)
                ? payload.permissions
                : (existingUser?.permissions || []),
            firstName: existingUser?.firstName || payload?.firstName || 'User',
            lastName: existingUser?.lastName || payload?.lastName || ''
        };
    };

    /**
     * Check if token is expired
     */
    const isTokenExpired = (token: string): boolean => {
        const payload = decodeToken(token);
        if (!payload || !payload.exp) return true;

        const expirationTime = payload.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();

        return currentTime > expirationTime;
    };

    /**
     * Validate token and check expiration
     */
    const isTokenValid = useCallback((): boolean => {
        if (!authState.token) return false;
        return !isTokenExpired(authState.token);
    }, [authState.token]);

    /**
     * Helper to get cookie by name
     */
    const getCookie = (name: string): string | null => {
        if (typeof document === 'undefined') return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
        return null;
    };

    const setCookie = (name: string, value: string, maxAgeSeconds: number): void => {
        if (typeof document === 'undefined') return;
        const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secureFlag}`;
    };

    const clearCookie = (name: string): void => {
        if (typeof document === 'undefined') return;
        const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${secureFlag}`;
    };

    const persistSession = (token: string, user: User, refreshToken?: string | null): void => {
        const normalizedRole = normalizeUserRole(user.role);
        const normalizedUser: User = {
            ...user,
            role: normalizedRole || user.role,
            permissions: Array.isArray(user.permissions) ? user.permissions : []
        };

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(normalizedUser));
        if (normalizedUser.role) {
            localStorage.setItem('role', normalizedUser.role);
        }
        setCookie(ACCESS_TOKEN_COOKIE, token, ACCESS_TOKEN_TTL_SECONDS);

        if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken);
            setCookie(REFRESH_TOKEN_COOKIE, refreshToken, REFRESH_TOKEN_TTL_SECONDS);
        }
    };

    const clearSessionStorage = (): void => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        localStorage.removeItem('refreshToken');
        clearCookie(ACCESS_TOKEN_COOKIE);
        clearCookie(REFRESH_TOKEN_COOKIE);
    };

    const refreshAccessToken = useCallback(async (refreshToken: string): Promise<{
        token: string;
        refreshToken: string;
        user: User;
    } | null> => {
        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });

            if (!response.ok) {
                return null;
            }

            const payload = await response.json();
            if (!payload?.success || !payload?.accessToken || !payload?.refreshToken || !payload?.user) {
                return null;
            }

            return {
                token: payload.accessToken,
                refreshToken: payload.refreshToken,
                user: payload.user as User
            };
        } catch {
            return null;
        }
    }, []);

    const getRefreshTokenCandidates = (preferredToken?: string | null): string[] => {
        const candidates = [
            preferredToken || null,
            getCookie(REFRESH_TOKEN_COOKIE),
            localStorage.getItem('refreshToken')
        ];

        const uniqueTokens = new Set<string>();
        for (const candidate of candidates) {
            if (candidate) {
                uniqueTokens.add(candidate);
            }
        }

        return Array.from(uniqueTokens);
    };

    const refreshWithFallback = useCallback(async (
        preferredToken?: string | null
    ): Promise<{
        token: string;
        refreshToken: string;
        user: User;
    } | null> => {
        const refreshTokens = getRefreshTokenCandidates(preferredToken);
        for (const tokenCandidate of refreshTokens) {
            const refreshed = await refreshAccessToken(tokenCandidate);
            if (refreshed) {
                return refreshed;
            }
        }

        return null;
    }, [refreshAccessToken]);

    const resolveSession = useCallback(async (): Promise<{
        token: string;
        user: User;
        refreshToken: string | null;
    } | null> => {
        const localToken = localStorage.getItem('token');
        const localUser = parseStoredUser(localStorage.getItem('user'));
        const localRefreshToken = localStorage.getItem('refreshToken');

        const cookieToken = getCookie(ACCESS_TOKEN_COOKIE);
        const cookieRefreshToken = getCookie(REFRESH_TOKEN_COOKIE);

        const validCookieToken = cookieToken && !isTokenExpired(cookieToken) ? cookieToken : null;
        const validLocalToken = localToken && !isTokenExpired(localToken) ? localToken : null;

        let activeToken = validCookieToken || validLocalToken || null;
        let activeUser = localUser;
        let activeRefreshToken = cookieRefreshToken || localRefreshToken || null;

        if (!activeToken && activeRefreshToken) {
            const refreshedSession = await refreshWithFallback(activeRefreshToken);
            if (refreshedSession) {
                activeToken = refreshedSession.token;
                activeUser = refreshedSession.user;
                activeRefreshToken = refreshedSession.refreshToken;
            }
        }

        if (!activeToken) {
            return null;
        }

        const payload = decodeToken(activeToken);
        activeUser = buildUserFromPayload(payload, activeUser);
        if (!activeUser) {
            return null;
        }

        return {
            token: activeToken,
            user: activeUser,
            refreshToken: activeRefreshToken
        };
    }, [refreshWithFallback]);

    /**
     * Initialize auth state from localStorage or cookie on mount
     */
    useEffect(() => {
        let cancelled = false;

        const initializeAuth = async () => {
            try {
                const resolvedSession = await resolveSession();
                if (cancelled) {
                    return;
                }

                if (resolvedSession) {
                    persistSession(resolvedSession.token, resolvedSession.user, resolvedSession.refreshToken);
                    setAuthState({
                        user: resolvedSession.user,
                        token: resolvedSession.token,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                    return;
                }

                clearSessionStorage();
                setAuthState({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    isLoading: false,
                });
            } catch (error) {
                console.error('Failed to initialize auth:', error);
                clearSessionStorage();
                setAuthState({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    isLoading: false,
                });
            }
        };

        initializeAuth().catch(() => {
            if (cancelled) {
                return;
            }
            clearSessionStorage();
            setAuthState({
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
            });
        });

        return () => {
            cancelled = true;
        };
    }, [resolveSession]);

    /**
     * Revalidate session when tab/page is restored from cache or regains focus.
     * Prevents stale "connected" UI when the browser shows a cached page snapshot.
     */
    useEffect(() => {
        const revalidateSession = async () => {
            try {
                const resolvedSession = await resolveSession();
                if (resolvedSession) {
                    persistSession(resolvedSession.token, resolvedSession.user, resolvedSession.refreshToken);
                    setAuthState({
                        user: resolvedSession.user,
                        token: resolvedSession.token,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                    return;
                }

                clearSessionStorage();
                setAuthState({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    isLoading: false,
                });
            } catch {
                clearSessionStorage();
                setAuthState({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    isLoading: false,
                });
            }
        };

        const handleFocus = () => {
            void revalidateSession();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void revalidateSession();
            }
        };

        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                void revalidateSession();
            }
        };

        const handleStorageChange = (event: StorageEvent) => {
            if (!event.key) return;
            if (event.key === 'token' || event.key === 'refreshToken' || event.key === 'user' || event.key === 'role') {
                void revalidateSession();
            }
        };

        window.addEventListener('focus', handleFocus);
        window.addEventListener('pageshow', handlePageShow);
        window.addEventListener('storage', handleStorageChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('pageshow', handlePageShow);
            window.removeEventListener('storage', handleStorageChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [resolveSession]);

    /**
     * Auto-refresh token before expiration (5 minutes before)
     */
    useEffect(() => {
        if (!authState.token || !authState.isAuthenticated) return;

        let isRefreshing = false;

        const checkTokenExpiration = async () => {
            const payload = decodeToken(authState.token!);
            if (!payload || !payload.exp) return;

            const expirationTime = payload.exp * 1000;
            const currentTime = Date.now();
            const timeUntilExpiry = expirationTime - currentTime;
            const FIVE_MINUTES = 5 * 60 * 1000;

            // If token expires in less than 5 minutes, trigger refresh
            if (timeUntilExpiry <= FIVE_MINUTES) {
                if (isRefreshing) return;

                isRefreshing = true;
                const refreshedSession = await refreshWithFallback();
                isRefreshing = false;

                if (!refreshedSession) {
                    // Do not force logout if the access token is still valid.
                    // Another app may have already rotated the refresh token.
                    if (timeUntilExpiry <= 0) {
                        clearSessionStorage();
                        setAuthState({
                            user: null,
                            token: null,
                            isAuthenticated: false,
                            isLoading: false,
                        });
                    }
                    return;
                }

                persistSession(refreshedSession.token, refreshedSession.user, refreshedSession.refreshToken);
                setAuthState((previous) => ({
                    ...previous,
                    user: refreshedSession.user,
                    token: refreshedSession.token,
                    isAuthenticated: true,
                    isLoading: false
                }));
            }
        };

        // Check every minute
        void checkTokenExpiration();
        const interval = setInterval(() => {
            void checkTokenExpiration();
        }, 60 * 1000);
        return () => clearInterval(interval);
    }, [authState.token, authState.isAuthenticated, refreshWithFallback]);

    /**
     * Login function - stores token and user
     */
    const login = useCallback((token: string, user: User, refreshToken?: string | null) => {
        persistSession(token, user, refreshToken || null);

        setAuthState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
        });
    }, []);

    /**
     * Logout function - clears all auth state
     * This will cascade across all apps using this context
     */
    const logout = useCallback(() => {
        const tokenToRevoke = authState.token || localStorage.getItem('token') || getCookie(ACCESS_TOKEN_COOKIE);
        if (tokenToRevoke) {
            void fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${tokenToRevoke}`,
                    'Content-Type': 'application/json'
                }
            }).catch(() => {
                // Local cleanup still guarantees logout UX even if backend revocation fails.
            });
        }

        clearSessionStorage();

        setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
        });

        // Hard redirect to login — destroys React state tree and prevents
        // revalidation effects from restoring the session before the page
        // finishes navigating.
        window.location.href = '/login';
    }, [authState.token]);

    /**
     * Update user information
     */
    const updateUser = useCallback((user: User) => {
        const normalizedRole = normalizeUserRole(user.role);
        const normalizedUser: User = {
            ...user,
            role: normalizedRole || user.role,
            permissions: Array.isArray(user.permissions) ? user.permissions : []
        };

        localStorage.setItem('user', JSON.stringify(normalizedUser));
        if (normalizedUser.role) {
            localStorage.setItem('role', normalizedUser.role);
        }
        setAuthState((prev) => ({
            ...prev,
            user: normalizedUser,
        }));
    }, []);

    /**
     * Check if user has specific permission
     */
    const hasPermission = useCallback(
        (permission: Permission): boolean => {
            if (!authState.user) return false;
            return authState.user.permissions.includes(permission);
        },
        [authState.user]
    );

    /**
     * Check if user has specific role
     */
    const hasRole = useCallback(
        (role: UserRole): boolean => {
            if (!authState.user) return false;
            return authState.user.role === role;
        },
        [authState.user]
    );

    const value: AuthContextType = {
        ...authState,
        login,
        logout,
        updateUser,
        hasPermission,
        hasRole,
        isTokenValid,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook
 * Use this hook in any component to access auth state and methods
 *
 * @example
 * const { user, isAuthenticated, login, logout } = useAuth();
 */
export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

/**
 * Role-based component guard
 * Renders children only if user has specified role
 *
 * @example
 * <RequireRole role={UserRole.FORMATEUR}>
 *   <FormatorDashboard />
 * </RequireRole>
 */
export function RequireRole({
    role,
    children,
    fallback = null,
}: {
    role: UserRole;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}) {
    const { hasRole } = useAuth();
    return hasRole(role) ? <>{children}</> : <>{fallback}</>;
}

/**
 * Permission-based component guard
 * Renders children only if user has specified permission
 *
 * @example
 * <RequirePermission permission={Permission.FULL_ACCESS}>
 *   <AdminPanel />
 * </RequirePermission>
 */
export function RequirePermission({
    permission,
    children,
    fallback = null,
}: {
    permission: Permission;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}) {
    const { hasPermission } = useAuth();
    return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
}
