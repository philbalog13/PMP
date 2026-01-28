import { MACManager } from '../algorithms/mac/MACCalculator';
import { EMVFormatter } from '../algorithms/formats/EMVFormatter';
import { hexToBuffer, bufferToHex } from '../utils/hex';

const macManager = new MACManager();
const emvFormatter = new EMVFormatter();

const KEY = hexToBuffer('0123456789ABCDEFFEDCBA9876543210'); // 16 bytes (Double Length)
const DATA = hexToBuffer('11223344556677889900AABB'); // 12 bytes

console.log('--- ISO 9797 MAC Examples ---\n');

// 1. MAC ALG 3 (Retail)
console.log(`[ALG 3] Data: ${bufferToHex(DATA)}`);
const mac3 = macManager.calculateISO9797_ALG3(DATA, KEY);
console.log(`MAC (Retail): ${bufferToHex(mac3.result)}`);
console.log('Trace:');
mac3.steps.forEach(s => console.log(`  > ${s.name}: ${s.output}`));
console.log('');

// 2. MAC ALG 1 (DES CBC)
console.log(`[ALG 1] Data: ${bufferToHex(DATA)}`);
const mac1 = macManager.calculateISO9797_ALG1(DATA, KEY.subarray(0, 8)); // Use Single Key
console.log(`MAC (CBC): ${bufferToHex(mac1.result)}`);
console.log('');

// 3. EMV ARQC Example
console.log('--- EMV ARQC Example ---\n');
const txData = {
    amount: '000000001000',
    otherAmount: '000000000000',
    countryCode: '0250',
    currencyCode: '0978',
    date: '240101',
    type: '00',
    unpredictableNumber: '12345678',
    aic: '0000',
    atc: '0001'
};
const arqc = emvFormatter.generateARQC(txData, KEY);
console.log(`ARQC: ${bufferToHex(arqc.result)}`);
console.log('ARQC Trace:');
arqc.steps.forEach(s => console.log(`  > ${s.name}: ${s.output}`));
