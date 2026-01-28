"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitwiseOperations = void 0;
class BitwiseOperations {
    static xor(a, b) {
        const len = Math.min(a.length, b.length);
        const res = Buffer.alloc(len);
        for (let i = 0; i < len; i++)
            res[i] = a[i] ^ b[i];
        return res;
    }
    static not(a) {
        const res = Buffer.alloc(a.length);
        for (let i = 0; i < a.length; i++)
            res[i] = ~a[i];
        return res;
    }
}
exports.BitwiseOperations = BitwiseOperations;
