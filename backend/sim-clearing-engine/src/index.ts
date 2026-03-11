import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/clearing.routes';
import { config } from './config';
import { bootstrapMTLS, startMTLSServer, patchAxiosWithMTLS } from './utils/mtls.helper';

const SERVICE_NAME = 'sim-clearing-engine';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(routes);

async function start() {
    if (config.mtlsEnabled) {
        try {
            const ctx = await bootstrapMTLS(SERVICE_NAME, config.keyManagementUrl);
            patchAxiosWithMTLS(ctx);
            startMTLSServer(app, config.port, ctx);
            console.log(`🏦 Sim-Clearing-Engine (🔒 mTLS) on port ${config.port}`);
            return;
        } catch (err: any) {
            console.error(`[mTLS] ${err.message} — falling back to HTTP`);
        }
    }
    app.listen(config.port, () => {
        console.log(`🏦 Sim-Clearing-Engine running on port ${config.port}`);
        console.log(`📋 Endpoints: POST /clearing/batch, GET /clearing/batches, GET /clearing/balance`);
        console.log(`📊 Educational: Télécollecte ISO 8583 TC33 — Back-Office de compensation`);
    });
}

start().catch(console.error);
export default app;
