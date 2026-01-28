import { TraceResult } from '../types';
interface CardData {
    pan: string;
    expiryDate: string;
    serviceCode: string;
}
export declare class CardAuthentication {
    /**
     * Static CVV (CVV1 for Magstripe, CVV2 for Online)
     * Algo:
     * 1. Data = PAN + Expiry + ServiceCode
     * 2. Pad with 0s if needed? Actually CVV algo uses Blocks
     * standard:
     *  Block 1: PAN (padded)
     *  Block 2: Exploded Data?
     * Simplified CVV Algo (Visa):
     * 1. Place PAN, Expiry, SvcCode in 128-bit block? No, usually it uses DES keys (Key A, Key B).
     * Classic CVV:
     * 1. Create Data Block: PAN | Expiry | SvcCode
     * 2. Encrypt with KA, Decrypt with KB, Encrypt with KA
     * 3. Extract digits
     */
    staticCVV(cardData: CardData, keyA: Buffer, keyB: Buffer): TraceResult<string>;
}
export {};
