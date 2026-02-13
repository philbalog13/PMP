import { ICommand } from '../ICommand';
import { HSMSimulator } from '../../core/HSMSimulator';
import { PINBlockManager, hexToBuffer, bufferToHex } from '@pmp/crypto-edu';
import { ensureHex, ensurePan, normalizeKeyLabel, safeUpper } from '../../utils/input';
import { ValidationError } from '../../core/errors';

type PinFormat = 'ISO-0' | 'ISO-1';

export class DecryptPIN implements ICommand {
    private readonly pinMgr: PINBlockManager;
    private readonly hsm: HSMSimulator;

    constructor(hsm: HSMSimulator) {
        this.hsm = hsm;
        this.pinMgr = new PINBlockManager();
    }

    async execute(payload: unknown): Promise<unknown> {
        const body = (payload ?? {}) as Record<string, unknown>;
        const pinBlock = ensureHex(body.pinBlock, 'pinBlock');
        const pan = ensurePan(body.pan);
        const format = safeUpper(body.format, 'ISO-0') as PinFormat;
        const keyLabel = normalizeKeyLabel(body.keyLabel, 'ZPK_TEST');

        if (format !== 'ISO-0' && format !== 'ISO-1') {
            throw new ValidationError('format must be ISO-0 or ISO-1');
        }

        const keyInfo = this.hsm.keyStorage.requireKey(keyLabel, ['ZPK', 'TPK', 'UNKNOWN']);
        const keyBuf = hexToBuffer(keyInfo.value);
        const encryptedBuf = hexToBuffer(pinBlock);

        if (encryptedBuf.length !== 8) {
            throw new ValidationError('pinBlock must represent exactly 8 encrypted bytes');
        }

        const decrypted = this.pinMgr.decryptPINBlock(encryptedBuf, keyBuf);
        const clearBlockHex = bufferToHex(decrypted.result).toUpperCase();
        const pin = format === 'ISO-0'
            ? this.pinMgr.recoverPINFromFormat0(decrypted.result, pan).result
            : this.recoverFormat1Pin(clearBlockHex);

        return {
            command_code: 'B5',
            pin,
            format,
            keyLabel,
            trace: [
                ...decrypted.steps.map((s) => `${s.name}: ${s.output}`),
                `Recovered PIN with ${format}`,
            ],
        };
    }

    private recoverFormat1Pin(clearBlockHex: string): string {
        if (clearBlockHex.length < 4 || clearBlockHex[0] !== '1') {
            throw new ValidationError('Invalid ISO-1 PIN block');
        }
        const pinLength = Number.parseInt(clearBlockHex[1], 10);
        if (!Number.isInteger(pinLength) || pinLength < 4 || pinLength > 12) {
            throw new ValidationError('Invalid PIN length in ISO-1 block');
        }
        return clearBlockHex.slice(2, 2 + pinLength);
    }
}
