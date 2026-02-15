import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import { UserRole, Permission, ROLE_PERMISSIONS } from './roles';
import { tokenBlacklist } from '../services/tokenBlacklist.service';

export interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        role: UserRole;
        permissions: Permission[];
        iat: number;
        exp: number;
    };
    vulnProfile?: Record<string, boolean>;
}

/**
 * Check if path is public (exact match or strict prefix match)
 * SECURITY: Uses exact/prefix matching to prevent path traversal
 */
const isPublicPath = (path: string): boolean => {
    // Health checks are always public
    if (
        path === '/health' ||
        path.startsWith('/health/') ||
        path === '/api/health' ||
        path.startsWith('/api/health/')
    ) {
        return true;
    }

    // Specific auth endpoints that are public
    const publicAuthPaths = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/refresh',
        '/api/auth/client/login',
        '/api/auth/marchand/login',
        '/api/auth/etudiant/login',
        '/api/auth/formateur/login',
        '/api/auth/token' // Dev endpoint
    ];

    // Exact match only for auth endpoints
    return publicAuthPaths.includes(path);
};

const extractBearerToken = (authHeader?: string): string | null => {
    if (!authHeader) {
        return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }

    return parts[1] || null;
};

const attachAuthenticatedUser = async (req: AuthenticatedRequest, token: string): Promise<void> => {
    const decoded = jwt.verify(token, config.jwt.secret) as any;

    const isBlacklisted = await tokenBlacklist.isBlacklisted(token);
    if (isBlacklisted) {
        const error = new Error('AUTH_TOKEN_REVOKED');
        throw error;
    }

    if (decoded.userId) {
        const allRevoked = await tokenBlacklist.areAllUserTokensRevoked(decoded.userId);
        if (allRevoked) {
            const error = new Error('AUTH_ALL_TOKENS_REVOKED');
            throw error;
        }
    }

    const role = decoded.role as UserRole;
    const permissions = ROLE_PERMISSIONS[role] || [];

    req.user = {
        ...decoded,
        permissions
    };
};

/**
 * JWT Authentication Middleware
 * Validates Bearer token and attaches user info to request
 */
export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (isPublicPath(req.path)) {
        return next();
    }

    const token = extractBearerToken(req.headers.authorization);

    if (!req.headers.authorization) {
        res.status(401).json({
            success: false,
            error: 'Authorization header required',
            code: 'AUTH_MISSING_HEADER'
        });
        return;
    }

    if (!token) {
        logger.warn('Invalid authorization format', { path: req.path });
        res.status(401).json({
            success: false,
            error: 'Invalid authorization format. Use: Bearer <token>',
            code: 'AUTH_INVALID_FORMAT'
        });
        return;
    }

    try {
        await attachAuthenticatedUser(req, token);
        logger.debug('Token validated', { userId: req.user?.userId, role: req.user?.role, path: req.path });
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            logger.warn('Token expired', { path: req.path });
            res.status(401).json({
                success: false,
                error: 'Token expired',
                code: 'AUTH_TOKEN_EXPIRED'
            });
            return;
        }

        if ((error as Error).message === 'AUTH_TOKEN_REVOKED') {
            logger.warn('Blacklisted token attempted', { path: req.path });
            res.status(401).json({
                success: false,
                error: 'Token has been revoked',
                code: 'AUTH_TOKEN_REVOKED'
            });
            return;
        }

        if ((error as Error).message === 'AUTH_ALL_TOKENS_REVOKED') {
            logger.warn('User tokens globally revoked', { path: req.path });
            res.status(401).json({
                success: false,
                error: 'All sessions have been revoked. Please login again.',
                code: 'AUTH_ALL_TOKENS_REVOKED'
            });
            return;
        }

        logger.warn('Invalid token', { path: req.path, error: (error as Error).message });
        res.status(401).json({
            success: false,
            error: 'Invalid token',
            code: 'AUTH_INVALID_TOKEN'
        });
    }
};

/**
 * Optional auth middleware:
 * If a valid token exists, attach req.user. Otherwise continue anonymously.
 */
export const optionalAuthMiddleware = async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
        return next();
    }

    try {
        await attachAuthenticatedUser(req, token);
    } catch (error) {
        logger.debug('Optional auth skipped due to invalid token', {
            path: req.path,
            error: (error as Error).message
        });
    }

    next();
};

/**
 * Decode token without verification (for debugging/internal use)
 */
export const decodeToken = (token: string): any => {
    return jwt.decode(token);
};

/**
 * Generate JWT token for testing/development
 */
export const generateToken = (userId: string, role: string = 'user', expiresIn: string | number = config.jwt.expiresIn): string => {
    const options = { expiresIn };
    return jwt.sign(
        { userId, role },
        config.jwt.secret,
        options as any
    );
};
