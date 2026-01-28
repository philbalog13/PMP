"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const KeyDerivation_1 = require("../algorithms/keyderivation/KeyDerivation");
const hex_1 = require("../utils/hex");
const keyManager = new KeyDerivation_1.KeyEdu();
const MK = (0, hex_1.hexToBuffer)('11111111111111111111111111111111'); // Master Key
const DATA = (0, hex_1.hexToBuffer)('0000000000000001'); // Variantes/Derivation Data
console.log('--- Key Management Examples ---\n');
// 1. Key Derivation (Standard EMV-like session key)
console.log(`Master Key: ${(0, hex_1.bufferToHex)(MK)}`);
console.log(`Derivation Data: ${(0, hex_1.bufferToHex)(DATA)}`);
const derived = keyManager.generateDerivedKey(MK, DATA);
console.log(`Derived Key: ${(0, hex_1.bufferToHex)(derived.result.value)}`);
console.log('Derivation Steps:');
derived.steps.forEach(s => console.log(`  > ${s.name}: ${s.output}`));
console.log('');
// 2. Key Check Value (KCV)
console.log('--- KCV Calculation ---\n');
const kcv = keyManager.calculateKCV(derived.result);
console.log(`Key: ${(0, hex_1.bufferToHex)(derived.result.value)}`);
console.log(`KCV: ${kcv.result}`);
console.log('Steps:');
kcv.steps.forEach(s => console.log(`  > ${s.name}: ${s.output}`));
