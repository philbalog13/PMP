import { TraceResult } from '../../types';
export declare class PINBlockManager {
    /**
     * Generates ISO 9564 Format 0 PIN Block
     * Format 0 is the most common. It XORs two 8-byte blocks:
     * Block 1 (PIN): 0 + L + PIN + F...F (L = PIN length)
     * Block 2 (PAN): 0000 + PAN (exclude check digit, take rightmost 12 digits)
     */
    generateISO9564_Format0(pin: string, pan: string): TraceResult<Buffer>;
    generateISO9564_Format1(pin: string): TraceResult<Buffer>;
    /**
     * Generates ISO 9564 Format 3 PIN Block (Diebold)
     */
    generateISO9564_Format3(pin: string, pan: string): TraceResult<Buffer>;
    /**
     * Generates ISO 9564 Format 4 PIN Block (AES)
     */
    generateISO9564_Format4(pin: string, pan: string): TraceResult<Buffer>;
    encryptPINBlock(pinBlock: Buffer, key: Buffer): TraceResult<Buffer>;
    decryptPINBlock(encrypted: Buffer, key: Buffer): TraceResult<Buffer>;
    recoverPINFromFormat0(decryptedBlock: Buffer, pan: string): TraceResult<string>;
}
