import { createRoleGuard } from '@shared/middleware/roleGuard';

/**
 * Portal Proxy (Next.js 16+)
 * Protects routes based on user roles:
 * - /demo -> CLIENT
 * - /analyze -> MARCHAND
 * - /etudiant -> ETUDIANT
 * - /formateur -> FORMATEUR
 */
export const proxy = createRoleGuard('portal');

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
        '/lab/:path*',
    ],
};
