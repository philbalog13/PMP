import dotenv from 'dotenv';
import app, { initializeVulnEngineRedis } from './app';
import { HSMSimulator } from './core/HSMSimulator';
import { Pkcs11TcpServer } from './pkcs11/Pkcs11TcpServer';
import { bootstrapMTLS, startMTLSServer, patchAxiosWithMTLS } from './utils/mtls.helper';

dotenv.config();

const parsedPort = Number(process.env.HSM_PORT ?? process.env.PORT ?? 8011);
const PORT = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 8011;
const PKCS11_PORT = Number(process.env.PKCS11_PORT || 5959);
const KEY_MANAGEMENT_URL = process.env.KEY_MANAGEMENT_URL || 'http://localhost:8012';
const MTLS_ENABLED = process.env.MTLS_ENABLED === 'true';
const SERVICE_NAME = 'hsm-simulator';

const hsm = HSMSimulator.getInstance();
const pkcs11Server = new Pkcs11TcpServer(hsm);

async function startServer(): Promise<void> {
    await initializeVulnEngineRedis();

    if (MTLS_ENABLED) {
        try {
            const ctx = await bootstrapMTLS(SERVICE_NAME, KEY_MANAGEMENT_URL);
            patchAxiosWithMTLS(ctx);
            startMTLSServer(app, PORT, ctx);
            const status = hsm.getStatus();
            console.log(`[HSM] Simulator (🔒 mTLS) listening on port ${PORT}`);
            console.log(`[HSM] Keys loaded: ${status.keysLoaded}`);
            pkcs11Server.start(PKCS11_PORT);
            return;
        } catch (err: any) {
            console.error(`[HSM][mTLS] ${err.message} — falling back to HTTP`);
        }
    }

    app.listen(PORT, () => {
        const status = hsm.getStatus();
        console.log(`[HSM] Simulator listening on port ${PORT}`);
        console.log(`[HSM] Keys loaded: ${status.keysLoaded}`);
    });

    pkcs11Server.start(PKCS11_PORT);
}

void startServer();
