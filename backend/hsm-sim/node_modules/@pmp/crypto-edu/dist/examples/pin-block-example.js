"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PINBlockGenerator_1 = require("../algorithms/pin/PINBlockGenerator");
const hex_1 = require("../utils/hex");
const pinManager = new PINBlockGenerator_1.PINBlockManager();
// Example Data
const PIN = '1234';
const PAN = '43219876543210987'; // 16 digits + check? Last digit is check digit usually
const ZPK = (0, hex_1.hexToBuffer)('11111111111111111111111111111111'); // TDES Key
console.log('--- ISO 9564 PIN Block Examples ---\n');
// 1. Format 0
console.log(`[Format 0] PIN: ${PIN}, PAN: ${PAN}`);
const format0 = pinManager.generateISO9564_Format0(PIN, PAN);
console.log(`Result: ${(0, hex_1.bufferToHex)(format0.result)}`);
console.log('Steps:');
format0.steps.forEach(s => console.log(`  - ${s.name}: ${s.output} (${s.description})`));
console.log('');
// 2. Format 1
console.log(`[Format 1] PIN: ${PIN}`);
const format1 = pinManager.generateISO9564_Format1(PIN);
console.log(`Result: ${(0, hex_1.bufferToHex)(format1.result)}`);
console.log('Steps:');
format1.steps.forEach(s => console.log(`  - ${s.name}: ${s.output}`));
console.log('');
// 3. Format 3
console.log(`[Format 3] PIN: ${PIN}, PAN: ${PAN}`);
const format3 = pinManager.generateISO9564_Format3(PIN, PAN);
console.log(`Result: ${(0, hex_1.bufferToHex)(format3.result)}`);
console.log('Steps:');
format3.steps.forEach(s => console.log(`  - ${s.name}: ${s.output}`));
console.log('');
// 4. Trace Encryption
console.log('[Encryption] Encrypting Format 0 Block...');
const encrypted = pinManager.encryptPINBlock(format0.result, ZPK);
console.log(`Encrypted Block: ${(0, hex_1.bufferToHex)(encrypted.result)}`);
