import { useState, useCallback } from 'react';
import type { TransactionRequest, TransactionResponse } from '@/types/transaction';

interface UseTransactionResult {
    processTransaction: (data: TransactionRequest) => Promise<TransactionResponse | null>;
    loading: boolean;
    error: string | null;
    clearError: () => void;
}

export function useTransaction(): UseTransactionResult {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const processTransaction = useCallback(async (data: TransactionRequest): Promise<TransactionResponse | null> => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/transaction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Transaction failed';
            setError(message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        processTransaction,
        loading,
        error,
        clearError,
    };
}
