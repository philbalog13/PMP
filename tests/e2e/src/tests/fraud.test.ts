import axios from 'axios';
import { config, testData } from '../config';

describe('🛡️ Fraud Detection Tests', () => {
    const fraudUrl = config.services.fraud;

    describe('POST /check', () => {
        it('should analyze low-risk transaction', async () => {
            const response = await axios.post(`${fraudUrl}/check`, {
                pan: testData.cards.valid.pan,
                amount: 25.00,
                merchantId: 'MERCHANT001',
                mcc: '5411'
            });

            expect(response.status).toBe(200);
            expect(response.data.riskScore).toBeLessThan(50);
            expect(response.data.riskLevel).toBe('LOW');
            expect(response.data.recommendation).toBe('APPROVE');
        });

        it('should flag high amount transaction', async () => {
            const response = await axios.post(`${fraudUrl}/check`, {
                pan: testData.cards.valid.pan,
                amount: 5000.00,
                merchantId: 'MERCHANT001',
                mcc: '5411'
            });

            expect(response.status).toBe(200);
            expect(response.data.riskScore).toBeGreaterThan(20);
            expect(response.data.reasons).toContain(expect.stringContaining('amount'));
        });

        it('should flag suspicious MCC (gambling)', async () => {
            const response = await axios.post(`${fraudUrl}/check`, {
                pan: testData.cards.valid.pan,
                amount: 100.00,
                merchantId: 'GAMBLER001',
                mcc: '7995' // Gambling
            });

            expect(response.status).toBe(200);
            expect(response.data.riskScore).toBeGreaterThan(25);
            expect(response.data.reasons).toContain(expect.stringContaining('merchant category'));
        });

        it('should flag blocked country', async () => {
            const response = await axios.post(`${fraudUrl}/check`, {
                pan: testData.cards.valid.pan,
                amount: 50.00,
                merchantId: 'MERCHANT001',
                mcc: '5411',
                country: 'KP' // North Korea
            });

            expect(response.status).toBe(200);
            expect(response.data.riskScore).toBeGreaterThan(40);
            expect(response.data.reasons).toContain(expect.stringContaining('country'));
        });

        it('should include educational information', async () => {
            const response = await axios.post(`${fraudUrl}/check`, {
                pan: testData.cards.valid.pan,
                amount: 50.00,
                merchantId: 'MERCHANT001',
                mcc: '5411'
            });

            expect(response.data._educational).toBeDefined();
            expect(response.data._educational.rulesApplied).toBeDefined();
        });
    });

    describe('GET /alerts', () => {
        it('should list fraud alerts', async () => {
            const response = await axios.get(`${fraudUrl}/alerts`);
            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(Array.isArray(response.data.data)).toBe(true);
        });
    });

    describe('GET /stats', () => {
        it('should return statistics', async () => {
            const response = await axios.get(`${fraudUrl}/stats`);
            expect(response.status).toBe(200);
            expect(response.data.data.totalChecks).toBeDefined();
            expect(response.data.data.totalAlerts).toBeDefined();
        });
    });
});
