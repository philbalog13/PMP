import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

export interface TransactionRequest {
    pan: string;
    amount: number;
    currency: string;
    merchantId?: string;
    transactionType: 'PURCHASE' | 'REFUND' | 'PREAUTH' | 'CANCEL';
    cvv?: string;
    expiryMonth?: number;
    expiryYear?: number;
}

export interface Transaction {
    id: string;
    pan: string;
    maskedPan: string;
    amount: number;
    currency: string;
    merchantId: string;
    transactionType: string;
    status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR';
    responseCode: string;
    authorizationCode?: string;
    createdAt: Date;
    completedAt?: Date;
    acquirerResponse?: any;
}

// In-memory transaction storage
const transactions: Map<string, Transaction> = new Map();

/**
 * Mask PAN for storage
 */
const maskPan = (pan: string): string => {
    if (pan.length < 12) return pan;
    return pan.substring(0, 4) + '*'.repeat(pan.length - 8) + pan.substring(pan.length - 4);
};

/**
 * Initiate a new transaction
 */
export const initiateTransaction = async (request: TransactionRequest): Promise<Transaction> => {
    const transactionId = uuidv4();

    const transaction: Transaction = {
        id: transactionId,
        pan: request.pan,
        maskedPan: maskPan(request.pan),
        amount: request.amount,
        currency: request.currency || 'EUR',
        merchantId: request.merchantId || config.merchantId,
        transactionType: request.transactionType,
        status: 'PENDING',
        responseCode: '',
        createdAt: new Date()
    };

    transactions.set(transactionId, transaction);

    try {
        // Forward to acquirer service
        const acquirerPayload = {
            transactionId,
            pan: request.pan,
            amount: request.amount,
            currency: request.currency || 'EUR',
            merchantId: transaction.merchantId,
            transactionType: request.transactionType,
            cvv: request.cvv,
            expiryMonth: request.expiryMonth,
            expiryYear: request.expiryYear,
            terminalId: 'POS001',
            timestamp: new Date().toISOString()
        };

        console.log(`[POS] Forwarding transaction ${transactionId} to acquirer`);

        const response = await axios.post(
            `${config.acquirerService.url}/process`,
            acquirerPayload,
            { timeout: config.acquirerService.timeout }
        );

        // Update transaction with response
        transaction.status = response.data.approved ? 'APPROVED' : 'DECLINED';
        transaction.responseCode = response.data.responseCode || '00';
        transaction.authorizationCode = response.data.authorizationCode;
        transaction.completedAt = new Date();
        transaction.acquirerResponse = response.data;

        transactions.set(transactionId, transaction);

        console.log(`[POS] Transaction ${transactionId} completed: ${transaction.status}`);

    } catch (error: any) {
        console.error(`[POS] Transaction ${transactionId} error:`, error.message);

        // Handle specific errors
        if (error.response) {
            transaction.status = 'DECLINED';
            transaction.responseCode = error.response.data?.responseCode || '96';
            transaction.acquirerResponse = error.response.data;
        } else if (error.code === 'ECONNREFUSED') {
            transaction.status = 'ERROR';
            transaction.responseCode = '91'; // Issuer unavailable
        } else {
            transaction.status = 'ERROR';
            transaction.responseCode = '96'; // System malfunction
        }
        transaction.completedAt = new Date();
        transactions.set(transactionId, transaction);
    }

    return transaction;
};

/**
 * Get transaction by ID
 */
export const getTransaction = (id: string): Transaction | null => {
    return transactions.get(id) || null;
};

/**
 * Get all transactions
 */
export const getAllTransactions = (limit: number = 50): Transaction[] => {
    const all = Array.from(transactions.values());
    return all.slice(-limit).reverse();
};

/**
 * Cancel a transaction
 */
export const cancelTransaction = async (transactionId: string): Promise<Transaction | null> => {
    const original = transactions.get(transactionId);
    if (!original) return null;

    if (original.status !== 'APPROVED') {
        return null;
    }

    // Create reversal transaction
    const reversal = await initiateTransaction({
        pan: original.pan,
        amount: original.amount,
        currency: original.currency,
        merchantId: original.merchantId,
        transactionType: 'CANCEL'
    });

    return reversal;
};
