import { Router, Request, Response, NextFunction } from 'express';
import { proxyRequest, getAllServicesHealth } from '../services/proxy.service';
import { orchestrator } from '../services/integration-orchestrator';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { strictRateLimitMiddleware } from '../middleware/rateLimit.middleware';
import {
    loginRateLimiter,
    registerRateLimiter,
    twoFALimiter,
    tokenRefreshLimiter
} from '../middleware/advancedRateLimit.middleware';
import { generateToken, authMiddleware } from '../middleware/auth.middleware';
import * as authController from '../controllers/auth.controller';
import * as twofaController from '../controllers/twofa.controller';

const router = Router();

const buildProxyHeaders = (req: Request): Record<string, string> => ({
    Authorization: req.headers.authorization || '',
    'Content-Type': 'application/json'
});

const CRITICAL_DB_TABLES = [
    'users.users',
    'learning.migration_history',
    'learning.cursus',
    'learning.cursus_modules',
    'learning.cursus_chapters',
    'learning.cursus_quizzes',
    'learning.cursus_quiz_questions',
    'learning.cursus_exercises',
    'learning.ctf_challenges'
];

const getDatabaseHealth = async () => {
    const startedAt = Date.now();
    await query('SELECT 1');

    const tables = await Promise.all(
        CRITICAL_DB_TABLES.map(async (table) => {
            const result = await query('SELECT to_regclass($1) AS relation_name', [table]);
            return {
                table,
                exists: result.rows[0]?.relation_name !== null
            };
        })
    );

    const missingTables = tables.filter((table) => !table.exists).map((table) => table.table);

    return {
        healthy: missingTables.length === 0,
        latencyMs: Date.now() - startedAt,
        tables,
        missingTables
    };
};

/**
 * Health check endpoints
 */
router.get('/health', async (req: Request, res: Response) => {
    const servicesHealth = await getAllServicesHealth();
    const allHealthy = Object.values(servicesHealth).every(s => s.healthy);
    res.status(200).json({ status: allHealthy ? 'healthy' : 'degraded', timestamp: new Date().toISOString(), gateway: { healthy: true }, services: servicesHealth });
});

router.get('/api/health', async (req: Request, res: Response) => {
    const servicesHealth = await getAllServicesHealth();
    const allHealthy = Object.values(servicesHealth).every(s => s.healthy);
    res.status(200).json({ status: allHealthy ? 'healthy' : 'degraded', timestamp: new Date().toISOString(), gateway: { healthy: true }, services: servicesHealth, _educational: { diagramStep: 'GW->>AUTH: VÃ©rification services', note: 'This endpoint aggregates health status from all microservices' } });
});

router.get('/health/db', async (_req: Request, res: Response) => {
    try {
        const database = await getDatabaseHealth();
        const statusCode = database.healthy ? 200 : 503;
        res.status(statusCode).json({
            status: database.healthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            database
        });
    } catch (error: any) {
        logger.error('Database health check failed', { error: error.message });
        res.status(503).json({
            status: 'down',
            timestamp: new Date().toISOString(),
            database: {
                healthy: false,
                error: error.message || 'Database check failed'
            }
        });
    }
});

router.get('/api/health/db', async (_req: Request, res: Response) => {
    try {
        const database = await getDatabaseHealth();
        const statusCode = database.healthy ? 200 : 503;
        res.status(statusCode).json({
            status: database.healthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            database,
            _educational: {
                diagramStep: 'GW->>DB: Verification des tables critiques',
                note: 'Checks DB reachability and required schema tables'
            }
        });
    } catch (error: any) {
        logger.error('Database health check failed', { error: error.message });
        res.status(503).json({
            status: 'down',
            timestamp: new Date().toISOString(),
            database: {
                healthy: false,
                error: error.message || 'Database check failed'
            }
        });
    }
});

/**
 * Authentication Routes
 * SECURITY: Granular rate limiting per endpoint type
 */
router.post('/api/auth/login', loginRateLimiter, authController.login);
router.post('/api/auth/register', registerRateLimiter, authController.register);
router.post('/api/auth/refresh', tokenRefreshLimiter, authController.refreshAccessToken);

