import { NextRequest, NextResponse } from 'next/server';
import { UserRole, Permission } from '../types/user';
import { normalizeRole, hasRole } from '../utils/roleUtils';
import { APP_URLS, getRoleRedirectUrl } from '../lib/app-urls';

/**
 * Role Guard Middleware
 * Protects Next.js routes based on user roles and permissions
 */

/**
 * Route configuration type
 */
interface RouteConfig {
    path: string;
    allowedRoles?: UserRole[];
    requiredPermissions?: Permission[];
}

/**
 * Default route configurations for each application
 */
export const ROUTE_CONFIGS: Record<string, RouteConfig[]> = {
    // Portal routes
    portal: [
        // Demo is available to any authenticated role.
        { path: '/demo', allowedRoles: [UserRole.CLIENT, UserRole.MARCHAND, UserRole.ETUDIANT, UserRole.FORMATEUR] },
        { path: '/analyze', allowedRoles: [] },

        // Student routes
        { path: '/etudiant', allowedRoles: [UserRole.ETUDIANT] },
        { path: '/student', allowedRoles: [UserRole.ETUDIANT] },

        // Instructor/Trainer routes (has access to everything)
        { path: '/formateur', allowedRoles: [UserRole.FORMATEUR] },
        { path: '/instructor', allowedRoles: [UserRole.FORMATEUR] },

        // Client legacy portal pages are deprecated and redirected
        { path: '/client', allowedRoles: [] },

        // Merchant routes
        { path: '/merchant', allowedRoles: [UserRole.MARCHAND] },

        // Lab is for students and trainers
        { path: '/lab', allowedRoles: [UserRole.ETUDIANT, UserRole.FORMATEUR] },
    ],
    // TPE-Web routes
    'tpe-web': [
        {
            path: '/',
            allowedRoles: [UserRole.CLIENT, UserRole.MARCHAND, UserRole.ETUDIANT, UserRole.FORMATEUR],
        },
    ],
    // User-Cards-Web routes
    'user-cards-web': [
        {
            path: '/',
            allowedRoles: [UserRole.CLIENT, UserRole.ETUDIANT, UserRole.FORMATEUR],
        },
    ],
    // HSM-Web routes
    'hsm-web': [
        {
            path: '/',
            allowedRoles: [UserRole.MARCHAND, UserRole.ETUDIANT, UserRole.FORMATEUR],
            requiredPermissions: [Permission.MANAGE_POS, Permission.ACCESS_LAB, Permission.FULL_ACCESS],
        },
    ],
};

function applyNoStoreHeaders(response: NextResponse): NextResponse {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Vary', 'Cookie, Authorization');
    response.headers.set('x-middleware-cache', 'no-cache');
    return response;
}

/**
 * Decode JWT token without verification
 * For client-side middleware only - backend should verify signature
 */
function decodeToken(token: string): any {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        return null;
    }
}

/**
 * Check if token is expired
 */
function isTokenExpired(token: string): boolean {
    const payload = decodeToken(token);
    if (!payload || !payload.exp) return true;

    const expirationTime = payload.exp * 1000;
    const currentTime = Date.now();

    return currentTime >= expirationTime;
}

/**
 * Extract user from request (from localStorage or cookie)
 */
function getUserFromRequest(request: NextRequest): {
    user: any;
    token: string | null;
    needsRefresh?: boolean;
} | null {
    // Try to get token from cookie first
    const tokenFromCookie = request.cookies.get('token')?.value;
    const refreshTokenFromCookie = request.cookies.get('refreshToken')?.value;

    // Try to get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');

    const token = tokenFromCookie || tokenFromHeader;

    if (!token) {
        return null;
    }

    // Decode token to get user info
    const payload = decodeToken(token);
    if (!payload) {
        return null;
    }

    const tokenExpired = isTokenExpired(token);
    if (tokenExpired && !refreshTokenFromCookie) {
        return null;
    }

    return {
        user: {
            id: payload.userId || payload.sub || payload.id, // Support userId key specifically
            email: payload.email || payload.upn || payload.unique_name,
            role: payload.role,
            permissions: payload.permissions || [],
        },
        token,
        needsRefresh: tokenExpired
    };
}


/**
 * Check if user has any of the required permissions
 */
function hasAnyPermission(userPermissions: Permission[], requiredPermissions: Permission[]): boolean {
    return requiredPermissions.some((permission) => userPermissions.includes(permission));
}

/**
 * Create role guard middleware for a specific application
 *
 * @param appName - Name of the application (e.g., 'portal', 'tpe-web')
 * @param customRoutes - Optional custom route configurations
 * @returns Next.js middleware function
 *
 * @example
 * // In middleware.ts
 * export const middleware = createRoleGuard('portal');
 *
 * export const config = {
 *   matcher: ['/demo/:path*', '/analyze/:path*', '/student/:path*', '/instructor/:path*']
 * }
 */
