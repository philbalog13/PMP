/**
 * Refresh Token Service
 * Manages long-lived refresh tokens for JWT rotation
 * SECURITY: Tokens are stored in database with rotation and expiration
 */
import crypto from 'crypto';
import { query } from '../config/database';
import { logger } from '../utils/logger';

export interface RefreshTokenData {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    lastUsedAt?: Date;
    userAgent?: string;
    ipAddress?: string;
}

class RefreshTokenService {
    // Refresh tokens live for 30 days by default
    private readonly REFRESH_TOKEN_EXPIRY_DAYS = 30;

    /**
     * Generate a cryptographically secure refresh token
     */
    private generateSecureToken(): string {
        return crypto.randomBytes(64).toString('hex');
    }

    /**
     * Create a new refresh token for a user
     */
    async createRefreshToken(
        userId: string,
        userAgent?: string,
        ipAddress?: string
    ): Promise<string> {
        try {
            const token = this.generateSecureToken();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

            await query(
                `INSERT INTO security.refresh_tokens (user_id, token, expires_at, user_agent, ip_address)
                VALUES ($1, $2, $3, $4, $5)`,
                [userId, token, expiresAt, userAgent || null, ipAddress || null]
            );

            logger.info('Refresh token created', { userId, expiresInDays: this.REFRESH_TOKEN_EXPIRY_DAYS });

            return token;
        } catch (error: any) {
            logger.error('Failed to create refresh token', { error: error.message, userId });
            throw new Error('Failed to create refresh token');
        }
    }

    /**
     * Validate and retrieve refresh token data
     */
    async validateRefreshToken(token: string): Promise<RefreshTokenData | null> {
        try {
            const result = await query(
                `SELECT id, user_id, token, expires_at, created_at, last_used_at, user_agent, ip_address
                FROM security.refresh_tokens
                WHERE token = $1 AND expires_at > NOW() AND revoked = FALSE`,
                [token]
            );

            if (result.rowCount === 0) {
                logger.warn('Invalid or expired refresh token attempt');
                return null;
            }

            const tokenData = result.rows[0];

            // Update last used timestamp
            await query(
                'UPDATE security.refresh_tokens SET last_used_at = NOW() WHERE id = $1',
                [tokenData.id]
            );

            return {
                id: tokenData.id,
                userId: tokenData.user_id,
                token: tokenData.token,
                expiresAt: tokenData.expires_at,
                createdAt: tokenData.created_at,
                lastUsedAt: tokenData.last_used_at,
                userAgent: tokenData.user_agent,
                ipAddress: tokenData.ip_address
            };
        } catch (error: any) {
            logger.error('Failed to validate refresh token', { error: error.message });
            return null;
        }
    }

    /**
     * Revoke a specific refresh token
     */
    async revokeRefreshToken(token: string): Promise<void> {
        try {
            await query(
                'UPDATE security.refresh_tokens SET revoked = TRUE WHERE token = $1',
                [token]
            );

            logger.info('Refresh token revoked');
        } catch (error: any) {
            logger.error('Failed to revoke refresh token', { error: error.message });
        }
    }

    /**
     * Revoke all refresh tokens for a user (e.g., on password change, logout all devices)
     */
    async revokeAllUserTokens(userId: string): Promise<void> {
        try {
            await query(
                'UPDATE security.refresh_tokens SET revoked = TRUE WHERE user_id = $1 AND revoked = FALSE',
                [userId]
            );

            logger.info('All user refresh tokens revoked', { userId });
        } catch (error: any) {
            logger.error('Failed to revoke all user tokens', { error: error.message, userId });
        }
    }

    /**
     * Rotate refresh token (revoke old, create new)
     * SECURITY: Implements token rotation to limit exposure window
     */
    async rotateRefreshToken(
        oldToken: string,
        userAgent?: string,
        ipAddress?: string
    ): Promise<string | null> {
        try {
            // Validate old token
            const tokenData = await this.validateRefreshToken(oldToken);

            if (!tokenData) {
                return null;
            }

            // Revoke old token
            await this.revokeRefreshToken(oldToken);

            // Create new token
            const newToken = await this.createRefreshToken(
                tokenData.userId,
                userAgent,
                ipAddress
            );

            logger.info('Refresh token rotated', { userId: tokenData.userId });

            return newToken;
        } catch (error: any) {
            logger.error('Failed to rotate refresh token', { error: error.message });
            return null;
        }
    }

    /**
     * Clean up expired tokens (maintenance task)
     */
    async cleanupExpiredTokens(): Promise<number> {
        try {
            const result = await query(
                'DELETE FROM security.refresh_tokens WHERE expires_at < NOW()'
            );

            const deletedCount = result.rowCount || 0;

            if (deletedCount > 0) {
                logger.info('Expired refresh tokens cleaned up', { count: deletedCount });
            }

            return deletedCount;
        } catch (error: any) {
            logger.error('Failed to cleanup expired tokens', { error: error.message });
            return 0;
        }
    }

    /**
     * Get active refresh token count for a user
     */
    async getUserTokenCount(userId: string): Promise<number> {
        try {
            const result = await query(
                'SELECT COUNT(*) as count FROM security.refresh_tokens WHERE user_id = $1 AND expires_at > NOW() AND revoked = FALSE',
                [userId]
            );

            return parseInt(result.rows[0].count, 10);
        } catch (error: any) {
            logger.error('Failed to get user token count', { error: error.message, userId });
            return 0;
        }
    }

    /**
     * Get all active sessions for a user (for security dashboard)
     */
    async getUserSessions(userId: string): Promise<Array<{
        id: string;
        createdAt: Date;
        lastUsedAt?: Date;
        expiresAt: Date;
        userAgent?: string;
        ipAddress?: string;
    }>> {
        try {
            const result = await query(
                `SELECT id, created_at, last_used_at, expires_at, user_agent, ip_address
                FROM security.refresh_tokens
                WHERE user_id = $1 AND expires_at > NOW() AND revoked = FALSE
                ORDER BY created_at DESC`,
                [userId]
            );

            return result.rows.map(row => ({
                id: row.id,
                createdAt: row.created_at,
                lastUsedAt: row.last_used_at,
                expiresAt: row.expires_at,
                userAgent: row.user_agent,
                ipAddress: row.ip_address
            }));
        } catch (error: any) {
            logger.error('Failed to get user sessions', { error: error.message, userId });
            return [];
        }
    }
}

export const refreshTokenService = new RefreshTokenService();
