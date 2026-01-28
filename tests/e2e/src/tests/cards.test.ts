import axios from 'axios';
import { config, testData } from '../config';

describe('💳 Card Service Tests', () => {
    const baseUrl = config.services.cards;

    describe('GET /cards', () => {
        it('should return list of cards', async () => {
            const response = await axios.get(`${baseUrl}/cards`);
            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(Array.isArray(response.data.data)).toBe(true);
            expect(response.data.pagination).toBeDefined();
        });

        it('should support pagination', async () => {
            const response = await axios.get(`${baseUrl}/cards?page=1&limit=2`);
            expect(response.status).toBe(200);
            expect(response.data.pagination.page).toBe(1);
            expect(response.data.pagination.limit).toBe(2);
        });
    });

    describe('GET /cards/:pan', () => {
        it('should return test card 4111111111111111', async () => {
            const response = await axios.get(`${baseUrl}/cards/${testData.cards.valid.pan}`);
            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(response.data.data.status).toBe('ACTIVE');
        });

        it('should return 404 for non-existent card', async () => {
            const response = await axios.get(`${baseUrl}/cards/9999999999999999`);
            expect(response.status).toBe(404);
            expect(response.data.success).toBe(false);
        });
    });

    describe('POST /cards/validate (Luhn)', () => {
        it('should validate valid PAN (4111111111111111)', async () => {
            const response = await axios.post(`${baseUrl}/cards/validate`, {
                pan: '4111111111111111'
            });
            expect(response.status).toBe(200);
            expect(response.data.data.valid).toBe(true);
            expect(response.data.data.network).toBe('VISA');
        });

        it('should validate Mastercard PAN', async () => {
            const response = await axios.post(`${baseUrl}/cards/validate`, {
                pan: '5500000000000004'
            });
            expect(response.status).toBe(200);
            expect(response.data.data.valid).toBe(true);
            expect(response.data.data.network).toBe('MASTERCARD');
        });

        it('should reject invalid Luhn PAN', async () => {
            const response = await axios.post(`${baseUrl}/cards/validate`, {
                pan: '4111111111111112' // Invalid check digit
            });
            expect(response.status).toBe(200);
            expect(response.data.data.valid).toBe(false);
        });

        it('should include educational information', async () => {
            const response = await axios.post(`${baseUrl}/cards/validate`, {
                pan: '4111111111111111'
            });
            expect(response.data._educational).toBeDefined();
            expect(response.data._educational.algorithm).toBe('Luhn (ISO/IEC 7812)');
        });
    });

    describe('POST /cards (Create)', () => {
        it('should create a new VISA card', async () => {
            const response = await axios.post(`${baseUrl}/cards`, {
                cardholderName: 'E2E TEST USER',
                cardType: 'VISA'
            });
            expect(response.status).toBe(201);
            expect(response.data.success).toBe(true);
            expect(response.data.data.cardType).toBe('VISA');
            expect(response.data.data.status).toBe('ACTIVE');
            expect(response.data.data.pan).toBeDefined();
            expect(response.data.data.cvv).toBeDefined();
        });

        it('should create a new MASTERCARD', async () => {
            const response = await axios.post(`${baseUrl}/cards`, {
                cardholderName: 'E2E MASTERCARD TEST',
                cardType: 'MASTERCARD'
            });
            expect(response.status).toBe(201);
            expect(response.data.data.cardType).toBe('MASTERCARD');
            expect(response.data.data.pan.startsWith('5')).toBe(true);
        });

        it('should reject without cardholder name', async () => {
            const response = await axios.post(`${baseUrl}/cards`, {
                cardType: 'VISA'
            });
            expect(response.status).toBe(400);
        });
    });

    describe('PATCH /cards/:pan/status', () => {
        let testPan: string;

        beforeAll(async () => {
            // Create a card for status tests
            const createResponse = await axios.post(`${baseUrl}/cards`, {
                cardholderName: 'STATUS TEST USER',
                cardType: 'VISA'
            });
            testPan = createResponse.data.data.pan;
        });

        it('should block a card', async () => {
            const response = await axios.patch(`${baseUrl}/cards/${testPan}/status`, {
                status: 'BLOCKED'
            });
            expect(response.status).toBe(200);
            expect(response.data.data.status).toBe('BLOCKED');
        });

        it('should reactivate a card', async () => {
            const response = await axios.patch(`${baseUrl}/cards/${testPan}/status`, {
                status: 'ACTIVE'
            });
            expect(response.status).toBe(200);
            expect(response.data.data.status).toBe('ACTIVE');
        });

        it('should reject invalid status', async () => {
            const response = await axios.patch(`${baseUrl}/cards/${testPan}/status`, {
                status: 'INVALID_STATUS'
            });
            expect(response.status).toBe(400);
        });
    });

    describe('POST /cards/validate-transaction', () => {
        it('should validate active card with correct CVV', async () => {
            const response = await axios.post(`${baseUrl}/cards/validate-transaction`, {
                pan: testData.cards.valid.pan,
                cvv: testData.cards.valid.cvv,
                expiryMonth: testData.cards.valid.expiryMonth,
                expiryYear: testData.cards.valid.expiryYear
            });
            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
        });

        it('should reject with wrong CVV', async () => {
            const response = await axios.post(`${baseUrl}/cards/validate-transaction`, {
                pan: testData.cards.valid.pan,
                cvv: '999',
                expiryMonth: testData.cards.valid.expiryMonth,
                expiryYear: testData.cards.valid.expiryYear
            });
            expect(response.status).toBe(200);
            expect(response.data.success).toBe(false);
            expect(response.data.error).toContain('CVV');
        });
    });
});
