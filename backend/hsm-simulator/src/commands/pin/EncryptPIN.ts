import { ICommand } from '../ICommand';
import { HSMSimulator } from '../../core/HSMSimulator';
import { PINBlockManager, hexToBuffer, bufferToHex } from '@pmp/crypto-edu';
import { ensurePan, ensurePin, normalizeKeyLabel, safeUpper } from '../../utils/input';
import { ValidationError } from '../../core/errors';

type PinFormat = 'ISO-0' | 'ISO-1';

export class EncryptPIN implements ICommand {
    private readonly pinMgr: PINBlockManager;
    private readonly hsm: HSMSimulator;

    constructor(hsm: HSMSimulator) {
        this.hsm = hsm;
        this.pinMgr = new PINBlockManager();
    }

    async execute(payload: unknown): Promise<unknown> {
        const body = (payload ?? {}) as Record<string, unknown>;
        const pin = ensurePin(body.pin);
        const pan = ensurePan(body.pan);
        const format = safeUpper(body.format, 'ISO-0') as PinFormat;
        const keyLabel = normalizeKeyLabel(body.keyLabel, 'ZPK_TEST');

        if (format !== 'ISO-0' && format !== 'ISO-1') {
            throw new ValidationError('format must be ISO-0 or ISO-1');
        }

        const keyInfo = this.hsm.keyStorage.requireKey(keyLabel, ['ZPK', 'TPK', 'UNKNOWN']);
        const keyBuf = hexToBuffer(keyInfo.value);

        if (keyBuf.length !== 16 && keyBuf.length !== 24) {
            throw new ValidationError('PIN encryption requires a double or triple length 3DES key');
        }

        const plainBlock = format === 'ISO-0'
            ? this.pinMgr.generateISO9564_Format0(pin, pan)
            : this.pinMgr.generateISO9564_Format1(pin);

        const encrypted = this.pinMgr.encryptPINBlock(plainBlock.result, keyBuf);

        return {
            command_code: 'B4',
            encrypted_pin_block: bufferToHex(encrypted.result).toUpperCase(),
            keyLabel,
            format,
            trace: [
                ...plainBlock.steps.map((s) => `${s.name}: ${s.output}`),
                ...encrypted.steps.map((s) => `${s.name}: ${s.output}`),
            ],
        };
    }
}
