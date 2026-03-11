import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/acquirer.routes';
import { config } from './config';
import { bootstrapMTLS, startMTLSServer, patchAxiosWithMTLS } from './utils/mtls.helper';

const SERVICE_NAME = 'sim-acquirer-service';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(routes);

async function start() {
    if (config.mtlsEnabled) {
        try {
            const ctx = await bootstrapMTLS(SERVICE_NAME, config.keyManagementUrl);
            patchAxiosWithMTLS(ctx);
            startMTLSServer(app, config.port, ctx);
            console.log(`🏦 Sim-Acquirer-Service (mTLS) on port ${config.port}`);
            return;
        } catch (err: any) {
            console.error(`[mTLS] ${err.message} — falling back to HTTP`);
        }
    }
    app.listen(config.port, () => {
        console.log(`🏦 Sim-Acquirer-Service running on port ${config.port}`);
        console.log(`📋 Endpoints: POST /process, POST /key-exchange, POST /telecollecte, GET/POST /merchants`);
    });
}

start().catch(console.error);
export default app;
