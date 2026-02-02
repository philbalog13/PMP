import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { TransactionTimeline, createTimelineContext, markTimestamp, getElapsedMs } from '../models/timeline.model';

export interface TransactionRequest {
    pan: string;
    amount: number;
    currency: string;
    merchantId?: string;
    transactionType: 'PURCHASE' | 'REFUND' | 'PREAUTH' | 'CANCEL';
    cvv?: string;
    expiryMonth?: number;
    expiryYear?: number;
    pinBlock?: string;
}

export interface Transaction {
    id: string;
    pan: string;
    maskedPan: string;
    token?: string;
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
    timeline?: Partial<TransactionTimeline>;
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
 * Tokenize PAN (T0+200ms)
 */
const tokenizePan = async (pan: string): Promise<string> => {
    try {
        const response = await axios.post(
            `${config.tokenizationService?.url || 'http://localhost:8014'}/tokenize`,
            { pan, format: 'FPE' },
            { timeout: 2000 }
        );
        return response.data.token;
    } catch (error) {
        console.log('[POS] Tokenization unavailable, using masked PAN as fallback');
        return 'TOK_' + maskPan(pan);
    }
};

/**
 * Encrypt PIN (T0+300ms) - Simulation
 */
const encryptPin = async (pin: string): Promise<string> => {
    // In real implementation, this would call HSM
    return 'PINBLK_' + Math.random().toString(36).substring(7);
};

/**
 * Initiate a new transaction with full timeline tracking
 */
export const initiateTransaction = async (request: TransactionRequest): Promise<Transaction> => {
    const transactionId = uuidv4();
    const ctx = createTimelineContext(transactionId);

    // T0: Start
    markTimestamp(ctx, 'preparation', 'start');
    console.log(`[POS] T0: Transaction ${transactionId} started`);

    // T0+100ms: Validation
    markTimestamp(ctx, 'preparation', 'validation');
    console.log(`[POS] T0+${getElapsedMs(ctx)}ms: Data validated`);

    // T0+200ms: Tokenization
    const token = await tokenizePan(request.pan);
    markTimestamp(ctx, 'preparation', 'tokenization');
    console.log(`[POS] T0+${getElapsedMs(ctx)}ms: PAN tokenized`);

    // T0+300ms: PIN Encryption
    const pinBlock = request.pinBlock || await encryptPin('****');
    markTimestamp(ctx, 'preparation', 'pinEncryption');
    console.log(`[POS] T0+${getElapsedMs(ctx)}ms: PIN encrypted`);

    const transaction: Transaction = {
        id: transactionId,
        pan: request.pan,
        maskedPan: maskPan(request.pan),
        token,
        amount: request.amount,
        currency: request.currency || 'EUR',
        merchantId: request.merchantId || config.merchantId,
        transactionType: request.transactionType,
        status: 'PENDING',
        responseCode: '',
        createdAt: new Date(),
        timeline: ctx.timeline
    };

    transactions.set(transactionId, transaction);

    // T0+500ms: Ready
    markTimestamp(ctx, 'preparation', 'ready');
    console.log(`[POS] T0+${getElapsedMs(ctx)}ms: Message ready`);

    try {
        // T0+600ms: Send to acquirer
        markTimestamp(ctx, 'network', 'acquirerSent');
        console.log(`[POS] T0+${getElapsedMs(ctx)}ms: Forwarding to acquirer`);

        const acquirerPayload = {
            transactionId,
            pan: request.pan,
            token,
            pinBlock,
            amount: request.amount,
            currency: request.currency || 'EUR',
            merchantId: transaction.merchantId,
            transactionType: request.transactionType,
            cvv: request.cvv,
            expiryMonth: request.expiryMonth,
            expiryYear: request.expiryYear,
            terminalId: 'POS001',
            timestamp: new Date().toISOString(),
            timeline: ctx.timeline
        };

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
        transaction.timeline = response.data.timeline || ctx.timeline;

        transactions.set(transactionId, transaction);
        console.log(`[POS] Transaction ${transactionId} completed: ${transaction.status}`);

    } catch (error: any) {
        console.error(`[POS] Transaction ${transactionId} error:`, error.message);

        if (error.response) {
            transaction.status = 'DECLINED';
            transaction.responseCode = error.response.data?.responseCode || '96';
            transaction.acquirerResponse = error.response.data;
        } else if (error.code === 'ECONNREFUSED') {
            transaction.status = 'ERROR';
            transaction.responseCode = '91';
        } else {
            transaction.status = 'ERROR';
            transaction.responseCode = '96';
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

/**
 * Format response for TPE (Phase 7.3)
 */
export const formatForTPE = (networkResponse: any): any => {
    // Logic to format message based on response code and card type
    const isApproved = networkResponse.approved;
    const lang = 'FR'; // Default to French

    let message = isApproved ? 'PAIEMENT ACCEPTE' : 'PAIEMENT REFUSE';
    if (!isApproved && networkResponse.responseCode === '51') {
        message = 'FONDS INSUFFISANTS';
    } else if (!isApproved && networkResponse.responseCode === '55') {
        message = 'CODE PIN INCORRECT';
    }

    return {
        ...networkResponse,
        userNotification: message,
        merchantNotification: `TRANS ${networkResponse.transactionId} : ${networkResponse.responseCode}`,
        systemAlert: isApproved ? 'Success' : `Declined: ${networkResponse.responseCode}`
    };
};

/**
 * Display message on TPE (Phase 7.4 simulation)
 */
export const displayToUser = async (message: string, status: 'SUCCESS' | 'ERROR'): Promise<void> => {
    console.log(`[POS DISPLAY] ------------------------------`);
    console.log(`[POS DISPLAY] | ${status === 'SUCCESS' ? '✅' : '❌'} ${message.padEnd(24)} |`);
    console.log(`[POS DISPLAY] ------------------------------`);
    // In a real device, this would call hardware drivers
};
