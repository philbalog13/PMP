import * as cryptoService from '../crypto.service';

describe('Crypto Service', () => {

    describe('encrypt / decrypt', () => {
        const key = '0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF'; // 256-bit key (32 bytes = 64 hex chars)
        const plaintext = 'Hello World!';

        it('should encrypt and decrypt AES-256', () => {
            const encrypted = cryptoService.encrypt(plaintext, key, 'aes-256-cbc');
            // encrypted.data contains IV + Ciphertext (or just Ciphertext for ECB)
            // decrypt expects this concatenated string
            const decrypted = cryptoService.decrypt(encrypted.data!, key, 'aes-256-cbc');

            expect(decrypted.data).toBe(plaintext);
        });

        it('should produce different ciphertext each time (random IV)', () => {
            const encrypted1 = cryptoService.encrypt(plaintext, key, 'aes-256-cbc');
            const encrypted2 = cryptoService.encrypt(plaintext, key, 'aes-256-cbc');

            expect(encrypted1.data).not.toBe(encrypted2.data);
        });
    });

    describe('generateMac', () => {
        const key = 'FEDCBA9876543210';
        const data = 'Transaction data';

        it('should generate HMAC-SHA256', () => {
            const result = cryptoService.generateMac(data, key, 'sha256');

            expect(result.data).toHaveLength(64); // 256 bits = 64 hex chars
        });

        it('should produce same MAC for same input', () => {
            const result1 = cryptoService.generateMac(data, key, 'sha256');
            const result2 = cryptoService.generateMac(data, key, 'sha256');

            expect(result1.data).toBe(result2.data);
        });

        it('should produce different MAC for different data', () => {
            const result1 = cryptoService.generateMac('Data 1', key, 'sha256');
            const result2 = cryptoService.generateMac('Data 2', key, 'sha256');

            expect(result1.data).not.toBe(result2.data);
        });
    });

    describe('verifyMac', () => {
        const key = 'TESTKEY123456789';
        const data = 'Verify this';

        it('should return true for valid MAC', () => {
            const macResult = cryptoService.generateMac(data, key, 'sha256');
            // macResult.data is string | undefined, verifyMac expects string
            const result = cryptoService.verifyMac(data, macResult.data!, key, 'sha256');

            expect(result.data).toBe('VALID');
        });

        it('should return false for tampered data', () => {
            const macResult = cryptoService.generateMac(data, key, 'sha256');
            const result = cryptoService.verifyMac('Tampered data', macResult.data!, key, 'sha256');

            expect(result.data).toBe('INVALID');
        });
    });

    describe('generatePinBlock', () => {
        const pin = '1234';
        const pan = '4111111111111111';

        it('should generate 16-char PIN block', () => {
            const result = cryptoService.generatePinBlock(pin, pan, 0);

            expect(result.data).toHaveLength(16);
        });

        it('should produce different blocks for different PINs', () => {
            const result1 = cryptoService.generatePinBlock('1234', pan, 0);
            const result2 = cryptoService.generatePinBlock('5678', pan, 0);

            expect(result1.data).not.toBe(result2.data);
        });

        it('should start with 0 for Format 0', () => {
            const result = cryptoService.generatePinBlock(pin, pan, 0);

            expect(result.data!.startsWith('0')).toBe(true);
        });
    });

    describe('generateCvv', () => {
        const key = 'abcdef0123456789abcdef0123456789';

        it('should generate 3-digit CVV', () => {
            const result = cryptoService.generateCvv('4111111111111111', '1228', '101', key);

            expect(result.data).toHaveLength(3);
            expect(/^\d{3}$/.test(result.data!)).toBe(true);
        });

        it('should be deterministic for same input', () => {
            const result1 = cryptoService.generateCvv('4111111111111111', '1228', '101', key);
            const result2 = cryptoService.generateCvv('4111111111111111', '1228', '101', key);

            expect(result1.data).toBe(result2.data);
        });

        it('should differ for different expiry', () => {
            const result1 = cryptoService.generateCvv('4111111111111111', '1228', '101', key);
            const result2 = cryptoService.generateCvv('4111111111111111', '0630', '101', key);

            expect(result1.data).not.toBe(result2.data);
        });
    });
});
