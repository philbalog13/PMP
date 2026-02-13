import dotenv from 'dotenv';
import app from './app';
import { HSMSimulator } from './core/HSMSimulator';

dotenv.config();

const parsedPort = Number(process.env.HSM_PORT ?? process.env.PORT ?? 8011);
const PORT = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 8011;

const hsm = HSMSimulator.getInstance();

app.listen(PORT, () => {
    const status = hsm.getStatus();
    console.log(`[HSM] Simulator listening on port ${PORT}`);
    console.log(`[HSM] Keys loaded: ${status.keysLoaded}`);
});
