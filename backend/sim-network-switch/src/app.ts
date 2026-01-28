/**
 * Express Application Configuration
 * Separated from bootstrap for testability
 */
import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { config } from './config';
import { requestIdMiddleware, requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import routes from './routes';

/**
 * Create and configure Express application
 * @returns Configured Express application
 */
export const createApp = (): Application => {
    const app = express();

    // ===========================================
    // Security Middleware
    // ===========================================

    // Helmet for security headers
    app.use(helmet({
        contentSecurityPolicy: config.isProduction,
        crossOriginEmbedderPolicy: config.isProduction,
    }));

    // CORS configuration
    app.use(cors({
        origin: config.isProduction ? false : '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Correlation-ID'],
        exposedHeaders: ['X-Request-ID', 'X-Response-Time'],
        credentials: true,
        maxAge: 86400, // 24 hours
    }));

    // ===========================================
    // Performance Middleware
    // ===========================================

    // Compression for responses
    app.use(compression({
        filter: (req: express.Request, res: express.Response) => {
            if (req.headers['x-no-compression']) {
                return false;
            }
            return compression.filter(req, res);
        },
        level: 6,
    }));

    // ===========================================
    // Body Parsing
    // ===========================================

    app.use(express.json({
        limit: '1mb',
        strict: true,
    }));

    app.use(express.urlencoded({
        extended: true,
        limit: '1mb',
    }));

    // ===========================================
    // Rate Limiting
    // ===========================================

    const limiter = rateLimit({
        windowMs: config.rateLimit.windowMs,
        max: config.rateLimit.maxRequests,
        message: {
            success: false,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests, please try again later',
            },
            timestamp: new Date().toISOString(),
        },
        standardHeaders: true, // Return rate limit info in headers
        legacyHeaders: false,
        skip: (req: express.Request) => {
            // Skip rate limiting for health checks
            return req.path === '/health/live' || req.path === '/health/ready';
        },
    });

    app.use(limiter);

    // ===========================================
    // Request Processing
    // ===========================================

    // Add request ID and logging
    app.use(requestIdMiddleware);
    app.use(requestLogger);

    // ===========================================
    // Routes
    // ===========================================

    app.use('/', routes);

    // ===========================================
    // Error Handling
    // ===========================================

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
};

/**
 * Get application info for health checks
 */
export const getAppInfo = () => ({
    name: 'sim-network-switch',
    version: process.env.npm_package_version || '1.0.0',
    environment: config.env,
    nodeVersion: process.version,
});

export default createApp;
