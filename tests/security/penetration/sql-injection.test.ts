/**
 * SQL Injection test suite (live API).
 * Runs real HTTP requests against api-gateway to validate injection resistance.
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
const SQL_ERROR_PATTERN = /(syntax error|postgres|sqlstate|query failed|prepared statement|unterminated)/i;

const VALID_CLIENT = {
    email: process.env.PMP_TEST_CLIENT_EMAIL || 'client@pmp.edu',
    password: process.env.PMP_TEST_CLIENT_PASSWORD || 'qa-pass-123'
};

const AUTH_INJECTION_CASES = [
    { name: 'email OR 1=1', email: "client@pmp.edu' OR 1=1--", password: 'anything' },
    { name: 'email UNION SELECT', email: "' UNION SELECT * FROM users--", password: 'anything' },
    { name: 'password OR 1=1', email: VALID_CLIENT.email, password: "' OR '1'='1" },
    { name: 'password stacked query', email: VALID_CLIENT.email, password: "'; DROP TABLE users;--" }
];

const PATH_INJECTION_PAYLOADS = [
    "' OR 1=1--",
    "abc' UNION SELECT * FROM users--",
    '1;DROP TABLE users;--'
];

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

describe('SQL Injection Prevention (live)', () => {
    let clientToken = '';

    beforeAll(async () => {
        const loginResponse = await requestJson('POST', '/api/auth/login', VALID_CLIENT);
        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body?.accessToken || loginResponse.body?.token).toBeDefined();
        clientToken = (loginResponse.body?.accessToken || loginResponse.body?.token) as string;
    });

    it.each(AUTH_INJECTION_CASES)('blocks auth bypass payload: $name', async ({ email, password }) => {
        const response = await requestJson('POST', '/api/auth/login', { email, password });

        expect(response.status).not.toBe(200);
        expect(response.body?.accessToken).toBeUndefined();
        expect(response.body?.token).toBeUndefined();
        expect(SQL_ERROR_PATTERN.test(response.rawBody)).toBe(false);
    });

    it('keeps valid credentials working after injection attempts', async () => {
        const response = await requestJson('POST', '/api/auth/login', VALID_CLIENT);

        expect(response.status).toBe(200);
        expect(response.body?.accessToken || response.body?.token).toBeDefined();
    });

    it('rejects injected transaction IDs without leaking SQL details', async () => {
        for (const payload of PATH_INJECTION_PAYLOADS) {
            const response = await requestJson(
                'GET',
                `/api/client/transactions/${encodeURIComponent(payload)}`,
                undefined,
                clientToken
            );

            expect(response.status).toBe(400);
            expect(response.body?.success).toBe(false);
            expect(SQL_ERROR_PATTERN.test(response.rawBody)).toBe(false);
        }
    });

    it('rejects injected timeline IDs without leaking SQL details', async () => {
        for (const payload of PATH_INJECTION_PAYLOADS) {
            const response = await requestJson(
                'GET',
                `/api/client/transactions/${encodeURIComponent(payload)}/timeline`,
                undefined,
                clientToken
            );

            expect(response.status).toBe(400);
            expect(response.body?.success).toBe(false);
            expect(SQL_ERROR_PATTERN.test(response.rawBody)).toBe(false);
        }
    });
});
