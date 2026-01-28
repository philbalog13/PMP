import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { authMiddleware } from './middleware/auth.middleware';
import { rateLimitMiddleware } from './middleware/rateLimit.middleware';
import { requestLoggerMiddleware } from './middleware/requestLogger.middleware';
import { errorHandlerMiddleware } from './middleware/errorHandler.middleware';
import gatewayRoutes from './routes/gateway.routes';
import { logger } from './utils/logger';

const app: Application = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false // Disable for API gateway
}));

// CORS configuration
app.use(cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging with correlation ID
app.use(requestLoggerMiddleware as any);

// Rate limiting
app.use(rateLimitMiddleware);

// JWT Authentication (applied globally, with public path exceptions)
app.use(authMiddleware as any);

// Gateway routes (health, auth, proxy)
app.use(gatewayRoutes);

// 404 handler
app.use((req, res) => {
    logger.warn('Route not found', { path: req.path, method: req.method });
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        code: 'NOT_FOUND',
        path: req.path
    });
});

// Global error handler
app.use(errorHandlerMiddleware);

export default app;
