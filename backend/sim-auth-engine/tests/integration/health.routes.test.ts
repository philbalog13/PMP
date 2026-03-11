import request from 'supertest';
import { createApp } from '../../src/app';

describe('Health Routes Integration', () => {
    const app = createApp();

    it('returns detailed health information', async () => {
        const response = await request(app)
            .get('/health')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('healthy');
        expect(response.body.data).toHaveProperty('uptime');
        expect(response.body.data).toHaveProperty('checks');
        expect(Array.isArray(response.body.data.checks)).toBe(true);
        expect(response.headers).toHaveProperty('x-request-id');
    });

    it('returns live status', async () => {
        const response = await request(app)
            .get('/health/live')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(response.body.status).toBe('ok');
    });

    it('returns ready status', async () => {
        const response = await request(app)
            .get('/health/ready')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(response.body.status).toBe('ok');
    });
});
