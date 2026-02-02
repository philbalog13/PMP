import { ICommand } from '../ICommand';
import { HSMSimulator } from '../../core/HSMSimulator';
import { encryptTDES, hexToBuffer, bufferToHex, padRight } from '@pmp/crypto-edu';

export class EncryptData implements ICommand {
    private hsm: HSMSimulator;

    constructor(hsm: HSMSimulator) {
        this.hsm = hsm;
    }

    async execute(payload: any): Promise<any> {
        const { data, keyLabel, mode } = payload; // mode could be ECB/CBC, defaulting to ECB via wrapper

        // 1. Get Key
        const keyInfo = this.hsm.keyStorage.getKey(keyLabel || 'ZEK_TEST'); // Zone Encryption Key
        if (!keyInfo) throw new Error('Key not found');

        // 2. Prepare Data (Pad to 8 bytes multiple)
        // PKCS5 or Zero padding? HSMs usually use Zero or ISO 9797-1 method 2 (80...)
        // For simplicity/edu: Zero padding to 8 bytes
        let dataHex = data;
        const remainder = dataHex.length % 16;
        if (remainder !== 0) {
            dataHex = padRight(dataHex, dataHex.length + (16 - remainder), 'F'); // Padding with F or 0
        }

        const keyBuf = hexToBuffer(keyInfo.value);
        const dataBuf = hexToBuffer(dataHex);

        // 3. Encrypt
        const encrypted = encryptTDES(dataBuf, keyBuf);

        return {
            command_code: 'E1',
            encryptedData: bufferToHex(encrypted)
        };
    }
}
