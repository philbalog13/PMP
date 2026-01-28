export class KeyStorage {
    private keys: Map<string, any> = new Map();

    constructor() {
        // Load partial test keys
        this.saveKey('ZPK_TEST', { type: 'ZPK', value: '11111111111111111111111111111111' });
        this.saveKey('CVK_TEST', { type: 'CVK', value: '0123456789ABCDEFFEDCBA9876543210' });
    }

    saveKey(label: string, data: any) {
        // In real HSM, encrypted under LMK. Here in-memory simulation.
        this.keys.set(label, data);
    }

    getKey(label: string) {
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
