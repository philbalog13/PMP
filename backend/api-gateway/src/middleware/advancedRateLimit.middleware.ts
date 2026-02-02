/**
 * Advanced Rate Limiting Middleware
 * Provides granular rate limiting per endpoint type
 * SECURITY: Protects against brute force and abuse
 */
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { logger } from '../utils/logger';

// Redis client for rate limiting store
let redisClient: ReturnType<typeof createClient> | null = null;

// Initialize Redis client for rate limiting
const initRedisClient = async () => {
    if (redisClient) {
        return redisClient;
    }

    try {
        redisClient = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            password: process.env.REDIS_PASSWORD
        });

        redisClient.on('error', (err) => {
            logger.error('Rate limit Redis error', { error: err.message });
        });

        await redisClient.connect();
        logger.info('Rate limiting Redis connected');

        return redisClient;
    } catch (error: any) {
        logger.error('Failed to connect rate limit Redis', { error: error.message });
        return null;
    }
};

// Initialize Redis on module load
initRedisClient();

/**
 * Create rate limiter with Redis store
 */
const createRateLimiter = (
    windowMs: number,
    max: number,
    message: string,
    skipInDevelopment: boolean = false
) => {
    // In development, use higher limits for testing
    const isDevelopment = process.env.NODE_ENV !== 'production';

    if (skipInDevelopment && isDevelopment) {
        // Return a no-op middleware in development
        return (req: any, res: any, next: any) => next();
    }

    const config: any = {
        windowMs,
        max: isDevelopment ? max * 10 : max, // 10x limit in dev
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            error: message,
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(windowMs / 1000)
        },
        handler: (req: any, res: any, next: any, options: any) => {
            logger.warn('Rate limit exceeded', {
                ip: req.ip,
                path: req.path,
                endpoint: message
            });
            res.status(429).json(options.message);
        },
        skip: (req: any) => {
            // Skip for health checks
            return req.path === '/health' || req.path === '/metrics';
        }
    };

    // Use Redis store if available, otherwise use in-memory
    if (redisClient) {
        config.store = new RedisStore({
            // @ts-expect-error - Use sendCommand for redis v4 compatibility
            sendCommand: (...args: string[]) => redisClient.sendCommand(args),
            prefix: 'rl:'
        });
    }

    return rateLimit(config);
};

/**
 * Login endpoint rate limiting
 * SECURITY: 5 attempts per 15 minutes per IP
 */
export const loginRateLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5,
    'Too many login attempts. Please try again in 15 minutes.'
);

/**
 * Registration endpoint rate limiting
 * SECURITY: 3 registrations per hour per IP
 */
export const registerRateLimiter = createRateLimiter(
    60 * 60 * 1000, // 1 hour
    3,
    'Too many registration attempts. Please try again in 1 hour.'
);

/**
 * 2FA endpoint rate limiting
 * SECURITY: 10 attempts per 30 minutes per IP
 */
export const twoFALimiter = createRateLimiter(
    30 * 60 * 1000, // 30 minutes
    10,
    'Too many 2FA attempts. Please try again in 30 minutes.'
);

/**
 * Password reset rate limiting
 * SECURITY: 3 requests per hour per IP
 */
export const passwordResetLimiter = createRateLimiter(
    60 * 60 * 1000, // 1 hour
    3,
    'Too many password reset requests. Please try again in 1 hour.'
);

/**
 * Token refresh rate limiting
 * SECURITY: 20 refreshes per hour per IP (normal usage should be ~4/hour)
 */
export const tokenRefreshLimiter = createRateLimiter(
    60 * 60 * 1000, // 1 hour
    20,
    'Too many token refresh requests. Please try again later.',
    true // Skip in development for testing
);

/**
 * Crypto operations rate limiting
 * SECURITY: 100 requests per minute per IP
 */
export const cryptoRateLimiter = createRateLimiter(
    60 * 1000, // 1 minute
    100,
    'Too many cryptographic operations. Please slow down.'
);

/**
 * General API rate limiting
 * SECURITY: 300 requests per 5 minutes per IP
 */
export const generalApiLimiter = createRateLimiter(
    5 * 60 * 1000, // 5 minutes
    300,
    'Too many API requests. Please slow down.',
    true // Skip in development
);

/**
 * Cleanup function for graceful shutdown
 */
export const closeRateLimitRedis = async () => {
    if (redisClient) {
        await redisClient.quit();
        logger.info('Rate limit Redis connection closed');
    }
};
