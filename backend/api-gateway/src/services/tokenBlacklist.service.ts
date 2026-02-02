/**
 * Token Blacklist Service
 * Uses Redis to maintain a blacklist of revoked JWT tokens
 */
import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

class TokenBlacklistService {
    private client: RedisClientType | null = null;
    private initialized = false;

    /**
     * Initialize Redis connection
     */
    async init(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            this.client = createClient({
                url: process.env.REDIS_URL || 'redis://localhost:6379',
                password: process.env.REDIS_PASSWORD
            });

            this.client.on('error', (err) => {
                logger.error('Redis Client Error', { error: err.message });
            });

            this.client.on('connect', () => {
                logger.info('Token blacklist Redis connected');
            });

            await this.client.connect();
            this.initialized = true;

            logger.info('Token blacklist service initialized');
        } catch (error: any) {
            logger.error('Failed to initialize token blacklist', { error: error.message });
            // Don't throw - allow app to start even if Redis is unavailable
            // Tokens just won't be revocable until Redis is available
        }
    }

    /**
     * Add token to blacklist
     */
    async blacklistToken(token: string, expiresInSeconds: number): Promise<void> {
        if (!this.client || !this.initialized) {
            logger.warn('Token blacklist not initialized, cannot blacklist token');
            return;
        }

        try {
            const key = `blacklist:token:${token}`;

            // Store token with TTL matching remaining JWT expiration
            // This saves memory - Redis auto-deletes after token would expire anyway
            await this.client.setEx(key, Math.max(expiresInSeconds, 1), 'revoked');

            logger.info('Token blacklisted', { tokenPreview: token.substring(0, 20) + '...' });
        } catch (error: any) {
            logger.error('Failed to blacklist token', { error: error.message });
        }
    }

    /**
     * Check if token is blacklisted
     */
    async isBlacklisted(token: string): Promise<boolean> {
        if (!this.client || !this.initialized) {
            // If Redis unavailable, assume not blacklisted (fail open)
            return false;
        }

        try {
            const key = `blacklist:token:${token}`;
            const result = await this.client.get(key);

            return result === 'revoked';
        } catch (error: any) {
            logger.error('Failed to check token blacklist', { error: error.message });
            // Fail open - if Redis error, don't block valid tokens
            return false;
        }
    }

    /**
     * Revoke all tokens for a user (e.g., on password change)
     */
    async revokeAllUserTokens(userId: string, expirationSeconds: number = 86400): Promise<void> {
        if (!this.client || !this.initialized) {
            logger.warn('Token blacklist not initialized, cannot revoke user tokens');
            return;
        }

        try {
            const key = `blacklist:user:${userId}`;
            await this.client.setEx(key, expirationSeconds, 'revoked');

            logger.info('All user tokens revoked', { userId });
        } catch (error: any) {
            logger.error('Failed to revoke user tokens', { error: error.message });
        }
    }

    /**
     * Check if all user tokens are revoked
     */
    async areAllUserTokensRevoked(userId: string): Promise<boolean> {
        if (!this.client || !this.initialized) {
            return false;
        }

        try {
            const key = `blacklist:user:${userId}`;
            const result = await this.client.get(key);

            return result === 'revoked';
        } catch (error: any) {
            logger.error('Failed to check user token revocation', { error: error.message });
            return false;
        }
    }

    /**
     * Get blacklist statistics
     */
    async getStats(): Promise<{ totalBlacklisted: number; initialized: boolean }> {
        if (!this.client || !this.initialized) {
            return { totalBlacklisted: 0, initialized: false };
        }

        try {
            const keys = await this.client.keys('blacklist:token:*');
            return {
                totalBlacklisted: keys.length,
                initialized: true
            };
        } catch (error: any) {
            logger.error('Failed to get blacklist stats', { error: error.message });
            return { totalBlacklisted: 0, initialized: this.initialized };
        }
    }

    /**
     * Cleanup - close Redis connection
     */
    async close(): Promise<void> {
        if (this.client) {
            await this.client.quit();
            this.initialized = false;
            logger.info('Token blacklist service closed');
        }
    }
}

export const tokenBlacklist = new TokenBlacklistService();
