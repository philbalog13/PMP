import crypto from 'node:crypto';

// Simulation of a Secure Key Component (Thales/Atalla style)
export interface StoredKey {
    scheme: 'U' | 'T' | 'X'; // Single, Double, Triple
    type: 'ZPK' | 'PVK' | 'TPK' | 'CVK';
    value: string; // Hex (encrypted under LMK in real HSM, here we treat as secure storage)
    checkValue: string;
}

export class KeyStore {
    private static LMK: Buffer; // Local Master Key (Transient)
    private static keys: Map<string, StoredKey> = new Map();

    static initialize() {
        // Generate a random LMK at startup (volatile in this sim)
        this.LMK = crypto.randomBytes(32); // 256-bit AES LMK
        console.log('HSM: New LMK Generated. Secure storage initialized.');

        // Seed some test keys
        this.storeKey('ZPK_TEST', 'ZPK', '11111111111111111111111111111111');
        this.storeKey('CVK_TEST', 'CVK', '0123456789ABCDEFFEDCBA9876543210');
    }

    static getLMK(): Buffer {
        return this.LMK;
    }

    static storeKey(label: string, type: 'ZPK' | 'PVK' | 'TPK' | 'CVK', clearValueHex: string) {
        // In real HSM, we would encrypt clearValueHex under LMK
        // For education, we store it but mark it as handled
        this.keys.set(label, {
            scheme: clearValueHex.length === 32 ? 'T' : 'U', // Simple check
            type,
            value: clearValueHex,
            checkValue: '000000' // Stub KCV
        });
    }

    static getKey(label: string): StoredKey | undefined {
        return this.keys.get(label);
    }

    static getAllKeys(): any[] {
        return Array.from(this.keys.entries()).map(([label, k]) => ({
            label,
            type: k.type,
            scheme: k.scheme,
            checkValue: k.checkValue
        }));
    }
}
