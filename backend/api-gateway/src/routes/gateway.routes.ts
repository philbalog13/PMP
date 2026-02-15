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
import { generateToken, authMiddleware, optionalAuthMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';
import { UserRole } from '../middleware/roles';
import { vulnStateMiddleware } from '../middleware/vulnState.middleware';
import * as authController from '../controllers/auth.controller';
import * as twofaController from '../controllers/twofa.controller';
import * as defenseController from '../controllers/defense.controller';
import { vulnStateService } from '../services/vulnState.service';

const router = Router();

const buildProxyHeaders = (req: Request): Record<string, string> => ({
    Authorization: req.headers.authorization || '',
    'Content-Type': 'application/json'
});

const CRITICAL_DB_TABLES = [
    'users.users',
    'learning.migration_history',
    'learning.student_vuln_state', // Added for sandbox
    'learning.vuln_catalog',       // Added for sandbox
    'learning.defense_quizzes',    // Added for sandbox
    'learning.cursus',
    'learning.cursus_modules',
    'learning.cursus_chapters',
    'learning.cursus_quizzes',
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

const applyCardOverrides = async (
    studentId: string,
    responseData: any
): Promise<any> => {
    const overridesByResource = await vulnStateService.getResourceOverridesByType(studentId, 'CARD');
    const cards = Array.isArray(responseData?.data)
        ? responseData.data
        : (Array.isArray(responseData) ? responseData : null);

    if (!cards) {
        return responseData;
    }

    const patchedCards = cards
        .map((card: Record<string, any>) => {
            const candidates = [card.id, card.pan, card.maskedPan]
                .filter(Boolean)
                .map((value) => String(value));

            let mergedCard: Record<string, any> = { ...card };
            let deleted = false;

            for (const resourceId of candidates) {
                const overrides = overridesByResource[resourceId];
                if (!overrides) {
                    continue;
                }

                if (overrides.deleted === true || overrides.is_deleted === true) {
                    deleted = true;
                    break;
                }

                mergedCard = { ...mergedCard, ...overrides };
            }

            return deleted ? null : mergedCard;
        })
        .filter(Boolean);

    if (Array.isArray(responseData)) {
        return patchedCards;
    }

    return {
        ...responseData,
        data: patchedCards
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
 * --- DEFENSIVE SANDBOX ROUTES ---
 * New endpoints for fixing vulnerabilities and getting defensive status
 * Using 'any' cast for handlers to avoid Express Request compatibility issues
 */
// Routes for defensive sandbox
router.get('/api/defense/status', authMiddleware, vulnStateMiddleware, defenseController.getDefenseStatus as any);
router.get('/api/defense/catalog', authMiddleware, vulnStateMiddleware, defenseController.getVulnCatalog as any);
router.post('/api/defense/probe', authMiddleware, vulnStateMiddleware, defenseController.probeFlag as any);
router.post('/api/defense/submit-flag', authMiddleware, vulnStateMiddleware, defenseController.submitFlag as any);
router.post('/api/defense/fix', authMiddleware, vulnStateMiddleware, defenseController.submitDefenseFix as any);
router.post('/api/defense/reset', authMiddleware, vulnStateMiddleware, defenseController.resetDefenseState as any);

/**
 * Dev token generation (VULNERABLE ENDPOINT)
 * Sandbox Logic: Checks if DEV_TOKEN_OPEN flag is active (default: true)
 */
router.post('/api/auth/token',
    strictRateLimitMiddleware,
    optionalAuthMiddleware as any,
    vulnStateMiddleware as any,
    (req: Request, res: Response) => {
        // Enforce sandbox check (only if identified as student and vulnerability is fixed)
        const authReq = req as AuthenticatedRequest;
        if (authReq.vulnProfile && authReq.vulnProfile['DEV_TOKEN_OPEN'] === false) {
            return res.status(404).json({ success: false, error: 'Not Found' });
        }

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
 * --- SANDBOX VULNERABILITY INTERCEPTORS ---
 * Specific handlers for patched vulnerabilities before they hit the proxy
 */

// Interceptor for /cards (IDOR Protection)
router.get('/api/cards',
    authMiddleware,
    vulnStateMiddleware,
    (async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const requestedUserId = req.query.userId as string;
        const currentUserId = req.user?.userId;

        // If IDOR is fixed (false), enforce ownership
        if (req.vulnProfile && req.vulnProfile['IDOR_CARDS_NO_AUTH'] === false) {
            // Security Policy: Must provide userId and must match token
            if (!requestedUserId || requestedUserId !== currentUserId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access Denied: In secure mode, you must filter by your own userId.',
                    code: 'IDOR_PREVENTION_ENFORCED',
                    hint: 'Add ?userId=YOUR_ID to the request'
                });
            }
        }

        const correlationId = (req as any).correlationId;
        const search = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';

        try {
            const response = await proxyRequest({
                serviceName: 'sim-card-service',
                method: 'GET',
                path: `/cards${search}`,
                headers: buildProxyHeaders(req),
                correlationId
            });

            let responseData = response.data;

            // Apply per-student virtual data overrides (resource isolation).
            if (req.user?.role === UserRole.ETUDIANT && req.user.userId) {
                responseData = await applyCardOverrides(req.user.userId, responseData);
            }

            Object.entries(response.headers).forEach(([key, value]) => {
                if (typeof value === 'string') {
                    res.setHeader(key, value);
                }
            });

            // When the sandbox vulnerability is active for a student, we expose the flag via headers
            // only when the request demonstrates the broken control (missing or mismatched userId).
            if (req.user?.role === UserRole.ETUDIANT
                && currentUserId
                && req.vulnProfile
                && req.vulnProfile['IDOR_CARDS_NO_AUTH'] === true
                && (!requestedUserId || requestedUserId !== currentUserId)) {
                const flag = await vulnStateService.getFlagValue('IDOR_CARDS_NO_AUTH');
                if (flag) {
                    res.setHeader('X-Defense-Vuln', 'IDOR_CARDS_NO_AUTH');
                    res.setHeader('X-Defense-Flag', flag);
                }
            }

            res.status(response.status).json(responseData);
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                error: error.message || 'Proxy error',
                code: error.code || 'PROXY_ERROR',
                correlationId
            });
        }
    }) as any
);


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
