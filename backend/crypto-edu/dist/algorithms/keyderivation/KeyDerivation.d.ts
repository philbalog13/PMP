import { TraceResult, Key } from '../../types';
export declare class KeyEdu {
    /**
     * Generates a derived key using a simplified EMV-like derivation
     * Master Key (MK) -> Session Key (SK) using derivation data
     * SK = TDES(MK, DerivationData)
     */
    generateDerivedKey(masterKey: Buffer, derivationData: Buffer): TraceResult<Key>;
    /**
     * Key Check Value (KCV) Calculation
     * KCV = First 3 bytes of TDES(Key, 0000000000000000)
     */
    calculateKCV(key: Key): TraceResult<string>;
}
