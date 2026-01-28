import { AlgorithmRegistry } from './AlgorithmRegistry';

export class CryptoEngine {
    private registry: AlgorithmRegistry;

    constructor() {
        this.registry = new AlgorithmRegistry();
    }

    init() {
        console.log('Crypto Engine Initialized');
        // Auto-register standards could go here
    }
}
