/**
 * Sim-Auth-Engine - Main Entry Point
 */
import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config';
import routes from './routes';

// ===========================================
// Application Setup
// ===========================================

const app: Application = express();

// Security
app.use(helmet());
app.use(cors());
app.use(compression());

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request ID middleware
app.use((req, res, next) => {
    (req as any).requestId = req.headers['x-request-id'] as string || uuidv4();
    res.setHeader('X-Request-ID', (req as any).requestId);
    next();
});

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
});

// Routes
app.use('/', routes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
    });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err.message);
    res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
    });
});

// ===========================================
// Server Lifecycle
// ===========================================

let server: ReturnType<typeof app.listen>;
let isShuttingDown = false;

const startServer = async (): Promise<void> => {
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
