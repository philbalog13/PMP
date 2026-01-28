"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptDES = encryptDES;
exports.decryptDES = decryptDES;
exports.encryptTDES = encryptTDES;
exports.decryptTDES = decryptTDES;
const node_crypto_1 = __importDefault(require("node:crypto"));
function encryptDES(data, key) {
    const cipher = node_crypto_1.default.createCipheriv('des-ecb', key, null);
    cipher.setAutoPadding(false);
    return Buffer.concat([cipher.update(data), cipher.final()]);
}
function decryptDES(data, key) {
    const decipher = node_crypto_1.default.createDecipheriv('des-ecb', key, null);
    decipher.setAutoPadding(false);
    return Buffer.concat([decipher.update(data), decipher.final()]);
}
function encryptTDES(data, key) {
    // Ensure key is 24 bytes (TDES-EDE3). If 16 bytes, duplicate first 8 bytes to end.
    let finalKey = key;
    if (key.length === 16) {
        finalKey = Buffer.concat([key, key.subarray(0, 8)]);
    }
    const cipher = node_crypto_1.default.createCipheriv('des-ede3', finalKey, null);
    cipher.setAutoPadding(false);
    return Buffer.concat([cipher.update(data), cipher.final()]);
}
function decryptTDES(data, key) {
    let finalKey = key;
    if (key.length === 16) {
        finalKey = Buffer.concat([key, key.subarray(0, 8)]);
    }
    const decipher = node_crypto_1.default.createDecipheriv('des-ede3', finalKey, null);
    decipher.setAutoPadding(false);
    return Buffer.concat([decipher.update(data), decipher.final()]);
}
