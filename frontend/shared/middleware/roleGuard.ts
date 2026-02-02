import { NextRequest, NextResponse } from 'next/server';
import { UserRole, Permission } from '../types/user';
import { normalizeRole, hasRole } from '../utils/roleUtils';

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
        // Legacy routes
        { path: '/demo', allowedRoles: [UserRole.CLIENT] },
        { path: '/analyze', allowedRoles: [UserRole.MARCHAND] },

        // Student routes
        { path: '/student', allowedRoles: [UserRole.ETUDIANT] },

        // Instructor/Trainer routes (has access to everything)
        { path: '/instructor', allowedRoles: [UserRole.FORMATEUR] },

        // Client routes
        { path: '/client', allowedRoles: [UserRole.CLIENT] },

        // Merchant routes
        { path: '/merchant', allowedRoles: [UserRole.MARCHAND] },

        // Workshops are accessible by all authenticated users
        { path: '/workshops', allowedRoles: [UserRole.CLIENT, UserRole.MARCHAND, UserRole.ETUDIANT, UserRole.FORMATEUR] },

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
} | null {
    // Try to get token from cookie first
    const tokenFromCookie = request.cookies.get('token')?.value;

    // Try to get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');

    const token = tokenFromCookie || tokenFromHeader;

    if (!token) {
        return null;
    }

    // Validate token expiration
    if (isTokenExpired(token)) {
        return null;
    }

    // Decode token to get user info
    const payload = decodeToken(token);
    if (!payload) {
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

    return function middleware(request: NextRequest) {
        const { pathname } = request.nextUrl;

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
            console.warn(`[RoleGuard] No valid auth data found for ${pathname}. Redirecting to /login.`);
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            return NextResponse.redirect(loginUrl);
        }

        const { user } = authData;
        console.log(`[RoleGuard] User authenticated: ${user.email} (Role: ${user.role})`);

        // Find matching route config
        const routeConfig = routes.find((route) => pathname.startsWith(route.path));

        if (!routeConfig) {
            console.log(`[RoleGuard] No specific route config for ${pathname}. Allowing access.`);
            // No specific config, allow by default for authenticated users
            return NextResponse.next();
        }

        console.log(`[RoleGuard] Path matching config: ${routeConfig.path}. Allowed roles: ${JSON.stringify(routeConfig.allowedRoles)}`);

        // Check role-based access
        if (routeConfig.allowedRoles) {
            if (!hasRole(user.role, routeConfig.allowedRoles)) {
                console.warn(`[RoleGuard] Access denied for ${pathname}. User role ${user.role} not in ${JSON.stringify(routeConfig.allowedRoles)}`);
                // User doesn't have required role
                return redirectBasedOnRole(request, normalizeRole(user.role));
            }
        }

        // Check permission-based access
        if (routeConfig.requiredPermissions) {
            if (!hasAnyPermission(user.permissions, routeConfig.requiredPermissions)) {
                console.warn(`[RoleGuard] Permission denied for ${pathname}. User permissions: ${JSON.stringify(user.permissions)}`);
                // User doesn't have required permissions
                return redirectBasedOnRole(request, user.role);
            }
        }

        console.log(`[RoleGuard] Access granted for ${pathname}`);
        // User is authorized
        return NextResponse.next();
    };
}

/**
 * Redirect user to their appropriate dashboard based on role
 */
function redirectBasedOnRole(request: NextRequest, role: UserRole): NextResponse {
    const normalizedRole = normalizeRole(role);
    console.log(`[RoleGuard] Redirecting based on role: ${role} -> normalized: ${normalizedRole}`);

    const roleRedirects: Record<UserRole, string> = {
        [UserRole.CLIENT]: '/demo',
        [UserRole.MARCHAND]: '/analyze',
        [UserRole.ETUDIANT]: '/student',
        [UserRole.FORMATEUR]: '/instructor',
    };

    const redirectPath = roleRedirects[normalizedRole] || '/';
    console.log(`[RoleGuard] Calculated redirect path: ${redirectPath}`);

    const url = new URL(redirectPath, request.url);
    return NextResponse.redirect(url);
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
