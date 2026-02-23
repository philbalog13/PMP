import { createClient } from 'redis';
import { logger } from '../utils/logger';

type MemoryValue = {
    value: string;
    expiresAt: number;
};

class CtfProofStoreService {
    private client: ReturnType<typeof createClient> | null = null;
    private connecting: Promise<void> | null = null;
    private readonly memory = new Map<string, MemoryValue>();

    private async ensureClient(): Promise<ReturnType<typeof createClient> | null> {
        if (this.client) {
            return this.client;
        }

        if (!this.connecting) {
            this.connecting = (async () => {
                try {
                    const client = createClient({
                        url: process.env.REDIS_URL || 'redis://localhost:6379',
                    });

                    client.on('error', (error) => {
                        logger.warn('[ctfProofStore] Redis error', { error: error.message });
                    });

                    await client.connect();
                    this.client = client;
                    logger.info('[ctfProofStore] Redis connected');
                } catch (error: any) {
                    logger.warn('[ctfProofStore] Redis unavailable, falling back to memory', {
                        error: error?.message || String(error),
                    });
                }
            })().finally(() => {
                this.connecting = null;
            });
        }

        await this.connecting;
        return this.client;
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

    async get(key: string): Promise<string | null> {
        const client = await this.ensureClient();
        if (client) {
            return client.get(key);
        }

        return this.getMemory(key);
    }

    async set(key: string, value: string, ttlSeconds: number): Promise<void> {
        const ttl = Math.max(1, Math.floor(ttlSeconds));
        const client = await this.ensureClient();
        if (client) {
            await client.set(key, value, { EX: ttl });
            return;
        }

        this.memory.set(key, {
            value,
            expiresAt: Date.now() + ttl * 1000,
        });
    }

    async del(key: string): Promise<void> {
        const client = await this.ensureClient();
        if (client) {
            await client.del(key);
            return;
        }

        this.memory.delete(key);
    }
}

export const ctfProofStore = new CtfProofStoreService();