export function createRoleGuard(appName: string, customRoutes?: RouteConfig[]) {
    const routes = customRoutes || ROUTE_CONFIGS[appName] || [];
    const portalLoginBase = APP_URLS.portal;
    const noStoreNext = () => applyNoStoreHeaders(NextResponse.next());

    return function middleware(request: NextRequest) {
        const { pathname } = request.nextUrl;
        const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
        const forwardedProto = request.headers.get('x-forwarded-proto');
        const requestProtocol = forwardedProto || request.nextUrl.protocol.replace(':', '');
        const requestOrigin = forwardedHost ? `${requestProtocol}://${forwardedHost}` : request.nextUrl.origin;

        console.log(`[RoleGuard] Processing request: ${pathname}`);

        // Public routes that don't require authentication
        const publicRoutes = ['/login', '/register', '/api', '/_next', '/favicon.ico'];
        if (publicRoutes.some((route) => pathname.startsWith(route))) {
            return NextResponse.next();
        }

        // Get user from request
        const authData = getUserFromRequest(request);

        // If no user, redirect to login
        if (!authData) {
            const isPortalApp = appName === 'portal';
            const loginUrl = isPortalApp ? new URL('/login', requestOrigin) : new URL('/login', portalLoginBase);
            const targetUrl = `${requestOrigin}${pathname}${request.nextUrl.search}`;

            console.warn(`[RoleGuard] No valid auth data found for ${pathname}. Redirecting to login (${isPortalApp ? 'portal-local' : 'portal-central'}).`);
            loginUrl.searchParams.set('redirect', isPortalApp ? pathname : targetUrl);
            return applyNoStoreHeaders(NextResponse.redirect(loginUrl));
        }

        const { user, needsRefresh } = authData;
        if (needsRefresh) {
            console.warn(`[RoleGuard] Access token expired for ${pathname}, allowing request because refresh token is present.`);
        }
        console.log(`[RoleGuard] User authenticated: ${user.email} (Role: ${user.role})`);

        // Find matching route config
        const routeConfig = routes.find((route) => pathname.startsWith(route.path));

        if (!routeConfig) {
            console.log(`[RoleGuard] No specific route config for ${pathname}. Allowing access.`);
            // No specific config, allow by default for authenticated users
            return noStoreNext();
        }

        console.log(`[RoleGuard] Path matching config: ${routeConfig.path}. Allowed roles: ${JSON.stringify(routeConfig.allowedRoles)}`);

        // Check role-based access
        if (routeConfig.allowedRoles) {
            const userRoleNormalized = normalizeRole(user.role);
            console.log(`[RoleGuard] Checking role access. User role: ${user.role} (normalized: ${userRoleNormalized}). Allowed: ${JSON.stringify(routeConfig.allowedRoles)}`);

            if (!hasRole(user.role, routeConfig.allowedRoles)) {
                console.warn(`[RoleGuard] Access denied for ${pathname}. User role ${user.role} (normalized: ${userRoleNormalized}) not in ${JSON.stringify(routeConfig.allowedRoles)}`);
                // User doesn't have required role
                return redirectBasedOnRole(request, userRoleNormalized);
            }
        }

        // Check permission-based access
        if (routeConfig.requiredPermissions) {
            const userPermissions = Array.isArray(user.permissions) ? user.permissions : [];
            if (userPermissions.length === 0) {
                console.warn(`[RoleGuard] No permissions present in token for ${pathname}. Falling back to role-based access.`);
            } else if (!hasAnyPermission(userPermissions, routeConfig.requiredPermissions)) {
                console.warn(`[RoleGuard] Permission denied for ${pathname}. User permissions: ${JSON.stringify(user.permissions)}`);
                // User doesn't have required permissions
                return redirectBasedOnRole(request, user.role);
            }
        }

        console.log(`[RoleGuard] Access granted for ${pathname}`);
        // User is authorized
        return noStoreNext();
    };
}

/**
 * Redirect user to their appropriate dashboard based on role
 */
function redirectBasedOnRole(request: NextRequest, role: UserRole): NextResponse {
    const normalizedRole = normalizeRole(role);
    const portalBase = APP_URLS.portal;
    console.log(`[RoleGuard] Redirecting based on role: ${role} -> normalized: ${normalizedRole}`);

    const redirectPath = getRoleRedirectUrl(normalizedRole);
    console.log(`[RoleGuard] Calculated redirect path: ${redirectPath}`);

    const isAbsolute = /^https?:\/\//i.test(redirectPath);
    const target = isAbsolute ? redirectPath : `${portalBase}${redirectPath}`;
    const url = new URL(target);
    return applyNoStoreHeaders(NextResponse.redirect(url));
}

/**
 * Higher-order function to protect API routes
 *
 * @param allowedRoles - Roles allowed to access the endpoint
 * @param handler - The actual API route handler
 * @returns Protected API route handler
 *
 * @example
 * export const GET = withRoleGuard([UserRole.FORMATEUR], async (request) => {
 *   // Only formateur can access this endpoint
 *   return NextResponse.json({ data: 'protected data' });
 * });
 */
export function withRoleGuard(
    allowedRoles: UserRole[],
    handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
    return async (request: NextRequest, context?: any) => {
        const authData = getUserFromRequest(request);

        if (!authData) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { user } = authData;

        if (!hasRole(user.role, allowedRoles)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return handler(request, context);
    };
}

/**
 * Higher-order function to protect API routes with permissions
 *
 * @param requiredPermissions - Permissions required to access the endpoint
 * @param handler - The actual API route handler
 * @returns Protected API route handler
 *
 * @example
 * export const POST = withPermissionGuard([Permission.FULL_ACCESS], async (request) => {
 *   // Only users with FULL_ACCESS can use this endpoint
 *   return NextResponse.json({ success: true });
 * });
 */
export function withPermissionGuard(
    requiredPermissions: Permission[],
    handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
    return async (request: NextRequest, context?: any) => {
        const authData = getUserFromRequest(request);

        if (!authData) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { user } = authData;

        if (!hasAnyPermission(user.permissions, requiredPermissions)) {
            return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
        }

        return handler(request, context);
    };
}
