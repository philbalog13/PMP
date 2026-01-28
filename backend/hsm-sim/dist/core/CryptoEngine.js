"use strict";
/**
 * CryptoEngine.ts
 *
 * Moteur cryptographique pour HSM-Simulator
 * Implémente les opérations crypto standards pour les paiements
 *
 * @educational Simule les opérations cryptographiques d'un HSM
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoEngine = void 0;
const crypto = __importStar(require("crypto"));
class CryptoEngine {
    /**
     * Generate symmetric key
     */
    async generateSymmetricKey(algorithm, length) {
        const keyBytes = length / 8;
        const key = crypto.randomBytes(keyBytes);
        // Apply odd parity for 3DES
        if (algorithm === '3DES') {
            for (let i = 0; i < key.length; i++) {
                let parity = 0;
                for (let j = 0; j < 8; j++) {
                    parity ^= (key[i] >> j) & 1;
                }
                if (parity === 0) {
                    key[i] ^= 1;
                }
            }
        }
        return key;
    }
    /**
     * Generate random bytes
     */
    async generateRandom(length) {
        return crypto.randomBytes(length);
    }
    /**
     * Encrypt data
     */
    async encrypt(data, key, algorithm) {
        let cipher;
        let iv = null;
        switch (algorithm) {
            case 'AES-256-CBC':
                iv = crypto.randomBytes(16);
                cipher = crypto.createCipheriv('aes-256-cbc', key.slice(0, 32), iv);
                break;
            case 'AES-256-ECB':
                cipher = crypto.createCipheriv('aes-256-ecb', key.slice(0, 32), null);
                break;
            case 'DES3-CBC':
                iv = crypto.randomBytes(8);
                cipher = crypto.createCipheriv('des-ede3-cbc', key.slice(0, 24), iv);
                break;
            case 'DES3-ECB':
                cipher = crypto.createCipheriv('des-ede3-ecb', key.slice(0, 24), null);
                break;
            case 'DES-ECB':
                cipher = crypto.createCipheriv('des-ecb', key.slice(0, 8), null);
                break;
            case 'DES-CBC':
                iv = crypto.randomBytes(8);
                cipher = crypto.createCipheriv('des-cbc', key.slice(0, 8), iv);
                break;
            default:
                throw new Error(`Unsupported algorithm: ${algorithm}`);
        }
        cipher.setAutoPadding(true);
        const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
        if (iv) {
            return Buffer.concat([iv, encrypted]);
        }
        return encrypted;
    }
    /**
     * Decrypt data
     */
    async decrypt(data, key, algorithm) {
        let decipher;
        let encryptedData = data;
        switch (algorithm) {
            case 'AES-256-CBC':
                const ivAes = data.slice(0, 16);
                encryptedData = data.slice(16);
                decipher = crypto.createDecipheriv('aes-256-cbc', key.slice(0, 32), ivAes);
                break;
            case 'AES-256-ECB':
                decipher = crypto.createDecipheriv('aes-256-ecb', key.slice(0, 32), null);
                break;
            case 'DES3-CBC':
                const ivDes3 = data.slice(0, 8);
                encryptedData = data.slice(8);
                decipher = crypto.createDecipheriv('des-ede3-cbc', key.slice(0, 24), ivDes3);
                break;
            case 'DES3-ECB':
                decipher = crypto.createDecipheriv('des-ede3-ecb', key.slice(0, 24), null);
                break;
            case 'DES-ECB':
                decipher = crypto.createDecipheriv('des-ecb', key.slice(0, 8), null);
                break;
            case 'DES-CBC':
                const ivDes = data.slice(0, 8);
                encryptedData = data.slice(8);
                decipher = crypto.createDecipheriv('des-cbc', key.slice(0, 8), ivDes);
                break;
            default:
                throw new Error(`Unsupported algorithm: ${algorithm}`);
        }
        decipher.setAutoPadding(true);
        return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    }
    /**
     * Generate MAC
     */
    async generateMac(data, key, algorithm) {
        switch (algorithm) {
            case 'RETAIL-MAC':
                return this.generateRetailMac(data, key);
            case 'HMAC-SHA256':
                const hmac = crypto.createHmac('sha256', key);
                hmac.update(data);
                return hmac.digest();
            case 'CMAC':
                // Simplified CMAC - in production use a proper library
                return this.generateRetailMac(data, key);
            default:
                throw new Error(`Unsupported MAC algorithm: ${algorithm}`);
        }
    }
    /**
     * Sign data with RSA
     */
    async sign(data, privateKey) {
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(data);
        return sign.sign(privateKey);
    }
    /**
     * Verify RSA signature
     */
    async verify(data, signature, publicKey) {
        const verify = crypto.createVerify('RSA-SHA256');
        verify.update(data);
        return verify.verify(publicKey, signature);
    }
    /**
     * Retail MAC (ISO 9797-1 Method 1)
     */
    async generateRetailMac(data, key) {
        // Pad data to 8-byte boundary
        const blockSize = 8;
        const paddingNeeded = blockSize - (data.length % blockSize);
        const paddedData = Buffer.concat([
            data,
            Buffer.from([0x80]),
            Buffer.alloc(paddingNeeded - 1, 0),
        ]);
        // CBC encryption of all blocks except last with single DES
        const keyA = key.slice(0, 8);
        const keyB = key.slice(8, 16);
        let result = Buffer.alloc(8, 0);
        for (let i = 0; i < paddedData.length; i += blockSize) {
            const block = paddedData.slice(i, i + blockSize);
            const xored = Buffer.alloc(8);
            for (let j = 0; j < 8; j++) {
                xored[j] = result[j] ^ block[j];
            }
            if (i === paddedData.length - blockSize) {
                // Last block: Triple DES
                const cipher1 = crypto.createCipheriv('des-ecb', keyA, null);
                cipher1.setAutoPadding(false);
                const enc1 = Buffer.concat([cipher1.update(xored), cipher1.final()]);
                const decipher = crypto.createDecipheriv('des-ecb', keyB, null);
                decipher.setAutoPadding(false);
                const dec = Buffer.concat([decipher.update(enc1), decipher.final()]);
                const cipher2 = crypto.createCipheriv('des-ecb', keyA, null);
                cipher2.setAutoPadding(false);
                result = Buffer.concat([cipher2.update(dec), cipher2.final()]);
            }
            else {
                // Other blocks: Single DES
                const cipher = crypto.createCipheriv('des-ecb', keyA, null);
                cipher.setAutoPadding(false);
                result = Buffer.concat([cipher.update(xored), cipher.final()]);
            }
        }
        return result;
    }
}
exports.CryptoEngine = CryptoEngine;
