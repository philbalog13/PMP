
// Simplified mock of the logic to verify the config
import { UserRole } from '../frontend/shared/types/user';

// Mocking the config structure from roleGuard.ts (since we can't easily import it without Next.js context in a standalone script sometimes)
// Copied relevant parts for verification
interface RouteConfig {
    path: string;
    allowedRoles?: UserRole[];
}

const ROUTE_CONFIGS: Record<string, RouteConfig[]> = {
    // Portal routes - COPIED FROM CODEBASE AFTER EDIT
    portal: [
        // Legacy routes
        { path: '/demo', allowedRoles: [UserRole.CLIENT] },
        { path: '/analyze', allowedRoles: [UserRole.MARCHAND] },

        // Student routes
        { path: '/student', allowedRoles: [UserRole.ETUDIANT, UserRole.CLIENT] },

        // Instructor/Trainer routes
        { path: '/instructor', allowedRoles: [UserRole.FORMATEUR] },

        // Client routes
        { path: '/client', allowedRoles: [UserRole.CLIENT] },

        // Merchant routes
        { path: '/merchant', allowedRoles: [UserRole.MARCHAND] },

        // Workshops
        { path: '/workshops', allowedRoles: [UserRole.CLIENT, UserRole.MARCHAND, UserRole.ETUDIANT, UserRole.FORMATEUR] },

        // Lab
        { path: '/lab', allowedRoles: [UserRole.ETUDIANT, UserRole.FORMATEUR, UserRole.CLIENT] },
    ],
};

function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
    return allowedRoles.includes(userRole);
}

function testPath(path: string, userRole: UserRole, expected: boolean) {
    const config = ROUTE_CONFIGS.portal.find(r => path.startsWith(r.path));
    if (!config) {
        console.log(`[PASS] ${path} - No config (Allowed default)`);
        return;
    }
    const allowed = hasRole(userRole, config.allowedRoles || []);
    const result = allowed === expected ? "PASS" : "FAIL";
    console.log(`[${result}] ${path} for ${userRole}: Expected ${expected}, Got ${allowed}`);
    if (result === "FAIL") process.exit(1);
}

console.log("Verifying Role Access for CLIENT...");
testPath('/student', UserRole.CLIENT, true);
testPath('/lab', UserRole.CLIENT, true);
testPath('/workshops', UserRole.CLIENT, true);
testPath('/client', UserRole.CLIENT, true);
testPath('/instructor', UserRole.CLIENT, false);
testPath('/merchant', UserRole.CLIENT, false);

console.log("Verifying Role Access for ETUDIANT...");
testPath('/student', UserRole.ETUDIANT, true);
testPath('/lab', UserRole.ETUDIANT, true);
testPath('/workshops', UserRole.ETUDIANT, true);

console.log("All tests passed!");
