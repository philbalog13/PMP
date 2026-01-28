"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlgorithmRegistry = void 0;
class AlgorithmRegistry {
    algorithms = new Map();
    register(name, implementation) {
        this.algorithms.set(name, implementation);
    }
    get(name) {
        return this.algorithms.get(name);
    }
    listAlgorithms() {
        return Array.from(this.algorithms.keys());
    }
}
exports.AlgorithmRegistry = AlgorithmRegistry;
