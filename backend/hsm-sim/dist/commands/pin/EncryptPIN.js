"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptPIN = void 0;
const crypto_edu_1 = require("@pmp/crypto-edu");
class EncryptPIN {
    constructor(hsm) {
        this.hsm = hsm;
        this.pinMgr = new crypto_edu_1.PINBlockManager();
    }
    async execute(payload) {
        const { pin, pan, format, keyLabel } = payload;
        const keyInfo = this.hsm.keyStorage.getKey(keyLabel || 'ZPK_TEST');
        if (!keyInfo)
            throw new Error('Key not found');
        // 1. Generate Plain Block
        let plainBlockRes;
        if (format === 'ISO-0')
            plainBlockRes = this.pinMgr.generateISO9564_Format0(pin, pan);
        else
            plainBlockRes = this.pinMgr.generateISO9564_Format1(pin);
        // 2. Encrypt
        const keyBuf = (0, crypto_edu_1.hexToBuffer)(keyInfo.value);
        const encRes = this.pinMgr.encryptPINBlock(plainBlockRes.result, keyBuf);
        return {
            command_code: 'B4',
            encrypted_pin_block: (0, crypto_edu_1.bufferToHex)(encRes.result),
            trace: encRes.steps
        };
    }
}
exports.EncryptPIN = EncryptPIN;
