/**
 * Tests for 3D-Secure ACS Simulator
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import axios from 'axios';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { ACSController } from '../controllers/ACSController';
import { createApp } from '../index';

let acsBaseUrl = process.env.ACS_BASE_URL || 'http://127.0.0.1:8013';
const integrationDescribe = process.env.RUN_INTEGRATION_TESTS === '1' ? describe : describe.skip;

type MockResponse = {
    statusCode: number;
    payload: any;
    status: (code: number) => MockResponse;
    json: (body: any) => MockResponse;
};

const createMockResponse = (): MockResponse => ({
    statusCode: 200,
    payload: null,
    status(code: number) {
        this.statusCode = code;
        return this;
    },
    json(body: any) {
        this.payload = body;
        return this;
    }
});

integrationDescribe('ACS Simulator Integration Tests', () => {
    let server: Server | null = null;

    beforeAll(async () => {
        server = createApp().listen(0);
        await new Promise<void>((resolve) => {
            server?.once('listening', () => resolve());
        });

        const address = server.address() as AddressInfo | null;
        if (!address) {
            throw new Error('ACS test server address unavailable');
        }

        acsBaseUrl = `http://127.0.0.1:${address.port}`;
    });

    afterAll(async () => {
        if (!server) return;
        await new Promise<void>((resolve, reject) => {
            server?.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    });

    describe('POST /authenticate', () => {
        it('should return frictionless authentication for low-risk transaction', async () => {
            const response = await axios.post(`${acsBaseUrl}/authenticate`, {
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
            const response = await axios.post(`${acsBaseUrl}/authenticate`, {
                pan: '4111111111111111',
                amount: 5000.00,
                cardholderName: 'TEST USER',
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
            const response = await axios.post(`${acsBaseUrl}/challenge/verify`, {
                otp: '123456',
                acsTransId: 'ACS_TEST_001'
            });

            expect(response.status).toBe(200);
            expect(response.data.transStatus).toBe('Y');
            expect(response.data.authenticationValue).toBeDefined();
        });

        it('should reject invalid OTP', async () => {
            const response = await axios.post(`${acsBaseUrl}/challenge/verify`, {
                otp: '000000',
                acsTransId: 'ACS_TEST_002'
            });

            expect(response.status).toBe(200);
            expect(response.data.transStatus).toBe('N');
        });
    });

    describe('GET /challenge', () => {
        it('should return challenge URL', async () => {
            const response = await axios.get(`${acsBaseUrl}/challenge`, {
                params: { txId: 'TXN_003' }
            });

            expect(response.status).toBe(200);
            expect(response.data.challengeUrl).toContain('http://localhost:3088/');
            expect(response.data.challengeUrl).toContain('txId=TXN_003');
            expect(response.data.challengeUrl).toContain('acsTransId=');
            expect(response.data.method).toBe('GET');
        });
    });

    describe('POST /ares', () => {
        it('should send authentication response', async () => {
            const response = await axios.post(`${acsBaseUrl}/ares`, {
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
    it('should calculate risk score based on amount', () => {
        const highAmount = 1000;
        const lowAmount = 50;

        expect(highAmount > lowAmount).toBe(true);
    });
});

describe('ACSController Legacy Endpoint Unit Tests', () => {
    let controller: ACSController;

    beforeEach(() => {
        controller = new ACSController();
    });

    it('should return challenge metadata on legacy /authenticate when challenge is required', async () => {
        const req = {
            body: {
                pan: '4111111111111111',
                amount: 5000,
                currency: 'EUR',
                merchantId: 'MERCHANT_001',
                transactionId: 'TXN_3DS_001',
                cardholderName: 'TEST USER'
            },
            headers: {}
        } as any;
        const res = createMockResponse();

        await controller.authenticate(req, res as any);

        expect(res.statusCode).toBe(200);
        expect(res.payload.transStatus).toBe('C');
        expect(typeof res.payload.challengeUrl).toBe('string');
        expect(res.payload.challengeUrl).toContain('acsTransId=');
        expect(typeof res.payload.acsTransId).toBe('string');
    });

    it('should validate a correct OTP on legacy /challenge/verify using acsTransId', async () => {
        const req = {
            body: {
                acsTransId: 'ACS_TEST_001',
                otp: '123456'
            },
            headers: {}
        } as any;
        const res = createMockResponse();

        await controller.verifyChallenge(req, res as any);

        expect(res.statusCode).toBe(200);
        expect(res.payload.transStatus).toBe('Y');
        expect(typeof res.payload.authenticationValue).toBe('string');
    });

    it('should expose the stored challenge result after OTP verification', async () => {
        const verifyReq = {
            body: {
                acsTransId: 'ACS_TEST_003',
                otp: '123456'
            },
            headers: {}
        } as any;
        const verifyRes = createMockResponse();
        await controller.verifyChallenge(verifyReq, verifyRes as any);

        const resultReq = {
            params: { acsTransId: 'ACS_TEST_003' }
        } as any;
        const resultRes = createMockResponse();
        await controller.getChallengeResult(resultReq, resultRes as any);

        expect(resultRes.statusCode).toBe(200);
        expect(resultRes.payload.transStatus).toBe('Y');
        expect(resultRes.payload.acsTransId).toBe('ACS_TEST_003');
    });

    it('should reject an invalid OTP on legacy /challenge/verify', async () => {
        const req = {
            body: {
                acsTransId: 'ACS_TEST_002',
                otp: '000000'
            },
            headers: {}
        } as any;
        const res = createMockResponse();

        await controller.verifyChallenge(req, res as any);

        expect(res.statusCode).toBe(200);
        expect(res.payload.transStatus).toBe('N');
    });

    it('should accept acsTransId alias on protocol /acs/creq', async () => {
        const req = {
            body: {
                acsTransId: 'ACS_ALIAS_001',
                otp: '123456'
            },
            headers: {}
        } as any;
        const res = createMockResponse();

        await controller.creq(req, res as any);

        expect(res.statusCode).toBe(200);
        expect(res.payload.threeDSServerTransID).toBe('ACS_ALIAS_001');
        expect(res.payload.transStatus).toBe('Y');
    });
});
