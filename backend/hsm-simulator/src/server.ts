import dotenv from 'dotenv';
import app, { initializeVulnEngineRedis } from './app';
import { HSMSimulator } from './core/HSMSimulator';
import { Pkcs11TcpServer } from './pkcs11/Pkcs11TcpServer';

dotenv.config();

const parsedPort = Number(process.env.HSM_PORT ?? process.env.PORT ?? 8011);
const PORT = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 8011;
const PKCS11_PORT = Number(process.env.PKCS11_PORT || 5959);

const hsm = HSMSimulator.getInstance();
const pkcs11Server = new Pkcs11TcpServer(hsm);

async function startServer(): Promise<void> {
    await initializeVulnEngineRedis();

    app.listen(PORT, () => {
        const status = hsm.getStatus();
        console.log(`[HSM] Simulator listening on port ${PORT}`);
        console.log(`[HSM] Keys loaded: ${status.keysLoaded}`);
    });

    pkcs11Server.start(PKCS11_PORT);
}

void startServer();
