import * as crypto from 'crypto';
import { config } from '../config';

export type Algorithm = 'aes-128-cbc' | 'aes-256-cbc' | 'des-ecb' | 'des-cbc' | 'des-ede3-cbc';

export interface CryptoResult {
    success: boolean;
    data?: string;
    error?: string;
    algorithm?: string;
    steps?: string[];
}

/**
 * Encrypt data with specified algorithm
 */
export const encrypt = (data: string, key: string, algorithm: Algorithm = 'aes-256-cbc'): CryptoResult => {
    try {
        const keyBuffer = Buffer.from(key, 'hex');
        const iv = algorithm.includes('ecb') ? null : crypto.randomBytes(getIvLength(algorithm));

        const cipher = iv
            ? crypto.createCipheriv(algorithm, keyBuffer, iv)
            : crypto.createCipheriv(algorithm, keyBuffer, Buffer.alloc(0));

        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const result = iv ? iv.toString('hex') + encrypted : encrypted;

        return {
            success: true,
            data: result,
            algorithm,
            steps: [
                `1. Key parsed (${keyBuffer.length * 8} bits)`,
                iv ? `2. IV generated (${iv.length * 8} bits)` : '2. ECB mode (no IV)',
                `3. Data encrypted: ${data.length} chars → ${result.length} hex chars`,
                `4. Output: ${iv ? 'IV + ' : ''}ciphertext`
            ]
        };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
};

/**
 * Decrypt data with specified algorithm
 */
export const decrypt = (data: string, key: string, algorithm: Algorithm = 'aes-256-cbc'): CryptoResult => {
    try {
        const keyBuffer = Buffer.from(key, 'hex');
        const ivLength = getIvLength(algorithm) * 2; // hex chars

        let iv: Buffer | null = null;
        let ciphertext = data;

        if (!algorithm.includes('ecb')) {
            iv = Buffer.from(data.substring(0, ivLength), 'hex');
            ciphertext = data.substring(ivLength);
        }

        const decipher = iv
            ? crypto.createDecipheriv(algorithm, keyBuffer, iv)
            : crypto.createDecipheriv(algorithm, keyBuffer, Buffer.alloc(0));

        let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return {
            success: true,
            data: decrypted,
            algorithm,
            steps: [
                `1. Key parsed (${keyBuffer.length * 8} bits)`,
                iv ? `2. IV extracted from ciphertext` : '2. ECB mode (no IV)',
                `3. Data decrypted: ${ciphertext.length} hex chars → plaintext`
            ]
        };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
};

/**
 * Generate MAC (Message Authentication Code)
 */
export const generateMac = (data: string, key: string, algorithm: 'sha256' | 'sha1' | 'md5' = 'sha256'): CryptoResult => {
    try {
        const keyBuffer = Buffer.from(key, 'hex');
        const hmac = crypto.createHmac(algorithm, keyBuffer);
        hmac.update(data);
        const mac = hmac.digest('hex');

        return {
            success: true,
            data: mac,
            algorithm: `hmac-${algorithm}`,
            steps: [
                `1. Key: ${keyBuffer.length * 8} bits`,
                `2. Data: ${data.length} bytes`,
                `3. MAC algorithm: HMAC-${algorithm.toUpperCase()}`,
                `4. Result: ${mac.length / 2} bytes (${mac.length} hex chars)`
            ]
        };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
};

/**
 * Verify MAC
 */
export const verifyMac = (data: string, mac: string, key: string, algorithm: 'sha256' | 'sha1' | 'md5' = 'sha256'): CryptoResult => {
    const computed = generateMac(data, key, algorithm);
    if (!computed.success) {
        return computed;
    }

    const valid = computed.data === mac.toLowerCase();
    return {
        success: true,
        data: valid ? 'VALID' : 'INVALID',
        steps: [
            `1. Computed MAC: ${computed.data?.substring(0, 16)}...`,
            `2. Provided MAC: ${mac.substring(0, 16)}...`,
            `3. Comparison: ${valid ? 'MATCH' : 'NO MATCH'}`
        ]
    };
};

/**
 * Generate PIN Block Format 0 (ISO 9564)
 */
export const generatePinBlock = (pin: string, pan: string, format: 0 | 1 | 3 = 0): CryptoResult => {
    try {
        if (pin.length < 4 || pin.length > 12) {
            return { success: false, error: 'PIN must be 4-12 digits' };
        }

        let pinBlock: string;

        if (format === 0) {
            // Format 0: PIN length + PIN + pad Fs XOR PAN
            const pinField = `0${pin.length}${pin}${'F'.repeat(14 - pin.length)}`;
            const panField = `0000${pan.substring(pan.length - 13, pan.length - 1)}`;

            pinBlock = xorHex(pinField, panField);

            return {
                success: true,
                data: pinBlock,
                steps: [
                    `1. PIN field: 0${pin.length}${pin.substring(0, 2)}**${'F'.repeat(14 - pin.length)}`,
                    `2. PAN field: 0000${pan.substring(0, 4)}****${pan.substring(pan.length - 5, pan.length - 1)}`,
                    `3. XOR operation → PIN Block`,
                    `4. Result: ${pinBlock.substring(0, 4)}****${pinBlock.substring(12)}`
                ]
            };
        }

        // Format 1: Random padding
        const randomPad = crypto.randomBytes(6).toString('hex').toUpperCase();
        pinBlock = `1${pin.length}${pin}${randomPad}`.substring(0, 16);

        return {
            success: true,
            data: pinBlock,
            steps: [
                `1. Format: ISO 9564-1 Format ${format}`,
                `2. PIN length: ${pin.length}`,
                `3. Random padding added`,
                `4. Result: 16 hex characters`
            ]
        };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
};

/**
 * Generate CVV/CVC
 */
export const generateCvv = (pan: string, expiry: string, serviceCode: string, key: string): CryptoResult => {
    try {
        const data = pan + expiry + serviceCode;
        const keyBuffer = Buffer.from(key.padEnd(32, '0'), 'hex');

        const hmac = crypto.createHmac('sha1', keyBuffer);
        hmac.update(data);
        const hash = hmac.digest('hex');

        // Extract 3 digits (simplified CVV generation)
        let cvv = '';
        for (const char of hash) {
            if (/\d/.test(char)) {
                cvv += char;
                if (cvv.length === 3) break;
            }
        }

        if (cvv.length < 3) cvv = cvv.padEnd(3, '0');

        return {
            success: true,
            data: cvv,
            steps: [
                '1. Input: PAN + Expiry + Service Code',
                '2. HMAC-SHA1 with CVK key',
                '3. Extract 3 numeric digits',
                `4. CVV: ${cvv}`
            ]
        };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
};

// Helper functions
function getIvLength(algorithm: string): number {
    if (algorithm.includes('aes')) return 16;
    if (algorithm.includes('des')) return 8;
    return 16;
}

function xorHex(a: string, b: string): string {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    const result = Buffer.alloc(bufA.length);
    for (let i = 0; i < bufA.length; i++) {
        result[i] = bufA[i] ^ bufB[i];
    }
    return result.toString('hex').toUpperCase();
}
