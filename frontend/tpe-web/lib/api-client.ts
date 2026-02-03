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
        (config.headers as any).Authorization = `Bearer ${token}`;
    }

    return config;
});

// Mock Response Generator for Demo
const mockOrchestration = (data: any): OrchestratedResult => ({
    success: true,
    approved: parseFloat(data.amount || '0') < 1000,
    responseCode: parseFloat(data.amount || '0') < 1000 ? '00' : '51',
    responseMessage: parseFloat(data.amount || '0') < 1000 ? 'Approved' : 'Insufficient Funds',
    authCode: Math.random().toString(36).substring(7).toUpperCase(),
    authorizationCode: Math.random().toString(36).substring(7).toUpperCase(),
    processingTime: 120,
    flowSteps: ['Fraud Check', 'Authorization', 'Response'],
    fraudCheck: {
        riskScore: 10,
        riskLevel: 'LOW',
        recommendation: 'APPROVE'
    }
});

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

function normalizeOrchestratedResult(payload: any): OrchestratedResult {
    const source = (payload?.data && typeof payload.data === 'object')
        ? payload.data
        : (payload || {});

    const approved = Boolean(source.approved);
    const responseCode = typeof source.responseCode === 'string'
        ? source.responseCode
        : (approved ? '00' : '05');
    const responseMessage = typeof source.responseMessage === 'string'
        ? source.responseMessage
        : (approved ? 'Approved' : 'Transaction declined');
    const authCode = source.authCode || source.authorizationCode;

    return {
        success: Boolean(payload?.success ?? source?.success ?? approved),
        approved,
        responseCode,
        responseMessage,
        authCode,
        authorizationCode: source.authorizationCode || source.authCode,
        fraudCheck: source.fraudCheck,
        threeDSResult: source.threeDSResult,
        processingTime: typeof source.processingTime === 'number' ? source.processingTime : 0,
        flowSteps: Array.isArray(source.flowSteps) ? source.flowSteps : [],
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

export default apiClient;
