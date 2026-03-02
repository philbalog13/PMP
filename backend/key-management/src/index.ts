import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/key.routes';
import { config } from './config';
import { PKIService } from './services/pki.service';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Alias /health → /api/health for api-gateway healthcheck compatibility
app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', service: 'key-management', timestamp: new Date().toISOString() });
});

app.use('/api', routes);

// key-management stays HTTP (MTLS_ENABLED=false) — it IS the CA.
// Bootstraps PKI on startup so the Root CA is ready before other services request certs.
async function start() {
    // Pre-initialize PKI so cert generation is fast when services call /api/pki/cert
    PKIService.getInstance();
    console.log('[PKI] MoneTIC Root CA initialized');

    app.listen(config.port, () => {
        console.log(`🔑 Key-Management (PKI / Root CA) running on port ${config.port}`);
        console.log(`📋 Endpoints: GET /api/pki/ca, POST /api/pki/cert`);
        console.log(`📋 Key Endpoints: POST/GET /api/keys, POST /api/keys/:id/rotate`);
    });
}

start().catch(console.error);
export default app;
