"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MACManager = void 0;
const hex_1 = require("../../utils/hex");
const crypto_wrappers_1 = require("../../utils/crypto-wrappers");
class MACManager {
    /**
     * ISO 9797-1 Algorithm 3 (Retail MAC)
     * Block cipher: DES
     * 1. Check data padding (ISO 9797 Method 1: pad with 0s to multiple of 8)
     * 2. Split into 8-byte blocks D1, D2... Dn
     * 3. I1 = DES(K1, D1)
     * 4. I2 = DES(K1, I1 ^ D2) ...
     * 5. On last block: Output = DES(K1, DES^-1(K2, DES(K1, FinalBlock))) ... Wait, Alg 3 is simpler in standard TDES context often:
     * Standard Retail MAC:
     * - DES CBC with Key A on all blocks.
     * - Final block: Decrypt with Key B, Encrypt with Key A.
     */
    calculateISO9797_ALG3(data, key) {
        const steps = [];
        // Key split (Key A = first 8 bytes, Key B = next 8 bytes)
        // If 16 bytes provided (Double length key)
        const KA = key.subarray(0, 8);
        const KB = key.subarray(8, 16);
        steps.push({
            name: 'Key Split',
            description: 'Split Double Length Key into KA and KB',
            input: (0, hex_1.bufferToHex)(key),
            output: `KA: ${(0, hex_1.bufferToHex)(KA)}, KB: ${(0, hex_1.bufferToHex)(KB)}`
        });
        // Padding (Method 1: Zero padding)
        const diff = data.length % 8;
        const padding = diff === 0 ? 0 : 8 - diff;
        const paddedData = Buffer.concat([data, Buffer.alloc(padding, 0)]);
        steps.push({
            name: 'Padding',
            description: 'Pad data with zeros to multiple of 8 bytes',
            input: (0, hex_1.bufferToHex)(data),
            output: (0, hex_1.bufferToHex)(paddedData)
        });
        // CBC Loop with KA
        const blocks = [];
        for (let i = 0; i < paddedData.length; i += 8) {
            blocks.push(paddedData.subarray(i, i + 8));
        }
        let currentBlock = Buffer.alloc(8, 0); // IV is zeros
        blocks.forEach((block, index) => {
            const xorInput = (0, hex_1.xorBuffers)(currentBlock, block);
            const encrypted = (0, crypto_wrappers_1.encryptDES)(xorInput, KA);
            steps.push({
                name: `Block ${index + 1} Processing`,
                description: `XOR with previous result then Encrypt with KA`,
                input: `IV/Prev: ${(0, hex_1.bufferToHex)(currentBlock)} ^ Block: ${(0, hex_1.bufferToHex)(block)}`,
                output: (0, hex_1.bufferToHex)(encrypted)
            });
            currentBlock = Buffer.from(encrypted);
        });
        // Final Transformation: Decrypt with KB, Encrypt with KA
        // Note: currentBlock is the result of the last DES(KA, ...)
        // Decrypt with KB
        const step2 = node_crypto_1.default.createDecipheriv('des-ecb', KB, null);
        step2.setAutoPadding(false);
        const decryptedFinal = Buffer.concat([step2.update(currentBlock), step2.final()]);
        steps.push({
            name: 'Final Stage 1',
            description: 'Decrypt result with KB',
            input: (0, hex_1.bufferToHex)(currentBlock),
            output: (0, hex_1.bufferToHex)(decryptedFinal)
        });
        // Encrypt with KA
        const step3 = (0, crypto_wrappers_1.encryptDES)(decryptedFinal, KA);
        steps.push({
            name: 'Final Stage 2',
            description: 'Encrypt result with KA (Retail MAC Result)',
            input: (0, hex_1.bufferToHex)(decryptedFinal),
            output: (0, hex_1.bufferToHex)(step3)
        });
        return { result: step3, steps };
    }
    /**
     * ISO 9797-1 Algorithm 1 (Single DES CBC)
     * Output is the last block (or truncated)
     */
    calculateISO9797_ALG1(data, key) {
        const steps = [];
        const algo = 'des-cbc';
        const iv = Buffer.alloc(8, 0);
        // Padding (Method 1: Zero padding)
        const diff = data.length % 8;
        const padding = diff === 0 ? 0 : 8 - diff;
        const paddedData = Buffer.concat([data, Buffer.alloc(padding, 0)]);
        steps.push({
            name: 'Padding',
            description: 'Pad data with zeros to multiple of 8 bytes',
            input: (0, hex_1.bufferToHex)(data),
            output: (0, hex_1.bufferToHex)(paddedData)
        });
        // Encrypt with DES CBC
        const cipher = node_crypto_1.default.createCipheriv(algo, key, iv);
        cipher.setAutoPadding(false);
        const encrypted = Buffer.concat([cipher.update(paddedData), cipher.final()]);
        const mac = encrypted.subarray(encrypted.length - 8);
        steps.push({
            name: 'DES CBC Encryption',
            description: 'Encrypt data using DES CBC, last block is MAC',
            input: (0, hex_1.bufferToHex)(paddedData),
            output: (0, hex_1.bufferToHex)(mac)
        });
        return { result: mac, steps };
    }
}
exports.MACManager = MACManager;
const node_crypto_1 = __importDefault(require("node:crypto"));
