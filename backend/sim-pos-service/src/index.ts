import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/transaction.routes';
import { config } from './config';
import { ODAService } from './services/oda.service';
import { ColdBootService } from './services/coldboot.service';
import { bootstrapMTLS, startMTLSServer, patchAxiosWithMTLS } from './utils/mtls.helper';

const SERVICE_NAME = 'sim-pos-service';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(routes);

async function start() {
    // Step 1: mTLS bootstrapping — fetch own cert from MoneTIC Root CA
    if (config.mtlsEnabled) {
        try {
            const mtlsCtx = await bootstrapMTLS(SERVICE_NAME, config.keyManagementUrl);
            patchAxiosWithMTLS(mtlsCtx);
            await ODAService.getInstance().initialize();
            await ColdBootService.getInstance().initialize();
            startMTLSServer(app, config.port, mtlsCtx);
            logBanner();
            return;
        } catch (err: any) {
            console.error(`[mTLS] Bootstrap failed: ${err.message} — falling back to HTTP`);
        }
    }

    // Step 2: Load Root CA for ODA (Offline Data Authentication)
    await ODAService.getInstance().initialize();

    // Step 3: Cold Boot — N.A.C key exchange with acquirer → network switch → HSM
    await ColdBootService.getInstance().initialize();

    app.listen(config.port, logBanner);
}

function logBanner() {
    const coldBoot = ColdBootService.getInstance();
    console.log(`\n${'═'.repeat(55)}`);
    console.log(`  🏪  Sim-POS-Service (TPE Virtuel) — Port ${config.port}`);
    console.log(`${'═'.repeat(55)}`);
    console.log(`  mTLS                    : ${config.mtlsEnabled ? '🔒 Enabled' : '🔓 Disabled'}`);
    console.log(`  ODA (Offline Data Auth) : ✅ Root CA loaded`);
    console.log(`  Cold Boot (N.A.C)       : ${coldBoot.isOperational() ? '✅ ZPK ready' : '⚠️  Degraded mode'}`);
    if (coldBoot.isOperational()) {
        const info = coldBoot.getSessionInfo();
        console.log(`  Session ZPK KCV        : ${info.zpkKcv}`);
        console.log(`  Session expires        : ${info.expiresAt}`);
    }
    console.log(`${'═'.repeat(55)}\n`);
    console.log(`📋 Endpoints: POST /transactions, GET /transactions/:id`);
}

start().catch((err) => {
    console.error('[POS] Fatal startup error:', err);
    process.exit(1);
});

export default app;
