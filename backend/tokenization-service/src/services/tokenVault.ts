/**
 * Token Vault Service
 * Manages PAN <-> Token mapping using Redis
 */

import { createClient, RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';

export interface TokenMetadata {
    token: string;
    pan: string;
    expiresAt: Date;
    usageCount: number;
    maxUsages: number;
    createdAt: Date;
}

export class TokenVault {
    private redis: RedisClientType;
    private connected: boolean = false;

    constructor(private redisUrl: string = 'redis://localhost:6379') { }

    async connect(): Promise<void> {
        this.redis = createClient({ url: this.redisUrl });
        await this.redis.connect();
        this.connected = true;
        console.log('Token Vault connected to Redis');
    }

    async disconnect(): Promise<void> {
        if (this.connected) {
            await this.redis.quit();
            this.connected = false;
        }
    }

    /**
     * Generate a Luhn-compliant token PAN
     */
    private generateLuhnToken(binPrefix: string = '9999'): string {
        // Generate random digits for middle section
        const middle = Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('');
        const partial = binPrefix + middle;

        // Calculate Luhn check digit
        let sum = 0;
        let isEven = true;
        for (let i = partial.length - 1; i >= 0; i--) {
            let digit = parseInt(partial[i], 10);
            if (isEven) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
            isEven = !isEven;
        }
        const checkDigit = (10 - (sum % 10)) % 10;

        return partial + checkDigit;
    }

    /**
     * Tokenize a PAN
     */
    async tokenize(pan: string, ttlSeconds: number = 3600, maxUsages: number = 10): Promise<TokenMetadata> {
        if (!this.connected) throw new Error('Vault not connected');

        // Check if PAN already has a token
        const existingToken = await this.redis.get(`pan:${pan}`);
        if (existingToken) {
            const metadata = await this.getTokenMetadata(existingToken);
            if (metadata && new Date(metadata.expiresAt) > new Date()) {
                return metadata;
            }
        }

        // Generate new token
        const token = this.generateLuhnToken();
        const metadata: TokenMetadata = {
            token,
            pan,
            expiresAt: new Date(Date.now() + ttlSeconds * 1000),
            usageCount: 0,
            maxUsages,
            createdAt: new Date()
        };

        // Store mappings
        await this.redis.setEx(`token:${token}`, ttlSeconds, JSON.stringify(metadata));
        await this.redis.setEx(`pan:${pan}`, ttlSeconds, token);

        return metadata;
    }

    /**
     * Detokenize (retrieve PAN from token)
     */
    async detokenize(token: string): Promise<string | null> {
        if (!this.connected) throw new Error('Vault not connected');

        const data = await this.redis.get(`token:${token}`);
        if (!data) return null;

        const metadata: TokenMetadata = JSON.parse(data);

        // Check expiry
        if (new Date(metadata.expiresAt) < new Date()) {
            await this.deleteToken(token);
            return null;
        }

        // Check usage limit
        if (metadata.usageCount >= metadata.maxUsages) {
            return null;
        }

        // Increment usage
        metadata.usageCount++;
        const ttl = await this.redis.ttl(`token:${token}`);
        await this.redis.setEx(`token:${token}`, ttl, JSON.stringify(metadata));

        return metadata.pan;
    }

    /**
     * Get token metadata
     */
    async getTokenMetadata(token: string): Promise<TokenMetadata | null> {
        if (!this.connected) throw new Error('Vault not connected');

        const data = await this.redis.get(`token:${token}`);
        if (!data) return null;

        return JSON.parse(data);
    }

    /**
     * Delete a token
     */
    async deleteToken(token: string): Promise<void> {
        if (!this.connected) throw new Error('Vault not connected');

        const metadata = await this.getTokenMetadata(token);
        if (metadata) {
            await this.redis.del(`token:${token}`);
            await this.redis.del(`pan:${metadata.pan}`);
        }
    }

    /**
     * Refresh token (extend expiry)
     */
    async refreshToken(token: string, additionalTtl: number = 3600): Promise<TokenMetadata | null> {
        if (!this.connected) throw new Error('Vault not connected');

        const metadata = await this.getTokenMetadata(token);
        if (!metadata) return null;

        metadata.expiresAt = new Date(Date.now() + additionalTtl * 1000);
        await this.redis.setEx(`token:${token}`, additionalTtl, JSON.stringify(metadata));
        await this.redis.setEx(`pan:${metadata.pan}`, additionalTtl, token);

        return metadata;
    }
}
