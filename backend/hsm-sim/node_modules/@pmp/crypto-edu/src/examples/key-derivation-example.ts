import { KeyEdu } from '../algorithms/keyderivation/KeyDerivation';
import { hexToBuffer, bufferToHex } from '../utils/hex';

const keyManager = new KeyEdu();

const MK = hexToBuffer('11111111111111111111111111111111'); // Master Key
const DATA = hexToBuffer('0000000000000001'); // Variantes/Derivation Data

console.log('--- Key Management Examples ---\n');

// 1. Key Derivation (Standard EMV-like session key)
console.log(`Master Key: ${bufferToHex(MK)}`);
console.log(`Derivation Data: ${bufferToHex(DATA)}`);

const derived = keyManager.generateDerivedKey(MK, DATA);
console.log(`Derived Key: ${bufferToHex(derived.result.value)}`);
console.log('Derivation Steps:');
derived.steps.forEach(s => console.log(`  > ${s.name}: ${s.output}`));
console.log('');

// 2. Key Check Value (KCV)
console.log('--- KCV Calculation ---\n');
const kcv = keyManager.calculateKCV(derived.result);
console.log(`Key: ${bufferToHex(derived.result.value)}`);
console.log(`KCV: ${kcv.result}`);
console.log('Steps:');
kcv.steps.forEach(s => console.log(`  > ${s.name}: ${s.output}`));
