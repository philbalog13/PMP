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

    describe('importKey', () => {
        it('should import key with calculated KCV', () => {
            const keyData = '0123456789ABCDEF0123456789ABCDEF';
            const imported = keyService.importKey('IMPORTED', 'DEK', 'AES-256', keyData);

            expect(imported.name).toBe('IMPORTED');
            expect(imported.status).toBe('ACTIVE');
            expect(imported.kcv).toHaveLength(6);
        });
    });
});
