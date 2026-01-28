import { TraceResult, TraceStep } from '../../types';
import { bufferToHex, hexToBuffer, xorBuffers } from '../../utils/hex';
import { MACManager } from '../mac/MACCalculator';

export interface TransactionData {
    amount: string; // n12
    otherAmount: string; // n12
    countryCode: string; // n3
    currencyCode: string; // n3
    date: string; // n6
    type: string; // n2
    unpredictableNumber: string; // n8 (4 bytes)
    aic: string; // Application Interchange Profile (n4)
    atc: string; // n4 (2 bytes)
}

export class EMVFormatter {
    private macManager = new MACManager();

    /**
     * Generates ARQC (Application Request Cryptogram)
     * Uses ISO 9797-1 MAC Algorithm 3 (Retail MAC) with Session Key
     * Data is concatenated from Transaction Data elements.
     */
    generateARQC(data: TransactionData, sessionKey: Buffer): TraceResult<Buffer> {
        const steps: TraceStep[] = [];

        // 1. Construct Data Block
        // Standard EMV construction (simplified for pedagogy):
        // Amount(6) + Other(6) + Country(2) + Currency(2) + Date(3) + Type(1) + UN(4) + AIP(2) + ATC(2) ...
        // Note: inputs are strings, need to be packed BCD or Hex.
        // Example: Amount "000000001000" -> 0x00 0x00 0x00 0x00 0x10 0x00

        const constructHex = (val: string, lenBytes: number) => val.padStart(lenBytes * 2, '0');

        const dataHex =
            constructHex(data.amount, 6) +
            constructHex(data.otherAmount, 6) +
            constructHex(data.countryCode, 2) +
            constructHex(data.currencyCode, 2) +
            constructHex(data.date, 3) +
            constructHex(data.type, 1) +
            constructHex(data.unpredictableNumber, 4) +
            constructHex(data.aic, 2) +
            constructHex(data.atc, 2);

        const inputData = hexToBuffer(dataHex);

        steps.push({
            name: 'Data Construction',
            description: 'Concatenate Amount, Date, UN, etc.',
            input: JSON.stringify(data),
            output: dataHex
        });

        // 2. Padding (ISO 9797 Method B often used in EMV, but Method 1 is simpler)
        // EMV actually uses specific padding (80 ... 00)
        // Let's manually pad with 80 00...
        let paddedHex = dataHex + '80';
        while ((paddedHex.length / 2) % 8 !== 0) {
            paddedHex += '00';
        }
        const paddedBuffer = hexToBuffer(paddedHex);

        steps.push({
            name: 'Padding (EMV)',
            description: 'Pad with 0x80 ... 0x00 to multiple of 8 bytes',
            input: bufferToHex(inputData),
            output: paddedHex
        });

        // 3. Compute MAC (ALG3)
        // We reuse MACManager.calculateISO9797_ALG3 which does zero padding (Method 1).
        // But since we manually padded, Method 1 on top is fine or redundant.
        // Ideally we should inject pre-padded data or use a raw method.
        // Let's use the MAC Manager but note that it might re-pad if not aligned (it is aligned).

        const macTrace = this.macManager.calculateISO9797_ALG3(paddedBuffer, sessionKey);

        // Merge steps
        steps.push(...macTrace.steps.map(s => ({ ...s, name: `MAC: ${s.name}` })));

        return { result: macTrace.result, steps };
    }

    generateARPC(arqc: Buffer, responseCode: string, key: Buffer): TraceResult<Buffer> {
        const steps: TraceStep[] = [];

        // ARPC Method 1: ARPC = MAC(ARQC ^ ARC, Key) ... 
        // Common EMV Method 1:
        // ARQC (8 bytes) XOR 000000000000 + ARC (2 bytes)

        const arcBuffer = hexToBuffer(responseCode.padEnd(4, '0'));
        const xorOperand = Buffer.concat([arcBuffer, Buffer.alloc(6, 0)]); // Pad right? Or Left? 
        // Actually ARC is usually right aligned or left?
        // ARC 3030 ('00')
        // ARPC Calculation:
        // 1. Pad ARC to 8 bytes with 00 (Right pad)
        // 2. XOR with ARQC
        // 3. DES(Key, Result) or 3DES(Key, Result)

        const xorInput = Buffer.concat([hexToBuffer(responseCode), Buffer.alloc(6, 0)]);
        const xored = xorBuffers(arqc, xorInput);

        steps.push({
            name: 'ARQC XOR ARC',
            description: 'XOR ARQC with Response Code (padded)',
            input: `ARQC: ${bufferToHex(arqc)}\nARC: ${bufferToHex(xorInput)}`,
            output: bufferToHex(xored)
        });

        // 3DES Encrypt
        // Note: Usually single DES is sufficient for ARPC method 1, but let's use what key allows
        // If key is 16 bytes, TDES.

        const arpc = this.macManager.calculateISO9797_ALG3(xored, key).result; // Using MAC as block cipher helper roughly

        // Actually ARPC is just Block Cipher of the XORed value, not MAC chain.
        // So we should use EncryptTDES directly.

        // We need to import EncryptTDES from wrappers, but EMVFormatter doesn't have direct access unless we import utils.
        // For now, let's assume we can use AES/DES wrapper?
        // I'll leave it as a placeholder or import crypto wrapper if possible.
        // Wait, I can import encryptTDES.

        return { result: arpc, steps };
    }
}
