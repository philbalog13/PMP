"use strict";
/**
 * KeyStore.ts
 *
 * Gestionnaire de clés cryptographiques pour HSM-Simulator
 * Stocke les clés en mémoire (simulé, pas sécurisé en production)
 *
 * @educational Simule le stockage sécurisé de clés d'un HSM
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyStore = void 0;
const events_1 = require("events");
class KeyStore extends events_1.EventEmitter {
    constructor() {
        super();
        this.keys = new Map();
        this.MAX_KEYS = 1000;
    }
    /**
     * Store a key
     */
    async storeKey(id, data, type, metadata) {
        if (this.keys.size >= this.MAX_KEYS) {
            throw new Error('Key store capacity exceeded');
        }
        const storedKey = {
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
    async getKey(id) {
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
    hasKey(id) {
        return this.keys.has(id);
    }
    /**
     * Delete a key
     */
    async deleteKey(id) {
        const existed = this.keys.delete(id);
        if (existed) {
            this.emit('keyDeleted', { id });
        }
        return existed;
    }
    /**
     * Get key metadata
     */
    getKeyInfo(id) {
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
    listKeys() {
        return Array.from(this.keys.keys());
    }
    /**
     * Get key count
     */
    async getKeyCount() {
        return this.keys.size;
    }
    /**
     * Clear all keys (zeroization)
     */
    zeroize() {
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
    detectAlgorithm(data) {
        switch (data.length) {
            case 8: return 'DES';
            case 16: return 'AES-128 or 3DES-112';
            case 24: return '3DES-168';
            case 32: return 'AES-256';
            default: return 'UNKNOWN';
        }
    }
}
exports.KeyStore = KeyStore;
