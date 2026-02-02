import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { authMiddleware } from './middleware/auth.middleware';
import { rateLimitMiddleware } from './middleware/rateLimit.middleware';
import { requestLoggerMiddleware } from './middleware/requestLogger.middleware';
import { errorHandlerMiddleware } from './middleware/errorHandler.middleware';
import gatewayRoutes from './routes/gateway.routes';
import usersRoutes from './routes/users.routes';
import progressRoutes from './routes/progress.routes';
import exercisesRoutes from './routes/exercises.routes';
import clientRoutes from './routes/client.routes';
import merchantRoutes from './routes/merchant.routes';
import { logger } from './utils/logger';

const app: Application = express();

// Security middleware - Advanced Helmet configuration
app.use(helmet({
    // Content Security Policy
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline for some frameworks
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
        }
    },
    // HTTP Strict Transport Security (HSTS)
    hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true
    },
    // Prevent clickjacking
    frameguard: {
        action: 'deny'
    },
    // Prevent MIME type sniffing
    noSniff: true,
    // XSS Protection (legacy but still useful)
    xssFilter: true,
    // Referrer Policy
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    },
    // Hide X-Powered-By header
    hidePoweredBy: true,
    // DNS Prefetch Control
    dnsPrefetchControl: {
        allow: false
    }
}));

// SECURITY: Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.headers['x-forwarded-proto'] !== 'https') {
            return res.redirect(301, `https://${req.headers.host}${req.url}`);
        }
        next();
    });
}

// CORS configuration with strict origin validation
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, curl, etc.)
        if (!origin) {
            return callback(null, true);
        }

        const allowedOrigins = config.cors.origin as string[];

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            logger.warn('CORS policy violation', { origin, allowedOrigins });
            callback(new Error(`Origin ${origin} not allowed by CORS policy`));
        }
    },
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
    maxAge: config.cors.maxAge
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

// API Routes (before gateway to take precedence)
app.use('/api/users', usersRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/exercises', exercisesRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/merchant', merchantRoutes);

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
