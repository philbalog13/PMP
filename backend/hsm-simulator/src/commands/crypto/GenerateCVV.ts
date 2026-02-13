import { ICommand } from '../ICommand';
import { HSMSimulator } from '../../core/HSMSimulator';
import { CVVGenerator, hexToBuffer } from '@pmp/crypto-edu';
import { ensurePan, ensureString, normalizeKeyLabel } from '../../utils/input';
import { ValidationError } from '../../core/errors';

export class GenerateCVV implements ICommand {
    private readonly cvvMgr = new CVVGenerator();

    constructor(private readonly hsm: HSMSimulator) { }

    async execute(payload: unknown): Promise<unknown> {
        const body = (payload ?? {}) as Record<string, unknown>;
        const pan = ensurePan(body.pan);
        const expiry = ensureString(body.expiry, 'expiry');
        const serviceCode = ensureString(body.serviceCode ?? '101', 'serviceCode');
        const keyLabel = normalizeKeyLabel(body.keyLabel, 'CVK_TEST');

        if (!/^\d{4}$/.test(expiry)) {
            throw new ValidationError('expiry must use YYMM format (4 digits)');
        }
        if (!/^\d{3}$/.test(serviceCode)) {
            throw new ValidationError('serviceCode must contain exactly 3 digits');
        }

        const keyInfo = this.hsm.keyStorage.requireKey(keyLabel, ['CVK', 'UNKNOWN']);
        const key = hexToBuffer(keyInfo.value);
        if (key.length < 16) {
            throw new ValidationError('CVK must be at least 16 bytes');
        }

        const keyA = key.subarray(0, 8);
        const keyB = key.subarray(8, 16);

        const cardData = {
            pan,
            expiryDate: expiry,
            serviceCode,
        };

        const result = this.cvvMgr.staticCVV(cardData, keyA, keyB);

        return {
            command_code: 'D4',
            cvv: result.result,
            keyLabel,
            trace: result.steps.map((s) => `${s.name}: ${s.output}`),
        };
    }
}
