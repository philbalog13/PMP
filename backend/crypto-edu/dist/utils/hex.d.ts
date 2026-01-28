/**
 * Utility functions for Hex string manipulation
 */
export declare function bufferToHex(buf: Buffer): string;
export declare function hexToBuffer(hex: string): Buffer;
export declare function xorBuffers(a: Buffer, b: Buffer): Buffer;
export declare function padLeft(str: string, length: number, char?: string): string;
export declare function padRight(str: string, length: number, char?: string): string;
