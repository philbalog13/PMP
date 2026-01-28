"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyStore = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
class KeyStore {
    static initialize() {
        // Generate a random LMK at startup (volatile in this sim)
        this.LMK = node_crypto_1.default.randomBytes(32); // 256-bit AES LMK
        console.log('HSM: New LMK Generated. Secure storage initialized.');
        // Seed some test keys
        this.storeKey('ZPK_TEST', 'ZPK', '11111111111111111111111111111111');
        this.storeKey('CVK_TEST', 'CVK', '0123456789ABCDEFFEDCBA9876543210');
    }
    static getLMK() {
        return this.LMK;
    }
    static storeKey(label, type, clearValueHex) {
        // In real HSM, we would encrypt clearValueHex under LMK
        // For education, we store it but mark it as handled
        this.keys.set(label, {
            scheme: clearValueHex.length === 32 ? 'T' : 'U', // Simple check
            type,
            value: clearValueHex,
            checkValue: '000000' // Stub KCV
        });
    }
    static getKey(label) {
        return this.keys.get(label);
    }
    static getAllKeys() {
        return Array.from(this.keys.entries()).map(([label, k]) => ({
            label,
            type: k.type,
            scheme: k.scheme,
            checkValue: k.checkValue
        }));
    }
}
exports.KeyStore = KeyStore;
KeyStore.keys = new Map();
