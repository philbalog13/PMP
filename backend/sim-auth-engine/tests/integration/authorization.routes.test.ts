import request from 'supertest';
import { createApp } from '../../src/app';

describe('Authorization Routes Integration', () => {
    const app = createApp();

    const validAuthorizationRequest = {
        stan: '123456',
        pan: '4111111111111111',
        amount: 42.5,
        merchantId: 'MERCH001',
        terminalId: 'TERM0001',
    };

    it('authorizes a valid transaction against seeded data', async () => {
        const response = await request(app)
            .post('/authorize')
            .send(validAuthorizationRequest)
            .expect('Content-Type', /json/)
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('approved', true);
        expect(response.body.data).toHaveProperty('responseCode', '00');
        expect(response.body.data).toHaveProperty('authorizationCode');
        expect(response.body.meta).toHaveProperty('requestId');
    });

    it('rejects an invalid authorization payload', async () => {
        const { pan, ...invalidRequest } = validAuthorizationRequest;

        const response = await request(app)
            .post('/authorize')
            .send(invalidRequest)
            .expect('Content-Type', /json/)
            .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns transaction history for a seeded card', async () => {
        const response = await request(app)
            .get('/transactions/4111111111111111')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.count).toBeGreaterThanOrEqual(2);
        expect(response.body.data).toHaveProperty('accountInfo');
    });

    it('runs a known simulation scenario', async () => {
        const response = await request(app)
            .post('/simulate/INSUFFICIENT_FUNDS')
            .send({})
            .expect('Content-Type', /json/)
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('scenario', 'INSUFFICIENT_FUNDS');
        expect(response.body.meta).toHaveProperty('requestId');
    });

    it('rejects an unknown simulation scenario', async () => {
        const response = await request(app)
            .post('/simulate/DOES_NOT_EXIST')
            .send({})
            .expect('Content-Type', /json/)
            .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_SCENARIO');
    });
});
