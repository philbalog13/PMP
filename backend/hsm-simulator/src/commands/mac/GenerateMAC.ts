import crypto from 'node:crypto';
import { ICommand } from '../ICommand';
import { HSMSimulator } from '../../core/HSMSimulator';
import { normalizeKeyLabel, parseDataInput, safeUpper } from '../../utils/input';
import { ValidationError } from '../../core/errors';

type MacMethod = 'ALG1' | 'ALG3';

export class GenerateMAC implements ICommand {
    private readonly hsm: HSMSimulator;

    constructor(hsm: HSMSimulator) {
        this.hsm = hsm;
    }

    async execute(payload: unknown): Promise<unknown> {
        const body = (payload ?? {}) as Record<string, unknown>;
        const keyLabel = normalizeKeyLabel(body.keyLabel, 'ZAK_002');
        const method = safeUpper(body.method, 'ALG3') as MacMethod;

        if (method !== 'ALG1' && method !== 'ALG3') {
            throw new ValidationError('method must be ALG1 or ALG3');
        }

        const keyInfo = this.hsm.keyStorage.requireKey(keyLabel, ['ZPK', 'TAK', 'ZAK', 'MAC', 'UNKNOWN']);
        const rawKey = Buffer.from(keyInfo.value, 'hex');
        const dataInput = parseDataInput(body.data, body.inputEncoding);
        const padded = this.zeroPad(dataInput.buffer, 8);

        const macKey = method === 'ALG1'
            ? this.expandSingleLengthKey(rawKey)
            : this.toTripleDesKey(rawKey);

        const cipher = crypto.createCipheriv('des-ede3-cbc', macKey, Buffer.alloc(8, 0));
        cipher.setAutoPadding(false);
        const encrypted = Buffer.concat([cipher.update(padded), cipher.final()]);
        const mac = encrypted.subarray(encrypted.length - 8).toString('hex').toUpperCase();

        return {
            command_code: 'C0',
            mac,
            keyLabel,
            method,
            inputEncoding: dataInput.encoding,
            trace: [
                `Input parsed as ${dataInput.encoding} (${dataInput.buffer.length} bytes)`,
                `Padded input to ${padded.length} bytes`,
                `Computed MAC using des-ede3-cbc (${method})`,
            ],
        };
    }

    private zeroPad(data: Buffer, blockSize: number): Buffer {
        if (data.length % blockSize === 0) {
            return data;
        }
        return Buffer.concat([data, Buffer.alloc(blockSize - (data.length % blockSize), 0)]);
    }

    private expandSingleLengthKey(key: Buffer): Buffer {
        if (key.length < 8) {
            throw new ValidationError('ALG1 requires at least 8 key bytes');
        }
        const key8 = key.subarray(0, 8);
        return Buffer.concat([key8, key8, key8]);
    }

    private toTripleDesKey(key: Buffer): Buffer {
        if (key.length < 16) {
            throw new ValidationError('ALG3 requires at least 16 key bytes');
        }
        if (key.length === 16) {
            return Buffer.concat([key, key.subarray(0, 8)]);
        }
        if (key.length >= 24) {
            return key.subarray(0, 24);
        }
        throw new ValidationError('Unsupported key length for ALG3');
    }
}
