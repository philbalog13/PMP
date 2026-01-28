import { ICommand } from '../ICommand';
import { HSMSimulator } from '../../core/HSMSimulator';
import { MACManager, hexToBuffer, bufferToHex } from '@pmp/crypto-edu';

export class GenerateMAC implements ICommand {
    private macMgr: MACManager;
    private hsm: HSMSimulator;

    constructor(hsm: HSMSimulator) {
        this.hsm = hsm;
        this.macMgr = new MACManager();
    }

    async execute(payload: any): Promise<any> {
        const { data, keyLabel, method } = payload;

        const keyInfo = this.hsm.keyStorage.getKey(keyLabel || 'ZPK_TEST');
        if (!keyInfo) throw new Error('Key not found');

        const keyBuf = hexToBuffer(keyInfo.value);
        const dataBuf = hexToBuffer(data);

        let res;
        if (method === 'ALG1') res = this.macMgr.calculateISO9797_ALG1(dataBuf, keyBuf.subarray(0, 8));
        else res = this.macMgr.calculateISO9797_ALG3(dataBuf, keyBuf);

        return {
            command_code: 'C0',
            mac: bufferToHex(res.result),
            trace: res.steps
        };
    }
}
