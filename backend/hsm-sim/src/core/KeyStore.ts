/**
 * KeyStore.ts
 * 
 * Gestionnaire de clés cryptographiques pour HSM-Simulator
 * Stocke les clés en mémoire (simulé, pas sécurisé en production)
 * 
 * @educational Simule le stockage sécurisé de clés d'un HSM
 */

import { EventEmitter } from 'events';

export interface StoredKey {
    id: string;
    type: string;
    algorithm: string;
    data: Buffer;
    kcv?: string;
    createdAt: Date;
    expiresAt?: Date;
    usageCount: number;
    metadata?: Record<string, any>;
}

export class KeyStore extends EventEmitter {
    private keys: Map<string, StoredKey> = new Map();
    private readonly MAX_KEYS = 1000;

    constructor() {
        super();
    }

    /**
     * Store a key
     */
    async storeKey(
        id: string,
        data: Buffer,
        type: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        if (this.keys.size >= this.MAX_KEYS) {
            throw new Error('Key store capacity exceeded');
        }

        const storedKey: StoredKey = {
            id,
            type,
            algorithm: this.detectAlgorithm(data),
            data: Buffer.from(data), // Clone
            createdAt: new Date(),
            usageCount: 0,
            metadata,
        };

        this.keys.set(id, storedKey);
        this.emit('keyStored', { id, type });
    }

    /**
     * Retrieve a key
     */
    async getKey(id: string): Promise<Buffer | null> {
        const storedKey = this.keys.get(id);
        if (!storedKey) {
            return null;
        }

        storedKey.usageCount++;
        return Buffer.from(storedKey.data); // Clone
    }

    /**
     * Check if key exists
     */
    hasKey(id: string): boolean {
        return this.keys.has(id);
    }

    /**
     * Delete a key
     */
    async deleteKey(id: string): Promise<boolean> {
        const existed = this.keys.delete(id);
        if (existed) {
            this.emit('keyDeleted', { id });
        }
        return existed;
    }

    /**
     * Get key metadata
     */
    getKeyInfo(id: string): Omit<StoredKey, 'data'> | null {
        const storedKey = this.keys.get(id);
        if (!storedKey) {
            return null;
        }

        const { data, ...info } = storedKey;
        return info;
    }

    /**
     * Get all key IDs
     */
    listKeys(): string[] {
        return Array.from(this.keys.keys());
    }

    /**
     * Get key count
     */
    async getKeyCount(): Promise<number> {
        return this.keys.size;
    }

    /**
     * Clear all keys (zeroization)
     */
    zeroize(): void {
        // Overwrite key data before clearing
        for (const storedKey of this.keys.values()) {
            storedKey.data.fill(0);
        }
        this.keys.clear();
        this.emit('zeroized');
    }

    /**
     * Detect algorithm from key length
     */
    private detectAlgorithm(data: Buffer): string {
        switch (data.length) {
            case 8: return 'DES';
            case 16: return 'AES-128 or 3DES-112';
            case 24: return '3DES-168';
            case 32: return 'AES-256';
            default: return 'UNKNOWN';
        }
    }
}
