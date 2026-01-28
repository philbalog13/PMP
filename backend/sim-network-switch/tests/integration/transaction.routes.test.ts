/**
 * Transaction Routes Integration Tests
 * End-to-end tests for transaction endpoints
 */
/// <reference types="jest" />
import request from 'supertest';
import { createApp } from '../../src/app';
import { Application } from 'express';

describe('Transaction Routes Integration', () => {
    let app: Application;

    beforeAll(() => {
        app = createApp();
    });

    describe('POST /transaction', () => {
        const validTransaction = {
            mti: '0100',
            pan: '4111111111111111',
            processingCode: '000000',
            amount: 100.00,
            currency: 'EUR',
            transmissionDateTime: '0128101530',
            localTransactionTime: '101530',
            localTransactionDate: '0128',
            stan: '000001',
            terminalId: 'TERM0001',
            merchantId: 'MERCH001',
            merchantCategoryCode: '5411',
            expiryDate: '2812',
            posEntryMode: '051',
            acquirerReferenceNumber: 'ACQ123456789',
        };

        it('should accept valid transaction request', async () => {
            const response = await request(app)
                .post('/transaction')
                .send(validTransaction)
                .expect('Content-Type', /json/);

            // May return 200 or 5xx depending on issuer availability
            expect([200, 502, 503]).toContain(response.status);

            if (response.status === 200) {
                expect(response.body).toHaveProperty('success');
                expect(response.body).toHaveProperty('data');
                expect(response.body.data).toHaveProperty('stan');
                expect(response.body.data).toHaveProperty('responseCode');
                expect(response.body.data).toHaveProperty('networkId');
            }
        });

        it('should return X-Request-ID header', async () => {
            const response = await request(app)
                .post('/transaction')
                .send(validTransaction);

            expect(response.headers).toHaveProperty('x-request-id');
        });

        it('should reject request with missing PAN', async () => {
            const { pan, ...invalidTransaction } = validTransaction;

            const response = await request(app)
                .post('/transaction')
                .send(invalidTransaction)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should reject request with invalid PAN format', async () => {
            const response = await request(app)
                .post('/transaction')
                .send({ ...validTransaction, pan: '123' })
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should reject request with negative amount', async () => {
            const response = await request(app)
                .post('/transaction')
                .send({ ...validTransaction, amount: -100 })
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should reject request with invalid MTI', async () => {
            const response = await request(app)
                .post('/transaction')
                .send({ ...validTransaction, mti: '12' })
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /transaction/network/:pan', () => {
        it('should identify VISA network', async () => {
            const response = await request(app)
                .get('/transaction/network/4111111111111111')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.network).toBe('VISA');
        });

        it('should identify MASTERCARD network', async () => {
            const response = await request(app)
                .get('/transaction/network/5555555555554444')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.network).toBe('MASTERCARD');
        });

        it('should identify AMEX network', async () => {
            const response = await request(app)
                .get('/transaction/network/378282246310005')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.network).toBe('AMEX');
        });

        it('should return UNKNOWN for unrecognized PAN', async () => {
            const response = await request(app)
                .get('/transaction/network/9999999999999999')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.network).toBe('UNKNOWN');
        });

        it('should reject invalid PAN format', async () => {
            const response = await request(app)
                .get('/transaction/network/123')
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /transaction/networks', () => {
        it('should return list of supported networks', async () => {
            const response = await request(app)
                .get('/transaction/networks')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.networks).toContain('VISA');
            expect(response.body.data.networks).toContain('MASTERCARD');
            expect(response.body.data.networks).toContain('AMEX');
            expect(response.body.data.count).toBeGreaterThanOrEqual(5);
        });
    });

    describe('GET /transaction/bin-table', () => {
        it('should return BIN routing table', async () => {
            const response = await request(app)
                .get('/transaction/bin-table')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.entries).toBeGreaterThan(0);
            expect(Array.isArray(response.body.data.table)).toBe(true);

            // Verify BIN entry structure
            const firstEntry = response.body.data.table[0];
            expect(firstEntry).toHaveProperty('binPrefix');
            expect(firstEntry).toHaveProperty('network');
            expect(firstEntry).toHaveProperty('issuerCode');
        });
    });
});

describe('404 Not Found', () => {
    let app: Application;

    beforeAll(() => {
        app = createApp();
    });

    it('should return 404 for unknown routes', async () => {
        const response = await request(app)
            .get('/unknown-route')
            .expect('Content-Type', /json/)
            .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('NOT_FOUND');
    });
});
