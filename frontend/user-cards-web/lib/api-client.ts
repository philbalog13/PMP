'use client';

type ApiRequestInit = RequestInit & {
    token?: string | null;
};

type JwtPayload = {
    exp?: number;
    [key: string]: unknown;
};

type ApiErrorPayload = {
    error?: string;
    success?: boolean;
};

type GenericObject = Record<string, unknown>;

const asObject = (value: unknown): GenericObject =>
    value !== null && typeof value === 'object' ? (value as GenericObject) : {};

const decodeToken = (token: string): JwtPayload | null => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
                .join('')
        );

        const parsed = JSON.parse(jsonPayload) as unknown;
        const payload = asObject(parsed);
        return payload as JwtPayload;
    } catch {
        return null;
    }
};

const isTokenExpired = (token: string): boolean => {
    const payload = decodeToken(token);
    if (!payload || !payload.exp) return true;
    return Date.now() >= payload.exp * 1000;
};

const readTokenFromCookie = (): string | null => {
    if (typeof document === 'undefined') return null;

    const tokenEntry = document.cookie
        .split('; ')
        .find((part) => part.startsWith('token='));

    if (!tokenEntry) return null;
    const [, rawToken] = tokenEntry.split('=');
    return rawToken ? decodeURIComponent(rawToken) : null;
};

export const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;

    const localToken = window.localStorage.getItem('token');
    const cookieToken = readTokenFromCookie();

    if (cookieToken && !isTokenExpired(cookieToken)) {
        window.localStorage.setItem('token', cookieToken);
        return cookieToken;
    }

    if (localToken && !isTokenExpired(localToken)) {
        return localToken;
    }

    return null;
};

async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
    const token = init.token ?? getAuthToken();
    const headers = new Headers(init.headers || {});

    if (!headers.has('Content-Type') && init.body !== undefined) {
        headers.set('Content-Type', 'application/json');
    }

    if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    let response: Response;
    try {
        response = await fetch(path, {
            ...init,
            headers
        });
    } catch (networkError: unknown) {
        const message = networkError instanceof Error ? networkError.message : null;
        throw new Error(message || 'Network error - server unreachable');
    }

    const payload: unknown = await response.json().catch(() => ({}));
    const payloadObject = asObject(payload);
    const apiError = typeof (payloadObject as ApiErrorPayload).error === 'string'
        ? (payloadObject as ApiErrorPayload).error
        : null;

    // Handle auth failures - clear stale token so next request can retry
    if (response.status === 401) {
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem('token');
        }
        throw new Error(apiError || 'Session expired - please log in again');
    }

    if (!response.ok) {
        throw new Error(apiError || `Request failed (${response.status})`);
    }

    if ((payloadObject as ApiErrorPayload).success === false) {
        throw new Error(apiError || 'Request failed');
    }

    return payload as T;
}

export type DashboardResponse = { dashboard?: GenericObject };
export type CardsResponse = { cards?: GenericObject[] };
export type CreateCardResponse = GenericObject;
export type TransactionsResponse = { transactions?: GenericObject[] };
export type SecurityResponse = { security?: GenericObject };
export type CardFeaturesUpdateBody = {
    threedsEnrolled?: boolean;
    contactlessEnabled?: boolean;
    internationalEnabled?: boolean;
    ecommerceEnabled?: boolean;
};
export type AccountResponse = { account?: GenericObject };
export type AccountUpdateBody = {
    accountLabel?: string;
    dailyTransferLimit?: number;
    monthlyTransferLimit?: number;
};
export type AccountEntriesResponse = { entries?: GenericObject[] };
export type DepositWithdrawResponse = GenericObject;
export type TransactionByIdResponse = { transaction?: GenericObject } & GenericObject;
export type TransactionTimelineResponse = { transaction?: GenericObject; timeline?: GenericObject[] };
export type MerchantTerminal = {
    terminalId?: string;
    merchantName?: string;
    mcc?: string;
    locationName?: string;
    city?: string;
};
export type Merchant = {
    id: string;
    username?: string;
    displayName?: string;
    terminals?: MerchantTerminal[];
};
export type MerchantsResponse = { merchants?: Merchant[] };

export const clientApi = {
    getDashboard: () => apiRequest<DashboardResponse>('/api/client/dashboard'),
    getCards: () => apiRequest<CardsResponse>('/api/client/cards'),
    createCard: (body: { amount: number; cardholderName?: string; cardType?: string; network?: string }) =>
        apiRequest<CreateCardResponse>('/api/client/cards', {
            method: 'POST',
            body: JSON.stringify(body)
        }),
    getTransactions: (searchParams = '') =>
        apiRequest<TransactionsResponse>(`/api/client/transactions${searchParams ? `?${searchParams}` : ''}`),
    getSecurity: () => apiRequest<SecurityResponse>('/api/client/security'),
    updateCardFeatures: (cardId: string, body: CardFeaturesUpdateBody) =>
        apiRequest<CreateCardResponse>(`/api/client/cards/${cardId}/features`, {
            method: 'PATCH',
            body: JSON.stringify(body)
        }),
    toggleCardBlock: (cardId: string, blocked: boolean) =>
        apiRequest<CreateCardResponse>(`/api/client/cards/${cardId}/block`, {
            method: 'PATCH',
            body: JSON.stringify({ blocked })
        }),
    getAccount: () => apiRequest<AccountResponse>('/api/client/account'),
    updateAccount: (body: AccountUpdateBody) =>
        apiRequest<CreateCardResponse>('/api/client/account', {
            method: 'PATCH',
            body: JSON.stringify(body)
        }),
    getAccountEntries: (searchParams = '') =>
        apiRequest<AccountEntriesResponse>(`/api/client/account/entries${searchParams ? `?${searchParams}` : ''}`),
    deposit: (amount: number, reference?: string, description?: string) =>
        apiRequest<DepositWithdrawResponse>('/api/client/account/deposit', {
            method: 'POST',
            body: JSON.stringify({ amount, reference, description })
        }),
    withdraw: (amount: number, reference?: string, description?: string) =>
        apiRequest<DepositWithdrawResponse>('/api/client/account/withdraw', {
            method: 'POST',
            body: JSON.stringify({ amount, reference, description })
        }),
    getAvailableMerchants: () =>
        apiRequest<MerchantsResponse>('/api/client/merchants'),
    getTransactionById: (id: string) =>
        apiRequest<TransactionByIdResponse>(`/api/client/transactions/${id}`),
    getTransactionTimeline: (id: string) =>
        apiRequest<TransactionTimelineResponse>(`/api/client/transactions/${id}/timeline`),
};
