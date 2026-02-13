import { ValidationError } from '../core/errors';

const HEX_REGEX = /^[0-9A-F]+$/i;

export type DataEncoding = 'hex' | 'utf8';

export function normalizeHex(value: string): string {
    return value.replace(/\s+/g, '').toUpperCase();
}

export function isHex(value: string): boolean {
    return value.length > 0 && value.length % 2 === 0 && HEX_REGEX.test(value);
}

export function ensureHex(value: unknown, fieldName: string): string {
    if (typeof value !== 'string') {
        throw new ValidationError(`${fieldName} must be a string`);
    }

    const normalized = normalizeHex(value);
    if (!isHex(normalized)) {
        throw new ValidationError(`${fieldName} must be a valid even-length hexadecimal string`);
    }

    return normalized;
}

export function ensurePan(value: unknown): string {
    if (typeof value !== 'string') {
        throw new ValidationError('pan must be a string');
    }
    const pan = value.replace(/\D/g, '');
    if (pan.length < 12 || pan.length > 19) {
        throw new ValidationError('pan must contain 12 to 19 digits');
    }
    return pan;
}

export function ensurePin(value: unknown): string {
    if (typeof value !== 'string' || !/^\d{4,12}$/.test(value)) {
        throw new ValidationError('pin must contain 4 to 12 digits');
    }
    return value;
}

export function ensureString(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new ValidationError(`${fieldName} must be a non-empty string`);
    }
    return value;
}

export function normalizeKeyLabel(value: unknown, fallback: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        return fallback;
    }
    return value.trim();
}

export function parseDataInput(
    value: unknown,
    inputEncoding: unknown = 'auto'
): { buffer: Buffer; encoding: DataEncoding } {
    const text = ensureString(value, 'data');
    const requested = typeof inputEncoding === 'string' ? inputEncoding.toLowerCase() : 'auto';

    if (requested !== 'auto' && requested !== 'hex' && requested !== 'utf8') {
        throw new ValidationError('inputEncoding must be one of auto, hex, utf8');
    }

    const normalized = normalizeHex(text);
    if (requested === 'hex' || (requested === 'auto' && isHex(normalized))) {
        return { buffer: Buffer.from(normalized, 'hex'), encoding: 'hex' };
    }

    return { buffer: Buffer.from(text, 'utf8'), encoding: 'utf8' };
}

export function ensureAllowed<T extends string>(value: unknown, allowed: T[], fieldName: string): T {
    if (typeof value !== 'string' || !allowed.includes(value as T)) {
        throw new ValidationError(`${fieldName} must be one of: ${allowed.join(', ')}`);
    }
    return value as T;
}

export function safeUpper(value: unknown, fallback: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        return fallback;
    }
    return value.trim().toUpperCase();
}
