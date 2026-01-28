import axios from 'axios';
import { config, testData, responseCodes } from '../config';

describe('💰 Transaction Flow Tests', () => {
    const posUrl = config.services.pos;
    const acquirerUrl = config.services.acquirer;

    describe('POS Service - Transaction Initiation', () => {
        it('should initiate a purchase transaction', async () => {
            const response = await axios.post(`${posUrl}/transactions`, {
                pan: testData.cards.valid.pan,
                amount: testData.transactions.smallAmount,
                currency: 'EUR',
                transactionType: 'PURCHASE'
            });

            expect(response.status).toBeLessThan(500);
            expect(response.data.data.transactionId).toBeDefined();
            expect(['APPROVED', 'DECLINED', 'ERROR']).toContain(response.data.data.status);
        });

        it('should return educational information', async () => {
            const response = await axios.post(`${posUrl}/transactions`, {
                pan: testData.cards.valid.pan,
                amount: testData.transactions.smallAmount,
                currency: 'EUR',
                transactionType: 'PURCHASE'
            });

            expect(response.data._educational).toBeDefined();
            expect(response.data._educational.transactionFlow).toBeDefined();
        });

        it('should list transactions', async () => {
            const response = await axios.get(`${posUrl}/transactions`);
            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(Array.isArray(response.data.data)).toBe(true);
        });

        it('should get transaction by ID', async () => {
            // First create a transaction
            const createResponse = await axios.post(`${posUrl}/transactions`, {
                pan: testData.cards.valid.pan,
                amount: 10.00,
                currency: 'EUR',
                transactionType: 'PURCHASE'
            });

            const transactionId = createResponse.data.data.transactionId;

            // Then fetch it
            const response = await axios.get(`${posUrl}/transactions/${transactionId}`);
            expect(response.status).toBe(200);
            expect(response.data.data.id).toBe(transactionId);
        });
    });

    describe('Acquirer Service - Merchant Validation', () => {
        it('should list merchants', async () => {
            const response = await axios.get(`${acquirerUrl}/merchants`);
            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(Array.isArray(response.data.data)).toBe(true);
        });

        it('should have test merchant MERCHANT001', async () => {
            const response = await axios.get(`${acquirerUrl}/merchants/MERCHANT001`);
            expect(response.status).toBe(200);
            expect(response.data.data.name).toBe('Boutique Test Paris');
            expect(response.data.data.mcc).toBe('5411');
        });

        it('should create new merchant', async () => {
            const response = await axios.post(`${acquirerUrl}/merchants`, {
                name: 'E2E Test Shop',
                mcc: '5999',
                city: 'Lyon'
            });
            expect(response.status).toBe(201);
            expect(response.data.success).toBe(true);
            expect(response.data.data.id).toBeDefined();
        });
    });
});
