import { TraceResult, TraceStep } from '../../types';
import { bufferToHex, hexToBuffer, xorBuffers } from '../../utils/hex';
import crypto from 'node:crypto';

export type AESMode = 'ECB' | 'CBC' | 'GCM';
export type AESKeySize = 128 | 192 | 256;

export class AESManager {

    /**
     * AES Encryption with detailed tracing
     */
    encrypt(data: Buffer, key: Buffer, mode: AESMode, iv?: Buffer): TraceResult<Buffer> {
        const steps: TraceStep[] = [];
        const algo = `aes-${key.length * 8}-${mode.toLowerCase()}`;

        steps.push({
            name: 'Initialization',
            description: `Initialize AES ${mode} with ${key.length * 8}-bit key`,
            input: `Key: ${bufferToHex(key)}`,
            output: `Algo: ${algo}, IV: ${iv ? bufferToHex(iv) : 'None'}`
        });

        let result: Buffer;

        if (mode === 'GCM') {
            if (!iv) throw new Error("IV required for GCM");
            const cipher = crypto.createCipheriv(algo, key, iv) as crypto.CipherGCM;
            const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
            const tag = cipher.getAuthTag();
            result = Buffer.concat([encrypted, tag]);

            steps.push({
                name: 'GCM Encryption',
                description: 'Encrypt data and generate Auth Tag',
                input: bufferToHex(data),
                output: `Cipher: ${bufferToHex(encrypted)}\nTag: ${bufferToHex(tag)}`
            });
        } else {
            // ECB / CBC
            // For trace purpose, we might want to show blocks?
            // Let's use standard crypto for result, but maybe simulate block steps if pedagogical
            // For now, let's just trace the full operation to keep it simple but functional
            const cipher = crypto.createCipheriv(algo, key, iv || null);
            cipher.setAutoPadding(true); // PKCS7 by default in Node
            result = Buffer.concat([cipher.update(data), cipher.final()]);

            steps.push({
                name: 'Encryption',
                description: `Encrypt using ${algo} (PKCS7 Padding)`,
                input: bufferToHex(data),
                output: bufferToHex(result)
            });
        }

        return { result, steps };
    }

    decrypt(encrypted: Buffer, key: Buffer, mode: AESMode, iv?: Buffer): TraceResult<Buffer> {
        const steps: TraceStep[] = [];
        const algo = `aes-${key.length * 8}-${mode.toLowerCase()}`;

        let result: Buffer;

        if (mode === 'GCM') {
            if (!iv) throw new Error("IV required for GCM");
            // Extract tag (last 16 bytes usually)
            const tagLength = 16;
            const tag = encrypted.subarray(encrypted.length - tagLength);
            const ciphertext = encrypted.subarray(0, encrypted.length - tagLength);

            steps.push({
                name: 'Extract Tag',
                description: 'Separate Ciphertext and Auth Tag',
                input: bufferToHex(encrypted),
                output: `Cipher: ${bufferToHex(ciphertext)}\nTag: ${bufferToHex(tag)}`
            });

            const decipher = crypto.createDecipheriv(algo, key, iv) as crypto.DecipherGCM;
            decipher.setAuthTag(tag);
            result = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

            steps.push({
                name: 'GCM Decryption',
                description: 'Decrypt and Verify Tag',
                input: bufferToHex(ciphertext),
                output: bufferToHex(result)
            });
        } else {
            const decipher = crypto.createDecipheriv(algo, key, iv || null);
            decipher.setAutoPadding(true);
            result = Buffer.concat([decipher.update(encrypted), decipher.final()]);

            steps.push({
                name: 'Decryption',
                description: `Decrypt using ${algo}`,
                input: bufferToHex(encrypted),
                output: bufferToHex(result)
            });
        }

        return { result, steps };
    }
}
