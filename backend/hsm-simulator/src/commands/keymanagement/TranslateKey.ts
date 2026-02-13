import crypto from 'node:crypto';
import { ICommand } from '../ICommand';
import { HSMSimulator } from '../../core/HSMSimulator';
import { bufferToHex, decryptTDES, encryptTDES, hexToBuffer } from '@pmp/crypto-edu';
import { ensureHex, normalizeKeyLabel, safeUpper } from '../../utils/input';
import { ValidationError } from '../../core/errors';
import { KeyType } from '../../core/KeyStorage';

const ALLOWED_OUTPUT_TYPES: KeyType[] = [
    'ZPK', 'CVK', 'ZAK', 'ZEK', 'TAK', 'TPK', 'PVK', 'ZMK', 'LMK', 'DEK', 'MAC', 'UNKNOWN',
];

export class TranslateKey implements ICommand {
    constructor(private readonly hsm: HSMSimulator) { }

    async execute(payload: unknown): Promise<unknown> {
        const body = (payload ?? {}) as Record<string, unknown>;

        const sourceKeyLabel = normalizeKeyLabel(body.sourceKeyLabel, 'ZMK_TEST');
        const destinationKeyLabel = normalizeKeyLabel(body.destinationKeyLabel, 'LMK_TEST');

        const sourceKey = this.hsm.keyStorage.requireKey(sourceKeyLabel);
        const destinationKey = this.hsm.keyStorage.requireKey(destinationKeyLabel);

        const sourceWrappingKey = hexToBuffer(sourceKey.value);
        const destinationWrappingKey = hexToBuffer(destinationKey.value);

        this.ensureTdesWrappingKey(sourceWrappingKey, sourceKeyLabel);
        this.ensureTdesWrappingKey(destinationWrappingKey, destinationKeyLabel);

        let clearKey: Buffer;
        if (typeof body.clearKey === 'string' && body.clearKey.trim().length > 0) {
            clearKey = hexToBuffer(ensureHex(body.clearKey, 'clearKey'));
        } else {
            const encryptedKeyHex = ensureHex(body.encryptedKey, 'encryptedKey');
            const encryptedKey = hexToBuffer(encryptedKeyHex);
            if (encryptedKey.length % 8 !== 0) {
                throw new ValidationError('encryptedKey must be aligned to 8-byte blocks');
            }
            clearKey = decryptTDES(encryptedKey, sourceWrappingKey);
        }

        if (![8, 16, 24, 32].includes(clearKey.length)) {
            throw new ValidationError('Translated clear key must be 8, 16, 24, or 32 bytes');
        }

        const translatedKey = this.wrapKey(clearKey, destinationWrappingKey);
        const outputKeyLabel = typeof body.outputKeyLabel === 'string' && body.outputKeyLabel.trim().length > 0
            ? body.outputKeyLabel.trim().toUpperCase()
            : undefined;
        const outputType = safeUpper(body.outputKeyType, 'UNKNOWN') as KeyType;

        if (outputKeyLabel) {
            if (!ALLOWED_OUTPUT_TYPES.includes(outputType)) {
                throw new ValidationError(`outputKeyType must be one of: ${ALLOWED_OUTPUT_TYPES.join(', ')}`);
            }
            this.hsm.keyStorage.saveKey(outputKeyLabel, {
                type: outputType,
                value: bufferToHex(clearKey).toUpperCase(),
                metadata: {
                    importedFrom: `translate-key:${sourceKeyLabel}->${destinationKeyLabel}`,
                },
            });
        }

        return {
            command_code: 'A6',
            sourceKeyLabel,
            destinationKeyLabel,
            translated_key: bufferToHex(translatedKey).toUpperCase(),
            clear_key_length_bytes: clearKey.length,
            outputKeyLabel: outputKeyLabel ?? null,
            kcv: this.calculateKcv(clearKey),
            status: 'OK',
        };
    }

    private ensureTdesWrappingKey(key: Buffer, label: string): void {
        if (key.length !== 16 && key.length !== 24) {
            throw new ValidationError(`Wrapping key '${label}' must be 16 or 24 bytes (3DES)`);
        }
    }

    private wrapKey(clearKey: Buffer, wrappingKey: Buffer): Buffer {
        if (clearKey.length % 8 !== 0) {
            throw new ValidationError('clearKey length must be aligned to 8-byte blocks');
        }
        return encryptTDES(clearKey, wrappingKey);
    }

    private calculateKcv(clearKey: Buffer): string {
        if (clearKey.length === 32) {
            const cipher = crypto.createCipheriv('aes-256-ecb', clearKey, null);
            cipher.setAutoPadding(false);
            const encrypted = Buffer.concat([cipher.update(Buffer.alloc(16, 0)), cipher.final()]);
            return encrypted.subarray(0, 3).toString('hex').toUpperCase();
        }

        const keyForKcv = clearKey.length === 8 ? Buffer.concat([clearKey, clearKey, clearKey]) : clearKey;
        const encrypted = encryptTDES(Buffer.alloc(8, 0), keyForKcv.subarray(0, Math.min(24, keyForKcv.length)));
        return encrypted.subarray(0, 3).toString('hex').toUpperCase();
    }
}
