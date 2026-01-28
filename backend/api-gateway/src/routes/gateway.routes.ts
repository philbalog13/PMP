import { Router, Request, Response, NextFunction } from 'express';
import { proxyRequest, getAllServicesHealth } from '../services/proxy.service';
import { logger } from '../utils/logger';
import { strictRateLimitMiddleware } from '../middleware/rateLimit.middleware';
import { generateToken } from '../middleware/auth.middleware';

const router = Router();

// Route configuration mapping paths to services
const routeConfig: Record<string, { service: string; pathRewrite?: (path: string) => string }> = {
    '/api/cards': { service: 'sim-card-service', pathRewrite: (p) => p.replace('/api/cards', '/cards') },
    '/api/transactions': { service: 'sim-pos-service', pathRewrite: (p) => p.replace('/api/transactions', '/transactions') },
    '/api/process': { service: 'sim-acquirer-service', pathRewrite: (p) => p.replace('/api/process', '/process') },
    '/api/merchants': { service: 'sim-acquirer-service', pathRewrite: (p) => p.replace('/api/merchants', '/merchants') },
    '/api/route': { service: 'sim-network-switch', pathRewrite: (p) => p.replace('/api/route', '/route') },
    '/api/issuer': { service: 'sim-issuer-service', pathRewrite: (p) => p.replace('/api/issuer', '') },
    '/api/accounts': { service: 'sim-issuer-service', pathRewrite: (p) => p.replace('/api/accounts', '/accounts') },
    '/api/authorize': { service: 'sim-auth-engine', pathRewrite: (p) => p.replace('/api/authorize', '/api/authorize') },
    '/api/rules': { service: 'sim-auth-engine', pathRewrite: (p) => p.replace('/api/rules', '/api/rules') },
    '/api/fraud': { service: 'sim-fraud-detection', pathRewrite: (p) => p.replace('/api/fraud', '') },
    '/api/crypto': { service: 'crypto-service', pathRewrite: (p) => p.replace('/api/crypto', '') },
    '/api/hsm': { service: 'hsm-simulator', pathRewrite: (p) => p.replace('/api/hsm', '/api/hsm') },
    '/api/keys': { service: 'key-management', pathRewrite: (p) => p.replace('/api/keys', '/keys') }
};

/**
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
    const servicesHealth = await getAllServicesHealth();
    const allHealthy = Object.values(servicesHealth).every(s => s.healthy);

    res.status(allHealthy ? 200 : 207).json({
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        gateway: { healthy: true },
        services: servicesHealth
    });
});

/**
 * Development token generation (for testing only)
 */
router.post('/api/auth/token', strictRateLimitMiddleware, (req: Request, res: Response) => {
    const { userId = 'dev-user', role = 'admin' } = req.body;

    if (process.env.NODE_ENV === 'production') {
        res.status(403).json({
            success: false,
            error: 'Token generation disabled in production'
        });
        return;
    }

    const token = generateToken(userId, role);
    res.json({
        success: true,
        token,
        expiresIn: '24h',
        note: 'Development token - do not use in production'
    });
});

/**
 * Dynamic proxy handler for all API routes
 */
const proxyHandler = async (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;
    const correlationId = (req as any).correlationId;

    // Find matching route
    const matchedRoute = Object.entries(routeConfig).find(([prefix]) =>
        path.startsWith(prefix)
    );

    if (!matchedRoute) {
        res.status(404).json({
            success: false,
            error: 'Route not found',
            code: 'ROUTE_NOT_FOUND',
            path
        });
        return;
    }

    const [prefix, config] = matchedRoute;
    const targetPath = config.pathRewrite ? config.pathRewrite(path) : path;

    try {
        const response = await proxyRequest({
            serviceName: config.service,
            method: req.method,
            path: targetPath,
            data: req.body,
            headers: {
                'Authorization': req.headers.authorization || '',
                'Content-Type': 'application/json'
            },
            correlationId
        });

        // Forward response headers
        Object.entries(response.headers).forEach(([key, value]) => {
            if (typeof value === 'string') {
                res.setHeader(key, value);
            }
        });

        res.status(response.status).json(response.data);
    } catch (error: any) {
        logger.error('Proxy handler error', {
            correlationId,
            service: config.service,
            path: targetPath,
            error: error.message
        });

        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || 'Proxy error',
            code: error.code || 'PROXY_ERROR',
            correlationId
        });
    }
};

// Apply proxy handler to all /api/* routes
router.all('/api/*', proxyHandler);

export default router;