// Persona-specific login aliases (same rate limit as main login)
router.post('/api/auth/client/login', loginRateLimiter, authController.login);
router.post('/api/auth/marchand/login', loginRateLimiter, authController.login);
router.post('/api/auth/etudiant/login', loginRateLimiter, authController.login);
router.post('/api/auth/formateur/login', loginRateLimiter, authController.login);

// Logout
router.post('/api/auth/logout', strictRateLimitMiddleware, authController.logout);

/**
 * Two-Factor Authentication (2FA) Routes
 * SECURITY: Protected by authMiddleware + 2FA rate limiter
 */
router.post('/api/auth/2fa/setup', authMiddleware, twoFALimiter, twofaController.setup2FA);
router.post('/api/auth/2fa/verify', authMiddleware, twoFALimiter, twofaController.verify2FA);
router.post('/api/auth/2fa/disable', authMiddleware, twofaController.disable2FA);
router.get('/api/auth/2fa/status', authMiddleware, twofaController.get2FAStatus);

/**
 * Dev token generation
 */
router.post('/api/auth/token', strictRateLimitMiddleware, (req: Request, res: Response) => {
    const { userId = 'dev-user', role = 'admin', expired = false } = req.body;
    if (process.env.NODE_ENV === 'production') return res.status(403).json({ success: false, error: 'Disabled in production' });

    // If expired requested, set expiration to -1s (immediately expired)
    const expiresIn = expired ? '-1s' : '24h';
    const token = generateToken(userId, role, expiresIn);

    res.json({ success: true, token, note: expired ? 'Expired token' : 'Dev token', expiresIn });
});

/**
 * Orchestrated Transaction Processing
 */
router.post('/api/transaction/process', async (req: Request, res: Response) => {
    const correlationId = (req as any).correlationId;
    try {
        const { pan, amount, merchantId } = req.body;
        if (!pan || !amount || !merchantId) return res.status(400).json({ success: false, error: 'Missing required fields', correlationId });
        const result = await orchestrator.processTransaction({ pan, amount: parseFloat(amount), currency: req.body.currency || 'EUR', merchantId, terminalId: req.body.terminalId || 'WEB001', mcc: req.body.mcc, country: req.body.country, isEcommerce: req.body.isEcommerce });
        res.status(result.approved ? 200 : 402).json({ success: result.approved, ...result, correlationId });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Transaction processing failed', correlationId });
    }
});

router.post('/api/transaction/verify-challenge', async (req: Request, res: Response) => {
    const { acsTransId, otp } = req.body;
    if (!acsTransId || !otp) return res.status(400).json({ success: false, error: 'Missing acsTransId or otp' });
    const result = await orchestrator.verifyChallenge(acsTransId, otp);
    res.json({ success: result.approved, ...result });
});

router.get('/api/integration/health', async (_req: Request, res: Response) => {
    try {
        const services = await orchestrator.getHealth();
        res.json({ success: true, services, timestamp: new Date().toISOString() });
    } catch (error: any) {
        logger.error('Integration health failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch integration health' });
    }
});

/**
 * Legacy endpoint aliases kept for backward compatibility with existing frontends.
 */
router.get('/api/authorize/history/:pan', async (req: Request, res: Response) => {
    const correlationId = (req as any).correlationId;
    try {
        const response = await proxyRequest({
            serviceName: 'sim-auth-engine',
            method: 'GET',
            path: `/transactions/${encodeURIComponent(req.params.pan)}`,
            headers: buildProxyHeaders(req),
            correlationId
        });
        res.status(response.status).json(response.data);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || 'Proxy error',
            code: error.code || 'PROXY_ERROR',
            correlationId
        });
    }
});

router.post('/api/authorize/simulate', async (req: Request, res: Response) => {
    const correlationId = (req as any).correlationId;
    const scenario = String(req.body?.scenario || '').trim().toUpperCase();
    if (!scenario) {
        return res.status(400).json({ success: false, error: 'scenario is required' });
    }

    try {
        const response = await proxyRequest({
            serviceName: 'sim-auth-engine',
            method: 'POST',
            path: `/simulate/${encodeURIComponent(scenario)}`,
            headers: buildProxyHeaders(req),
            correlationId
        });
        res.status(response.status).json(response.data);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || 'Proxy error',
            code: error.code || 'PROXY_ERROR',
            correlationId
        });
    }
});

