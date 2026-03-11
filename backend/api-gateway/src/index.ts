import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { tokenBlacklist } from './services/tokenBlacklist.service';
import { startLabMaintenanceLoop, stopLabMaintenanceLoop } from './services/ctfLab.service';
import { bootstrapMTLS, startMTLSServer, patchAxiosWithMTLS } from './utils/mtls.helper';
import https from 'https';
import http from 'http';

const PORT = config.port;
const SERVICE_NAME = 'api-gateway';

// Graceful shutdown handling
let server: http.Server | https.Server | undefined;

const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received, starting graceful shutdown`);

    stopLabMaintenanceLoop();
    await tokenBlacklist.close();

    if (server) {
        server.close(() => {
            logger.info('Server closed');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }

    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

async function startGateway() {
    if (config.mtlsEnabled) {
        try {
            const ctx = await bootstrapMTLS(SERVICE_NAME, config.keyManagementUrl);
            patchAxiosWithMTLS(ctx);
            server = startMTLSServer(app, PORT, ctx);
            logger.info('🚀 API Gateway (🔒 mTLS) started', { port: PORT });
            await tokenBlacklist.init();
            startLabMaintenanceLoop();
            return;
        } catch (err: any) {
            logger.warn(`[mTLS] ${err.message} — falling back to HTTP`);
        }
    }

    // Start HTTP server
    server = app.listen(PORT, async () => {
        logger.info('🚀 API Gateway started', {
            port: PORT,
            env: config.nodeEnv,
            rateLimit: `${config.rateLimit.max} req/min`
        });

        await tokenBlacklist.init();
        startLabMaintenanceLoop();

        logger.info('📋 Routing table:', {
            cards: 'POST /api/cards → sim-card-service:8001',
            transactions: 'POST /api/transactions → sim-pos-service:8002',
            authorize: 'POST /api/authorize → sim-auth-engine:8006',
            crypto: 'POST /api/crypto/* → crypto-service:8010',
            keys: 'GET /api/keys → key-management:8012',
            telecollecte: 'POST /api/merchant/telecollecte → sim-acquirer:8003',
            clearingBatches: 'GET /api/merchant/clearing/batches → sim-clearing-engine:8016'
        });
    });
}

startGateway().catch((err) => {
    logger.error('Failed to start API Gateway', { error: err.message });
    process.exit(1);
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    process.exit(1);
});

export { server };
