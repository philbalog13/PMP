import axios, { AxiosHeaders } from 'axios';
import type { TransactionRequest, TransactionResponse, TransactionRecord } from '@/types/transaction';

// Use same-origin API in browser (works with Next rewrites + Docker DNS)
const API_BASE_URL = typeof window === 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
    : '';

// Simulation mode - enabled only if explicitly requested
const IS_SIMULATION = process.env.NEXT_PUBLIC_ENABLE_SIMULATION === 'true';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

let devTokenPromise: Promise<string | null> | null = null;

type ApiObject = Record<string, unknown>;

export interface ClientCardApi {
    id: string;
    masked_pan?: string;
    card_type?: string;
    network?: string;
    balance?: number | string;
    status?: string;
    threeds_enrolled?: boolean;
    [key: string]: unknown;
}

export interface MerchantTerminalApi {
    terminalId?: string;
    merchantName?: string;
    mcc?: string;
    locationName?: string;
    city?: string;
    [key: string]: unknown;
}

export interface MerchantApi {
    id: string;
    username?: string;
    displayName?: string;
    terminals?: MerchantTerminalApi[];
    [key: string]: unknown;
}

export interface ClientCardsResponse extends ApiObject {
    cards?: ClientCardApi[];
}

export interface MerchantsResponse extends ApiObject {
    merchants?: MerchantApi[];
}

export interface SimulatedClientPaymentResponse extends ApiObject {
    success: boolean;
    error?: string;
    responseCode?: string;
    response_code?: string;
    transaction?: {
        id?: string;
        transaction_id?: string;
        transactionId?: string;
        stan?: string;
        authorization_code?: string;
        authorizationCode?: string;
        response_code?: string;
        [key: string]: unknown;
    };
    ledgerBooked?: boolean;
}

export interface ClientTransactionsResponse extends ApiObject {
    transactions?: Array<Record<string, unknown>>;
}

export interface MerchantTransactionsResponse extends ApiObject {
    transactions?: Array<Record<string, unknown>>;
}

const asRecord = (value: unknown): ApiObject => (
    typeof value === 'object' && value !== null
        ? (value as ApiObject)
        : {}
);

const toNumber = (value: unknown, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

function readTokenFromCookie(): string | null {
    if (typeof document === 'undefined') return null;
    const tokenEntry = document.cookie
        .split('; ')
        .find((item) => item.startsWith('token='));
    if (!tokenEntry) return null;

    const cookieToken = tokenEntry.split('=')[1];
    return cookieToken ? decodeURIComponent(cookieToken) : null;
}

function getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;

    const localToken = window.localStorage.getItem('token');
    if (localToken) return localToken;

    const cookieToken = readTokenFromCookie();
    if (cookieToken) {
        window.localStorage.setItem('token', cookieToken);
        return cookieToken;
    }

    return null;
}

async function ensureAuthToken(): Promise<string | null> {
    const existingToken = getStoredToken();
    if (existingToken) return existingToken;

    // Never auto-generate token outside browser/simulation contexts.
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') {
        return null;
    }

    if (!devTokenPromise) {
        devTokenPromise = fetch('/api/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'tpe-terminal', role: 'marchand' }),
        })
            .then(async (response) => {
                if (!response.ok) return null;
                const data = await response.json();
                const token = data?.token ?? null;
                if (token) {
                    window.localStorage.setItem('token', token);
                }
                return token;
            })
            .catch(() => null)
            .finally(() => {
                devTokenPromise = null;
            });
    }

    return devTokenPromise;
}

apiClient.interceptors.request.use(async (config) => {
    if (IS_SIMULATION) return config;

    const url = config.url || '';
    const publicEndpoints = [
        '/api/health',
        '/health',
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/refresh',
        '/api/auth/token',
    ];

    if (publicEndpoints.some((path) => url.includes(path))) {
        return config;
    }

    const token = await ensureAuthToken();
    if (!token) return config;

    if (!config.headers) {
        config.headers = new AxiosHeaders();
    }

    if (config.headers instanceof AxiosHeaders) {
        config.headers.set('Authorization', `Bearer ${token}`);
    } else {
        const headers = AxiosHeaders.from(config.headers || {});
        headers.set('Authorization', `Bearer ${token}`);
        config.headers = headers;
    }

    return config;
});

// Mock Response Generator for Demo
const mockOrchestration = (data: Partial<TransactionRequest>): OrchestratedResult => {
    const amount = toNumber(data.amount, 0);
    const approved = amount < 1000;

    return {
    success: true,
    approved,
    responseCode: approved ? '00' : '51',
    responseMessage: approved ? 'Approved' : 'Insufficient Funds',
    authCode: Math.random().toString(36).substring(7).toUpperCase(),
    authorizationCode: Math.random().toString(36).substring(7).toUpperCase(),
    processingTime: 120,
    flowSteps: ['Fraud Check', 'Authorization', 'Response'],
    fraudCheck: {
        riskScore: 10,
        riskLevel: 'LOW',
        recommendation: 'APPROVE'
    }
};
};

