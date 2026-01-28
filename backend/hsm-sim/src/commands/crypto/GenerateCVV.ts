import { ICommand } from '../ICommand';
import { HSMSimulator } from '../../core/HSMSimulator';
import { CVVGenerator, hexToBuffer } from '@pmp/crypto-edu';

export class GenerateCVV implements ICommand {
    private cvvMgr = new CVVGenerator();
    constructor(private hsm: HSMSimulator) { }

    async execute(payload: any): Promise<any> {
        const { pan, expiry, serviceCode, keyLabel } = payload;
        const keyInfo = this.hsm.keyStorage.getKey(keyLabel || 'CVK_TEST');
        if (!keyInfo) throw new Error('CVK not found');

        // staticCVV expects: cardData, keyA, keyB
        // We have one key. CVV usually splits key into A and B?
        // Or we use single length key?
        // If key is 16 bytes: A = 0-8, B = 8-16
        const key = hexToBuffer(keyInfo.value);
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
