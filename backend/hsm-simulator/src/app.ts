import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { hsmRoutes } from './routes/hsm.routes';
import { VulnEngine } from './services/VulnEngine';
import { HSMController } from './controllers/hsm.controller';

// Lazy-load ioredis — HSM starts in memory-only mode when Redis is unavailable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let RedisConstructor: any = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    RedisConstructor = require('ioredis');
} catch {
    console.warn('[HSM] ioredis not installed — VulnEngine will use in-memory Map');
}

const app = express();
const controller = new HSMController();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let vulnRedisClient: any | null = null;

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[HSM] ${req.method} ${req.path}`);
    next();
});

app.use(VulnEngine.middleware.bind(VulnEngine));
app.use('/hsm', hsmRoutes);

// Legacy CTF PIN compatibility routes
app.post('/pin/verify', controller.verifyPin);
app.post('/pin/generate-block', controller.generatePinBlock);

app.get(['/health', '/hsm/health'], (_req: Request, res: Response) => {
    res.json({ status: 'OK', service: 'HSM Simulator', version: '1.1.0' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[HSM] Request pipeline error:', err.message);
    res.status(500).json({ success: false, error: 'Unhandled request error', code: 'PIPELINE_ERROR' });
});

export async function initializeVulnEngineRedis(): Promise<void> {
    if (vulnRedisClient) {
        return;
    }

    if (!RedisConstructor) {
        console.warn('[HSM] ioredis not available — VulnEngine stays in memory mode');
        return;
    }
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
        vulnRedisClient = new RedisConstructor(redisUrl, {
            lazyConnect: true,
            maxRetriesPerRequest: 1,
        });
        await vulnRedisClient.connect();
        VulnEngine.init(vulnRedisClient);
        console.log('[HSM] VulnEngine Redis connected');
    } catch (error: any) {
        vulnRedisClient = null;
        console.warn('[HSM] VulnEngine Redis unavailable, fallback memory mode:', error.message);
    }
}

export default app;
