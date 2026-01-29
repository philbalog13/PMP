import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        role: string;
        iat: number;
        exp: number;
    };
}

/**
 * JWT Authentication Middleware
 * Validates Bearer token and attaches user info to request
 */
export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // Skip auth for health checks and public endpoints
    const publicPaths = ['/health', '/api/health', '/metrics', '/api/auth/login', '/api/cards/generate', '/api/pos/transaction'];
    if (publicPaths.some(path => req.path.startsWith(path))) {
        return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        logger.warn('Missing authorization header', { path: req.path, ip: req.ip });
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
        const decoded = jwt.verify(token, config.jwt.secret) as AuthenticatedRequest['user'];
        req.user = decoded;
        logger.debug('Token validated', { userId: decoded?.userId, path: req.path });
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
 * Generate JWT token for testing/development
 */
export const generateToken = (userId: string, role: string = 'user'): string => {
    const options = { expiresIn: config.jwt.expiresIn };
    return jwt.sign(
        { userId, role },
        config.jwt.secret,
        options as any
    );
};
