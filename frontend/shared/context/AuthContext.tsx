'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthState, UserRole, Permission } from '../types/user';

interface AuthContextType extends AuthState {
    login: (token: string, user: User) => void;
    logout: () => void;
    updateUser: (user: User) => void;
    hasPermission: (permission: Permission) => boolean;
    hasRole: (role: UserRole) => boolean;
    isTokenValid: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

    /**
     * Check if token is expired
     */
    const isTokenExpired = (token: string): boolean => {
        const payload = decodeToken(token);
        if (!payload || !payload.exp) return true;

        const expirationTime = payload.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();

        return currentTime >= expirationTime;
    };

    /**
     * Validate token and check expiration
     */
    const isTokenValid = useCallback((): boolean => {
        if (!authState.token) return false;
        return !isTokenExpired(authState.token);
    }, [authState.token]);

    /**
     * Initialize auth state from localStorage on mount
     */
    useEffect(() => {
        const initializeAuth = () => {
            try {
                const storedToken = localStorage.getItem('token');
                const storedUser = localStorage.getItem('user');

                if (storedToken && storedUser) {
                    // Validate token
                    if (isTokenExpired(storedToken)) {
                        // Token expired, clear storage
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        setAuthState({
                            user: null,
                            token: null,
                            isAuthenticated: false,
                            isLoading: false,
                        });
                        return;
                    }

                    // Token valid, restore session
                    const user: User = JSON.parse(storedUser);
                    setAuthState({
                        user,
                        token: storedToken,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } else {
                    setAuthState({
                        user: null,
                        token: null,
                        isAuthenticated: false,
                        isLoading: false,
                    });
                }
            } catch (error) {
                console.error('Failed to initialize auth:', error);
                setAuthState({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    isLoading: false,
                });
            }
        };

        initializeAuth();
    }, []);

    /**
     * Auto-refresh token before expiration (5 minutes before)
     */
    useEffect(() => {
        if (!authState.token || !authState.isAuthenticated) return;

        const checkTokenExpiration = () => {
            const payload = decodeToken(authState.token!);
            if (!payload || !payload.exp) return;

            const expirationTime = payload.exp * 1000;
            const currentTime = Date.now();
            const timeUntilExpiry = expirationTime - currentTime;
            const FIVE_MINUTES = 5 * 60 * 1000;

            // If token expires in less than 5 minutes, trigger refresh
            if (timeUntilExpiry <= FIVE_MINUTES && timeUntilExpiry > 0) {
                // TODO: Call refresh token endpoint
                console.log('Token expiring soon, should refresh');
                // For now, just log. Backend refresh endpoint needs to be implemented
            }
        };

        // Check every minute
        const interval = setInterval(checkTokenExpiration, 60 * 1000);
        return () => clearInterval(interval);
    }, [authState.token, authState.isAuthenticated]);

    /**
     * Login function - stores token and user
     */
    const login = useCallback((token: string, user: User) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

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
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
        });

        // Optionally redirect to login page
        // window.location.href = '/login';
    }, []);

    /**
     * Update user information
     */
    const updateUser = useCallback((user: User) => {
        localStorage.setItem('user', JSON.stringify(user));
        setAuthState((prev) => ({
            ...prev,
            user,
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
