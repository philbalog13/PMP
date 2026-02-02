import { ICommand } from '../ICommand';
import { HSMSimulator } from '../../core/HSMSimulator';
import { PINBlockManager, hexToBuffer, bufferToHex } from '@pmp/crypto-edu';

export class DecryptPIN implements ICommand {
    private pinMgr: PINBlockManager;
    private hsm: HSMSimulator;

    constructor(hsm: HSMSimulator) {
        this.hsm = hsm;
        this.pinMgr = new PINBlockManager();
    }

    async execute(payload: any): Promise<any> {
        const { pinBlock, pan, keyLabel } = payload;

        // 1. Get Key
        const keyInfo = this.hsm.keyStorage.getKey(keyLabel || 'ZPK_TEST');
        if (!keyInfo) throw new Error('Key not found');

        // 2. Decrypt Block
        const keyBuf = hexToBuffer(keyInfo.value);
        const encryptedBuf = hexToBuffer(pinBlock);

        const decryptRes = this.pinMgr.decryptPINBlock(encryptedBuf, keyBuf);

        // 3. Recover PIN (assuming Format 0 for now as it's the standard)
        // In a real HSM, format is specified or auto-detected.
        const recoverRes = this.pinMgr.recoverPINFromFormat0(decryptRes.result, pan);

        return {
            command_code: 'B5', // Assigning B5 as decided
            pin: recoverRes.result,
            trace: [...decryptRes.steps, ...recoverRes.steps]
        };
    }
}
