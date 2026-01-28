"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyEdu = void 0;
const hex_1 = require("../../utils/hex");
const crypto_wrappers_1 = require("../../utils/crypto-wrappers");
class KeyEdu {
    /**
     * Generates a derived key using a simplified EMV-like derivation
     * Master Key (MK) -> Session Key (SK) using derivation data
     * SK = TDES(MK, DerivationData)
     */
    generateDerivedKey(masterKey, derivationData) {
        const steps = [];
        steps.push({
            name: 'Input Parameters',
            description: 'Derive key from Master Key using Data',
            input: `MK: ${(0, hex_1.bufferToHex)(masterKey)}`,
            output: `Data: ${(0, hex_1.bufferToHex)(derivationData)}`
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
        const leftPart = (0, crypto_wrappers_1.encryptTDES)(derivationData, masterKey);
        steps.push({
            name: 'Left Key Part',
            description: 'SK_L = TDES(MK, Data)',
            input: (0, hex_1.bufferToHex)(derivationData),
            output: (0, hex_1.bufferToHex)(leftPart)
        });
        const invertedData = (0, hex_1.xorBuffers)(derivationData, Buffer.alloc(8, 0xFF));
        const rightPart = (0, crypto_wrappers_1.encryptTDES)(invertedData, masterKey);
        steps.push({
            name: 'Right Key Part',
            description: 'SK_R = TDES(MK, ~Data)',
            input: (0, hex_1.bufferToHex)(invertedData),
            output: (0, hex_1.bufferToHex)(rightPart)
        });
        const sessionKey = Buffer.concat([leftPart, rightPart]);
        steps.push({
            name: 'Final Session Key',
            description: 'Concatenate Left and Right parts',
            input: `${(0, hex_1.bufferToHex)(leftPart)} + ${(0, hex_1.bufferToHex)(rightPart)}`,
            output: (0, hex_1.bufferToHex)(sessionKey)
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
    calculateKCV(key) {
        const steps = [];
        const zeroBlock = Buffer.alloc(8, 0);
        const encrypted = (0, crypto_wrappers_1.encryptTDES)(zeroBlock, key.value);
        const kcv = encrypted.subarray(0, 3).toString('hex').toUpperCase();
        steps.push({
            name: 'Encrypt Zero Block',
            description: 'Encrypt 8 bytes of zeros with the Key',
            input: (0, hex_1.bufferToHex)(zeroBlock),
            output: (0, hex_1.bufferToHex)(encrypted)
        });
        steps.push({
            name: 'Truncate',
            description: 'Take first 3 bytes as Check Value',
            input: (0, hex_1.bufferToHex)(encrypted),
            output: kcv
        });
        return { result: kcv, steps };
    }
}
exports.KeyEdu = KeyEdu;
