"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ECCManager = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
class ECCManager {
    generateKeyPair() {
        const steps = [];
        const { publicKey, privateKey } = node_crypto_1.default.generateKeyPairSync('ec', {
            namedCurve: 'secp256k1',
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        steps.push({
            name: 'ECC KeyPair',
            description: 'Generate SECP256K1 Key Pair',
            input: 'Curve: secp256k1',
            output: 'Keys Generated'
        });
        return { result: { publicKey, privateKey }, steps };
    }
}
exports.ECCManager = ECCManager;
