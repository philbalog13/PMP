import crypto from 'node:crypto';
import { ICommand } from '../ICommand';
import { HSMSimulator } from '../../core/HSMSimulator';
import { encryptTDES, hexToBuffer, bufferToHex } from '@pmp/crypto-edu';
import { normalizeKeyLabel } from '../../utils/input';
import { ValidationError } from '../../core/errors';

export class CalculateKCV implements ICommand {
    private readonly hsm: HSMSimulator;

    constructor(hsm: HSMSimulator) {
        this.hsm = hsm;
    }

    async execute(payload: unknown): Promise<unknown> {
        const body = (payload ?? {}) as Record<string, unknown>;
        const keyLabel = normalizeKeyLabel(body.keyLabel, 'ZPK_TEST');
        const keyInfo = this.hsm.keyStorage.requireKey(keyLabel);
        const key = hexToBuffer(keyInfo.value);

        const { encrypted, algorithm } = this.calculateCheckValue(key);
        const encryptedHex = bufferToHex(encrypted).toUpperCase();

        return {
            command_code: 'K1',
            keyLabel,
            algorithm,
            kcv: encryptedHex.substring(0, 6),
            full_check_value: encryptedHex,
        };
    }

    private calculateCheckValue(key: Buffer): { encrypted: Buffer; algorithm: string } {
        if (key.length === 8) {
            const expanded = Buffer.concat([key, key, key]);
            return { encrypted: encryptTDES(Buffer.alloc(8, 0), expanded), algorithm: '3DES-ECB(single-expanded)' };
        }

        if (key.length === 16 || key.length === 24) {
            return { encrypted: encryptTDES(Buffer.alloc(8, 0), key), algorithm: '3DES-ECB' };
        }

        if (key.length === 32) {
            const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
            cipher.setAutoPadding(false);
            const encrypted = Buffer.concat([cipher.update(Buffer.alloc(16, 0)), cipher.final()]);
            return { encrypted, algorithm: 'AES-256-ECB' };
        }

        throw new ValidationError(
            `Unsupported key length ${key.length} bytes for KCV calculation. Use 8/16/24/32 bytes.`
        );
    }
}
