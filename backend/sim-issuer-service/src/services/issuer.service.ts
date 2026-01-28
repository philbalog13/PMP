import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { getAccountByPan, debitAccount, creditAccount } from './account.service';

export interface AuthorizationRequest {
    transactionId: string;
    pan: string;
    amount: number;
    currency: string;
    merchantId: string;
    mcc: string;
    transactionType: string;
}

export interface AuthorizationResponse {
    transactionId: string;
    approved: boolean;
    responseCode: string;
    authorizationCode?: string;
    balance?: number;
    message?: string;
}

/**
 * Generate 6-digit authorization code
 */
const generateAuthCode = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

/**
 * Authorize a transaction
 */
export const authorizeTransaction = async (request: AuthorizationRequest): Promise<AuthorizationResponse> => {
    console.log(`[ISSUER] Processing authorization for ${request.transactionId}`);

    // 1. Get account
    const account = getAccountByPan(request.pan);
    if (!account) {
        console.log(`[ISSUER] Account not found for PAN`);
        return {
            transactionId: request.transactionId,
            approved: false,
            responseCode: '14', // Invalid card number
            message: 'Card not recognized'
        };
    }

    // 2. Check account status
    if (account.status !== 'ACTIVE') {
        console.log(`[ISSUER] Account blocked: ${account.status}`);
        return {
            transactionId: request.transactionId,
            approved: false,
            responseCode: account.status === 'BLOCKED' ? '62' : '78',
            message: `Card ${account.status.toLowerCase()}`
        };
    }

    // 3. Call fraud detection (optional, non-blocking)
    try {
        const fraudCheck = await axios.post(
            `${config.fraudDetection.url}/check`,
            {
                pan: request.pan,
                amount: request.amount,
                merchantId: request.merchantId,
                mcc: request.mcc
            },
            { timeout: config.fraudDetection.timeout }
        );

        if (fraudCheck.data.riskScore > 70) {
            console.log(`[ISSUER] High fraud risk: ${fraudCheck.data.riskScore}`);
            return {
                transactionId: request.transactionId,
                approved: false,
                responseCode: '59', // Suspected fraud
                message: 'Transaction flagged for review'
            };
        }
    } catch (error) {
        console.log(`[ISSUER] Fraud service unavailable, continuing...`);
        // Continue without fraud check
    }

    // 4. Call auth engine for rule validation
    try {
        const authEngineResponse = await axios.post(
            `${config.authEngine.url}/api/authorize`,
            {
                pan: request.pan,
                amount: request.amount,
                currency: request.currency,
                merchantId: request.merchantId,
                mcc: request.mcc,
                transactionType: request.transactionType,
                account: {
                    balance: account.balance,
                    dailyLimit: account.dailyLimit,
                    dailySpent: account.dailySpent,
                    monthlyLimit: account.monthlyLimit,
                    monthlySpent: account.monthlySpent
                }
            },
            { timeout: config.authEngine.timeout }
        );

        if (!authEngineResponse.data.approved) {
            console.log(`[ISSUER] Auth engine declined: ${authEngineResponse.data.responseCode}`);
            return {
                transactionId: request.transactionId,
                approved: false,
                responseCode: authEngineResponse.data.responseCode || '05',
                message: authEngineResponse.data.reason || 'Authorization declined'
            };
        }
    } catch (error: any) {
        console.log(`[ISSUER] Auth engine error, using local validation`);
        // Fallback to local validation
        if (account.balance < request.amount) {
            return {
                transactionId: request.transactionId,
                approved: false,
                responseCode: '51',
                message: 'Insufficient funds'
            };
        }
    }

    // 5. Process based on transaction type
    if (request.transactionType === 'PURCHASE' || request.transactionType === 'PREAUTH') {
        const debitResult = debitAccount(request.pan, request.amount);
        if (!debitResult.success) {
            console.log(`[ISSUER] Debit failed: ${debitResult.error}`);

            const responseCode = debitResult.error?.includes('Insufficient') ? '51' :
                debitResult.error?.includes('limit') ? '61' : '05';

            return {
                transactionId: request.transactionId,
                approved: false,
                responseCode,
                message: debitResult.error
            };
        }

        console.log(`[ISSUER] Transaction approved, new balance: ${debitResult.newBalance}`);
        return {
            transactionId: request.transactionId,
            approved: true,
            responseCode: '00',
            authorizationCode: generateAuthCode(),
            balance: debitResult.newBalance,
            message: 'Approved'
        };

    } else if (request.transactionType === 'REFUND' || request.transactionType === 'CANCEL') {
        const creditResult = creditAccount(request.pan, request.amount);
        if (!creditResult.success) {
            return {
                transactionId: request.transactionId,
                approved: false,
                responseCode: '05',
                message: creditResult.error
            };
        }

        return {
            transactionId: request.transactionId,
            approved: true,
            responseCode: '00',
            authorizationCode: generateAuthCode(),
            balance: creditResult.newBalance,
            message: 'Refund approved'
        };
    }

    return {
        transactionId: request.transactionId,
        approved: false,
        responseCode: '12', // Invalid transaction
        message: 'Unknown transaction type'
    };
};
