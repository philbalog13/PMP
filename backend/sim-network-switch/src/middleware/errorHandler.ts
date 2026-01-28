/**
 * Error Handler Middleware
 * Centralized error handling
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { recordError } from '../utils/metrics';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
    statusCode: number;
    code: string;
    details?: unknown;

    constructor(
        message: string,
        statusCode: number = 500,
        code: string = 'INTERNAL_ERROR',
        details?: unknown
    ) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}

/**
 * Validation Error
 */
export class ValidationError extends ApiError {
    constructor(message: string, details?: unknown) {
        super(message, 400, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}

/**
 * Not Found Error
 */
export class NotFoundError extends ApiError {
    constructor(message: string = 'Resource not found') {
        super(message, 404, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}

/**
 * Service Unavailable Error
 */
export class ServiceUnavailableError extends ApiError {
    constructor(message: string = 'Service unavailable') {
        super(message, 503, 'SERVICE_UNAVAILABLE');
        this.name = 'ServiceUnavailableError';
    }
}

/**
 * Error response format
 */
interface ErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
    requestId?: string;
    timestamp: string;
}

/**
 * Error handler middleware
 */
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Log error
    logger.error('Request error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        requestId: (req as any).requestId,
    });

    // Determine status code and error details
    let statusCode = 500;
    let code = 'INTERNAL_ERROR';
    let details: unknown = undefined;

    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        code = err.code;
        details = err.details;
    } else if (err.name === 'ValidationError') {
        // Joi validation errors
        statusCode = 400;
        code = 'VALIDATION_ERROR';
    }

    // Record error metric
    recordError(err.name || 'Error', code);

    // Build response
    const response: ErrorResponse = {
        success: false,
        error: {
            code,
            message: err.message || 'An unexpected error occurred',
            ...(process.env.NODE_ENV !== 'production' && details ? { details } : {}),
        },
        requestId: (req as any).requestId,
        timestamp: new Date().toISOString(),
    };

    res.status(statusCode).json(response);
};

/**
 * Not found handler (404)
 */
export const notFoundHandler = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const response: ErrorResponse = {
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`,
        },
        requestId: (req as any).requestId,
        timestamp: new Date().toISOString(),
    };

    res.status(404).json(response);
};

export default { errorHandler, notFoundHandler, ApiError, ValidationError, NotFoundError };
