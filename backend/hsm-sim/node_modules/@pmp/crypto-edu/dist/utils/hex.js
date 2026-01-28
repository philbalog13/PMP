"use strict";
/**
 * Utility functions for Hex string manipulation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.bufferToHex = bufferToHex;
exports.hexToBuffer = hexToBuffer;
exports.xorBuffers = xorBuffers;
exports.padLeft = padLeft;
exports.padRight = padRight;
function bufferToHex(buf) {
    return buf.toString('hex').toUpperCase();
}
function hexToBuffer(hex) {
    return Buffer.from(hex, 'hex');
}
function xorBuffers(a, b) {
    const length = Math.min(a.length, b.length);
    const result = Buffer.alloc(length);
    for (let i = 0; i < length; i++) {
        result[i] = a[i] ^ b[i];
    }
    return result;
}
function padLeft(str, length, char = '0') {
    return str.padStart(length, char);
}
function padRight(str, length, char = 'F') {
    return str.padEnd(length, char);
}
