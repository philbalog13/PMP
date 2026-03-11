/**
 * Sim-Auth-Engine - Main Entry Point
 */
import { config } from './config';
import { createApp } from './app';
import { bootstrapMTLS, startMTLSServer, patchAxiosWithMTLS } from './utils/mtls.helper';

const SERVICE_NAME = 'sim-auth-engine';

// ===========================================
// Application Setup
// ===========================================

const app = createApp();

// ===========================================
// Server Lifecycle
// ===========================================

let server: ReturnType<typeof app.listen>;
let isShuttingDown = false;

const startServer = async (): Promise<void> => {
    if (config.mtlsEnabled) {
        try {
            const ctx = await bootstrapMTLS(SERVICE_NAME, config.keyManagementUrl);
            patchAxiosWithMTLS(ctx);
            startMTLSServer(app, config.server.port, ctx);
            console.log(`🚀 Sim-Auth-Engine (🔒 mTLS) on port ${config.server.port}`);
            return;
        } catch (err: any) {
            console.error(`[mTLS] ${err.message} — falling back to HTTP`);
        }
    }
    server = app.listen(config.server.port, config.server.host, () => {
        console.log(`🚀 Sim-Auth-Engine started on port ${config.server.port}`);
        console.log('Endpoints:');
        console.log(`  POST /authorize - Process authorization`);
        console.log(`  GET  /transactions/:pan - Transaction history`);
        console.log(`  POST /simulate/:scenario - Run simulation`);
        console.log(`  GET  /rules - List rules`);
        console.log(`  POST /rules - Create rule`);
        console.log(`  GET  /health - Health check`);
    });
};

const gracefulShutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`${signal} received, shutting down...`);

    if (server) {
        await new Promise<void>((resolve) => server.close(() => resolve()));
    }

    console.log('✅ Shutdown complete');
    process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    gracefulShutdown('uncaughtException');
});

startServer();

export { app };
