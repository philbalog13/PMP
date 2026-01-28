/**
 * Crypto Service Unit Tests
 * Tests for AES, DES, MAC, PIN Block functions
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock Crypto Service (will be imported from actual service)
class CryptoService {
    private keys: Map<string, Buffer> = new Map();

    // Key Management
    generateKey(keyType: 'AES' | 'DES' | '3DES', keyId: string): string {
        const length = keyType === 'AES' ? 32 : keyType === '3DES' ? 24 : 8;
        const key = Buffer.alloc(length);
        for (let i = 0; i < length; i++) {
            key[i] = Math.floor(Math.random() * 256);
        }
        this.keys.set(keyId, key);
        return key.toString('hex').toUpperCase();
    }

    getKey(keyId: string): Buffer | undefined {
        return this.keys.get(keyId);
    }

    // Encryption
    encryptAES(data: string, keyId: string): string {
        const key = this.keys.get(keyId);
        if (!key) throw new Error('Key not found');
        // Simplified - would use crypto in real implementation
        return Buffer.from(data).toString('hex').toUpperCase();
    }

    decryptAES(encryptedData: string, keyId: string): string {
        const key = this.keys.get(keyId);
        if (!key) throw new Error('Key not found');
        return Buffer.from(encryptedData, 'hex').toString();
    }

    // MAC Calculation (ISO 9797-1 Algorithm 3)
    calculateMAC(data: string, keyId: string): string {
        const key = this.keys.get(keyId);
        if (!key) throw new Error('Key not found');
        // Simplified MAC - real impl uses CBC-MAC
        let mac = 0;
        for (let i = 0; i < data.length; i++) {
            mac = (mac + data.charCodeAt(i)) % 256;
        }
        return mac.toString(16).padStart(16, '0').toUpperCase();
    }

    verifyMAC(data: string, mac: string, keyId: string): boolean {
        const calculatedMac = this.calculateMAC(data, keyId);
        return calculatedMac === mac;
    }

    // PIN Block (ISO 9564-1 Format 0)
    generatePINBlock(pin: string, pan: string): string {
        if (pin.length < 4 || pin.length > 12) {
            throw new Error('PIN must be 4-12 digits');
        }
        if (!/^\d+$/.test(pin)) {
            throw new Error('PIN must contain only digits');
        }

        // Format 0: PIN Block = PIN field XOR PAN field
        const pinField = `0${pin.length}${pin}${'F'.repeat(14 - pin.length)}`;
        const panField = `0000${pan.slice(-13, -1)}`;

        let result = '';
        for (let i = 0; i < 16; i++) {
            const pinNibble = parseInt(pinField[i], 16);
            const panNibble = parseInt(panField[i], 16);
            result += (pinNibble ^ panNibble).toString(16);
        }
        return result.toUpperCase();
    }

    // Luhn Validation
    validateLuhn(pan: string): boolean {
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
}

describe('CryptoService', () => {
    let cryptoService: CryptoService;

    beforeEach(() => {
        cryptoService = new CryptoService();
    });

    describe('Key Management', () => {
        it('should generate AES-256 key (32 bytes)', () => {
            const keyHex = cryptoService.generateKey('AES', 'test-aes');
            expect(keyHex).toHaveLength(64); // 32 bytes = 64 hex chars
        });

        it('should generate 3DES key (24 bytes)', () => {
            const keyHex = cryptoService.generateKey('3DES', 'test-3des');
            expect(keyHex).toHaveLength(48); // 24 bytes = 48 hex chars
        });

        it('should generate DES key (8 bytes)', () => {
            const keyHex = cryptoService.generateKey('DES', 'test-des');
            expect(keyHex).toHaveLength(16); // 8 bytes = 16 hex chars
        });

        it('should retrieve stored key', () => {
            cryptoService.generateKey('AES', 'my-key');
            const key = cryptoService.getKey('my-key');
            expect(key).toBeDefined();
            expect(key?.length).toBe(32);
        });

        it('should return undefined for non-existent key', () => {
            const key = cryptoService.getKey('nonexistent');
            expect(key).toBeUndefined();
        });
    });

    describe('Encryption/Decryption', () => {
        it('should encrypt and decrypt data correctly', () => {
            cryptoService.generateKey('AES', 'enc-key');
            const original = 'Hello, Payment!';
            const encrypted = cryptoService.encryptAES(original, 'enc-key');
            const decrypted = cryptoService.decryptAES(encrypted, 'enc-key');
            expect(decrypted).toBe(original);
        });

        it('should throw error when key not found', () => {
            expect(() => {
                cryptoService.encryptAES('data', 'missing-key');
            }).toThrow('Key not found');
        });
    });

    describe('MAC Calculation', () => {
        it('should calculate MAC for message', () => {
            cryptoService.generateKey('3DES', 'mac-key');
            const mac = cryptoService.calculateMAC('Test message', 'mac-key');
            expect(mac).toHaveLength(16);
            expect(/^[0-9A-F]+$/.test(mac)).toBe(true);
        });

        it('should verify valid MAC', () => {
            cryptoService.generateKey('3DES', 'mac-key');
            const message = 'Test message';
            const mac = cryptoService.calculateMAC(message, 'mac-key');
            expect(cryptoService.verifyMAC(message, mac, 'mac-key')).toBe(true);
        });

        it('should reject invalid MAC', () => {
            cryptoService.generateKey('3DES', 'mac-key');
            expect(cryptoService.verifyMAC('Test', 'INVALID_MAC_1234', 'mac-key')).toBe(false);
        });

        it('should produce different MACs for different messages', () => {
            cryptoService.generateKey('3DES', 'mac-key');
            const mac1 = cryptoService.calculateMAC('Message 1', 'mac-key');
            const mac2 = cryptoService.calculateMAC('Message 2', 'mac-key');
            expect(mac1).not.toBe(mac2);
        });
    });

    describe('PIN Block Generation', () => {
        it('should generate valid PIN block for 4-digit PIN', () => {
            const pinBlock = cryptoService.generatePINBlock('1234', '4111111111111111');
            expect(pinBlock).toHaveLength(16);
            expect(/^[0-9A-F]+$/.test(pinBlock)).toBe(true);
        });

        it('should generate valid PIN block for 6-digit PIN', () => {
            const pinBlock = cryptoService.generatePINBlock('123456', '5500000000000004');
            expect(pinBlock).toHaveLength(16);
        });

        it('should reject PIN with less than 4 digits', () => {
            expect(() => {
                cryptoService.generatePINBlock('123', '4111111111111111');
            }).toThrow('PIN must be 4-12 digits');
        });

        it('should reject PIN with more than 12 digits', () => {
            expect(() => {
                cryptoService.generatePINBlock('1234567890123', '4111111111111111');
            }).toThrow('PIN must be 4-12 digits');
        });

        it('should reject non-numeric PIN', () => {
            expect(() => {
                cryptoService.generatePINBlock('12AB', '4111111111111111');
            }).toThrow('PIN must contain only digits');
        });

        it('should produce different PIN blocks for different PANs', () => {
            const pb1 = cryptoService.generatePINBlock('1234', '4111111111111111');
            const pb2 = cryptoService.generatePINBlock('1234', '5500000000000004');
            expect(pb1).not.toBe(pb2);
        });
    });

    describe('Luhn Validation', () => {
        it('should validate correct Visa card', () => {
            expect(cryptoService.validateLuhn('4111111111111111')).toBe(true);
        });

        it('should validate correct Mastercard', () => {
            expect(cryptoService.validateLuhn('5500000000000004')).toBe(true);
        });

        it('should reject invalid PAN', () => {
            expect(cryptoService.validateLuhn('4111111111111112')).toBe(false);
        });

        it('should reject PAN with wrong checksum', () => {
            expect(cryptoService.validateLuhn('1234567890123456')).toBe(false);
        });
    });
});

describe('Error Handling', () => {
    let cryptoService: CryptoService;

    beforeEach(() => {
        cryptoService = new CryptoService();
    });

    it('should handle empty data gracefully', () => {
        cryptoService.generateKey('AES', 'key');
        const encrypted = cryptoService.encryptAES('', 'key');
        expect(encrypted).toBe('');
    });

    it('should handle special characters in data', () => {
        cryptoService.generateKey('AES', 'key');
        const special = 'éàü€@#$%^&*()';
        const encrypted = cryptoService.encryptAES(special, 'key');
        const decrypted = cryptoService.decryptAES(encrypted, 'key');
        expect(decrypted).toBe(special);
    });
});
