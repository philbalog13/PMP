/**
 * Token Blacklist Service
 * Uses Redis to maintain a blacklist of revoked JWT tokens
 */
import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

class TokenBlacklistService {
    private client: RedisClientType | null = null;
    private initialized = false;
    private inMemoryTokenBlacklist = new Map<string, number>();
    private inMemoryUserRevocations = new Map<string, number>();

    private nowSeconds(): number {
        return Math.floor(Date.now() / 1000);
    }

    private purgeExpiredMemoryEntries(): void {
        const now = this.nowSeconds();

        for (const [token, expiry] of this.inMemoryTokenBlacklist.entries()) {
            if (expiry <= now) {
                this.inMemoryTokenBlacklist.delete(token);
            }
        }

        for (const [userId, expiry] of this.inMemoryUserRevocations.entries()) {
            if (expiry <= now) {
                this.inMemoryUserRevocations.delete(userId);
            }
        }
    }

    private setInMemoryToken(token: string, expiresInSeconds: number): void {
        const ttl = Math.max(expiresInSeconds, 1);
        this.inMemoryTokenBlacklist.set(token, this.nowSeconds() + ttl);
    }

    private setInMemoryUserRevocation(userId: string, expiresInSeconds: number): void {
        const ttl = Math.max(expiresInSeconds, 1);
        this.inMemoryUserRevocations.set(userId, this.nowSeconds() + ttl);
    }

    private isInMemoryTokenBlacklisted(token: string): boolean {
        this.purgeExpiredMemoryEntries();
        const expiry = this.inMemoryTokenBlacklist.get(token);
        return typeof expiry === 'number' && expiry > this.nowSeconds();
    }

    private isInMemoryUserRevoked(userId: string): boolean {
        this.purgeExpiredMemoryEntries();
        const expiry = this.inMemoryUserRevocations.get(userId);
        return typeof expiry === 'number' && expiry > this.nowSeconds();
    }

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
            // Don't throw - app stays available with in-memory fallback revocation.
        }
    }

    /**
     * Add token to blacklist
     */
    async blacklistToken(token: string, expiresInSeconds: number): Promise<void> {
        this.purgeExpiredMemoryEntries();

        if (!this.client || !this.initialized) {
            this.setInMemoryToken(token, expiresInSeconds);
            logger.warn('Token blacklist Redis unavailable, using in-memory fallback');
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
            this.setInMemoryToken(token, expiresInSeconds);
        }
    }

    /**
     * Check if token is blacklisted
     */
    async isBlacklisted(token: string): Promise<boolean> {
        if (this.isInMemoryTokenBlacklisted(token)) {
            return true;
        }

        if (!this.client || !this.initialized) {
            return false;
        }

        try {
            const key = `blacklist:token:${token}`;
            const result = await this.client.get(key);

            return result === 'revoked';
        } catch (error: any) {
            logger.error('Failed to check token blacklist', { error: error.message });
            return this.isInMemoryTokenBlacklisted(token);
        }
    }

    /**
     * Revoke all tokens for a user (e.g., on password change)
     */
    async revokeAllUserTokens(userId: string, expirationSeconds: number = 86400): Promise<void> {
        this.purgeExpiredMemoryEntries();

        if (!this.client || !this.initialized) {
            this.setInMemoryUserRevocation(userId, expirationSeconds);
            logger.warn('Token blacklist Redis unavailable, using in-memory fallback');
            return;
        }

        try {
            const key = `blacklist:user:${userId}`;
            await this.client.setEx(key, expirationSeconds, 'revoked');

            logger.info('All user tokens revoked', { userId });
        } catch (error: any) {
            logger.error('Failed to revoke user tokens', { error: error.message });
            this.setInMemoryUserRevocation(userId, expirationSeconds);
        }
    }

    /**
     * Check if all user tokens are revoked
     */
    async areAllUserTokensRevoked(userId: string): Promise<boolean> {
        if (this.isInMemoryUserRevoked(userId)) {
            return true;
        }

        if (!this.client || !this.initialized) {
            return false;
        }

        try {
            const key = `blacklist:user:${userId}`;
            const result = await this.client.get(key);

            return result === 'revoked';
        } catch (error: any) {
            logger.error('Failed to check user token revocation', { error: error.message });
            return this.isInMemoryUserRevoked(userId);
        }
    }

    /**
     * Get blacklist statistics
     */
    async getStats(): Promise<{ totalBlacklisted: number; initialized: boolean; inMemoryBlacklisted: number; inMemoryRevokedUsers: number }> {
        this.purgeExpiredMemoryEntries();

        if (!this.client || !this.initialized) {
            return {
                totalBlacklisted: 0,
                initialized: false,
                inMemoryBlacklisted: this.inMemoryTokenBlacklist.size,
                inMemoryRevokedUsers: this.inMemoryUserRevocations.size
            };
        }

        try {
            const keys = await this.client.keys('blacklist:token:*');
            return {
                totalBlacklisted: keys.length,
                initialized: true,
                inMemoryBlacklisted: this.inMemoryTokenBlacklist.size,
                inMemoryRevokedUsers: this.inMemoryUserRevocations.size
            };
        } catch (error: any) {
            logger.error('Failed to get blacklist stats', { error: error.message });
            return {
                totalBlacklisted: 0,
                initialized: this.initialized,
                inMemoryBlacklisted: this.inMemoryTokenBlacklist.size,
                inMemoryRevokedUsers: this.inMemoryUserRevocations.size
            };
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
