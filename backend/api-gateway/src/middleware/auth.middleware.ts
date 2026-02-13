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

/**
 * JWT Authentication Middleware
 * Validates Bearer token and attaches user info to request
 */
export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Skip auth for health checks and public endpoints
    console.log(`[AUTH_CHECK] Path: ${req.path}, URL: ${req.url}, OriginalUrl: ${req.originalUrl}`);

    if (isPublicPath(req.path)) {
        return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        console.warn(`[AUTH_MISSING] ${req.path}`);
        res.status(401).json({
            success: false,
            error: 'Authorization header required',
            code: 'AUTH_MISSING_HEADER'
        });
        return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        logger.warn('Invalid authorization format', { path: req.path });
        res.status(401).json({
            success: false,
            error: 'Invalid authorization format. Use: Bearer <token>',
            code: 'AUTH_INVALID_FORMAT'
        });
        return;
    }

    const token = parts[1];

    try {
        const decoded = jwt.verify(token, config.jwt.secret) as any;

        // SECURITY: Check if token is blacklisted (revoked)
        const isBlacklisted = await tokenBlacklist.isBlacklisted(token);
        if (isBlacklisted) {
            logger.warn('Blacklisted token attempted', { userId: decoded?.userId, path: req.path });
            res.status(401).json({
                success: false,
                error: 'Token has been revoked',
                code: 'AUTH_TOKEN_REVOKED'
            });
            return;
        }

        // SECURITY: Check if all user tokens are revoked (e.g., password change)
        if (decoded.userId) {
            const allRevoked = await tokenBlacklist.areAllUserTokensRevoked(decoded.userId);
            if (allRevoked) {
                logger.warn('User tokens globally revoked', { userId: decoded.userId });
                res.status(401).json({
                    success: false,
                    error: 'All sessions have been revoked. Please login again.',
                    code: 'AUTH_ALL_TOKENS_REVOKED'
                });
                return;
            }
        }

        // Enrich user object with permissions from the matrix if not already in JWT
        const role = decoded.role as UserRole;
        const permissions = ROLE_PERMISSIONS[role] || [];

        req.user = {
            ...decoded,
            permissions
        };

        logger.debug('Token validated', { userId: decoded?.userId, role: decoded?.role, path: req.path });
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

        logger.warn('Invalid token', { path: req.path, error: (error as Error).message });
        res.status(401).json({
            success: false,
            error: 'Invalid token',
            code: 'AUTH_INVALID_TOKEN'
        });
    }
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
