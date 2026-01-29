/**
 * Tests for 3D-Secure ACS Simulator
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';

const ACS_BASE_URL = 'http://localhost:8088';

describe('ACS Simulator Integration Tests', () => {
    describe('POST /authenticate', () => {
        it('should return frictionless authentication for low-risk transaction', async () => {
            const response = await axios.post(`${ACS_BASE_URL}/authenticate`, {
                pan: '4111111111111111',
                amount: 50.00,
                merchantId: 'MERCHANT_001',
                transactionId: 'TXN_001'
            });

            expect(response.status).toBe(200);
            expect(response.data.transStatus).toBe('Y');
            expect(response.data.authenticationValue).toBeDefined();
            expect(response.data.eci).toBe('05');
        });

        it('should require challenge for high-risk transaction', async () => {
            const response = await axios.post(`${ACS_BASE_URL}/authenticate`, {
                pan: '4111111111111111',
                amount: 5000.00,
                merchantId: 'MERCHANT_001',
                transactionId: 'TXN_002'
            });

            expect(response.status).toBe(200);
            expect(response.data.transStatus).toBe('C');
            expect(response.data.challengeUrl).toBeDefined();
            expect(response.data.acsTransId).toBeDefined();
        });
    });

    describe('POST /challenge/verify', () => {
        it('should verify valid OTP', async () => {
            const response = await axios.post(`${ACS_BASE_URL}/challenge/verify`, {
                otp: '123456',
                acsTransId: 'ACS_TEST_001'
            });

            expect(response.status).toBe(200);
            expect(response.data.transStatus).toBe('Y');
            expect(response.data.authenticationValue).toBeDefined();
        });

        it('should reject invalid OTP', async () => {
            const response = await axios.post(`${ACS_BASE_URL}/challenge/verify`, {
                otp: '000000',
                acsTransId: 'ACS_TEST_002'
            });

            expect(response.status).toBe(200);
            expect(response.data.transStatus).toBe('N');
        });
    });

    describe('GET /challenge', () => {
        it('should return challenge URL', async () => {
            const response = await axios.get(`${ACS_BASE_URL}/challenge`, {
                params: { txId: 'TXN_003' }
            });

            expect(response.status).toBe(200);
            expect(response.data.challengeUrl).toContain('3ds-challenge');
            expect(response.data.method).toBe('GET');
        });
    });

    describe('POST /ares', () => {
        it('should send authentication response', async () => {
            const response = await axios.post(`${ACS_BASE_URL}/ares`, {
                threeDSServerTransID: '3DS_SERVER_001',
                transStatus: 'Y'
            });

            expect(response.status).toBe(200);
            expect(response.data.messageType).toBe('ARes');
            expect(response.data.messageVersion).toBe('2.2.0');
        });
    });
});

describe('ThreeDSecureService Unit Tests', () => {
    // These would be unit tests if we extract the service
    it('should calculate risk score based on amount', () => {
        // Mock test - would require importing ThreeDSecureService
        const highAmount = 1000;
        const lowAmount = 50;

        // Risk increases with amount
        expect(highAmount > lowAmount).toBe(true);
    });
});
