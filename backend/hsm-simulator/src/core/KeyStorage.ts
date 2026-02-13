import fs from 'node:fs';
import path from 'node:path';
import { KeyNotFoundError, ValidationError } from './errors';
import { isHex, normalizeHex } from '../utils/input';

export type KeyType =
    | 'LMK'
    | 'ZMK'
    | 'ZPK'
    | 'TPK'
    | 'TAK'
    | 'PVK'
    | 'CVK'
    | 'ZEK'
    | 'ZAK'
    | 'MAC'
    | 'DEK'
    | 'UNKNOWN';

export interface StoredKey {
    label: string;
    type: KeyType;
    value: string; // Hex encoded key data for educational simulator
    scheme: 'U' | 'T' | 'X';
    algorithm: 'DES' | '3DES' | 'AES' | 'UNKNOWN';
    createdAt: string;
    metadata?: Record<string, unknown>;
}

interface SeedKey {
    label: string;
    type: KeyType;
    value: string;
    metadata?: Record<string, unknown>;
}

const DEFAULT_KEYS: SeedKey[] = [
    {
        label: 'ZPK_TEST',
        type: 'ZPK',
        value: '11111111111111111111111111111111',
        metadata: { purpose: 'PIN block encryption test key' },
    },
    {
        label: 'CVK_TEST',
        type: 'CVK',
        value: '0123456789ABCDEFFEDCBA9876543210',
        metadata: { purpose: 'CVV generation test key' },
    },
    {
        label: 'ZAK_002',
        type: 'ZAK',
        value: 'A1B2C3D4E5F60718293A4B5C6D7E8F90',
        metadata: { purpose: 'MAC generation for issuer flow' },
    },
    {
        label: 'TAK_TEST',
        type: 'TAK',
        value: '89ABCDEF0123456789ABCDEF01234567',
        metadata: { purpose: 'Terminal MAC operations' },
    },
    {
        label: 'ZEK_001',
        type: 'ZEK',
        value: '00112233445566778899AABBCCDDEEFF',
        metadata: { purpose: 'Issuer data encryption (TDES)' },
    },
    {
        label: 'DEK_AES_001',
        type: 'DEK',
        value: '00112233445566778899AABBCCDDEEFF00112233445566778899AABBCCDDEEFF',
        metadata: { purpose: 'AES data encryption key' },
    },
    {
        label: 'ZMK_TEST',
        type: 'ZMK',
        value: 'FEDCBA9876543210FEDCBA9876543210',
        metadata: { purpose: 'Key translation source/destination' },
    },
    {
        label: 'LMK_TEST',
        type: 'LMK',
        value: '0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
        metadata: { purpose: 'Local master key simulation' },
    },
];

export class KeyStorage {
    private readonly keys: Map<string, StoredKey> = new Map();
    private readonly defaultKeysLoadedAt: string;

    constructor() {
        this.defaultKeysLoadedAt = new Date().toISOString();
        this.reloadDefaults();
    }

    reloadDefaults(): void {
        this.keys.clear();
        DEFAULT_KEYS.forEach((seed) => this.saveKey(seed.label, seed));
        this.loadFromJsonConfig();
        this.loadFromEnvironment();
    }

    saveKey(label: string, data: { type: KeyType; value: string; metadata?: Record<string, unknown> }): void {
        const normalizedLabel = label.trim().toUpperCase();
        if (!normalizedLabel) {
            throw new ValidationError('Key label cannot be empty');
        }

        const normalizedValue = normalizeHex(data.value);
        if (!isHex(normalizedValue)) {
            throw new ValidationError(`Invalid key value for '${normalizedLabel}'`);
        }

        const stored: StoredKey = {
            label: normalizedLabel,
            type: data.type,
            value: normalizedValue,
            scheme: this.detectScheme(normalizedValue),
            algorithm: this.detectAlgorithm(normalizedValue),
            createdAt: new Date().toISOString(),
            metadata: data.metadata,
        };

        this.keys.set(normalizedLabel, stored);
    }

    getKey(label: string): StoredKey | undefined {
        return this.keys.get(label.trim().toUpperCase());
    }

    requireKey(label: string, allowedTypes?: KeyType[]): StoredKey {
        const key = this.getKey(label);
        if (!key) {
            throw new KeyNotFoundError(label);
        }

        if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(key.type)) {
            throw new ValidationError(
                `Key '${label}' has type '${key.type}', expected one of: ${allowedTypes.join(', ')}`
            );
        }

        return key;
    }

    zeroize(): void {
        for (const key of this.keys.values()) {
            key.value = '0'.repeat(key.value.length);
        }
        this.keys.clear();
        console.warn('[HSM Storage] ZEROIZED ALL KEYS');
    }

    listKeys(): StoredKey[] {
        return Array.from(this.keys.values())
            .map((entry) => ({ ...entry }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }

    getCount(): number {
        return this.keys.size;
    }

    getDefaultKeysLoadedAt(): string {
        return this.defaultKeysLoadedAt;
    }

    private detectScheme(valueHex: string): 'U' | 'T' | 'X' {
        const length = valueHex.length;
        if (length <= 16) return 'U';
        if (length <= 32) return 'T';
        return 'X';
    }

    private detectAlgorithm(valueHex: string): 'DES' | '3DES' | 'AES' | 'UNKNOWN' {
        const byteLength = valueHex.length / 2;
        if (byteLength === 8) return 'DES';
        if (byteLength === 16 || byteLength === 24) return '3DES';
        if (byteLength === 32) return 'AES';
        return 'UNKNOWN';
    }

    private loadFromEnvironment(): void {
        const raw = process.env.HSM_BOOTSTRAP_KEYS;
        if (!raw) return;

        try {
            const parsed = JSON.parse(raw) as Record<string, { type: KeyType; value: string }>;
            for (const [label, value] of Object.entries(parsed)) {
                if (!value?.type || !value?.value) continue;
                this.saveKey(label, {
                    type: value.type,
                    value: value.value,
                    metadata: { source: 'env:HSM_BOOTSTRAP_KEYS' },
                });
            }
        } catch (error) {
            console.warn('[HSM Storage] Failed to parse HSM_BOOTSTRAP_KEYS');
        }
    }

    private loadFromJsonConfig(): void {
        const possiblePaths = [
            path.resolve(process.cwd(), 'config', 'test-keys.json'),
            path.resolve(process.cwd(), 'backend', 'hsm-simulator', 'config', 'test-keys.json'),
            path.resolve(__dirname, '..', '..', 'config', 'test-keys.json'),
        ];

        const filePath = possiblePaths.find((candidate) => fs.existsSync(candidate));
        if (!filePath) return;

        try {
            const raw = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(raw) as { keys?: Record<string, Record<string, unknown>> };
            if (!parsed.keys) return;

            for (const [entryName, entry] of Object.entries(parsed.keys)) {
                const type = (entry.type as string | undefined)?.toUpperCase() as KeyType | undefined;
                const value = (entry.value_hex as string | undefined)
                    ?? (entry.combined_hex as string | undefined)
                    ?? (entry.valueHex as string | undefined)
                    ?? (entry.combinedHex as string | undefined);

                if (!type || !value || !isHex(normalizeHex(value))) {
                    continue;
                }

                const id = typeof entry.id === 'string' ? entry.id.toUpperCase() : undefined;
                const label = id ?? `${type}_${entryName.toUpperCase()}`;

                this.saveKey(label, {
                    type,
                    value,
                    metadata: { source: path.basename(filePath) },
                });
            }
        } catch {
            console.warn('[HSM Storage] Failed to load test-keys.json');
        }
    }
}
