import { ICommand } from '../ICommand';
import { HSMSimulator } from '../../core/HSMSimulator';
import { encryptTDES, hexToBuffer, bufferToHex } from '@pmp/crypto-edu';

export class CalculateKCV implements ICommand {
    private hsm: HSMSimulator;

    constructor(hsm: HSMSimulator) {
        this.hsm = hsm;
    }

    async execute(payload: any): Promise<any> {
        const { keyLabel } = payload;

        // 1. Get Key
        const keyInfo = this.hsm.keyStorage.getKey(keyLabel);
        if (!keyInfo) throw new Error('Key not found');

        const keyBuf = hexToBuffer(keyInfo.value);

        // 2. Create Zero Block (8 bytes)
        const zeroBlock = Buffer.alloc(8, 0);

        // 3. Encrypt
        const encrypted = encryptTDES(zeroBlock, keyBuf);
        const encryptedHex = bufferToHex(encrypted);

        // 4. Extract KCV (First 6 hex chars = 3 bytes)
        const kcv = encryptedHex.substring(0, 6).toUpperCase();

        return {
            command_code: 'K1',
            kcv: kcv,
            full_check_value: encryptedHex
        };
    }
}
