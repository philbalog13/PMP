import { TraceResult } from '../../types';
export interface RSAKeyPair {
    publicKey: string;
    privateKey: string;
}
export declare class RSAManager {
    generateKeyPair(modulusLength?: number): TraceResult<RSAKeyPair>;
    encrypt(data: Buffer, publicKey: string): TraceResult<Buffer>;
    decrypt(encrypted: Buffer, privateKey: string): TraceResult<Buffer>;
}