/**
 * Orchestrated Transaction Result
 */
export interface OrchestratedResult {
    success: boolean;
    approved: boolean;
    responseCode: string;
    responseMessage: string;
    authCode?: string;
    authorizationCode?: string;
    fraudCheck?: {
        riskScore: number;
        riskLevel: string;
        recommendation: string;
    };
    threeDSResult?: {
        transStatus: string;
        eci?: string;
        challengeUrl?: string;
        acsTransId?: string;
    };
    processingTime: number;
    flowSteps: string[];
}

function normalizeOrchestratedResult(payload: unknown): OrchestratedResult {
    const root = asRecord(payload);
    const nestedData = root.data;
    const source = (typeof nestedData === 'object' && nestedData !== null)
        ? asRecord(nestedData)
        : root;

    const approved = Boolean(source.approved);
    const responseCode = typeof source.responseCode === 'string'
        ? source.responseCode
        : (approved ? '00' : '05');
    const responseMessage = typeof source.responseMessage === 'string'
        ? source.responseMessage
        : (approved ? 'Approved' : 'Transaction declined');
    const authCode = typeof source.authCode === 'string'
        ? source.authCode
        : (typeof source.authorizationCode === 'string' ? source.authorizationCode : undefined);
    const fraudCheck = (typeof source.fraudCheck === 'object' && source.fraudCheck !== null)
        ? (source.fraudCheck as OrchestratedResult['fraudCheck'])
        : undefined;
    const threeDSResult = (typeof source.threeDSResult === 'object' && source.threeDSResult !== null)
        ? (source.threeDSResult as OrchestratedResult['threeDSResult'])
        : undefined;
    const flowSteps = Array.isArray(source.flowSteps)
        ? source.flowSteps.map((step) => String(step))
        : [];

    return {
        success: Boolean(root.success ?? source.success ?? approved),
        approved,
        responseCode,
        responseMessage,
        authCode,
        authorizationCode: typeof source.authorizationCode === 'string'
            ? source.authorizationCode
            : (typeof source.authCode === 'string' ? source.authCode : undefined),
        fraudCheck,
        threeDSResult,
        processingTime: typeof source.processingTime === 'number' ? source.processingTime : 0,
        flowSteps,
    };
}

/**
 * Process transaction through unified orchestration flow
 * Coordinates Fraud Detection -> 3D-Secure -> Authorization
 */
export async function processTransaction(
    data: Partial<TransactionRequest>
): Promise<OrchestratedResult> {
    if (IS_SIMULATION) {
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate net delay
        return mockOrchestration(data);
    }

    const response = await apiClient.post(
        '/api/transaction/process',
        data,
        {
            // 402 = business decline, not transport failure.
            validateStatus: (status) => (status >= 200 && status < 300) || status === 402,
        }
    );

    return normalizeOrchestratedResult(response.data);
}

/**
 * Verify 3D-Secure challenge with OTP
 */
export async function verifyChallenge(
    acsTransId: string,
    otp: string
): Promise<OrchestratedResult> {
    const response = await apiClient.post(
        '/api/transaction/verify-challenge',
        { acsTransId, otp }
    );

    return normalizeOrchestratedResult(response.data);
}

/**
 * Get transaction history for a PAN
 */
export async function getTransactionHistory(pan: string): Promise<TransactionRecord[]> {
    const response = await apiClient.get<{ data: { transactions: TransactionRecord[] } }>(
        `/api/authorize/history/${pan}`
    );
    return response.data.data.transactions;
}

/**
 * Simulate specific authorization scenario
 */
export async function simulateScenario(scenario: string): Promise<TransactionResponse> {
    const response = await apiClient.post<{ data: TransactionResponse }>(
        `/api/authorize/simulate`,
        { scenario }
    );
    return response.data.data;
}

/**
 * Get integration health status (Service Orchestration Health)
 */
export async function getIntegrationHealth(): Promise<Record<string, boolean>> {
    const response = await apiClient.get<{ services: Record<string, boolean> }>(
        '/api/integration/health'
    );
    return response.data.services;
}

/**
 * System Health Check (Boot Sequence)
 * Calls GET /api/health as defined in sequence diagram
 */
export async function checkSystemHealth(): Promise<boolean> {
    if (IS_SIMULATION) {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Network delay simulation
        return true;
    }

    try {
        const response = await apiClient.get('/api/health');
        return response.status === 200 || response.status === 207;
    } catch (e) {
        console.error('Boot health check failed', e);
        return false;
    }
}

