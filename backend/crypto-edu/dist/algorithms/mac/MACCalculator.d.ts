import { TraceResult } from '../../types';
export declare class MACManager {
    /**
     * ISO 9797-1 Algorithm 3 (Retail MAC)
     * Block cipher: DES
     * 1. Check data padding (ISO 9797 Method 1: pad with 0s to multiple of 8)
     * 2. Split into 8-byte blocks D1, D2... Dn
     * 3. I1 = DES(K1, D1)
     * 4. I2 = DES(K1, I1 ^ D2) ...
     * 5. On last block: Output = DES(K1, DES^-1(K2, DES(K1, FinalBlock))) ... Wait, Alg 3 is simpler in standard TDES context often:
     * Standard Retail MAC:
     * - DES CBC with Key A on all blocks.
     * - Final block: Decrypt with Key B, Encrypt with Key A.
     */
    calculateISO9797_ALG3(data: Buffer, key: Buffer): TraceResult<Buffer>;
    /**
     * ISO 9797-1 Algorithm 1 (Single DES CBC)
     * Output is the last block (or truncated)
     */
    calculateISO9797_ALG1(data: Buffer, key: Buffer): TraceResult<Buffer>;
}
