import { Router, Request, Response, NextFunction } from 'express';
import { proxyRequest, getAllServicesHealth } from '../services/proxy.service';
import { orchestrator } from '../services/integration-orchestrator';
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
import { RequireRole, UserRole } from '../middleware/roles';

const router = Router();

/**
 * Persona View Mock Endpoints (Pedagogical)
 * These are placed at the TOP to ensure they take precedence over the catch-all proxy.
 * PROTECTED by RBAC: Only the specific role can access its view.
 */
// Mock Endpoints
router.get('/api/client/cards', RequireRole(UserRole.CLIENT), (req, res) => res.json({ success: true, cards: [{ id: 'C1', pan: '4916****1344', balance: 1000 }] }));
router.get('/api/marchand/transactions', RequireRole(UserRole.MARCHAND), (req, res) => res.json({ success: true, transactions: [{ id: 'T1', amount: 45.8, status: 'APPROVED' }] }));
router.get('/api/marchand/reports/daily', RequireRole(UserRole.MARCHAND), (req, res) => res.json({ success: true, report: { date: new Date().toISOString().split('T')[0], totalSales: 1540.50, transactionCount: 32 } }));
router.get('/api/etudiant/progression', RequireRole(UserRole.ETUDIANT), (req, res) => res.json({ success: true, workshop: 1, status: 'COMPLETED' }));
router.post('/api/etudiant/progression/save', RequireRole(UserRole.ETUDIANT), (req, res) => res.json({ success: true, message: 'Progression saved' }));
router.get('/api/etudiant/quiz', RequireRole(UserRole.ETUDIANT), (req, res) => res.json({ success: true, quiz: 'Introduction to Payments', score: '85%' }));
router.get('/api/etudiant/exercises', RequireRole(UserRole.ETUDIANT), (req, res) => res.json({ success: true, active: 'Lab 2: Crypto' }));
router.get('/api/etudiant/docs', RequireRole(UserRole.ETUDIANT), (req, res) => res.json({ success: true, docs: ['EMV Specs', 'ISO8583 Guide'] }));
// Trainer / Admin Endpoints
router.get('/api/formateur/sessions-actives', RequireRole(UserRole.FORMATEUR), (req, res) => res.json({ success: true, sessions: [{ id: 'S1', user: 'etudiant_01', active: true }] }));
router.get('/api/formateur/exercises', RequireRole(UserRole.FORMATEUR), (req, res) => res.json({ success: true, exercises: [{ id: 'E1', title: 'Crypto Basics' }, { id: 'E2', title: '3DS Flow' }] }));
router.post('/api/formateur/exercises', RequireRole(UserRole.FORMATEUR), (req, res) => res.json({ success: true, message: 'Exercise created' }));
router.get('/api/admin/logs', RequireRole(UserRole.FORMATEUR), (req, res) => res.json({ success: true, logs: ['[INFO] Login success', '[WARN] Failed attempt'] }));
router.get('/api/admin/users', RequireRole(UserRole.FORMATEUR), (req, res) => res.json({ success: true, users: ['client_test', 'marchand_boulangerie', 'etudiant_01'] }));

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
    res.status(200).json({ status: allHealthy ? 'healthy' : 'degraded', timestamp: new Date().toISOString(), gateway: { healthy: true }, services: servicesHealth, _educational: { diagramStep: 'GW->>AUTH: Vérification services', note: 'This endpoint aggregates health status from all microservices' } });
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

/**
 * Dynamic proxy handler
 */
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

    const [prefix, config] = matchedRoute;
    const targetPath = config.pathRewrite ? config.pathRewrite(path) : path;

    try {
        const response = await proxyRequest({ serviceName: config.service, method: req.method, path: targetPath, data: req.body, headers: { 'Authorization': req.headers.authorization || '', 'Content-Type': 'application/json' }, correlationId });
        Object.entries(response.headers).forEach(([key, value]) => { if (typeof value === 'string') res.setHeader(key, value); });
        res.status(response.status).json(response.data);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Proxy error', code: error.code || 'PROXY_ERROR', correlationId });
    }
};

router.all('/api/*', proxyHandler);

export default router;
