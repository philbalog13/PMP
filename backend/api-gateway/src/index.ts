import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { tokenBlacklist } from './services/tokenBlacklist.service';
import { startLabMaintenanceLoop, stopLabMaintenanceLoop } from './services/ctfLab.service';

const PORT = config.port;

// Graceful shutdown handling
let server: ReturnType<typeof app.listen>;

const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received, starting graceful shutdown`);

    stopLabMaintenanceLoop();

    // Close token blacklist service
    await tokenBlacklist.close();

    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

// Start server
server = app.listen(PORT, async () => {
    logger.info('🚀 API Gateway started', {
        port: PORT,
        env: config.nodeEnv,
        rateLimit: `${config.rateLimit.max} req/min`
    });

    // Initialize security services
    await tokenBlacklist.init();
    startLabMaintenanceLoop();

    logger.info('📋 Routing table:', {
        cards: 'POST /api/cards → sim-card-service:8001',
        transactions: 'POST /api/transactions → sim-pos-service:8002',
        authorize: 'POST /api/authorize → sim-auth-engine:8006',
        crypto: 'POST /api/crypto/* → crypto-service:8010',
        keys: 'GET /api/keys → key-management:8012'
    });
});

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    process.exit(1);
});

export default server;
