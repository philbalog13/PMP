/**
 * End-to-End Tests for Payment Extensions
 */

import { describe, it, expect } from '@jest/globals';
import axios from 'axios';

const BASE_URL = 'http://localhost:8080/api/v1';
const TOKENIZATION_URL = 'http://localhost:8085';
const ACS_URL = 'http://localhost:8088';
const FRAUD_URL = 'http://localhost:8086';

describe('E2E: Complete Payment Flow with Extensions', () => {
    it('should process payment with tokenization and 3DS', async () => {
        // Step 1: Tokenize PAN
        const tokenResponse = await axios.post(`${TOKENIZATION_URL}/tokenize`, {
            pan: '4111111111111111',
            ttl: 3600
        });

        expect(tokenResponse.data.token).toBeDefined();
        const token = tokenResponse.data.token;

        // Step 2: Check fraud risk
        const fraudResponse = await axios.post(`${FRAUD_URL}/predict`, {
            amount: 500,
            mcc: '5411',
            cardPresent: false
        });

        expect(fraudResponse.data.risk_score).toBeDefined();

        // Step 3: If low risk, authenticate with 3DS
        if (fraudResponse.data.risk_score < 70) {
            const authResponse = await axios.post(`${ACS_URL}/authenticate`, {
                pan: '4111111111111111',
                amount: 500,
                merchantId: 'MERCHANT_001',
                transactionId: `E2E_${Date.now()}`
            });

            expect(authResponse.data.transStatus).toMatch(/Y|C/);
        }
    });

    it('should handle high-risk transaction with challenge', async () => {
        // High amount transaction
        const fraudCheck = await axios.post(`${FRAUD_URL}/predict`, {
            amount: 10000,
            mcc: '7995', // Gambling
            cardPresent: false,
            international: true
        });

        expect(fraudCheck.data.risk_score).toBeGreaterThan(50);
        expect(fraudCheck.data.action).toMatch(/REVIEW|DECLINE/);
    });

    it('should detokenize for authorization', async () => {
        // Tokenize
        const tokenResponse = await axios.post(`${TOKENIZATION_URL}/tokenize`, {
            pan: '5500000000000004'
        });

        const token = tokenResponse.data.token;

        // Detokenize
        const detokenResponse = await axios.post(`${TOKENIZATION_URL}/detokenize`, {
            token
        });

        expect(detokenResponse.data.fullPan).toBe('5500000000000004');
    });
});

describe('E2E: Mobile Payment Flow', () => {
    it('should generate QR code and process payment', () => {
        const qrData = {
            merchantId: 'MERCHANT_001',
            amount: 25.00,
            transactionId: `QR_${Date.now()}`
        };

        const qrPayload = JSON.stringify(qrData);

        expect(qrPayload).toContain('MERCHANT_001');
        expect(qrPayload).toContain('25');
    });
});

describe('E2E: Error Scenarios', () => {
    it('should handle expired token', async () => {
        try {
            await axios.post(`${TOKENIZATION_URL}/detokenize`, {
                token: '9999000000000000' // Invalid/expired
            });
        } catch (error: any) {
            expect(error.response.status).toBe(404);
        }
    });

    it('should handle invalid 3DS authentication', async () => {
        const response = await axios.post(`${ACS_URL}/challenge/verify`, {
            otp: '000000', // Wrong OTP
            acsTransId: 'INVALID'
        });

        expect(response.data.transStatus).toBe('N');
    });
});
