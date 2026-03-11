import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/issuer.routes';
import { config } from './config';
import { bootstrapMTLS, startMTLSServer, patchAxiosWithMTLS } from './utils/mtls.helper';

const SERVICE_NAME = 'sim-issuer-service';

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
            console.log(`🏛️ Sim-Issuer-Service (🔒 mTLS) on port ${config.port}`);
            return;
        } catch (err: any) {
            console.error(`[mTLS] ${err.message} — falling back to HTTP`);
        }
    }
    app.listen(config.port, () => {
        console.log(`🏛️ Sim-Issuer-Service running on port ${config.port}`);
        console.log(`📋 Endpoints: POST /authorize, GET /accounts`);
    });
}

start().catch(console.error);
export default app;
