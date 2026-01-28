import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Rate limiting middleware
 * Limits requests per IP address to prevent abuse
 */
export const rateLimitMiddleware = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,

    message: {
        success: false,
        error: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
    },

    handler: (req, res, next, options) => {
        logger.warn('Rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            limit: config.rateLimit.max,
            window: `${config.rateLimit.windowMs / 1000}s`
        });
        res.status(429).json(options.message);
    },

    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/metrics';
    },

    keyGenerator: (req) => {
        // Use X-Forwarded-For if behind proxy, otherwise use IP
        return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';
    }
});

/**
 * Stricter rate limit for sensitive endpoints (auth, crypto)
 */
export const strictRateLimitMiddleware = rateLimit({
    windowMs: 60 * 1000,
    max: 20, // 20 requests per minute for sensitive endpoints
    standardHeaders: true,
    message: {
        success: false,
        error: 'Rate limit exceeded for sensitive endpoint',
        code: 'STRICT_RATE_LIMIT_EXCEEDED'
    }
});
