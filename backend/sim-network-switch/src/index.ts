/**
 * Sim-Network-Switch Microservice
 * Main Entry Point with Graceful Shutdown
 * 
 * This file handles:
 * - Application bootstrap
 * - Server lifecycle management
 * - Graceful shutdown
 * - Signal handling
 * 
 * Express configuration is in app.ts for testability
 */
import { config } from './config';
import { createApp, getAppInfo } from './app';
import { logger } from './utils/logger';
import { activeConnections } from './utils/metrics';
import { initializeHealthCheckDependencies } from './services/health.service';

// ===========================================
// Application Setup
// ===========================================

const app = createApp();

// ===========================================
// Server Lifecycle
// ===========================================

let server: ReturnType<typeof app.listen>;
let isShuttingDown = false;

/**
 * Start the server
 */
const startServer = async (): Promise<void> => {
    try {
        // Initialize dependencies
        logger.info('Initializing dependencies...');
        await initializeHealthCheckDependencies();

        // Get app info
        const appInfo = getAppInfo();

        // Start HTTP server
        server = app.listen(config.server.port, config.server.host, () => {
            logger.info(`🚀 ${appInfo.name} started`, {
                port: config.server.port,
                host: config.server.host,
                environment: config.env,
                nodeVersion: process.version,
                version: appInfo.version,
            });

            logger.info('Endpoints available:', {
                health: `http://${config.server.host}:${config.server.port}/health`,
                metrics: `http://${config.server.host}:${config.server.port}/metrics`,
                transaction: `http://${config.server.host}:${config.server.port}/transaction`,
            });
        });

        // Track connections for graceful shutdown
        server.on('connection', (socket) => {
            activeConnections.inc();
            socket.on('close', () => {
                activeConnections.dec();
            });
        });

        // Handle server errors
        server.on('error', (error: NodeJS.ErrnoException) => {
            if (error.code === 'EADDRINUSE') {
                logger.error(`Port ${config.server.port} is already in use`);
                process.exit(1);
            }
            throw error;
        });

    } catch (error) {
        logger.error('Failed to start server', { error });
        process.exit(1);
    }
};

/**
 * Graceful shutdown handler
 * Closes connections properly before exiting
 */
const gracefulShutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) {
        logger.warn('Shutdown already in progress...');
        return;
    }

    isShuttingDown = true;
    logger.info(`${signal} received, starting graceful shutdown...`);

    // Set a hard timeout for shutdown (30 seconds)
    const hardShutdownTimeout = setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
    }, 30000);

    try {
        // Stop accepting new connections
        if (server) {
            logger.info('Closing HTTP server...');
            await new Promise<void>((resolve, reject) => {
                server.close((err) => {
                    if (err) {
                        logger.error('Error closing server', { error: err });
                        reject(err);
                    } else {
                        logger.info('HTTP server closed');
                        resolve();
                    }
                });
            });
        }

        // Wait for active connections to complete
        logger.info('Waiting for active connections to close...');

        // Cleanup resources (Redis, etc.)
        logger.info('Cleaning up resources...');

        // Clear the hard shutdown timeout
        clearTimeout(hardShutdownTimeout);

        logger.info('✅ Graceful shutdown complete');
        process.exit(0);

    } catch (error) {
        logger.error('Error during shutdown', { error });
        clearTimeout(hardShutdownTimeout);
        process.exit(1);
    }
};

// ===========================================
// Signal Handlers
// ===========================================

// Graceful shutdown on SIGTERM (Docker, Kubernetes)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Graceful shutdown on SIGINT (Ctrl+C)
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
        name: error.name,
    });
    gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', {
        reason,
        promise: String(promise),
    });
    gracefulShutdown('unhandledRejection');
});

// ===========================================
// Start Application
// ===========================================

startServer();

// Export for testing
export { app };
