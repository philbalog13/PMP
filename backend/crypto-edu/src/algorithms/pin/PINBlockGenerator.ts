import { TraceResult, TraceStep } from '../../types';
import { bufferToHex, hexToBuffer, xorBuffers, padRight } from '../../utils/hex';
import { encryptTDES, decryptTDES } from '../../utils/crypto-wrappers';

export class PINBlockManager {
    /**
     * Generates ISO 9564 Format 0 PIN Block
     * Format 0 is the most common. It XORs two 8-byte blocks:
     * Block 1 (PIN): 0 + L + PIN + F...F (L = PIN length)
     * Block 2 (PAN): 0000 + PAN (exclude check digit, take rightmost 12 digits)
     */
    generateISO9564_Format0(pin: string, pan: string): TraceResult<Buffer> {
        const steps: TraceStep[] = [];

        // Step 1: Prepare PIN Block
        const L = pin.length;
        let pinBlockString = `0${L}${pin}`;
        pinBlockString = padRight(pinBlockString, 16, 'F');
        const pinBlock = hexToBuffer(pinBlockString);

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
        const panBlock = hexToBuffer(panBlockString);

        steps.push({
            name: 'Format PAN',
            description: 'Prepare PAN Block (0000 + Rightmost 12 digits of PAN excluding check digit)',
            input: pan,
            output: panBlockString
        });

        // Step 3: XOR
        const result = xorBuffers(pinBlock, panBlock);

        steps.push({
            name: 'XOR Operation',
            description: 'XOR PIN Block with PAN Block',
            input: `${pinBlockString} ^ ${panBlockString}`,
            output: bufferToHex(result)
        });

        return { result, steps };
    }

    generateISO9564_Format1(pin: string): TraceResult<Buffer> {
        const steps: TraceStep[] = [];

        // Format 1: 1 + L + PIN + Random (Transaction ID etc)
        const L = pin.length;
        let blockString = `1${L}${pin}`;

        // Fill with random hex digits for pedogogical simulation
        while (blockString.length < 16) {
            blockString += Math.floor(Math.random() * 16).toString(16).toUpperCase();
        }

        const result = hexToBuffer(blockString);

        steps.push({
            name: 'Format 1 Construction',
            description: 'Construct Format 1 Block (1 + Length + PIN + Random Filler)',
            input: pin,
            output: blockString
        });

        return { result, steps };
    }

    /**
     * Generates ISO 9564 Format 3 PIN Block (Diebold)
     */
    generateISO9564_Format3(pin: string, pan: string): TraceResult<Buffer> {
        const steps: TraceStep[] = [];
        const L = pin.length;

        let pinBlockString = `3${L}${pin}`;
        // Random padding A-F (10-15)
        while (pinBlockString.length < 16) {
            pinBlockString += Math.floor(10 + Math.random() * 6).toString(16).toUpperCase();
        }
        const pinBlock = hexToBuffer(pinBlockString);

        steps.push({
            name: 'Format 3 Construction',
            description: '3 + Length + PIN + Random Padding (A-F)',
            input: pin,
            output: pinBlockString
        });

        const panBody = pan.slice(0, -1);
        const pan12 = panBody.slice(-12);
        const panBlockString = `0000${pan12}`;
        const panBlock = hexToBuffer(panBlockString);

        const result = xorBuffers(pinBlock, panBlock);

        steps.push({
            name: 'XOR with PAN',
            description: 'Format 3 is also XORed with PAN',
            input: `${pinBlockString} ^ ${panBlockString}`,
            output: bufferToHex(result)
        });

        return { result, steps };
    }

    /**
     * Generates ISO 9564 Format 4 PIN Block (AES)
     */
    generateISO9564_Format4(pin: string, pan: string): TraceResult<Buffer> {
        const steps: TraceStep[] = [];
        const L = pin.length;

        // Field 1: 4 (4 bits)
        // Field 2: L (4 bits)
        // Field 3: PIN (L x 4 bits)
        // Field 4: Padding 'A' (4 bits)
        // Field 5: Random data
        let blockString = `4${L}${pin}A`;
        // AES block size is 128 bits = 32 hex chars
        while (blockString.length < 32) {
            blockString += Math.floor(Math.random() * 16).toString(16).toUpperCase();
        }

        const pinBlock = hexToBuffer(blockString);

        steps.push({
            name: 'Format 4 Construction',
            description: 'AES PIN Block (4 + Length + PIN + A + Random)',
            input: pin,
            output: blockString
        });

        return { result: pinBlock, steps };
    }

    encryptPINBlock(pinBlock: Buffer, key: Buffer): TraceResult<Buffer> {
        const steps: TraceStep[] = [];

        steps.push({
            name: 'Input Block',
            description: 'Clear PIN Block',
            input: bufferToHex(pinBlock),
            output: bufferToHex(pinBlock)
        });

        const encrypted = encryptTDES(pinBlock, key);

        steps.push({
            name: 'TDES Encryption',
            description: 'Encrypt PIN Block using Zone PIN Key (ZPK)',
            input: `Key: ${bufferToHex(key)}`,
            output: bufferToHex(encrypted)
        });

        return { result: encrypted, steps };
    }

    decryptPINBlock(encrypted: Buffer, key: Buffer): TraceResult<Buffer> {
        const steps: TraceStep[] = [];

        const decrypted = decryptTDES(encrypted, key);

        steps.push({
            name: 'TDES Decryption',
            description: 'Decrypt using Zone PIN Key (ZPK)',
            input: bufferToHex(encrypted),
            output: bufferToHex(decrypted)
        });

        return { result: decrypted, steps };
    }

    recoverPINFromFormat0(decryptedBlock: Buffer, pan: string): TraceResult<string> {
        const steps: TraceStep[] = [];

        // Step 1: Reconstruct PAN Block
        const panBody = pan.slice(0, -1);
        const pan12 = panBody.slice(-12);
        const panBlockString = `0000${pan12}`;
        const panBlock = hexToBuffer(panBlockString);

        steps.push({
            name: 'Reconstruct PAN Block',
            description: 'Needed to reverse the XOR',
            input: pan,
            output: panBlockString
        });

        // Step 2: XOR Decrypted Block with PAN Block
        const pinBlock = xorBuffers(decryptedBlock, panBlock);
        const pinBlockHex = bufferToHex(pinBlock);

        steps.push({
            name: 'Reverse XOR',
            description: 'XOR Decrypted Block with PAN Block to recover PIN Block',
            input: `${bufferToHex(decryptedBlock)} ^ ${panBlockString}`,
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
