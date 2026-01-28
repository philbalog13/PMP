import { TraceResult, TraceStep } from '../../types';
import { bufferToHex, hexToBuffer, xorBuffers } from '../../utils/hex';
import { encryptDES, encryptTDES } from '../../utils/crypto-wrappers';

export class MACManager {
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
    calculateISO9797_ALG3(data: Buffer, key: Buffer): TraceResult<Buffer> {
        const steps: TraceStep[] = [];

        // Key split (Key A = first 8 bytes, Key B = next 8 bytes)
        // If 16 bytes provided (Double length key)
        const KA = key.subarray(0, 8);
        const KB = key.subarray(8, 16);

        steps.push({
            name: 'Key Split',
            description: 'Split Double Length Key into KA and KB',
            input: bufferToHex(key),
            output: `KA: ${bufferToHex(KA)}, KB: ${bufferToHex(KB)}`
        });

        // Padding (Method 1: Zero padding)
        const diff = data.length % 8;
        const padding = diff === 0 ? 0 : 8 - diff;
        const paddedData = Buffer.concat([data, Buffer.alloc(padding, 0)]);

        steps.push({
            name: 'Padding',
            description: 'Pad data with zeros to multiple of 8 bytes',
            input: bufferToHex(data),
            output: bufferToHex(paddedData)
        });

        // CBC Loop with KA
        const blocks: Buffer[] = [];
        for (let i = 0; i < paddedData.length; i += 8) {
            blocks.push(paddedData.subarray(i, i + 8));
        }

        let currentBlock = Buffer.alloc(8, 0); // IV is zeros

        blocks.forEach((block, index) => {
            const xorInput = xorBuffers(currentBlock, block);
            const encrypted = encryptDES(xorInput, KA);

            steps.push({
                name: `Block ${index + 1} Processing`,
                description: `XOR with previous result then Encrypt with KA`,
                input: `IV/Prev: ${bufferToHex(currentBlock)} ^ Block: ${bufferToHex(block)}`,
                output: bufferToHex(encrypted)
            });

            currentBlock = Buffer.from(encrypted);
        });

        // Final Transformation: Decrypt with KB, Encrypt with KA
        // Note: currentBlock is the result of the last DES(KA, ...)

        // Decrypt with KB
        const step2 = crypto.createDecipheriv('des-ecb', KB, null);
        step2.setAutoPadding(false);
        const decryptedFinal = Buffer.concat([step2.update(currentBlock), step2.final()]);

        steps.push({
            name: 'Final Stage 1',
            description: 'Decrypt result with KB',
            input: bufferToHex(currentBlock),
            output: bufferToHex(decryptedFinal)
        });

        // Encrypt with KA
        const step3 = encryptDES(decryptedFinal, KA);

        steps.push({
            name: 'Final Stage 2',
            description: 'Encrypt result with KA (Retail MAC Result)',
            input: bufferToHex(decryptedFinal),
            output: bufferToHex(step3)
        });

        return { result: step3, steps };
    }

    /**
     * ISO 9797-1 Algorithm 1 (Single DES CBC)
     * Output is the last block (or truncated)
     */
    calculateISO9797_ALG1(data: Buffer, key: Buffer): TraceResult<Buffer> {
        const steps: TraceStep[] = [];
        const algo = 'des-cbc';
        const iv = Buffer.alloc(8, 0);

        // Padding (Method 1: Zero padding)
        const diff = data.length % 8;
        const padding = diff === 0 ? 0 : 8 - diff;
        const paddedData = Buffer.concat([data, Buffer.alloc(padding, 0)]);

        steps.push({
            name: 'Padding',
            description: 'Pad data with zeros to multiple of 8 bytes',
            input: bufferToHex(data),
            output: bufferToHex(paddedData)
        });

        // Encrypt with DES CBC
        const cipher = crypto.createCipheriv(algo, key, iv);
        cipher.setAutoPadding(false);
        const encrypted = Buffer.concat([cipher.update(paddedData), cipher.final()]);

        const mac = encrypted.subarray(encrypted.length - 8);

        steps.push({
            name: 'DES CBC Encryption',
            description: 'Encrypt data using DES CBC, last block is MAC',
            input: bufferToHex(paddedData),
            output: bufferToHex(mac)
        });

        return { result: mac, steps };
    }
}

import crypto from 'node:crypto';