/**
 * Legacy direct process (bypasses orchestration)
 */
export async function processDirectTransaction(
    data: Partial<TransactionRequest>
): Promise<TransactionResponse> {
    const response = await apiClient.post<TransactionResponse>('/api/route/process', data);
    return response.data;
}

/**
 * Get client's virtual cards
 */
export async function getClientCards(): Promise<ClientCardsResponse> {
    const response = await apiClient.get<ClientCardsResponse>('/api/client/cards');
    return response.data ?? {};
}

/**
 * Get available merchants for payment
 */
export async function getAvailableMerchants(): Promise<MerchantsResponse> {
    const response = await apiClient.get<MerchantsResponse>('/api/client/merchants');
    return response.data ?? {};
}

/**
 * Simulate a client payment (creates real DB records)
 */
export async function simulateClientPayment(data: {
    cardId: string;
    merchantId: string;
    amount: number;
    use3DS?: boolean;
    paymentType?: string;
}): Promise<SimulatedClientPaymentResponse> {
    const response = await apiClient.post<SimulatedClientPaymentResponse>('/api/client/transactions/simulate', data, {
        // Accept 400 (business decline) and 404 (card/merchant not found) as valid responses
        validateStatus: (status) => (status >= 200 && status < 300) || status === 400 || status === 404,
    });
    const payload = asRecord(response.data);
    const rawTransaction = asRecord(payload.transaction);
    const transaction = Object.keys(rawTransaction).length > 0
        ? {
            ...rawTransaction,
            id: typeof rawTransaction.id === 'string' ? rawTransaction.id : undefined,
            transaction_id: typeof rawTransaction.transaction_id === 'string' ? rawTransaction.transaction_id : undefined,
            transactionId: typeof rawTransaction.transactionId === 'string' ? rawTransaction.transactionId : undefined,
            stan: typeof rawTransaction.stan === 'string' ? rawTransaction.stan : undefined,
            authorization_code: typeof rawTransaction.authorization_code === 'string' ? rawTransaction.authorization_code : undefined,
            authorizationCode: typeof rawTransaction.authorizationCode === 'string' ? rawTransaction.authorizationCode : undefined,
            response_code: typeof rawTransaction.response_code === 'string' ? rawTransaction.response_code : undefined,
        }
        : undefined;
    return {
        success: Boolean(payload.success),
        ...payload,
        error: typeof payload.error === 'string' ? payload.error : undefined,
        responseCode: typeof payload.responseCode === 'string' ? payload.responseCode : undefined,
        response_code: typeof payload.response_code === 'string' ? payload.response_code : undefined,
        transaction,
        ledgerBooked: typeof payload.ledgerBooked === 'boolean' ? payload.ledgerBooked : undefined
    };
}

/**
 * Get client's own transactions from DB
 */
export async function getMyTransactions(params?: { limit?: number; page?: number }): Promise<ClientTransactionsResponse> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.page) query.set('page', String(params.page));
    const response = await apiClient.get<ClientTransactionsResponse>(`/api/client/transactions?${query.toString()}`);
    return response.data ?? {};
}

/**
 * Get merchant transactions from DB
 */
export async function getMerchantTransactions(params?: { limit?: number; page?: number }): Promise<MerchantTransactionsResponse> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.page) query.set('page', String(params.page));
    const queryString = query.toString();
    const response = await apiClient.get<MerchantTransactionsResponse>(
        queryString ? `/api/merchant/transactions?${queryString}` : '/api/merchant/transactions'
    );
    return response.data ?? {};
}

/**
 * Get one merchant transaction by ID
 */
export async function getMerchantTransactionById(id: string): Promise<ApiObject> {
    const response = await apiClient.get<ApiObject>(`/api/merchant/transactions/${id}`);
    return response.data ?? {};
}

/**
 * Get one merchant transaction timeline
 */
export async function getMerchantTransactionTimeline(id: string): Promise<ApiObject> {
    const response = await apiClient.get<ApiObject>(`/api/merchant/transactions/${id}/timeline`);
    return response.data ?? {};
}

/**
 * Get a single transaction by ID
 */
export async function getTransactionById(id: string): Promise<ApiObject> {
    const response = await apiClient.get<ApiObject>(`/api/client/transactions/${id}`);
    return response.data ?? {};
}

/**
 * Get transaction timeline (processing steps)
 */
export async function getTransactionTimeline(id: string): Promise<ApiObject> {
    const response = await apiClient.get<ApiObject>(`/api/client/transactions/${id}/timeline`);
    return response.data ?? {};
}

export default apiClient;
