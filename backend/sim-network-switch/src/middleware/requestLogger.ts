/**
 * Request Logging Middleware
 * Logs all incoming requests with timing
 */
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger, createRequestLogger } from '../utils/logger';
import { recordHttpRequest } from '../utils/metrics';

// Extend Request to include requestId
declare global {
    namespace Express {
        interface Request {
            requestId: string;
            startTime: number;
        }
    }
}

/**
 * Request ID middleware
 * Assigns unique ID to each request
 */
export const requestIdMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    req.requestId = req.headers['x-request-id'] as string || uuidv4();
    req.startTime = Date.now();

    // Add to response headers
    res.setHeader('X-Request-ID', req.requestId);

    next();
};

/**
 * Request logging middleware
 */
export const requestLogger = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const reqLogger = createRequestLogger(req.requestId);

    // Log incoming request
    reqLogger.info('Incoming request', {
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('user-agent'),
    });

    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - req.startTime;

        reqLogger.info('Request completed', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
        });

        // Record metrics
        recordHttpRequest(req.method, req.path, res.statusCode, duration);
    });

    next();
};

/**
 * Sensitive data masking for logs
 */
export const maskSensitiveData = (obj: Record<string, unknown>): Record<string, unknown> => {
    const sensitiveFields = ['pan', 'pinBlock', 'cvv', 'password', 'token'];
    const masked = { ...obj };

    for (const field of sensitiveFields) {
        if (masked[field] && typeof masked[field] === 'string') {
            const value = masked[field] as string;
            if (field === 'pan' && value.length >= 13) {
                masked[field] = `${value.slice(0, 6)}****${value.slice(-4)}`;
            } else {
                masked[field] = '****';
            }
        }
    }

    return masked;
};

export default { requestIdMiddleware, requestLogger, maskSensitiveData };
