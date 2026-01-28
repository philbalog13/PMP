"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RSAManager = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
class RSAManager {
    generateKeyPair(modulusLength = 2048) {
        const steps = [];
        steps.push({
            name: 'Start Generation',
            description: `Generating RSA KeyPair (${modulusLength} bits)...`,
            input: `Modulus: ${modulusLength}`,
            output: 'Pending...'
        });
        const { publicKey, privateKey } = node_crypto_1.default.generateKeyPairSync('rsa', {
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
    encrypt(data, publicKey) {
        const steps = [];
        const encrypted = node_crypto_1.default.publicEncrypt({
            key: publicKey,
            padding: node_crypto_1.default.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
        }, data);
        steps.push({
            name: 'RSA Encryption',
            description: 'Encrypt with Public Key (OAEP SHA-256)',
            input: data.toString('utf8'), // Assuming text for pedagogy
            output: encrypted.toString('base64')
        });
        return { result: encrypted, steps };
    }
    decrypt(encrypted, privateKey) {
        const steps = [];
        const decrypted = node_crypto_1.default.privateDecrypt({
            key: privateKey,
            padding: node_crypto_1.default.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
        }, encrypted);
        steps.push({
            name: 'RSA Decryption',
            description: 'Decrypt with Private Key',
            input: encrypted.toString('base64'),
            output: decrypted.toString('utf8')
        });
        return { result: decrypted, steps };
    }
}
exports.RSAManager = RSAManager;
