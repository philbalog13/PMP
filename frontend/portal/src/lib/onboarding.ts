import { User } from '@shared/types/user';

const ONBOARDING_STORAGE_PREFIX = 'onboarding_done';

type UserIdentity = Pick<User, 'id' | 'email'> | null | undefined;

function resolveIdentity(user: UserIdentity): string | null {
    const id = typeof user?.id === 'string' ? user.id.trim() : '';
    if (id) {
        return id;
    }

    const email = typeof user?.email === 'string' ? user.email.trim().toLowerCase() : '';
    if (email) {
        return email;
    }

    return null;
}

export function getOnboardingStorageKey(user: UserIdentity): string | null {
    const identity = resolveIdentity(user);
    if (!identity) {
        return null;
    }
    return `${ONBOARDING_STORAGE_PREFIX}:${identity}`;
}

export function isOnboardingDoneLocally(user: UserIdentity): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    const key = getOnboardingStorageKey(user);
    if (!key) {
        return false;
    }

    return localStorage.getItem(key) === 'true';
}

export function markOnboardingDoneLocally(user: UserIdentity): void {
    if (typeof window === 'undefined') {
        return;
    }

    const key = getOnboardingStorageKey(user);
    if (!key) {
        return;
    }

    localStorage.setItem(key, 'true');
}
