import { createRoleGuard } from '@shared/middleware/roleGuard';

/**
 * TPE-Web Proxy
 * Accessible to all authenticated users (CLIENT, MARCHAND, ETUDIANT, FORMATEUR)
 * Different behaviors based on role:
 * - CLIENT: Demo simulation mode
 * - MARCHAND: Full POS terminal mode
 * - ETUDIANT: Pedagogical mode with hints
 * - FORMATEUR: All access with lab controls
 */
export const proxy = createRoleGuard('tpe-web');

export default proxy;

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
