"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardAuthentication = void 0;
const hex_1 = require("../utils/hex");
const crypto_wrappers_1 = require("../utils/crypto-wrappers");
class CardAuthentication {
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
    staticCVV(cardData, keyA, keyB) {
        const steps = [];
        // Step 1: Prepare Data
        // Format: PAN (digits) + Expiry (4) + ServiceCode (3)
        // If Data length is odd, pad with 0? 
        // Usually we take the data and put it into 16 bytes (32 hex chars) block for TDES?
        // Actually CVV uses single block encryption logic mostly.
        // Standard approach:
        // 1. Concat PAN + Expiry + SvcCode
        // 2. Put into 16-bye buffer (left aligned, pad with 0s) -> Block 1
        //    Actually, often uses 2 blocks.
        // Let's implement common pedagogical version:
        // Input: PAN(19 max) + Exp(4) + Svc(3)
        // Only use digits.
        const rawData = `${cardData.pan}${cardData.expiryDate}${cardData.serviceCode}`;
        const paddedData = rawData.padEnd(32, '0').slice(0, 32); // Ensure we work with enough data, standard says block construction is specific
        // Convert to Hex Buffer? The input data are digits. They are treated as Hex nibbles? 
        // Yes, usually "packed BCD" or just hex representation of the digits.
        // e.g. PAN 4111.. -> 0x41 0x11...
        // If PAN has odd length, we might have issue.
        // Let's assume input string is Hex for this algo.
        // 1234 -> 0x12 0x34
        // Make sure length is even
        let hexString = rawData;
        if (hexString.length % 2 !== 0)
            hexString += '0';
        // Pad to 32 digits (16 bytes)
        hexString = hexString.padEnd(32, '0').substring(0, 32);
        const block1 = (0, hex_1.hexToBuffer)(hexString.substring(0, 16));
        const block2 = (0, hex_1.hexToBuffer)(hexString.substring(16, 32));
        steps.push({
            name: 'Data Preparation',
            description: 'Construct 2 blocks from PAN+Exp+Svc',
            input: rawData,
            output: `Block1: ${(0, hex_1.bufferToHex)(block1)}\nBlock2: ${(0, hex_1.bufferToHex)(block2)}`
        });
        // Step 2: DES(KA, Block1)
        const step2 = (0, crypto_wrappers_1.encryptDES)(block1, keyA);
        steps.push({
            name: 'Encrypt Block 1',
            description: 'DES(KA, Block1)',
            input: (0, hex_1.bufferToHex)(block1),
            output: (0, hex_1.bufferToHex)(step2)
        });
        // Step 3: XOR with Block 2
        /*
         * WAIT, Standard CVV Algo:
         * 1. Encrypt Block1 with KA
         * 2. XOR result with Block2
         * 3. Encrypt result with KA
         * 4. Decrypt result with KB
         * 5. Encrypt result with KA
         */
        // No, standard is:
        // 1. DES(KA, Block1) -> R1
        // 2. R1 XOR Block2 -> R2
        // 3. TDES(KeyAB, R2) -> Result
        // Let's do Trace step for XOR
        // But wait, hexToBuffer(hexString) gives us the blocks.
        // Simplified workflow for demo (since strict CVV algo details vary by issuer slightly, but general structure is TDES):
        // 1. TDES(Key, Data)
        // Let's stick to the structure:
        // 1. DES(KA, B1) => O1
        // 2. O1 XOR B2 => O2
        // 3. TDES(KA+KB, O2) => O3
        const xorResult = Buffer.alloc(8);
        for (let i = 0; i < 8; i++)
            xorResult[i] = step2[i] ^ block2[i];
        steps.push({
            name: 'XOR Block 2',
            description: 'Result ^ Block2',
            input: (0, hex_1.bufferToHex)(block2),
            output: (0, hex_1.bufferToHex)(xorResult)
        });
        // 3. TDES Encryption of XOR Result (using KA and KB)
        // Key = KA + KB + KA (Triple DES 112-bit)
        const tripleKey = Buffer.concat([keyA, keyB, keyA]);
        // Manually: Encrypt KA, Decrypt KB, Encrypt KA
        const tdesResult = (0, crypto_wrappers_1.encryptDES)(
        // Decrypt KB
        node_crypto_1.default.createDecipheriv('des-ecb', keyB, null).setAutoPadding(false).update((0, crypto_wrappers_1.encryptDES)(xorResult, keyA)), keyA);
        // Or simpler using TDES wrapper if we construct keys
        // Let's use individual steps for trace
        const encA = (0, crypto_wrappers_1.encryptDES)(xorResult, keyA);
        const decB = node_crypto_1.default.createDecipheriv('des-ecb', keyB, null).setAutoPadding(false).update(encA);
        const encA2 = (0, crypto_wrappers_1.encryptDES)(decB, keyA);
        steps.push({
            name: 'TDES Processing',
            description: 'Enc(KA) -> Dec(KB) -> Enc(KA)',
            input: (0, hex_1.bufferToHex)(xorResult),
            output: (0, hex_1.bufferToHex)(encA2)
        });
        // Step 4: Extract CVV
        // Filter digits from hex result
        const hexResult = (0, hex_1.bufferToHex)(encA2);
        let digits = hexResult.replace(/[A-F]/g, '');
        // If not enough digits, map A->0, B->1, ... F->5 ??
        // No, standard mapping is: A-F are ignored? Or mapped?
        // Actually standard is: extract 0-9. If < 3, trace remaining hex chars, subtract 10 (A=0, B=1...)
        // Let's implement extraction
        let cvv = digits.substring(0, 3);
        if (cvv.length < 3) {
            // Need more digits
            // Find letters and convert
            // A(10)->0, B(11)->1, ... F(15)->5
            let extra = '';
            for (const char of hexResult) {
                const val = parseInt(char, 16);
                if (val >= 10)
                    extra += (val - 10).toString();
            }
            cvv = (digits + extra).substring(0, 3);
        }
        steps.push({
            name: 'Extract Digits',
            description: 'Extract 3 digits from result (mapping A-F to 0-5 if needed)',
            input: hexResult,
            output: cvv
        });
        return { result: cvv, steps };
    }
}
exports.CardAuthentication = CardAuthentication;
const node_crypto_1 = __importDefault(require("node:crypto"));
