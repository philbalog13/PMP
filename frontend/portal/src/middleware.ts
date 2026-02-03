import { createRoleGuard } from '@shared/middleware/roleGuard';

/**
 * Portal Middleware
 * Protects routes based on user roles:
 * - /demo → CLIENT
 * - /analyze → MARCHAND
 * - /etudiant → ETUDIANT
 * - /formateur → FORMATEUR
 */
export const middleware = createRoleGuard('portal');

export const config = {
    matcher: [
        '/demo/:path*',
        '/analyze/:path*',
        '/etudiant/:path*',
        '/student/:path*',
        '/formateur/:path*',
        '/instructor/:path*',
        '/client/:path*',
        '/merchant/:path*',
        '/workshops/:path*',
        '/lab/:path*',
    ],
};
