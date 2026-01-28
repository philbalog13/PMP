"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PINBlockManager = void 0;
const hex_1 = require("../utils/hex");
const crypto_wrappers_1 = require("../utils/crypto-wrappers");
class PINBlockManager {
    /**
     * Generates ISO 9564 Format 0 PIN Block
     * Format 0 is the most common. It XORs two 8-byte blocks:
     * Block 1 (PIN): 0 + L + PIN + F...F (L = PIN length)
     * Block 2 (PAN): 0000 + PAN (exclude check digit, take rightmost 12 digits)
     */
    generateISO9564_Format0(pin, pan) {
        const steps = [];
        // Step 1: Prepare PIN Block
        const L = pin.length;
        let pinBlockString = `0${L}${pin}`;
        pinBlockString = (0, hex_1.padRight)(pinBlockString, 16, 'F');
        const pinBlock = (0, hex_1.hexToBuffer)(pinBlockString);
        steps.push({
            name: 'Format PIN',
            description: 'Prepare PIN Block (0 + Length + PIN + Padding F)',
            input: pin,
            output: pinBlockString
        });
        // Step 2: Prepare PAN Block
        // Take rightmost 12 digits excluding check digit (last digit)
        const panBody = pan.slice(0, -1);
        const pan12 = panBody.slice(-12);
        const panBlockString = `0000${pan12}`;
        const panBlock = (0, hex_1.hexToBuffer)(panBlockString);
        steps.push({
            name: 'Format PAN',
            description: 'Prepare PAN Block (0000 + Rightmost 12 digits of PAN excluding check digit)',
            input: pan,
            output: panBlockString
        });
        // Step 3: XOR
        const result = (0, hex_1.xorBuffers)(pinBlock, panBlock);
        steps.push({
            name: 'XOR Operation',
            description: 'XOR PIN Block with PAN Block',
            input: `${pinBlockString} ^ ${panBlockString}`,
            output: (0, hex_1.bufferToHex)(result)
        });
        return { result, steps };
    }
    generateISO9564_Format1(pin) {
        const steps = [];
        // Format 1: 1 + L + PIN + Random (Transaction ID etc)
        const L = pin.length;
        let blockString = `1${L}${pin}`;
        // Fill with random hex digits for pedogogical simulation (fixed seed for deterministic test if needed, but here random)
        // For trace stability in tests, we might want to inject random provider, but using simple random here.
        while (blockString.length < 16) {
            blockString += Math.floor(Math.random() * 16).toString(16).toUpperCase();
        }
        const result = (0, hex_1.hexToBuffer)(blockString);
        steps.push({
            name: 'Format 1 Construction',
            description: 'Construct Format 1 Block (1 + Length + PIN + Random Filler)',
            input: pin,
            output: blockString
        });
        return { result, steps };
    }
    encryptPINBlock(pinBlock, key) {
        const steps = [];
        steps.push({
            name: 'Input Block',
            description: 'Clear PIN Block',
            input: (0, hex_1.bufferToHex)(pinBlock),
            output: (0, hex_1.bufferToHex)(pinBlock)
        });
        const encrypted = (0, crypto_wrappers_1.encryptTDES)(pinBlock, key);
        steps.push({
            name: 'TDES Encryption',
            description: 'Encrypt PIN Block using Zone PIN Key (ZPK)',
            input: `Key: ${(0, hex_1.bufferToHex)(key)}`,
            output: (0, hex_1.bufferToHex)(encrypted)
        });
        return { result: encrypted, steps };
    }
    decryptPINBlock(encrypted, key) {
        const steps = [];
        const decrypted = (0, crypto_wrappers_1.decryptTDES)(encrypted, key);
        steps.push({
            name: 'TDES Decryption',
            description: 'Decrypt using Zone PIN Key (ZPK)',
            input: (0, hex_1.bufferToHex)(encrypted),
            output: (0, hex_1.bufferToHex)(decrypted)
        });
        return { result: decrypted, steps };
    }
    /**
     * Educational Helper: Extract PIN from Format 0 Block
     */
    recoverPINFromFormat0(decryptedBlock, pan) {
        const steps = [];
        // Step 1: Reconstruct PAN Block
        const panBody = pan.slice(0, -1);
        const pan12 = panBody.slice(-12);
        const panBlockString = `0000${pan12}`;
        const panBlock = (0, hex_1.hexToBuffer)(panBlockString);
        steps.push({
            name: 'Reconstruct PAN Block',
            description: 'Needed to reverse the XOR',
            input: pan,
            output: panBlockString
        });
        // Step 2: XOR Decrypted Block with PAN Block
        const pinBlock = (0, hex_1.xorBuffers)(decryptedBlock, panBlock);
        const pinBlockHex = (0, hex_1.bufferToHex)(pinBlock);
        steps.push({
            name: 'Reverse XOR',
            description: 'XOR Decrypted Block with PAN Block to recover PIN Block',
            input: `${(0, hex_1.bufferToHex)(decryptedBlock)} ^ ${panBlockString}`,
            output: pinBlockHex
        });
        // Step 3: Parse PIN
        // Format 0: 0 + L + PIN + Padding
        const lengthDigit = parseInt(pinBlockHex[1], 10);
        const pin = pinBlockHex.substring(2, 2 + lengthDigit);
        steps.push({
            name: 'Extract PIN',
            description: `Read Length (L=${lengthDigit}) and extract PIN digits`,
            input: pinBlockHex,
            output: pin
        });
        return { result: pin, steps };
    }
}
exports.PINBlockManager = PINBlockManager;
