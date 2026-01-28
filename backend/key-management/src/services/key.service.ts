import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

export type KeyType = 'ZMK' | 'TMK' | 'ZPK' | 'PVK' | 'CVK' | 'KEK' | 'DEK' | 'MAC';
export type KeyAlgorithm = 'AES-128' | 'AES-256' | '3DES' | 'DES';

export interface CryptoKey {
    id: string;
    name: string;
    type: KeyType;
    algorithm: KeyAlgorithm;
    keyData: string; // Encrypted key value (in production, this would be in HSM)
    kcv: string; // Key Check Value
    status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'DESTROYED';
    createdAt: Date;
    expiresAt?: Date;
    rotatedFrom?: string; // ID of previous key version
}

// In-memory key store (simulates HSM secure storage)
const keys: Map<string, CryptoKey> = new Map();

// Pre-populate with test keys
const initTestKeys = () => {
    const testKeys: Omit<CryptoKey, 'id' | 'createdAt' | 'kcv'>[] = [
        {
            name: 'MASTER-ZMK-001',
            type: 'ZMK',
            algorithm: '3DES',
            keyData: '0123456789ABCDEF0123456789ABCDEF',
            status: 'ACTIVE'
        },
        {
            name: 'TERMINAL-TMK-001',
            type: 'TMK',
            algorithm: '3DES',
            keyData: 'FEDCBA9876543210FEDCBA9876543210',
            status: 'ACTIVE'
        },
        {
            name: 'PIN-ZPK-001',
            type: 'ZPK',
            algorithm: 'AES-128',
            keyData: '00112233445566778899AABBCCDDEEFF',
            status: 'ACTIVE'
        },
        {
            name: 'CVV-CVK-001',
            type: 'CVK',
            algorithm: '3DES',
            keyData: 'A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4',
            status: 'ACTIVE'
        },
        {
            name: 'MAC-KEY-001',
            type: 'MAC',
            algorithm: 'AES-256',
            keyData: '0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
            status: 'ACTIVE'
        }
    ];

    testKeys.forEach(key => {
        const id = uuidv4();
        const kcv = calculateKcv(key.keyData);
        keys.set(id, {
            ...key,
            id,
            kcv,
            createdAt: new Date()
        });
    });
};

initTestKeys();

/**
 * Calculate Key Check Value (encrypt zeros with key, take first 6 hex chars)
 */
const calculateKcv = (keyData: string): string => {
    try {
        const keyBuffer = Buffer.from(keyData, 'hex');
        const zeros = Buffer.alloc(8, 0);

        let algorithm: string;
        if (keyBuffer.length === 8) algorithm = 'des-ecb';
        else if (keyBuffer.length === 16) algorithm = 'aes-128-ecb';
        else if (keyBuffer.length === 24) algorithm = 'des-ede3';
        else algorithm = 'aes-256-ecb';

        const cipher = crypto.createCipheriv(algorithm, keyBuffer, null);
        cipher.setAutoPadding(false);
        const encrypted = cipher.update(zeros);

        return encrypted.toString('hex').substring(0, 6).toUpperCase();
    } catch {
        return '000000';
    }
};

/**
 * Generate a new cryptographic key
 */
export const generateKey = (name: string, type: KeyType, algorithm: KeyAlgorithm): CryptoKey => {
    let keyLength: number;
    switch (algorithm) {
        case 'DES': keyLength = 8; break;
        case '3DES': keyLength = 24; break;
        case 'AES-128': keyLength = 16; break;
        case 'AES-256': keyLength = 32; break;
        default: keyLength = 16;
    }

    const keyData = crypto.randomBytes(keyLength).toString('hex').toUpperCase();
    const kcv = calculateKcv(keyData);

    const key: CryptoKey = {
        id: uuidv4(),
        name,
        type,
        algorithm,
        keyData,
        kcv,
        status: 'ACTIVE',
        createdAt: new Date()
    };

    keys.set(key.id, key);
    console.log(`[KEY-MGMT] Generated ${type} key: ${key.id}, KCV: ${kcv}`);

    return key;
};

/**
 * Get key by ID (without exposing key data)
 */
export const getKey = (id: string): Omit<CryptoKey, 'keyData'> | null => {
    const key = keys.get(id);
    if (!key) return null;

    const { keyData, ...safeKey } = key;
    return safeKey;
};

/**
 * Get all keys (without exposing key data)
 */
export const getAllKeys = (): Omit<CryptoKey, 'keyData'>[] => {
    return Array.from(keys.values()).map(({ keyData, ...key }) => key);
};

/**
 * Get key data (for internal use only)
 */
export const getKeyData = (id: string): string | null => {
    return keys.get(id)?.keyData || null;
};

/**
 * Update key status
 */
export const updateKeyStatus = (id: string, status: CryptoKey['status']): boolean => {
    const key = keys.get(id);
    if (!key) return false;
    key.status = status;
    keys.set(id, key);
    return true;
};

/**
 * Rotate key (create new version, suspend old)
 */
export const rotateKey = (id: string): CryptoKey | null => {
    const oldKey = keys.get(id);
    if (!oldKey) return null;

    // Generate new key with same properties
    const newKey = generateKey(
        `${oldKey.name}-v${Date.now()}`,
        oldKey.type,
        oldKey.algorithm
    );
    newKey.rotatedFrom = id;

    // Suspend old key
    oldKey.status = 'SUSPENDED';
    keys.set(id, oldKey);

    console.log(`[KEY-MGMT] Rotated key ${id} → ${newKey.id}`);

    return newKey;
};

/**
 * Delete (destroy) key
 */
export const deleteKey = (id: string): boolean => {
    const key = keys.get(id);
    if (!key) return false;

    key.status = 'DESTROYED';
    key.keyData = '0'.repeat(key.keyData.length); // Zeroize
    keys.set(id, key);

    console.log(`[KEY-MGMT] Destroyed key ${id}`);
    return true;
};

/**
 * Import a key (for testing)
 */
export const importKey = (
    name: string,
    type: KeyType,
    algorithm: KeyAlgorithm,
    keyData: string
): CryptoKey => {
    const kcv = calculateKcv(keyData);
    const key: CryptoKey = {
        id: uuidv4(),
        name,
        type,
        algorithm,
        keyData: keyData.toUpperCase(),
        kcv,
        status: 'ACTIVE',
        createdAt: new Date()
    };

    keys.set(key.id, key);
    return key;
};

/**
 * Export key (for backup - returns encrypted or clear based on mode)
 */
export const exportKey = (id: string, kekId?: string): { keyBlock: string; kcv: string } | null => {
    const key = keys.get(id);
    if (!key || key.status !== 'ACTIVE') return null;

    // In production, this would encrypt the key under KEK
    // For educational purposes, we return it (clearly marked as unsafe)
    return {
        keyBlock: `UNSAFE_CLEAR:${key.keyData}`,
        kcv: key.kcv
    };
};
