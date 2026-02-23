/**
 * End-to-end transaction flow (live API).
 * Exercises real payment simulation through api-gateway.
 */

import { beforeAll, describe, expect, it } from '@jest/globals';
import http, { IncomingHttpHeaders } from 'node:http';

type HttpResult = {
    status: number;
    headers: IncomingHttpHeaders;
    body: any;
    rawBody: string;
};

const API_BASE_URL = process.env.PMP_API_BASE_URL || 'http://localhost:8000';
const CLIENT_EMAIL = process.env.PMP_TEST_CLIENT_EMAIL || 'client@pmp.edu';
const CLIENT_PASSWORD = process.env.PMP_TEST_CLIENT_PASSWORD || 'qa-pass-123';

const requestJson = async (
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
    token?: string
): Promise<HttpResult> => {
    const targetUrl = new URL(path, API_BASE_URL);

    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : undefined;

        const req = http.request(
            {
                method,
                hostname: targetUrl.hostname,
                port: targetUrl.port ? Number(targetUrl.port) : (targetUrl.protocol === 'https:' ? 443 : 80),
                path: `${targetUrl.pathname}${targetUrl.search}`,
                headers: {
                    ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            },
            (res) => {
                const chunks: Buffer[] = [];
                res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
                res.on('end', () => {
                    const rawBody = Buffer.concat(chunks).toString('utf8');
                    let parsed: any = null;
                    try {
                        parsed = rawBody ? JSON.parse(rawBody) : null;
                    } catch {
                        parsed = { rawBody };
                    }

                    resolve({
                        status: res.statusCode || 0,
                        headers: res.headers,
                        body: parsed,
                        rawBody
                    });
                });
            }
        );

        req.on('error', reject);

        if (payload) {
            req.write(payload);
        }

        req.end();
    });
};

describe('End-to-End Transaction Flow (live)', () => {
    let clientToken = '';
    let cardId = '';
    let merchantId = '';
    let cardSingleTxnLimit = 0;

    beforeAll(async () => {
        const loginResponse = await requestJson('POST', '/api/auth/login', {
            email: CLIENT_EMAIL,
            password: CLIENT_PASSWORD
        });

        expect(loginResponse.status).toBe(200);
        clientToken = (loginResponse.body?.accessToken || loginResponse.body?.token) as string;
        expect(clientToken).toBeTruthy();

        const cardsResponse = await requestJson('GET', '/api/client/cards', undefined, clientToken);
        expect(cardsResponse.status).toBe(200);
        expect(Array.isArray(cardsResponse.body?.cards)).toBe(true);

        const activeCard = cardsResponse.body.cards.find((card: any) => String(card.status || '').toUpperCase() === 'ACTIVE')
            || cardsResponse.body.cards[0];

        expect(activeCard).toBeDefined();
        cardId = String(activeCard.id || '');
        cardSingleTxnLimit = Number(activeCard.single_txn_limit || 0);
        expect(cardId).toBeTruthy();

        const merchantsResponse = await requestJson('GET', '/api/client/merchants', undefined, clientToken);
        expect(merchantsResponse.status).toBe(200);
        expect(Array.isArray(merchantsResponse.body?.merchants)).toBe(true);
        expect(merchantsResponse.body.merchants.length).toBeGreaterThan(0);

        merchantId = String(merchantsResponse.body.merchants[0].id || '');
        expect(merchantId).toBeTruthy();
    });

    it('processes an approved transaction and exposes a coherent timeline', async () => {
        const safeAmount = cardSingleTxnLimit > 10 ? 5 : 1;

        const simulateResponse = await requestJson(
            'POST',
            '/api/client/transactions/simulate',
            {
                cardId,
                merchantId,
                amount: safeAmount,
                use3DS: false,
                paymentType: 'PURCHASE'
            },
            clientToken
        );

        expect(simulateResponse.status).toBe(200);
        expect(simulateResponse.body?.success).toBe(true);

        const transaction = simulateResponse.body?.transaction || {};
        const transactionId = String(transaction.id || '');
        const processingSteps = Array.isArray(transaction.processing_steps) ? transaction.processing_steps : [];

        expect(transactionId).toBeTruthy();
        expect(String(transaction.status || '').toUpperCase()).toBe('APPROVED');
        expect(String(transaction.response_code || '')).toBe('00');
        expect(processingSteps.length).toBeGreaterThanOrEqual(8);

        const stepNames = processingSteps.map((step: any) => String(step.name || ''));
        expect(stepNames).toContain('Transaction Initiated');
        expect(stepNames).toContain('Card Validation');
        expect(stepNames).toContain('Authorization Decision');

        // Masking guard: no full PAN in transaction payload.
        expect(/\b\d{13,19}\b/.test(JSON.stringify(transaction))).toBe(false);

        const detailResponse = await requestJson('GET', `/api/client/transactions/${transactionId}`, undefined, clientToken);
        expect(detailResponse.status).toBe(200);
        expect(detailResponse.body?.success).toBe(true);
        expect(detailResponse.body?.transaction?.id).toBe(transactionId);

        const timelineResponse = await requestJson('GET', `/api/client/transactions/${transactionId}/timeline`, undefined, clientToken);
        expect(timelineResponse.status).toBe(200);
        expect(timelineResponse.body?.success).toBe(true);
        expect(Array.isArray(timelineResponse.body?.timeline)).toBe(true);
        expect(timelineResponse.body.timeline.length).toBeGreaterThanOrEqual(8);
        expect(timelineResponse.body.timeline.some((step: any) => step.name === 'Authorization Decision')).toBe(true);
    });

    it('rejects a payment above single transaction limit with response code 61', async () => {
        const overLimitAmount = Math.max(cardSingleTxnLimit + 1, 501);

        const response = await requestJson(
            'POST',
            '/api/client/transactions/simulate',
            {
                cardId,
                merchantId,
                amount: overLimitAmount,
                use3DS: false,
                paymentType: 'PURCHASE'
            },
            clientToken
        );

        expect(response.status).toBe(400);
        expect(response.body?.success).toBe(false);
        expect(String(response.body?.responseCode || '')).toBe('61');

        const processingSteps = Array.isArray(response.body?.processingSteps) ? response.body.processingSteps : [];
        expect(processingSteps.length).toBeGreaterThanOrEqual(4);
        expect(
            processingSteps.some(
                (step: any) => step.name === 'Limit Verification' && String(step.status || '').toLowerCase() === 'failed'
            )
        ).toBe(true);
    });
});
