import axios from 'axios';
import { config, testData } from '../config';

describe('🏛️ Issuer Service Tests', () => {
    const issuerUrl = config.services.issuer;

    describe('GET /accounts', () => {
        it('should list all accounts', async () => {
            const response = await axios.get(`${issuerUrl}/accounts`);
            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(Array.isArray(response.data.data)).toBe(true);
        });

        it('should mask PANs in response', async () => {
            const response = await axios.get(`${issuerUrl}/accounts`);
            const account = response.data.data[0];
            // PAN should be masked (e.g., 4111****1111)
            expect(account.pan).toMatch(/\d{4}\*+\d{4}/);
        });
    });

    describe('GET /accounts/:pan', () => {
        it('should return account for valid PAN', async () => {
            const response = await axios.get(`${issuerUrl}/accounts/${testData.cards.valid.pan}`);
            expect(response.status).toBe(200);
            expect(response.data.data.balance).toBeDefined();
            expect(response.data.data.currency).toBe('EUR');
        });

        it('should return 404 for non-existent PAN', async () => {
            const response = await axios.get(`${issuerUrl}/accounts/9999888877776666`);
            expect(response.status).toBe(404);
        });
    });

    describe('POST /authorize', () => {
        it('should authorize valid transaction', async () => {
            const response = await axios.post(`${issuerUrl}/authorize`, {
                transactionId: 'TEST-001',
                pan: testData.cards.valid.pan,
                amount: 25.00,
                currency: 'EUR',
                merchantId: 'MERCHANT001',
                mcc: '5411',
                transactionType: 'PURCHASE'
            });

            expect(response.status).toBe(200);
            if (response.data.approved) {
                expect(response.data.authorizationCode).toBeDefined();
                expect(response.data.responseCode).toBe('00');
            }
        });

        it('should decline for insufficient funds', async () => {
            const response = await axios.post(`${issuerUrl}/authorize`, {
                transactionId: 'TEST-002',
                pan: testData.cards.insufficientFunds.pan,
                amount: 500.00, // More than €10 balance
                currency: 'EUR',
                merchantId: 'MERCHANT001',
                mcc: '5411',
                transactionType: 'PURCHASE'
            });

            expect(response.status).toBe(200);
            expect(response.data.approved).toBe(false);
            expect(response.data.responseCode).toBe('51');
        });

        it('should include educational information', async () => {
            const response = await axios.post(`${issuerUrl}/authorize`, {
                transactionId: 'TEST-003',
                pan: testData.cards.valid.pan,
                amount: 10.00,
                currency: 'EUR',
                merchantId: 'MERCHANT001',
                mcc: '5411',
                transactionType: 'PURCHASE'
            });

            expect(response.data._educational).toBeDefined();
            expect(response.data._educational.issuerRole).toBeDefined();
        });
    });

    describe('PATCH /accounts/:pan/balance', () => {
        it('should update account balance', async () => {
            // Get current balance
            const getResponse = await axios.get(`${issuerUrl}/accounts/${testData.cards.valid.pan}`);
            const currentBalance = getResponse.data.data.balance;

            // Update balance
            const newBalance = currentBalance + 100;
            const patchResponse = await axios.patch(`${issuerUrl}/accounts/${testData.cards.valid.pan}/balance`, {
                balance: newBalance
            });

            expect(patchResponse.status).toBe(200);
            expect(patchResponse.data.newBalance).toBe(newBalance);

            // Restore original balance
            await axios.patch(`${issuerUrl}/accounts/${testData.cards.valid.pan}/balance`, {
                balance: currentBalance
            });
        });

        it('should reject invalid balance', async () => {
            const response = await axios.patch(`${issuerUrl}/accounts/${testData.cards.valid.pan}/balance`, {
                balance: 'not-a-number'
            });
            expect(response.status).toBe(400);
        });
    });
});
