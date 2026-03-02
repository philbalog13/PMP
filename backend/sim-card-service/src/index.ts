import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cardRoutes from './routes/card.routes';
import { config } from './config';
import { bootstrapMTLS, startMTLSServer, patchAxiosWithMTLS } from './utils/mtls.helper';

const SERVICE_NAME = 'sim-card-service';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use(cardRoutes);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

async function start() {
    if (config.mtlsEnabled) {
        try {
            const ctx = await bootstrapMTLS(SERVICE_NAME, config.keyManagementUrl);
            patchAxiosWithMTLS(ctx);
            startMTLSServer(app, config.port, ctx);
            console.log(`💳 Sim-Card-Service (🔒 mTLS) on port ${config.port}`);
            return;
        } catch (err: any) {
            console.error(`[mTLS] ${err.message} — falling back to HTTP`);
        }
    }
    app.listen(config.port, () => {
        console.log(`💳 Sim-Card-Service running on port ${config.port}`);
        console.log(`📋 Endpoints: POST/GET /cards, GET /cards/:pan, PATCH /cards/:pan/status`);
    });
}

start().catch(console.error);
export default app;
