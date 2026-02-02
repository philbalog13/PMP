import { createRoleGuard } from '@shared/middleware/roleGuard';

/**
 * HSM-Web Proxy
 * Accessible to: MARCHAND, ETUDIANT, FORMATEUR
 * - MARCHAND: Certificate operations only
 * - ETUDIANT: Lab scenarios for crypto learning
 * - FORMATEUR: Full HSM administration access
 */
export const proxy = createRoleGuard('hsm-web');

export default proxy;

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
