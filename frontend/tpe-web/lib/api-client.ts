import axios from 'axios';
import type { TransactionRequest, TransactionResponse, TransactionRecord } from '@/types/transaction';

// API Gateway URL - unified entry point for all services
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Simulation mode - enabled only if API_BASE_URL is not provided or explicitly requested
const IS_SIMULATION = process.env.NEXT_PUBLIC_ENABLE_SIMULATION === 'true';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// Mock Response Generator for Demo
const mockOrchestration = (data: any): OrchestratedResult => ({
    success: true,
    approved: parseFloat(data.amount || '0') < 1000,
    responseCode: parseFloat(data.amount || '0') < 1000 ? '00' : '51',
    responseMessage: parseFloat(data.amount || '0') < 1000 ? 'Approved' : 'Insufficient Funds',
    authCode: Math.random().toString(36).substring(7).toUpperCase(),
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

/**
 * Process transaction through unified orchestration flow
 * Coordinates Fraud Detection → 3D-Secure → Authorization
 */
export async function processTransaction(
    data: Partial<TransactionRequest>
): Promise<OrchestratedResult> {
    if (IS_SIMULATION) {
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate net delay
        return mockOrchestration(data);
    }
    const response = await apiClient.post<OrchestratedResult>('/api/transaction/process', data);
    return response.data;
}

/**
 * Verify 3D-Secure challenge with OTP
 */
export async function verifyChallenge(
    acsTransId: string,
    otp: string
): Promise<OrchestratedResult> {
    const response = await apiClient.post<OrchestratedResult>('/api/transaction/verify-challenge', {
        acsTransId,
        otp
    });
    return response.data;
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

