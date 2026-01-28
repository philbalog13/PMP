import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export interface RequestWithCorrelation extends Request {
    correlationId: string;
    startTime: number;
}

/**
 * Request logging middleware with correlation ID
 * Adds unique correlation ID to each request for tracing
 */
export const requestLoggerMiddleware = (
    req: RequestWithCorrelation,
    res: Response,
    next: NextFunction
): void => {
    // Generate or use existing correlation ID
    req.correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
    req.startTime = Date.now();

    // Add correlation ID to response headers
    res.setHeader('X-Correlation-ID', req.correlationId);

    // Log incoming request
    logger.info('Incoming request', {
        correlationId: req.correlationId,
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip,
        userAgent: req.headers['user-agent']?.substring(0, 100)
    });

    // Log response on finish
    res.on('finish', () => {
        const duration = Date.now() - req.startTime;
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

        logger[logLevel]('Request completed', {
            correlationId: req.correlationId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`
        });
    });

    next();
};
