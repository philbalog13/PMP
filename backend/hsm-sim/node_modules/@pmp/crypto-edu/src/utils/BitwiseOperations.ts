import { bufferToHex, hexToBuffer } from './hex';

export class BitwiseOperations {
    static xor(a: Buffer, b: Buffer): Buffer {
        const len = Math.min(a.length, b.length);
        const res = Buffer.alloc(len);
        for (let i = 0; i < len; i++) res[i] = a[i] ^ b[i];
        return res;
    }

    static not(a: Buffer): Buffer {
        const res = Buffer.alloc(a.length);
        for (let i = 0; i < a.length; i++) res[i] = ~a[i];
        return res;
    }
}
