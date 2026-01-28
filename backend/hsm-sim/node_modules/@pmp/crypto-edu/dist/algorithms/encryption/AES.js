"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AESManager = void 0;
const hex_1 = require("../../utils/hex");
const node_crypto_1 = __importDefault(require("node:crypto"));
class AESManager {
    /**
     * AES Encryption with detailed tracing
     */
    encrypt(data, key, mode, iv) {
        const steps = [];
        const algo = `aes-${key.length * 8}-${mode.toLowerCase()}`;
        steps.push({
            name: 'Initialization',
            description: `Initialize AES ${mode} with ${key.length * 8}-bit key`,
            input: `Key: ${(0, hex_1.bufferToHex)(key)}`,
            output: `Algo: ${algo}, IV: ${iv ? (0, hex_1.bufferToHex)(iv) : 'None'}`
        });
        let result;
        if (mode === 'GCM') {
            if (!iv)
                throw new Error("IV required for GCM");
            const cipher = node_crypto_1.default.createCipheriv(algo, key, iv);
            const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
            const tag = cipher.getAuthTag();
            result = Buffer.concat([encrypted, tag]);
            steps.push({
                name: 'GCM Encryption',
                description: 'Encrypt data and generate Auth Tag',
                input: (0, hex_1.bufferToHex)(data),
                output: `Cipher: ${(0, hex_1.bufferToHex)(encrypted)}\nTag: ${(0, hex_1.bufferToHex)(tag)}`
            });
        }
        else {
            // ECB / CBC
            // For trace purpose, we might want to show blocks?
            // Let's use standard crypto for result, but maybe simulate block steps if pedagogical
            // For now, let's just trace the full operation to keep it simple but functional
            const cipher = node_crypto_1.default.createCipheriv(algo, key, iv || null);
            cipher.setAutoPadding(true); // PKCS7 by default in Node
            result = Buffer.concat([cipher.update(data), cipher.final()]);
            steps.push({
                name: 'Encryption',
                description: `Encrypt using ${algo} (PKCS7 Padding)`,
                input: (0, hex_1.bufferToHex)(data),
                output: (0, hex_1.bufferToHex)(result)
            });
        }
        return { result, steps };
    }
    decrypt(encrypted, key, mode, iv) {
        const steps = [];
        const algo = `aes-${key.length * 8}-${mode.toLowerCase()}`;
        let result;
        if (mode === 'GCM') {
            if (!iv)
                throw new Error("IV required for GCM");
            // Extract tag (last 16 bytes usually)
            const tagLength = 16;
            const tag = encrypted.subarray(encrypted.length - tagLength);
            const ciphertext = encrypted.subarray(0, encrypted.length - tagLength);
            steps.push({
                name: 'Extract Tag',
                description: 'Separate Ciphertext and Auth Tag',
                input: (0, hex_1.bufferToHex)(encrypted),
                output: `Cipher: ${(0, hex_1.bufferToHex)(ciphertext)}\nTag: ${(0, hex_1.bufferToHex)(tag)}`
            });
            const decipher = node_crypto_1.default.createDecipheriv(algo, key, iv);
            decipher.setAuthTag(tag);
            result = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
            steps.push({
                name: 'GCM Decryption',
                description: 'Decrypt and Verify Tag',
                input: (0, hex_1.bufferToHex)(ciphertext),
                output: (0, hex_1.bufferToHex)(result)
            });
        }
        else {
            const decipher = node_crypto_1.default.createDecipheriv(algo, key, iv || null);
            decipher.setAutoPadding(true);
            result = Buffer.concat([decipher.update(encrypted), decipher.final()]);
            steps.push({
                name: 'Decryption',
                description: `Decrypt using ${algo}`,
                input: (0, hex_1.bufferToHex)(encrypted),
                output: (0, hex_1.bufferToHex)(result)
            });
        }
        return { result, steps };
    }
}
exports.AESManager = AESManager;
