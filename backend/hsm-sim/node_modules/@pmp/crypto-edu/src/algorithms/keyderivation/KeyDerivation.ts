import { TraceResult, TraceStep, Key } from '../../types';
import { bufferToHex, hexToBuffer, xorBuffers } from '../../utils/hex';
import { encryptTDES, decryptTDES, encryptDES } from '../../utils/crypto-wrappers';
import crypto from 'node:crypto';

export class KeyEdu {
    /**
     * Generates a derived key using a simplified EMV-like derivation
     * Master Key (MK) -> Session Key (SK) using derivation data
     * SK = TDES(MK, DerivationData)
     */
    generateDerivedKey(masterKey: Buffer, derivationData: Buffer): TraceResult<Key> {
        const steps: TraceStep[] = [];

        steps.push({
            name: 'Input Parameters',
            description: 'Derive key from Master Key using Data',
            input: `MK: ${bufferToHex(masterKey)}`,
            output: `Data: ${bufferToHex(derivationData)}`
        });

        // Ensure derivation data is block size aligned (8 or 16 depending on key length)
        // For TDES double length key derivation, we often produce 16 bytes.
        // Basic approach: Encrypt Derivation Data with MK

        // Variant 1: Session Key Generation (e.g. for ARQC)
        // Key = TDES(MK, Data)
        // If Data is 8 bytes, result is 8 bytes (Single length)
        // If we need Double Length, we usually do TDES(MK, Data) || TDES(MK, Data ^ FFs) or similar

        // Let's implement common "Session Key Derivation"
        // SK-L = TDES(MK, Data)
        // SK-R = TDES(MK, Data ^ FFFF...)

        const leftPart = encryptTDES(derivationData, masterKey);

        steps.push({
            name: 'Left Key Part',
            description: 'SK_L = TDES(MK, Data)',
            input: bufferToHex(derivationData),
            output: bufferToHex(leftPart)
        });

        const invertedData = xorBuffers(derivationData, Buffer.alloc(8, 0xFF));
        const rightPart = encryptTDES(invertedData, masterKey);

        steps.push({
            name: 'Right Key Part',
            description: 'SK_R = TDES(MK, ~Data)',
            input: bufferToHex(invertedData),
            output: bufferToHex(rightPart)
        });

        const sessionKey = Buffer.concat([leftPart, rightPart]);

        steps.push({
            name: 'Final Session Key',
            description: 'Concatenate Left and Right parts',
            input: `${bufferToHex(leftPart)} + ${bufferToHex(rightPart)}`,
            output: bufferToHex(sessionKey)
        });

        return {
            result: { value: sessionKey, type: 'TDES' },
            steps
        };
    }

    /**
     * Key Check Value (KCV) Calculation
     * KCV = First 3 bytes of TDES(Key, 0000000000000000)
     */
    calculateKCV(key: Key): TraceResult<string> {
        const steps: TraceStep[] = [];
        const zeroBlock = Buffer.alloc(8, 0);

        const encrypted = encryptTDES(zeroBlock, key.value);
        const kcv = encrypted.subarray(0, 3).toString('hex').toUpperCase();

        steps.push({
            name: 'Encrypt Zero Block',
            description: 'Encrypt 8 bytes of zeros with the Key',
            input: bufferToHex(zeroBlock),
            output: bufferToHex(encrypted)
        });

        steps.push({
            name: 'Truncate',
            description: 'Take first 3 bytes as Check Value',
            input: bufferToHex(encrypted),
            output: kcv
        });

        return { result: kcv, steps };
    }
}
