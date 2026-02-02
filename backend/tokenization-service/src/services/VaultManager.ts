/**
 * Vault Manager
 * Manages multiple vault backends
 */

import { createClient, RedisClientType } from 'redis';

export interface VaultBackend {
    connect(): Promise<void>;
    store(key: string, value: string, ttl: number): Promise<void>;
    retrieve(key: string): Promise<string | null>;
    delete(key: string): Promise<void>;
}

export class RedisVault implements VaultBackend {
    private client!: RedisClientType;

    constructor(private url: string) { }

    async connect(): Promise<void> {
        this.client = createClient({ url: this.url });
        await this.client.connect();
    }

    async store(key: string, value: string, ttl: number): Promise<void> {
        await this.client.setEx(key, ttl, value);
    }

    async retrieve(key: string): Promise<string | null> {
        return await this.client.get(key);
    }

    async delete(key: string): Promise<void> {
        await this.client.del(key);
    }
}

export class VaultManager {
    private backends: Map<string, VaultBackend> = new Map();
    private defaultBackend: string = 'redis';

    addBackend(name: string, backend: VaultBackend) {
        this.backends.set(name, backend);
    }

    async connect() {
        for (const [name, backend] of this.backends) {
            await backend.connect();
            console.log(`✓ Vault backend '${name}' connected`);
        }
    }

    getBackend(name?: string): VaultBackend {
        const backendName = name || this.defaultBackend;
        const backend = this.backends.get(backendName);
        if (!backend) throw new Error(`Backend '${backendName}' not found`);
        return backend;
    }
}
