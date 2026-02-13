/**
 * Unit Tests for Tokenization Service
 */

type StoredRecord = { value: string; expiresAt: number | null };
const inMemoryStore = new Map<string, StoredRecord>();

const mockRedisClient = {
    connect: jest.fn(async () => undefined),
    quit: jest.fn(async () => undefined),
    get: jest.fn(async (key: string) => {
        const record = inMemoryStore.get(key);
        if (!record) return null;
        if (record.expiresAt !== null && record.expiresAt <= Date.now()) {
            inMemoryStore.delete(key);
            return null;
        }
        return record.value;
    }),
    setEx: jest.fn(async (key: string, ttlSeconds: number, value: string) => {
        inMemoryStore.set(key, {
            value,
            expiresAt: Date.now() + ttlSeconds * 1000
        });
        return 'OK';
    }),
    ttl: jest.fn(async (key: string) => {
        const record = inMemoryStore.get(key);
        if (!record) return -2;
        if (record.expiresAt === null) return -1;
        const remaining = Math.floor((record.expiresAt - Date.now()) / 1000);
        return remaining > 0 ? remaining : -2;
    }),
    del: jest.fn(async (...keys: string[]) => {
        let deleted = 0;
        for (const key of keys) {
            if (inMemoryStore.delete(key)) deleted++;
        }
        return deleted;
    })
};

jest.mock('redis', () => ({
    createClient: jest.fn(() => mockRedisClient)
}));

import { TokenVault } from '../tokenVault';

describe('TokenVault', () => {
    let vault: TokenVault;

    beforeEach(() => {
        inMemoryStore.clear();
    });

    beforeAll(async () => {
        vault = new TokenVault('redis://localhost:6379');
        await vault.connect();
    });

    afterAll(async () => {
        await vault.disconnect();
    });

    describe('Token Generation', () => {
        it('should generate Luhn-compliant token', async () => {
            const metadata = await vault.tokenize('4111111111111111');
            expect(metadata.token).toMatch(/^9999\d{12}$/);

            // Verify Luhn check
            const luhnValid = verifyLuhn(metadata.token);
            expect(luhnValid).toBe(true);
        });

        it('should generate unique tokens', async () => {
            const meta1 = await vault.tokenize('4111111111111111', 60);
            const meta2 = await vault.tokenize('5500000000000004', 60);
            expect(meta1.token).not.toBe(meta2.token);
        });
    });

    describe('Detokenization', () => {
        it('should retrieve original PAN', async () => {
            const originalPan = '4111111111111111';
            const { token } = await vault.tokenize(originalPan);
            const retrievedPan = await vault.detokenize(token);
            expect(retrievedPan).toBe(originalPan);
        });

        it('should return null for expired token', async () => {
            const { token } = await vault.tokenize('4111111111111111', 1); // 1 second
            await new Promise(resolve => setTimeout(resolve, 1500));
            const pan = await vault.detokenize(token);
            expect(pan).toBeNull();
        });
    });

    describe('Token Lifecycle', () => {
        it('should enforce usage limits', async () => {
            const { token } = await vault.tokenize('4111111111111111', 60, 2);

            await vault.detokenize(token); // Usage 1
            await vault.detokenize(token); // Usage 2
            const result = await vault.detokenize(token); // Exceeds limit

            expect(result).toBeNull();
        });
    });
});

function verifyLuhn(pan: string): boolean {
    let sum = 0;
    let isEven = false;
    for (let i = pan.length - 1; i >= 0; i--) {
        let digit = parseInt(pan[i], 10);
        if (isEven) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        isEven = !isEven;
    }
    return sum % 10 === 0;
}
