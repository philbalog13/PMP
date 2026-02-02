import { createRoleGuard } from '@shared/middleware/roleGuard';

/**
 * User-Cards-Web Proxy
 * Accessible to: CLIENT, ETUDIANT, FORMATEUR
 * - CLIENT: Manage personal cards and transactions
 * - ETUDIANT: Create test cards for exercises
 * - FORMATEUR: Full access to card management
 */
export const proxy = createRoleGuard('user-cards-web');

export default proxy;

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
