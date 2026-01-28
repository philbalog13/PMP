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

    // Build network switch request (ISO 8583-like)
    const networkRequest = {
        transactionId: request.transactionId,
        messageType: request.transactionType === 'PURCHASE' ? '0100' : '0400',
        pan: request.pan,
        amount: request.amount,
        currency: request.currency,
        mcc: merchant.mcc,
        merchantId: request.merchantId,
        merchantName: merchant.name,
        merchantCity: merchant.city,
        merchantCountry: merchant.country,
        acquirerId: config.acquirerId,
        terminalId: request.terminalId,
        transactionType: request.transactionType,
        cvv: request.cvv,
        expiryMonth: request.expiryMonth,
        expiryYear: request.expiryYear,
        timestamp: request.timestamp,
        localTime: new Date().toISOString()
    };

    try {
        console.log(`[ACQUIRER] Forwarding to network switch`);

        const response = await axios.post(
            `${config.networkSwitch.url}/route`,
            networkRequest,
            { timeout: config.networkSwitch.timeout }
        );

        console.log(`[ACQUIRER] Network response: ${response.data.responseCode}`);

        return {
            transactionId: request.transactionId,
            approved: response.data.responseCode === '00',
            responseCode: response.data.responseCode,
            authorizationCode: response.data.authorizationCode,
            merchantId: request.merchantId,
            acquirerId: config.acquirerId,
            networkResponse: response.data
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
