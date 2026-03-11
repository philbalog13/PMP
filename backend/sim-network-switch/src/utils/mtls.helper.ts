/**
 * mTLS Helper — Mutual TLS for inter-service communication
 *
 * Implements full mTLS: each service fetches its own certificate from the PKI
 * (key-management / MoneTIC Root CA), then starts an HTTPS server and uses
 * an HTTPS agent for all outgoing calls.
 *
 * Educational note: In production payment systems (PCI-DSS), all inter-service
 * communication must be encrypted and mutually authenticated. mTLS ensures that
 * BOTH parties present valid certificates signed by the same trusted CA.
 */
import https from 'https';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import type { Application } from 'express';

export interface MTLSContext {
    caCertPem: string;
    certPem: string;
    privateKeyPem: string;
    serviceName: string;
}

/**
 * Bootstrap mTLS by fetching certificates from key-management.
 * Step 1: GET /api/pki/ca → Root CA certificate
 * Step 2: POST /api/pki/cert → Own signed certificate
 * Caches certs to /tmp/pki/<serviceName>/ for restarts.
 */
export async function bootstrapMTLS(serviceName: string, keyMgmtUrl: string): Promise<MTLSContext> {
    const cacheDir = `/tmp/pki/${serviceName}`;

    // Use cached certs if they exist and are not older than 23h
    const cachedCaPath = path.join(cacheDir, 'ca.crt');
    const cachedCertPath = path.join(cacheDir, 'service.crt');
    const cachedKeyPath = path.join(cacheDir, 'service.key');

    try {
        if (fs.existsSync(cachedCaPath) && fs.existsSync(cachedCertPath) && fs.existsSync(cachedKeyPath)) {
            const stat = fs.statSync(cachedCertPath);
            const ageMs = Date.now() - stat.mtimeMs;
            if (ageMs < 23 * 60 * 60 * 1000) {
                console.log(`[mTLS:${serviceName}] Using cached certificates (age: ${Math.round(ageMs / 3600000)}h)`);
                return {
                    caCertPem: fs.readFileSync(cachedCaPath, 'utf8'),
                    certPem: fs.readFileSync(cachedCertPath, 'utf8'),
                    privateKeyPem: fs.readFileSync(cachedKeyPath, 'utf8'),
                    serviceName
                };
            }
        }
    } catch { }

    console.log(`[mTLS:${serviceName}] Bootstrapping certificates from ${keyMgmtUrl}...`);

    // Step 1: Fetch Root CA (plain HTTP is acceptable for public cert)
    const caResponse = await axios.get(`${keyMgmtUrl}/api/pki/ca`, { timeout: 10000 });
    const caCertPem: string = caResponse.data?.data?.certificate;
    if (!caCertPem) throw new Error('[mTLS] Empty CA certificate from key-management');

    // Step 2: Generate own certificate signed by CA
    const certResponse = await axios.post(
        `${keyMgmtUrl}/api/pki/cert`,
        { subjectCN: serviceName, isEMVCard: false },
        { timeout: 15000 }
    );
    const certPem: string = certResponse.data?.data?.cert;
    const privateKeyPem: string = certResponse.data?.data?.privateKey;
    if (!certPem || !privateKeyPem) throw new Error('[mTLS] Invalid certificate response from key-management');

    // Cache to /tmp/pki/
    try {
        fs.mkdirSync(cacheDir, { recursive: true });
        fs.writeFileSync(cachedCaPath, caCertPem);
        fs.writeFileSync(cachedCertPath, certPem);
        fs.writeFileSync(cachedKeyPath, privateKeyPem, { mode: 0o600 });
    } catch (cacheErr: any) {
        console.warn(`[mTLS:${serviceName}] Could not cache certs: ${cacheErr.message}`);
    }

    console.log(`[mTLS:${serviceName}] ✅ Certificates bootstrapped successfully`);
    return { caCertPem, certPem, privateKeyPem, serviceName };
}

/**
 * Create an HTTPS agent for outgoing axios requests.
 * Presents own certificate for mutual authentication.
 */
export function createMTLSAgent(ctx: MTLSContext): https.Agent {
    return new https.Agent({
        ca: ctx.caCertPem,
        cert: ctx.certPem,
        key: ctx.privateKeyPem,
        rejectUnauthorized: true
    });
}

/**
 * Start an HTTPS server with mTLS (mutual TLS).
 * Requires connecting clients to present a certificate signed by our CA.
 */
export function startMTLSServer(app: Application, port: number, ctx: MTLSContext): https.Server {
    const server = https.createServer(
        {
            ca: ctx.caCertPem,
            cert: ctx.certPem,
            key: ctx.privateKeyPem,
            requestCert: true,
            rejectUnauthorized: true
        },
        app
    );
    server.listen(port);
    console.log(`[mTLS:${ctx.serviceName}] 🔒 HTTPS/mTLS server listening on port ${port}`);
    return server;
}

/**
 * Patch all axios instances used by this service to include the mTLS agent.
 * Call once after bootstrapMTLS to ensure all HTTP calls use mTLS.
 */
export function patchAxiosWithMTLS(ctx: MTLSContext): void {
    const agent = createMTLSAgent(ctx);
    axios.defaults.httpsAgent = agent;
    // Rewrite service URLs from http:// to https:// for mTLS services
    console.log(`[mTLS:${ctx.serviceName}] Axios default HTTPS agent configured`);
}
