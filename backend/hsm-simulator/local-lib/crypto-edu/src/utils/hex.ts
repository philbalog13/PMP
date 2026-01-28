/**
 * Utility functions for Hex string manipulation
 */

export function bufferToHex(buf: Buffer): string {
    return buf.toString('hex').toUpperCase();
}

export function hexToBuffer(hex: string): Buffer {
    return Buffer.from(hex, 'hex');
}

export function xorBuffers(a: Buffer, b: Buffer): Buffer {
    const length = Math.min(a.length, b.length);
    const result = Buffer.alloc(length);
    for (let i = 0; i < length; i++) {
        result[i] = a[i] ^ b[i];
    }
    return result;
}

export function padLeft(str: string, length: number, char: string = '0'): string {
    return str.padStart(length, char);
}

export function padRight(str: string, length: number, char: string = 'F'): string {
    return str.padEnd(length, char);
}
