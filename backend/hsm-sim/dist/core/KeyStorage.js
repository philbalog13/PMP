"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyStorage = void 0;
class KeyStorage {
    constructor() {
        this.keys = new Map();
        // Load partial test keys
        this.saveKey('ZPK_TEST', { type: 'ZPK', value: '11111111111111111111111111111111' });
        this.saveKey('CVK_TEST', { type: 'CVK', value: '0123456789ABCDEFFEDCBA9876543210' });
    }
    saveKey(label, data) {
        // In real HSM, encrypted under LMK. Here in-memory simulation.
        this.keys.set(label, data);
    }
    getKey(label) {
        return this.keys.get(label);
    }
    zeroize() {
        this.keys.clear();
        console.warn('[HSM Storage] ZEROIZED ALL KEYS');
    }
    listKeys() {
        return Array.from(this.keys.entries()).map(([k, v]) => ({ label: k, ...v }));
    }
}
exports.KeyStorage = KeyStorage;