router.post('/api/authorize/simulate/:scenario', async (req: Request, res: Response) => {
    const correlationId = (req as any).correlationId;
    const scenario = String(req.params.scenario || '').trim().toUpperCase();
    if (!scenario) {
        return res.status(400).json({ success: false, error: 'scenario is required' });
    }

    try {
        const response = await proxyRequest({
            serviceName: 'sim-auth-engine',
            method: 'POST',
            path: `/simulate/${encodeURIComponent(scenario)}`,
            headers: buildProxyHeaders(req),
            correlationId
        });
        res.status(response.status).json(response.data);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || 'Proxy error',
            code: error.code || 'PROXY_ERROR',
            correlationId
        });
    }
});

router.post('/api/route/process', async (req: Request, res: Response) => {
    const correlationId = (req as any).correlationId;
    try {
        const response = await proxyRequest({
            serviceName: 'sim-network-switch',
            method: 'POST',
            path: '/transaction',
            data: req.body,
            headers: buildProxyHeaders(req),
            correlationId
        });
        res.status(response.status).json(response.data);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || 'Proxy error',
            code: error.code || 'PROXY_ERROR',
            correlationId
        });
    }
});

/**
 * Dynamic proxy handler
 */
const routeConfig: Record<string, { service: string; pathRewrite?: (path: string) => string }> = {
    '/api/cards': { service: 'sim-card-service', pathRewrite: (p) => p.replace('/api/cards', '/cards') },
    '/api/transactions': { service: 'sim-pos-service', pathRewrite: (p) => p.replace('/api/transactions', '/transactions') },
    '/api/process': { service: 'sim-acquirer-service', pathRewrite: (p) => p.replace('/api/process', '/process') },
    '/api/merchants': { service: 'sim-acquirer-service', pathRewrite: (p) => p.replace('/api/merchants', '/merchants') },
    '/api/route': { service: 'sim-network-switch', pathRewrite: (p) => p.replace('/api/route', '/transaction') },
    '/api/issuer': { service: 'sim-issuer-service', pathRewrite: (p) => p.replace('/api/issuer', '') },
    '/api/accounts': { service: 'sim-issuer-service', pathRewrite: (p) => p.replace('/api/accounts', '/accounts') },
    '/api/authorize': { service: 'sim-auth-engine', pathRewrite: (p) => p.replace('/api/authorize', '/authorize') },
    '/api/rules': { service: 'sim-auth-engine', pathRewrite: (p) => p.replace('/api/rules', '/rules') },
    '/api/fraud': { service: 'sim-fraud-detection', pathRewrite: (p) => p.replace('/api/fraud', '') },
    '/api/crypto': { service: 'crypto-service', pathRewrite: (p) => p.replace('/api/crypto', '') },
    '/api/hsm': { service: 'hsm-simulator', pathRewrite: (p) => p.replace('/api/hsm', '/hsm') },
    '/api/keys': { service: 'key-management', pathRewrite: (p) => p.replace('/api/keys', '/keys') },
    '/api/3ds': { service: 'acs-simulator', pathRewrite: (p) => p.replace('/api/3ds', '') },
    '/api/tokenization': { service: 'tokenization-service', pathRewrite: (p) => p.replace('/api/tokenization', '') }
};

const proxyHandler = async (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;
    const correlationId = (req as any).correlationId;
    const matchedRoute = Object.entries(routeConfig).find(([prefix]) => path.startsWith(prefix));

    if (!matchedRoute) return res.status(404).json({ success: false, error: 'Route not found', code: 'ROUTE_NOT_FOUND', path });

    const [_prefix, config] = matchedRoute;
    const targetPath = config.pathRewrite ? config.pathRewrite(path) : path;

    try {
        const response = await proxyRequest({ serviceName: config.service, method: req.method, path: targetPath, data: req.body, headers: buildProxyHeaders(req), correlationId });
        Object.entries(response.headers).forEach(([key, value]) => { if (typeof value === 'string') res.setHeader(key, value); });
        res.status(response.status).json(response.data);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Proxy error', code: error.code || 'PROXY_ERROR', correlationId });
    }
};

router.all('/api/*', proxyHandler);

export default router;
