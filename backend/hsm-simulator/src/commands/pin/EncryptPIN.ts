import { ICommand } from '../ICommand';
import { HSMSimulator } from '../../core/HSMSimulator';
import { PINBlockManager, hexToBuffer, bufferToHex } from '@pmp/crypto-edu';

export class EncryptPIN implements ICommand {
    private pinMgr: PINBlockManager;
    private hsm: HSMSimulator;

    constructor(hsm: HSMSimulator) {
        this.hsm = hsm;
        this.pinMgr = new PINBlockManager();
    }

    async execute(payload: any): Promise<any> {
        const { pin, pan, format, keyLabel } = payload;

        const keyInfo = this.hsm.keyStorage.getKey(keyLabel || 'ZPK_TEST');
        if (!keyInfo) throw new Error('Key not found');

        // 1. Generate Plain Block
        let plainBlockRes;
        if (format === 'ISO-0') plainBlockRes = this.pinMgr.generateISO9564_Format0(pin, pan);
        else plainBlockRes = this.pinMgr.generateISO9564_Format1(pin);

        // 2. Encrypt
        const keyBuf = hexToBuffer(keyInfo.value);
        const encRes = this.pinMgr.encryptPINBlock(plainBlockRes.result, keyBuf);

        return {
            command_code: 'B4',
            encrypted_pin_block: bufferToHex(encRes.result),
            trace: encRes.steps
        };
    }
}
