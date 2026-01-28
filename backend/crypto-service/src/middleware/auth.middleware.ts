import { Request, Response, NextFunction } from 'express';

/**
 * Simple authentication middleware for development/testing
 * In production, this would validate JWT tokens
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
    // For development, just pass through
    // In production, would validate Authorization header
    const authHeader = req.headers.authorization;

    if (process.env.NODE_ENV === 'production' && !authHeader) {
        res.status(401).json({ success: false, error: 'Authorization required' });
        return;
    }

    next();
};
