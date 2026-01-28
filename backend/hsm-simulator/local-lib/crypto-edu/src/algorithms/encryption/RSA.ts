import { TraceResult, TraceStep } from '../../types';
import crypto from 'node:crypto';

export interface RSAKeyPair {
    publicKey: string;
    privateKey: string;
}

export class RSAManager {

    generateKeyPair(modulusLength: number = 2048): TraceResult<RSAKeyPair> {
        const steps: TraceStep[] = [];

        steps.push({
            name: 'Start Generation',
            description: `Generating RSA KeyPair (${modulusLength} bits)...`,
            input: `Modulus: ${modulusLength}`,
            output: 'Pending...'
        });

        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: modulusLength,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });

        steps.push({
            name: 'Keys Generated',
            description: 'RSA Key Pair creation successful',
            input: `Modulus: ${modulusLength}`,
            output: 'Public/Private Keys created'
        });

        return {
            result: { publicKey, privateKey },
            steps
        };
    }

    encrypt(data: Buffer, publicKey: string): TraceResult<Buffer> {
        const steps: TraceStep[] = [];

        const encrypted = crypto.publicEncrypt(
            {
                key: publicKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256',
            },
            data
        );

        steps.push({
            name: 'RSA Encryption',
            description: 'Encrypt with Public Key (OAEP SHA-256)',
            input: data.toString('utf8'), // Assuming text for pedagogy
            output: encrypted.toString('base64')
        });

        return { result: encrypted, steps };
    }

    decrypt(encrypted: Buffer, privateKey: string): TraceResult<Buffer> {
        const steps: TraceStep[] = [];

        const decrypted = crypto.privateDecrypt(
            {
                key: privateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256',
            },
            encrypted
        );

        steps.push({
            name: 'RSA Decryption',
            description: 'Decrypt with Private Key',
            input: encrypted.toString('base64'),
            output: decrypted.toString('utf8')
        });

        return { result: decrypted, steps };
    }
}
