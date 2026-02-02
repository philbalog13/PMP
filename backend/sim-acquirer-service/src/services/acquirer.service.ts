import axios from 'axios';
import { config } from '../config';
import { validateMerchant, getMerchant } from './merchant.service';

export interface AcquirerRequest {
    transactionId: string;
    pan: string;
    amount: number;
    currency: string;
    merchantId: string;
    transactionType: string;
    cvv?: string;
    expiryMonth?: number;
    expiryYear?: number;
    terminalId: string;
    timestamp: string;
}

export interface AcquirerResponse {
    transactionId: string;
    approved: boolean;
    responseCode: string;
    authorizationCode?: string;
    merchantId: string;
    acquirerId: string;
    networkResponse?: any;
}

/**
 * Process transaction from POS
 */
export const processTransaction = async (request: AcquirerRequest): Promise<AcquirerResponse> => {
    console.log(`[ACQUIRER] Processing transaction ${request.transactionId}`);

    // Validate merchant
    const merchantValidation = validateMerchant(request.merchantId);
    if (!merchantValidation.valid) {
        console.log(`[ACQUIRER] Invalid merchant: ${merchantValidation.error}`);
        return {
            transactionId: request.transactionId,
            approved: false,
            responseCode: '03', // Invalid merchant
            merchantId: request.merchantId,
            acquirerId: config.acquirerId
        };
    }

    const merchant = merchantValidation.merchant!;

    // Generate ISO 8583 fields
    const now = new Date();
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    const hh = now.getHours().toString().padStart(2, '0');
    const min = now.getMinutes().toString().padStart(2, '0');
    const ss = now.getSeconds().toString().padStart(2, '0');

    // Format Expiry (YYMM) - default to 2026/12 if not provided
    const expYear = (request.expiryYear || 2026).toString().slice(-2).padStart(2, '0');
    const expMonth = (request.expiryMonth || 12).toString().padStart(2, '0');

    // Build network switch request (ISO 8583-like)
    const networkRequest = {
        mti: request.transactionType === 'PURCHASE' ? '0100' : '0400',
        pan: request.pan,
        processingCode: '000000', // Purchase/Default
        amount: request.amount,
        currency: request.currency,
        transmissionDateTime: `${mm}${dd}${hh}${min}${ss}`,
        localTransactionTime: `${hh}${min}${ss}`,
        localTransactionDate: `${mm}${dd}`,
        stan: Math.floor(Math.random() * 999999).toString().padStart(6, '0'),
        terminalId: request.terminalId,
        merchantId: request.merchantId,
        merchantCategoryCode: merchant.mcc,
        expiryDate: `${expYear}${expMonth}`,
        posEntryMode: '010', // Manual/Unknown
        acquirerReferenceNumber: `ARN${Date.now().toString().slice(-12)}`.padEnd(23, '0'),
        // Optional extras if allowed by schema (stripUnknown is true)
        transactionId: request.transactionId,
        transactionType: request.transactionType
    };

    try {
        console.log(`[ACQUIRER] Forwarding to network switch`);

        const response = await axios.post(
            `${config.networkSwitch.url}/transaction`,
            networkRequest,
            { timeout: config.networkSwitch.timeout }
        );

        const networkData = response.data.data || response.data;
        console.log(`[ACQUIRER] Network response: ${networkData.responseCode}`);

        return {
            transactionId: request.transactionId,
            approved: networkData.responseCode === '00',
            responseCode: networkData.responseCode,
            authorizationCode: networkData.authorizationCode,
            merchantId: request.merchantId,
            acquirerId: config.acquirerId,
            networkResponse: networkData
        };

    } catch (error: any) {
        console.error(`[ACQUIRER] Network error:`, error.message);

        if (error.response) {
            return {
                transactionId: request.transactionId,
                approved: false,
                responseCode: error.response.data?.responseCode || '96',
                merchantId: request.merchantId,
                acquirerId: config.acquirerId,
                networkResponse: error.response.data
            };
        }

        return {
            transactionId: request.transactionId,
            approved: false,
            responseCode: '91', // Issuer unavailable
            merchantId: request.merchantId,
            acquirerId: config.acquirerId
        };
    }
};

/**
 * Process network response (Phase 7.2)
 */
export const processResponse = async (networkResponse: any): Promise<AcquirerResponse> => {
    console.log(`[ACQUIRER] Processing network response for ${networkResponse.transactionId}`);

    // Simulate some acquirer-side processing or logging
    const processingTime = Math.floor(Math.random() * 50); // 0-50ms delay

    return {
        transactionId: networkResponse.transactionId,
        approved: networkResponse.responseCode === '00',
        responseCode: networkResponse.responseCode,
        authorizationCode: networkResponse.authorizationCode,
        merchantId: networkResponse.merchantId,
        acquirerId: config.acquirerId,
        networkResponse: networkResponse,
        // timestamp: new Date().toISOString()
    };
};
