/**
 * Integration tests for PMP API endpoints
 * Requires: backend running on port 8000, postgres + redis via docker
 * Run: npm test
 */
import request from 'supertest';

const BASE = 'http://localhost:8000';

let clientToken: string;
let merchantToken: string;
let trainerToken: string;

describe('Auth & Token Acquisition', () => {
    it('POST /api/auth/login - client login', async () => {
        const res = await request(BASE)
            .post('/api/auth/login')
            .send({ email: 'client@pmp.edu', password: 'qa-pass-123' });
        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeDefined();
        clientToken = res.body.accessToken;
    });

    it('POST /api/auth/login - merchant login', async () => {
        const res = await request(BASE)
            .post('/api/auth/login')
            .send({ email: 'bakery@pmp.edu', password: 'qa-pass-123' });
        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeDefined();
        merchantToken = res.body.accessToken;
    });

    it('POST /api/auth/login - trainer login', async () => {
        const res = await request(BASE)
            .post('/api/auth/login')
            .send({ email: 'trainer@pmp.edu', password: 'qa-pass-123' });
        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeDefined();
        trainerToken = res.body.accessToken;
    });
});

describe('Client Endpoints', () => {
    it('GET /api/client/cards - list cards', async () => {
        const res = await request(BASE)
            .get('/api/client/cards')
            .set('Authorization', `Bearer ${clientToken}`);
        expect(res.status).toBe(200);
        expect(res.body.cards).toBeDefined();
        expect(Array.isArray(res.body.cards)).toBe(true);
    });

    it('GET /api/client/merchants - list merchants', async () => {
        const res = await request(BASE)
            .get('/api/client/merchants')
            .set('Authorization', `Bearer ${clientToken}`);
        expect(res.status).toBe(200);
        expect(res.body.merchants).toBeDefined();
        expect(res.body.merchants.length).toBeGreaterThan(0);
    });

    it('GET /api/client/transactions - list transactions', async () => {
        const res = await request(BASE)
            .get('/api/client/transactions')
            .set('Authorization', `Bearer ${clientToken}`);
        expect(res.status).toBe(200);
        expect(res.body.transactions).toBeDefined();
        expect(Array.isArray(res.body.transactions)).toBe(true);
    });
});

describe('Payment Simulation', () => {
    let cardId: string;
    let merchantId: string;
    let transactionId: string;

    beforeAll(async () => {
        const cardsRes = await request(BASE)
            .get('/api/client/cards')
            .set('Authorization', `Bearer ${clientToken}`);
        cardId = cardsRes.body.cards?.[0]?.id;

        const merchantsRes = await request(BASE)
            .get('/api/client/merchants')
            .set('Authorization', `Bearer ${clientToken}`);
        const merchant = merchantsRes.body.merchants?.[0];
        merchantId = merchant?.id;
    });

    it('POST /api/client/transactions/simulate - create payment', async () => {
        if (!cardId || !merchantId) return;

        const res = await request(BASE)
            .post('/api/client/transactions/simulate')
            .set('Authorization', `Bearer ${clientToken}`)
            .send({
                cardId,
                merchantId,
                amount: 1.50,
                use3DS: false,
                paymentType: 'PURCHASE',
            });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.transaction).toBeDefined();
        expect(res.body.transaction.processing_steps).toBeDefined();
        expect(res.body.transaction.processing_steps.length).toBeGreaterThanOrEqual(7);
        transactionId = res.body.transaction.id;
    });

    it('GET /api/client/transactions/:id - get transaction detail', async () => {
        if (!transactionId) return;

        const res = await request(BASE)
            .get(`/api/client/transactions/${transactionId}`)
            .set('Authorization', `Bearer ${clientToken}`);
        expect(res.status).toBe(200);
        expect(res.body.transaction).toBeDefined();
        expect(res.body.transaction.id).toBe(transactionId);
    });

    it('GET /api/client/transactions/:id/timeline - get timeline', async () => {
        if (!transactionId) return;

        const res = await request(BASE)
            .get(`/api/client/transactions/${transactionId}/timeline`)
            .set('Authorization', `Bearer ${clientToken}`);
        expect(res.status).toBe(200);
        expect(res.body.timeline).toBeDefined();
        expect(Array.isArray(res.body.timeline)).toBe(true);
        expect(res.body.timeline.length).toBeGreaterThan(0);
        expect(res.body.timeline[0]).toHaveProperty('name');
        expect(res.body.timeline[0]).toHaveProperty('category');
        expect(res.body.timeline[0]).toHaveProperty('status');
    });
});

describe('Merchant Endpoints', () => {
    it('GET /api/merchant/transactions - list merchant transactions', async () => {
        const res = await request(BASE)
            .get('/api/merchant/transactions')
            .set('Authorization', `Bearer ${merchantToken}`);
        expect(res.status).toBe(200);
        expect(res.body.transactions).toBeDefined();
    });

    it('GET /api/merchant/account - merchant account', async () => {
        const res = await request(BASE)
            .get('/api/merchant/account')
            .set('Authorization', `Bearer ${merchantToken}`);
        expect(res.status).toBe(200);
    });

    it('GET /api/merchant/transactions/:id/timeline - merchant timeline', async () => {
        // First get a transaction ID
        const listRes = await request(BASE)
            .get('/api/merchant/transactions?limit=1')
            .set('Authorization', `Bearer ${merchantToken}`);

        const txn = listRes.body.transactions?.[0];
        if (!txn) return; // Skip if no transactions

        const res = await request(BASE)
            .get(`/api/merchant/transactions/${txn.id}/timeline`)
            .set('Authorization', `Bearer ${merchantToken}`);
        expect(res.status).toBe(200);
        expect(res.body.timeline).toBeDefined();
        expect(Array.isArray(res.body.timeline)).toBe(true);
        expect(res.body.timeline.length).toBeGreaterThan(0);
    });
});

describe('Platform Endpoints (Trainer)', () => {
    it('GET /api/platform/transactions - list all platform transactions', async () => {
        const res = await request(BASE)
            .get('/api/platform/transactions')
            .set('Authorization', `Bearer ${trainerToken}`);
        expect(res.status).toBe(200);
        expect(res.body.transactions).toBeDefined();
        expect(Array.isArray(res.body.transactions)).toBe(true);
    });

    it('GET /api/platform/transactions/:id/timeline - platform timeline', async () => {
        // Get a transaction first
        const listRes = await request(BASE)
            .get('/api/platform/transactions?limit=1')
            .set('Authorization', `Bearer ${trainerToken}`);

        const txn = listRes.body.transactions?.[0];
        if (!txn) return;

        const res = await request(BASE)
            .get(`/api/platform/transactions/${txn.id}/timeline`)
            .set('Authorization', `Bearer ${trainerToken}`);
        expect(res.status).toBe(200);
        expect(res.body.timeline).toBeDefined();
        expect(Array.isArray(res.body.timeline)).toBe(true);
    });

    it('GET /api/platform/transactions - denied for client role', async () => {
        const res = await request(BASE)
            .get('/api/platform/transactions')
            .set('Authorization', `Bearer ${clientToken}`);
        expect([401, 403]).toContain(res.status);
    });
});

describe('Health', () => {
    it('GET /api/health - health check', async () => {
        const res = await request(BASE).get('/api/health');
        expect([200, 207]).toContain(res.status);
    });
});
