/**
 * Health Routes Integration Tests
 */
/// <reference types="jest" />
import request from 'supertest';
import { createApp } from '../../src/app';
import { Application } from 'express';

describe('Health Routes Integration', () => {
    let app: Application;

    beforeAll(() => {
        app = createApp();
    });

    describe('GET /health', () => {
        it('should return detailed health status', async () => {
            const response = await request(app)
                .get('/health')
                .expect('Content-Type', /json/);

            // May be 200 (healthy/degraded) or 503 (unhealthy)
            expect([200, 503]).toContain(response.status);

            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('status');
            expect(response.body.data).toHaveProperty('version');
            expect(response.body.data).toHaveProperty('uptime');
            expect(response.body.data).toHaveProperty('timestamp');
            expect(response.body.data).toHaveProperty('checks');

            expect(Array.isArray(response.body.data.checks)).toBe(true);
        });

        it('should include memory check', async () => {
            const response = await request(app)
                .get('/health')
                .expect('Content-Type', /json/);

            const memoryCheck = response.body.data.checks.find(
                (c: { name: string }) => c.name === 'memory'
            );

            expect(memoryCheck).toBeDefined();
            expect(['pass', 'warn', 'fail']).toContain(memoryCheck.status);
        });
    });

    describe('GET /health/live', () => {
        it('should return liveness status', async () => {
            const response = await request(app)
                .get('/health/live')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('status');
            expect(response.body.status).toBe('ok');
        });
    });

    describe('GET /health/ready', () => {
        it('should return readiness status', async () => {
            const response = await request(app)
                .get('/health/ready')
                .expect('Content-Type', /json/);

            // May be 200 (ready) or 503 (not ready)
            expect([200, 503]).toContain(response.status);
            expect(response.body).toHaveProperty('status');
        });
    });

    describe('GET /health/dependencies', () => {
        it('should return dependency statuses', async () => {
            const response = await request(app)
                .get('/health/dependencies')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('dependencies');
            expect(response.body.data).toHaveProperty('count');
            expect(Array.isArray(response.body.data.dependencies)).toBe(true);
        });
    });

    describe('GET /health/circuit-breakers', () => {
        it('should return circuit breaker statuses', async () => {
            const response = await request(app)
                .get('/health/circuit-breakers')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body).toHaveProperty('data');
        });
    });
});

describe('Metrics Endpoint', () => {
    let app: Application;

    beforeAll(() => {
        app = createApp();
    });

    describe('GET /metrics', () => {
        it('should return Prometheus metrics', async () => {
            const response = await request(app)
                .get('/metrics')
                .expect('Content-Type', /text\/plain/)
                .expect(200);

            // Check for expected metrics
            expect(response.text).toContain('sim_network_switch');
            expect(response.text).toContain('process_');
            expect(response.text).toContain('nodejs_');
        });

        it('should include custom metrics', async () => {
            // First make a request to generate metrics
            await request(app).get('/health');

            const response = await request(app)
                .get('/metrics')
                .expect(200);

            expect(response.text).toContain('http_requests_total');
            expect(response.text).toContain('http_request_duration');
        });
    });
});
