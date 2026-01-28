"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateMAC = void 0;
const crypto_edu_1 = require("@pmp/crypto-edu");
class GenerateMAC {
    constructor(hsm) {
        this.hsm = hsm;
        this.macMgr = new crypto_edu_1.MACManager();
    }
    async execute(payload) {
        const { data, keyLabel, method } = payload;
        const keyInfo = this.hsm.keyStorage.getKey(keyLabel || 'ZPK_TEST');
        if (!keyInfo)
            throw new Error('Key not found');
        const keyBuf = (0, crypto_edu_1.hexToBuffer)(keyInfo.value);
        const dataBuf = (0, crypto_edu_1.hexToBuffer)(data);
        let res;
        if (method === 'ALG1')
            res = this.macMgr.calculateISO9797_ALG1(dataBuf, keyBuf.subarray(0, 8));
        else
            res = this.macMgr.calculateISO9797_ALG3(dataBuf, keyBuf);
        return {
            command_code: 'C0',
            mac: (0, crypto_edu_1.bufferToHex)(res.result),
            trace: res.steps
        };
    }
}
exports.GenerateMAC = GenerateMAC;
