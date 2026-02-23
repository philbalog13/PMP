import * as crypto from 'crypto';
import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

type MemoryEntry = {
    value: string;
    expiresAt: number;
};

class CtfRedisService {
    private client: Redis | null = null;

    private readonly memory = new Map<string, MemoryEntry>();

    private async ensureClient(): Promise<Redis | null> {
        if (this.client) {
            return this.client;
        }

        try {
            const client = new Redis(config.redis.url, {
                lazyConnect: true,
                maxRetriesPerRequest: 1,
            });
            await client.connect();
            this.client = client;
            logger.info('[ctfRedis] Redis connected');
            return client;
        } catch (error: any) {
            logger.warn('[ctfRedis] Redis unavailable, using memory fallback', { error: error.message });
            return null;
        }
    }

    private setMemory(key: string, value: string, ttlSeconds: number): void {
        this.memory.set(key, {
            value,
            expiresAt: Date.now() + Math.max(1, ttlSeconds) * 1000,
        });
    }

    private getMemory(key: string): string | null {
        const entry = this.memory.get(key);
        if (!entry) {
            return null;
        }
        if (Date.now() > entry.expiresAt) {
            this.memory.delete(key);
            return null;
        }
        return entry.value;
    }

    async setWithTtl(key: string, value: string, ttlSeconds: number): Promise<void> {
        const client = await this.ensureClient();
        if (client) {
            await client.set(key, value, 'EX', Math.max(1, Math.floor(ttlSeconds)));
            return;
        }

        this.setMemory(key, value, ttlSeconds);
    }

    async get(key: string): Promise<string | null> {
        const client = await this.ensureClient();
        if (client) {
            return client.get(key);
        }
        return this.getMemory(key);
    }

    async incrementWithTtl(key: string, ttlSeconds: number): Promise<number> {
        const client = await this.ensureClient();
        if (client) {
            const count = await client.incr(key);
            if (count === 1) {
                await client.expire(key, Math.max(1, Math.floor(ttlSeconds)));
            }
            return count;
        }

        const current = Number(this.getMemory(key) || 0);
        const next = current + 1;
        this.setMemory(key, String(next), ttlSeconds);
        return next;
    }

    async storeMitmProofCvv(studentId: string, cvv: string): Promise<void> {
        await this.setWithTtl(`ctf:proof:${studentId}:MITM-001:captured_cvv`, cvv, 300);
    }

    async incrementReplayCounter(studentId: string, fingerprint: string): Promise<number> {
        const hash = crypto.createHash('sha256').update(fingerprint).digest('hex');
        return this.incrementWithTtl(`ctf:replay:${studentId}:${hash}`, 120);
    }
}

export const ctfRedis = new CtfRedisService();
