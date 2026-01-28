import { TraceResult } from '../../types';
export type AESMode = 'ECB' | 'CBC' | 'GCM';
export type AESKeySize = 128 | 192 | 256;
export declare class AESManager {
    /**
     * AES Encryption with detailed tracing
     */
    encrypt(data: Buffer, key: Buffer, mode: AESMode, iv?: Buffer): TraceResult<Buffer>;
    decrypt(encrypted: Buffer, key: Buffer, mode: AESMode, iv?: Buffer): TraceResult<Buffer>;
}
