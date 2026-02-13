import { UserRole } from '@shared/types/user';

const LOGIN_ENDPOINTS: Record<UserRole, string> = {
    [UserRole.CLIENT]: '/api/auth/client/login',
    [UserRole.MARCHAND]: '/api/auth/marchand/login',
    [UserRole.ETUDIANT]: '/api/auth/etudiant/login',
    [UserRole.FORMATEUR]: '/api/auth/formateur/login',
};

export interface AuthApiUser {
    id?: string;
    userId?: string;
    username?: string;
    email?: string;
    firstName?: string;
    first_name?: string;
    lastName?: string;
    last_name?: string;
    role?: string;
    permissions?: string[];
}

export interface LoginSuccessPayload {
    accessToken: string;
    refreshToken?: string;
    user: AuthApiUser;
}

export interface RegisterInput {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
}

export interface LoginInput {
    role: UserRole;
    email: string;
    password: string;
    code2fa?: string;
}

export interface AuthApiFailure {
    ok: false;
    error: string;
    code?: string;
    status: number;
}

export interface AuthApiSuccess<T> {
    ok: true;
    data: T;
}

export type AuthApiResult<T> = AuthApiSuccess<T> | AuthApiFailure;

function splitFullName(fullName: string): { firstName: string; lastName: string } {
    const trimmed = fullName.trim();
    if (!trimmed) {
        return { firstName: 'User', lastName: '.' };
    }

    const segments = trimmed.split(/\s+/).filter(Boolean);
    const firstName = segments[0] || 'User';
    const lastName = segments.slice(1).join(' ') || '.';

    return { firstName, lastName };
}

async function readJsonSafely(response: Response): Promise<Record<string, unknown>> {
    try {
        const parsed = await response.json();
        if (parsed && typeof parsed === 'object') {
            return parsed as Record<string, unknown>;
        }
    } catch {
        return {};
    }

    return {};
}

function extractError(data: Record<string, unknown>, fallback: string): string {
    const rawError = data.error;
    if (typeof rawError === 'string' && rawError.trim()) {
        return rawError;
    }

    const rawMessage = data.message;
    if (typeof rawMessage === 'string' && rawMessage.trim()) {
        return rawMessage;
    }

    return fallback;
}

export async function loginWithRole(input: LoginInput): Promise<AuthApiResult<LoginSuccessPayload>> {
    const endpoint = LOGIN_ENDPOINTS[input.role];
    const body: Record<string, string> = {
        email: input.email.trim(),
        password: input.password
    };
    if (input.code2fa?.trim()) {
        body.code2fa = input.code2fa.trim();
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await readJsonSafely(response);

    if (!response.ok || data.success !== true) {
        return {
            ok: false,
            error: extractError(data, 'Connexion refusee'),
            code: typeof data.code === 'string' ? data.code : undefined,
            status: response.status
        };
    }

    if (typeof data.accessToken !== 'string' || !data.accessToken || !data.user || typeof data.user !== 'object') {
        return {
            ok: false,
            error: 'Reponse login invalide',
            code: 'AUTH_INVALID_PAYLOAD',
            status: 502
        };
    }

    return {
        ok: true,
        data: {
            accessToken: data.accessToken,
            refreshToken: typeof data.refreshToken === 'string' ? data.refreshToken : undefined,
            user: data.user as AuthApiUser
        }
    };
}

export async function registerAccount(input: RegisterInput): Promise<AuthApiResult<{ message?: string }>> {
    const names = splitFullName(input.fullName);
    const payload = {
        username: input.email.split('@')[0],
        email: input.email.trim(),
        password: input.password,
        firstName: names.firstName,
        lastName: names.lastName,
        role: input.role
    };

    const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await readJsonSafely(response);

    if (!response.ok || data.success !== true) {
        return {
            ok: false,
            error: extractError(data, 'Inscription refusee'),
            code: typeof data.code === 'string' ? data.code : undefined,
            status: response.status
        };
    }

    return {
        ok: true,
        data: {
            message: typeof data.message === 'string' ? data.message : undefined
        }
    };
}
