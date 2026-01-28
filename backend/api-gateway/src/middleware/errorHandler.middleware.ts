import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface ApiError extends Error {
    statusCode?: number;
    code?: string;
    details?: any;
}

/**
 * Global error handling middleware
 * Catches all errors and returns consistent error response
 */
export const errorHandlerMiddleware = (
    error: ApiError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const statusCode = error.statusCode || 500;
    const correlationId = (req as any).correlationId || 'unknown';

    logger.error('Request error', {
        correlationId,
        method: req.method,
        path: req.path,
        statusCode,
        error: error.message,
        stack: error.stack,
        code: error.code
    });

    // Don't expose internal errors in production
    const isProduction = process.env.NODE_ENV === 'production';

    res.status(statusCode).json({
        success: false,
        error: isProduction && statusCode === 500
            ? 'Internal server error'
            : error.message,
        code: error.code || 'INTERNAL_ERROR',
        correlationId,
        ...(error.details && !isProduction && { details: error.details })
    });
};

/**
 * Create an API error with status code
 */
export const createApiError = (
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any
): ApiError => {
    const error: ApiError = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    error.details = details;
    return error;
};
