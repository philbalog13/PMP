import axios from 'axios';
import type { TransactionRequest, TransactionResponse, TransactionRecord } from '@/types/transaction';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8004';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

export async function processTransaction(
    data: Partial<TransactionRequest>
): Promise<TransactionResponse> {
    const response = await apiClient.post<TransactionResponse>('/api/v1/process', data);
    return response.data;
}

export async function getTransactionHistory(pan: string): Promise<TransactionRecord[]> {
    const response = await apiClient.get<{ data: { transactions: TransactionRecord[] } }>(
        `/api/v1/transactions/${pan}`
    );
    return response.data.data.transactions;
}

export async function simulateScenario(scenario: string): Promise<TransactionResponse> {
    const response = await apiClient.post<{ data: TransactionResponse }>(
        `/api/v1/simulate/${scenario}`
    );
    return response.data.data;
}

export default apiClient;
