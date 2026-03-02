/**
 * mTLS Helper — ESM version for monitoring-service
 * Uses native fetch() instead of axios (no axios dependency in monitoring)
 */
import https from 'https';
import fs from 'fs';
import path from 'path';
import type { Express } from 'express';

export interface MTLSContext {
    caCertPem: string;
    certPem: string;
    privateKeyPem: string;
    serviceName: string;
}

export async function bootstrapMTLS(serviceName: string, keyMgmtUrl: string): Promise<MTLSContext> {
    const cacheDir = `/tmp/pki/${serviceName}`;
    const cachedCaPath = path.join(cacheDir, 'ca.crt');
    const cachedCertPath = path.join(cacheDir, 'service.crt');
    const cachedKeyPath = path.join(cacheDir, 'service.key');

    try {
        if (fs.existsSync(cachedCaPath) && fs.existsSync(cachedCertPath) && fs.existsSync(cachedKeyPath)) {
            const stat = fs.statSync(cachedCertPath);
            const ageMs = Date.now() - stat.mtimeMs;
            if (ageMs < 23 * 60 * 60 * 1000) {
                console.log(`[mTLS:${serviceName}] Using cached certificates`);
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

    const caRes = await fetch(`${keyMgmtUrl}/api/pki/ca`);
    const caData: any = await caRes.json();
    const caCertPem: string = caData?.data?.certificate;
    if (!caCertPem) throw new Error('[mTLS] Empty CA certificate from key-management');

    const certRes = await fetch(`${keyMgmtUrl}/api/pki/cert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectCN: serviceName, isEMVCard: false })
    });
    const certData: any = await certRes.json();
    const certPem: string = certData?.data?.cert;
    const privateKeyPem: string = certData?.data?.privateKey;
    if (!certPem || !privateKeyPem) throw new Error('[mTLS] Invalid certificate response from key-management');

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

export function createMTLSServer(app: Express, port: number, ctx: MTLSContext): https.Server {
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
