"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoEngine = void 0;
const AlgorithmRegistry_1 = require("./AlgorithmRegistry");
class CryptoEngine {
    registry;
    constructor() {
        this.registry = new AlgorithmRegistry_1.AlgorithmRegistry();
    }
    init() {
        console.log('Crypto Engine Initialized');
        // Auto-register standards could go here
    }
}
exports.CryptoEngine = CryptoEngine;
