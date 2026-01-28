/**
 * Authentication Middleware
 * JWT-based authentication for protected routes
 * NOTE: Simplified for pedagogical purposes
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiError } from './errorHandler';

/**
 * JWT Token payload interface
 */
interface TokenPayload {
    sub: string;          // Subject (user/service ID)
    iss: string;          // Issuer
    aud: string;          // Audience
    exp: number;          // Expiration timestamp
    iat: number;          // Issued at timestamp
    role: string;         // User role
    permissions: string[];// Permissions list
}

/**
 * Extend Express Request with auth info
 */
declare global {
    namespace Express {
        interface Request {
            auth?: {
                userId: string;
                role: string;
                permissions: string[];
                token: string;
            };
        }
    }
}

/**
 * Authentication Error
 */
export class AuthenticationError extends ApiError {
    constructor(message: string = 'Authentication required') {
        super(message, 401, 'AUTHENTICATION_ERROR');
        this.name = 'AuthenticationError';
    }
}

/**
 * Authorization Error
 */
export class AuthorizationError extends ApiError {
    constructor(message: string = 'Insufficient permissions') {
        super(message, 403, 'AUTHORIZATION_ERROR');
        this.name = 'AuthorizationError';
    }
}

/**
 * Extract Bearer token from Authorization header
 */
const extractBearerToken = (authHeader: string | undefined): string | null => {
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }

    return parts[1];
};

/**
 * Decode JWT token (simplified - no signature validation for pedagogical purposes)
 * In production: Use jsonwebtoken library with proper key validation
 */
const decodeToken = (token: string): TokenPayload | null => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        // Decode payload (middle part)
        const payload = JSON.parse(
            Buffer.from(parts[1], 'base64url').toString('utf8')
        );

        return payload as TokenPayload;
    } catch (error) {
        return null;
    }
};

/**
 * Validate token payload
 */
const validatePayload = (payload: TokenPayload): boolean => {
    const now = Math.floor(Date.now() / 1000);

    // Check expiration
    if (payload.exp && payload.exp < now) {
        return false;
    }

    // Check not before (if present)
    if (payload.iat && payload.iat > now + 60) {
        return false; // Token from future (with 60s tolerance)
    }

    // Check required fields
    if (!payload.sub || !payload.role) {
        return false;
    }

    return true;
};

/**
 * Authentication middleware
 * Validates JWT token and adds auth info to request
 * 
 * @example
 * // Protect a route
 * router.post('/transaction', authMiddleware, transactionController.create);
 */
export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Extract token
        const token = extractBearerToken(req.headers.authorization);

        if (!token) {
            throw new AuthenticationError('No authentication token provided');
        }

        // Decode token (simplified)
        const payload = decodeToken(token);

        if (!payload) {
            throw new AuthenticationError('Invalid token format');
        }

        // Validate payload
        if (!validatePayload(payload)) {
            throw new AuthenticationError('Token expired or invalid');
        }

        // Add auth info to request
        req.auth = {
            userId: payload.sub,
            role: payload.role,
            permissions: payload.permissions || [],
            token,
        };

        logger.debug('Authentication successful', {
            userId: payload.sub,
            role: payload.role,
            requestId: req.requestId,
        });

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Optional authentication middleware
 * Adds auth info if token present, but doesn't require it
 */
export const optionalAuthMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = extractBearerToken(req.headers.authorization);

        if (token) {
            const payload = decodeToken(token);

            if (payload && validatePayload(payload)) {
                req.auth = {
                    userId: payload.sub,
                    role: payload.role,
                    permissions: payload.permissions || [],
                    token,
                };
            }
        }

        next();
    } catch (error) {
        // Don't fail on optional auth
        next();
    }
};

/**
 * Role-based authorization middleware factory
 * 
 * @example
 * // Require admin role
 * router.delete('/user', authMiddleware, requireRole('admin'), userController.delete);
 */
export const requireRole = (...allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.auth) {
            return next(new AuthenticationError('Authentication required'));
        }

        if (!allowedRoles.includes(req.auth.role)) {
            logger.warn('Authorization failed - insufficient role', {
                userId: req.auth.userId,
                userRole: req.auth.role,
                requiredRoles: allowedRoles,
                requestId: req.requestId,
            });
            return next(new AuthorizationError(
                `Role '${req.auth.role}' not authorized. Required: ${allowedRoles.join(', ')}`
            ));
        }

        next();
    };
};

/**
 * Permission-based authorization middleware factory
 * 
 * @example
 * // Require specific permission
 * router.post('/refund', authMiddleware, requirePermission('refund:create'), refundController.create);
 */
export const requirePermission = (...requiredPermissions: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.auth) {
            return next(new AuthenticationError('Authentication required'));
        }

        const hasAllPermissions = requiredPermissions.every(
            perm => req.auth!.permissions.includes(perm)
        );

        if (!hasAllPermissions) {
            logger.warn('Authorization failed - missing permissions', {
                userId: req.auth.userId,
                userPermissions: req.auth.permissions,
                requiredPermissions,
                requestId: req.requestId,
            });
            return next(new AuthorizationError(
                `Missing required permissions: ${requiredPermissions.join(', ')}`
            ));
        }

        next();
    };
};

/**
 * Service-to-service authentication middleware
 * For internal microservice communication
 */
export const serviceAuthMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const serviceToken = req.headers['x-service-token'] as string;
        const serviceName = req.headers['x-service-name'] as string;

        if (!serviceToken || !serviceName) {
            throw new AuthenticationError('Service authentication required');
        }

        // In production: Validate against service registry
        // For pedagogical purposes: Simple token check
        const expectedToken = process.env.SERVICE_AUTH_TOKEN;

        if (serviceToken !== expectedToken) {
            throw new AuthenticationError('Invalid service token');
        }

        logger.debug('Service authentication successful', {
            serviceName,
            requestId: req.requestId,
        });

        next();
    } catch (error) {
        next(error);
    }
};

export default {
    authMiddleware,
    optionalAuthMiddleware,
    requireRole,
    requirePermission,
    serviceAuthMiddleware,
    AuthenticationError,
    AuthorizationError,
};
