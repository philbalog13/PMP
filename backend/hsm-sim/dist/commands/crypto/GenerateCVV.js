"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateCVV = void 0;
const crypto_edu_1 = require("@pmp/crypto-edu");
class GenerateCVV {
    constructor(hsm) {
        this.hsm = hsm;
        this.cvvMgr = new crypto_edu_1.CVVGenerator();
    }
    async execute(payload) {
        const { pan, expiry, serviceCode, keyLabel } = payload;
        const keyInfo = this.hsm.keyStorage.getKey(keyLabel || 'CVK_TEST');
        if (!keyInfo)
            throw new Error('CVK not found');
        // staticCVV expects: cardData, keyA, keyB
        // We have one key. CVV usually splits key into A and B?
        // Or we use single length key?
        // If key is 16 bytes: A = 0-8, B = 8-16
        const key = (0, crypto_edu_1.hexToBuffer)(keyInfo.value);
        let keyA = key;
        let keyB = key;
        if (key.length === 16) {
            keyA = key.subarray(0, 8);
            keyB = key.subarray(8, 16);
        }
        const cardData = {
            pan,
            expiryDate: expiry,
            serviceCode
        };
        const res = this.cvvMgr.staticCVV(cardData, keyA, keyB);
        return { command_code: 'D4', cvv: res.result, trace: res.steps };
    }
}
exports.GenerateCVV = GenerateCVV;
