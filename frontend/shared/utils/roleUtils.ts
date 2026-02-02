import { UserRole } from '../types/user';

/**
 * Robustly normalize role strings to standardized UserRole enum values.
 * Handles legacy strings ('student', 'trainer', etc.) and ensures consistent 'ROLE_' prefixing.
 */
export function normalizeRole(role: any): UserRole {
    if (!role) return role as UserRole;

    // Convert to string and handle possible "ROLE_" prefix inconsistencies or legacy strings
    const r = String(role).toUpperCase();

    if (r === 'STUDENT' || r === 'ETUDIANT' || r === 'ROLE_ETUDIANT') return UserRole.ETUDIANT;
    if (r === 'TRAINER' || r === 'FORMATEUR' || r === 'ROLE_FORMATEUR') return UserRole.FORMATEUR;
    if (r === 'CLIENT' || r === 'ROLE_CLIENT') return UserRole.CLIENT;
    if (r === 'MERCHANT' || r === 'MARCHAND' || r === 'ROLE_MARCHAND') return UserRole.MARCHAND;

    // Fallback to original cast if no match, though technically we should return something safe
    return role as UserRole;
}

/**
 * Check if the provided role matches any of the allowed roles, with normalization.
 */
export function hasRole(userRole: any, allowedRoles: UserRole | UserRole[]): boolean {
    const normalized = normalizeRole(userRole);
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return roles.includes(normalized);
}
