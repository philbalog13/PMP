/**
 * Centralized cross-app URLs
 * All frontend apps should use these instead of hardcoded localhost URLs
 */
import { UserRole } from '../types/user';
import { normalizeRole } from '../utils/roleUtils';

export const APP_URLS = {
    portal: process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000',
    tpe: process.env.NEXT_PUBLIC_TPE_URL || 'http://localhost:3001',
    userCards: process.env.NEXT_PUBLIC_USER_CARDS_URL || 'http://localhost:3004',
    hsm: process.env.NEXT_PUBLIC_HSM_URL || 'http://localhost:3081',
    monitoring: process.env.NEXT_PUBLIC_MONITORING_URL || 'http://localhost:3082',
    ctfAttackbox: process.env.NEXT_PUBLIC_CTF_ATTACKBOX_URL || 'http://localhost:7681',
    studentCtf: '/student/ctf',
    studentCtfLeaderboard: '/student/ctf/leaderboard',
    instructorCtf: '/instructor/ctf',
};

const roleRedirects: Record<UserRole, string> = {
    [UserRole.CLIENT]: APP_URLS.userCards,
    [UserRole.MARCHAND]: `${APP_URLS.portal}/merchant`,
    [UserRole.ETUDIANT]: '/student',
    [UserRole.FORMATEUR]: '/instructor',
};

function parseOrigin(value: string): string | null {
    try {
        return new URL(value).origin;
    } catch {
        return null;
    }
}

export function getRoleRedirectUrl(role: UserRole | string | null | undefined): string {
    const normalizedRole = normalizeRole(role);
    if (!normalizedRole) {
        return '/';
    }

    return roleRedirects[normalizedRole] || '/';
}

export function getAllowedRedirectOrigins(currentOrigin?: string): Set<string> {
    const candidates = [
        APP_URLS.portal,
        APP_URLS.tpe,
        APP_URLS.userCards,
        APP_URLS.hsm,
        APP_URLS.monitoring,
        currentOrigin || '',
    ];

    const origins = new Set<string>();
    for (const candidate of candidates) {
        if (!candidate) continue;

        const parsedOrigin = parseOrigin(candidate);
        if (parsedOrigin) {
            origins.add(parsedOrigin);
        }
    }

    return origins;
}

export function resolveSafeRedirectTarget(
    requestedRedirect: string | null | undefined,
    fallbackRole: UserRole | string | null | undefined,
    currentOrigin?: string
): string {
    const fallback = getRoleRedirectUrl(fallbackRole);
    if (!requestedRedirect) {
        return fallback;
    }

    const trimmed = requestedRedirect.trim();
    if (!trimmed) {
        return fallback;
    }

    // Internal app path is always allowed.
    if (trimmed.startsWith('/')) {
        return trimmed;
    }

    try {
        const parsedTarget = new URL(trimmed);
        const allowedOrigins = getAllowedRedirectOrigins(currentOrigin);
        if (allowedOrigins.has(parsedTarget.origin)) {
            return parsedTarget.toString();
        }
    } catch {
        return fallback;
    }

    return fallback;
}
