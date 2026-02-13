import crypto from 'node:crypto';
import { ICommand } from '../ICommand';
import { HSMSimulator } from '../../core/HSMSimulator';
import { bufferToHex, encryptTDES, hexToBuffer } from '@pmp/crypto-edu';
import { normalizeKeyLabel, parseDataInput, safeUpper } from '../../utils/input';
import { ValidationError } from '../../core/errors';

type BlockMode = 'ECB' | 'CBC';

export class EncryptData implements ICommand {
    private readonly hsm: HSMSimulator;

    constructor(hsm: HSMSimulator) {
        this.hsm = hsm;
    }

    async execute(payload: unknown): Promise<unknown> {
        const body = (payload ?? {}) as Record<string, unknown>;
        const keyLabel = normalizeKeyLabel(body.keyLabel, 'ZEK_001');
        const keyInfo = this.hsm.keyStorage.requireKey(keyLabel, ['ZEK', 'DEK', 'UNKNOWN']);
        const keyBuf = hexToBuffer(keyInfo.value);
        const dataInput = parseDataInput(body.data, body.inputEncoding);
        const mode = safeUpper(body.mode, keyBuf.length === 32 ? 'CBC' : 'ECB') as BlockMode;

        if (mode !== 'ECB' && mode !== 'CBC') {
            throw new ValidationError('mode must be ECB or CBC');
        }

        let encrypted: Buffer;
        let algorithm: string;

        if (keyBuf.length === 32) {
            ({ encrypted, algorithm } = this.encryptAes(dataInput.buffer, keyBuf, mode));
        } else if (keyBuf.length === 16 || keyBuf.length === 24) {
            ({ encrypted, algorithm } = this.encryptTdes(dataInput.buffer, keyBuf));
        } else {
            throw new ValidationError(
                `Unsupported key length ${keyBuf.length} bytes for encrypt-data. Use 16/24 (3DES) or 32 (AES-256)`
            );
        }

        return {
            command_code: 'E1',
            encryptedData: bufferToHex(encrypted).toUpperCase(),
            keyLabel,
            algorithm,
            mode,
            inputEncoding: dataInput.encoding,
            inputLength: dataInput.buffer.length,
        };
    }

    private encryptTdes(data: Buffer, key: Buffer): { encrypted: Buffer; algorithm: string } {
        const padded = this.padIso9797Method2(data, 8);
        const encrypted = encryptTDES(padded, key);
        return { encrypted, algorithm: '3DES-ECB-ISO9797M2' };
    }

    private encryptAes(data: Buffer, key: Buffer, mode: BlockMode): { encrypted: Buffer; algorithm: string } {
        if (mode === 'ECB') {
            const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
            const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
            return { encrypted, algorithm: 'AES-256-ECB-PKCS7' };
        }

        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
        return { encrypted: Buffer.concat([iv, encrypted]), algorithm: 'AES-256-CBC-PKCS7' };
    }

    private padIso9797Method2(data: Buffer, blockSize: number): Buffer {
        const withPrefix = Buffer.concat([data, Buffer.from([0x80])]);
        const remainder = withPrefix.length % blockSize;
        if (remainder === 0) return withPrefix;
        return Buffer.concat([withPrefix, Buffer.alloc(blockSize - remainder, 0)]);
    }
}
