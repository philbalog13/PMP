/**
 * Standardized API Response Utilities
 * Consistent response format across the service
 */

/**
 * Success response structure
 */
export interface SuccessResponse<T> {
    success: true;
    data: T;
    meta?: {
        requestId?: string;
        processingTime?: number;
        pagination?: PaginationMeta;
        [key: string]: unknown;
    };
    timestamp: string;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
        field?: string; // For validation errors
    };
    meta?: {
        requestId?: string;
        [key: string]: unknown;
    };
    timestamp: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

/**
 * API Response builder
 */
export const apiResponse = {
    /**
     * Create success response
     * @param data - Response data
     * @param meta - Optional metadata
     * @returns Formatted success response
     * 
     * @example
     * res.json(apiResponse.success({ user: { id: 1 } }, { requestId: req.requestId }));
     */
    success: <T>(data: T, meta?: Record<string, unknown>): SuccessResponse<T> => ({
        success: true,
        data,
        meta,
        timestamp: new Date().toISOString(),
    }),

    /**
     * Create error response
     * @param code - Error code (e.g., 'VALIDATION_ERROR')
     * @param message - Human-readable error message
     * @param details - Optional error details
     * @returns Formatted error response
     * 
     * @example
     * res.status(400).json(apiResponse.error('VALIDATION_ERROR', 'Invalid PAN format'));
     */
    error: (
        code: string,
        message: string,
        details?: unknown
    ): ErrorResponse => ({
        success: false,
        error: {
            code,
            message,
            ...(details !== undefined && { details }),
        },
        timestamp: new Date().toISOString(),
    }),

    /**
     * Create validation error response
     * @param field - Field that failed validation
     * @param message - Validation error message
     * @param details - Validation details
     * @returns Formatted validation error response
     * 
     * @example
     * res.status(400).json(apiResponse.validationError('pan', 'Must be 16 digits'));
     */
    validationError: (
        field: string,
        message: string,
        details?: unknown
    ): ErrorResponse => ({
        success: false,
        error: {
            code: 'VALIDATION_ERROR',
            message,
            field,
            ...(details !== undefined && { details }),
        },
        timestamp: new Date().toISOString(),
    }),

    /**
     * Create paginated success response
     * @param data - Array of items
     * @param pagination - Pagination info
     * @param meta - Optional additional metadata
     * @returns Formatted paginated response
     * 
     * @example
     * const items = await getItems(page, limit);
     * res.json(apiResponse.paginated(items, { page: 1, limit: 10, total: 100 }));
     */
    paginated: <T>(
        data: T[],
        pagination: { page: number; limit: number; total: number },
        meta?: Record<string, unknown>
    ): SuccessResponse<T[]> => {
        const totalPages = Math.ceil(pagination.total / pagination.limit);

        return {
            success: true,
            data,
            meta: {
                ...meta,
                pagination: {
                    page: pagination.page,
                    limit: pagination.limit,
                    total: pagination.total,
                    totalPages,
                    hasNext: pagination.page < totalPages,
                    hasPrev: pagination.page > 1,
                },
            },
            timestamp: new Date().toISOString(),
        };
    },

    /**
     * Create created response (201)
     * @param data - Created resource
     * @param location - Optional location header value
     * @returns Formatted created response
     */
    created: <T>(data: T, meta?: Record<string, unknown>): SuccessResponse<T> => ({
        success: true,
        data,
        meta,
        timestamp: new Date().toISOString(),
    }),

    /**
     * Create no content response (204)
     * Used for DELETE operations
     */
    noContent: (): null => null,

    /**
     * Create accepted response (202)
     * For async operations
     */
    accepted: <T>(data: T, meta?: Record<string, unknown>): SuccessResponse<T> => ({
        success: true,
        data,
        meta,
        timestamp: new Date().toISOString(),
    }),
};

/**
 * HTTP Status codes constants
 */
export const HttpStatus = {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Common error codes
 */
export const ErrorCodes = {
    // Validation
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',
    MISSING_FIELD: 'MISSING_FIELD',

    // Authentication
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    INVALID_TOKEN: 'INVALID_TOKEN',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',

    // Authorization
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

    // Resources
    NOT_FOUND: 'NOT_FOUND',
    ALREADY_EXISTS: 'ALREADY_EXISTS',
    CONFLICT: 'CONFLICT',

    // Rate limiting
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

    // Server
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    TIMEOUT: 'TIMEOUT',

    // Transaction specific
    INVALID_CARD: 'INVALID_CARD',
    INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
    CARD_EXPIRED: 'CARD_EXPIRED',
    TRANSACTION_DECLINED: 'TRANSACTION_DECLINED',
} as const;

export default apiResponse;
