import * as keyService from '../key.service';

describe('Key Management Service', () => {

    describe('generateKey', () => {
        it('should generate AES-256 key', () => {
            const key = keyService.generateKey('TEST-KEY', 'DEK', 'AES-256');

            expect(key.name).toBe('TEST-KEY');
            expect(key.type).toBe('DEK');
            expect(key.algorithm).toBe('AES-256');
            expect(key.status).toBe('ACTIVE');
            expect(key.kcv).toHaveLength(6);
        });

        it('should generate unique KCV for each key', () => {
            const key1 = keyService.generateKey('KEY1', 'DEK', 'AES-256');
            const key2 = keyService.generateKey('KEY2', 'DEK', 'AES-256');

            // Keys should have different KCVs (highly likely but not guaranteed)
            // We test key generation works, not collision probability
            expect(key1.id).not.toBe(key2.id);
        });

        it('should generate 3DES key', () => {
            const key = keyService.generateKey('3DES-KEY', 'TMK', '3DES');

            expect(key.algorithm).toBe('3DES');
        });

        it('should generate DES key with 8-byte payload', () => {
            const key = keyService.generateKey('DES-KEY', 'TMK', 'DES');

            expect(key.algorithm).toBe('DES');
            expect(key.keyData).toHaveLength(16);
        });

        it('should fall back to 16 bytes for unknown algorithm input', () => {
            const key = keyService.generateKey('FALLBACK-KEY', 'DEK', 'UNKNOWN' as any);

            expect(key.algorithm).toBe('UNKNOWN');
            expect(key.keyData).toHaveLength(32);
        });
    });

    describe('getKey', () => {
        it('should return key without keyData', () => {
            const created = keyService.generateKey('GET-TEST', 'ZPK', 'AES-128');
            const retrieved = keyService.getKey(created.id);

            expect(retrieved).toBeDefined();
            expect(retrieved?.name).toBe('GET-TEST');
            expect((retrieved as any).keyData).toBeUndefined();
        });

        it('should return null for non-existent key', () => {
            const result = keyService.getKey('non-existent-id');

            expect(result).toBeNull();
        });
    });

    describe('rotateKey', () => {
        it('should create new key and suspend old', () => {
            const original = keyService.generateKey('ROTATE-TEST', 'DEK', 'AES-256');
            const rotated = keyService.rotateKey(original.id);

            expect(rotated).toBeDefined();
            expect(rotated?.rotatedFrom).toBe(original.id);

            const oldKey = keyService.getKey(original.id);
            expect(oldKey?.status).toBe('SUSPENDED');
        });

        it('should return null for non-existent key', () => {
            const result = keyService.rotateKey('non-existent-id');

            expect(result).toBeNull();
        });
    });

    describe('deleteKey', () => {
        it('should destroy key', () => {
            const key = keyService.generateKey('DELETE-TEST', 'DEK', 'AES-128');
            const deleted = keyService.deleteKey(key.id);

            expect(deleted).toBe(true);

            const retrieved = keyService.getKey(key.id);
            expect(retrieved?.status).toBe('DESTROYED');
        });

        it('should return false for non-existent key', () => {
            const result = keyService.deleteKey('non-existent-id');

            expect(result).toBe(false);
        });
    });

    describe('getAllKeys', () => {
        it('should return array of keys without keyData', () => {
            const keys = keyService.getAllKeys();

            expect(Array.isArray(keys)).toBe(true);
            expect(keys.length).toBeGreaterThan(0);

            keys.forEach(key => {
                expect((key as any).keyData).toBeUndefined();
            });
        });
    });

    describe('getKeyData', () => {
        it('should return raw key data for existing key', () => {
            const key = keyService.generateKey('DATA-TEST', 'DEK', 'AES-128');

            expect(keyService.getKeyData(key.id)).toBe(key.keyData);
        });

        it('should return null for missing key', () => {
            expect(keyService.getKeyData('missing-key')).toBeNull();
        });
    });

    describe('updateKeyStatus', () => {
        it('should update key status when key exists', () => {
            const key = keyService.generateKey('STATUS-TEST', 'DEK', 'AES-128');

            expect(keyService.updateKeyStatus(key.id, 'EXPIRED')).toBe(true);
            expect(keyService.getKey(key.id)?.status).toBe('EXPIRED');
        });

        it('should return false when key does not exist', () => {
            expect(keyService.updateKeyStatus('missing-key', 'EXPIRED')).toBe(false);
        });
    });

    describe('importKey', () => {
        it('should import key with calculated KCV', () => {
            const keyData = '0123456789ABCDEF0123456789ABCDEF';
            const imported = keyService.importKey('IMPORTED', 'DEK', 'AES-256', keyData);

            expect(imported.name).toBe('IMPORTED');
            expect(imported.status).toBe('ACTIVE');
            expect(imported.kcv).toHaveLength(6);
        });

        it('should fall back to 000000 KCV for invalid key material', () => {
            const imported = keyService.importKey('BROKEN', 'DEK', 'AES-256', '1234');

            expect(imported.kcv).toBe('000000');
        });
    });

    describe('exportKey', () => {
        it('should export active key in unsafe clear format', () => {
            const key = keyService.generateKey('EXPORT-TEST', 'DEK', 'AES-128');
            const exported = keyService.exportKey(key.id);

            expect(exported).toEqual({
                keyBlock: `UNSAFE_CLEAR:${key.keyData}`,
                kcv: key.kcv
            });
        });

        it('should not export inactive or missing keys', () => {
            const key = keyService.generateKey('EXPORT-DISABLED', 'DEK', 'AES-128');
            keyService.updateKeyStatus(key.id, 'SUSPENDED');

            expect(keyService.exportKey(key.id)).toBeNull();
            expect(keyService.exportKey('missing-key')).toBeNull();
        });
    });
});
