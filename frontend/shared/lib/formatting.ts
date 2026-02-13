/**
 * Shared Formatting Utilities
 * Common formatting functions for currency, dates, and card data
 */

// ── Type-safe conversion helpers ──────────────────────────────────────

type UnknownRecord = Record<string, unknown>;

export const toRecord = (value: unknown): UnknownRecord =>
    value !== null && typeof value === 'object' ? (value as UnknownRecord) : {};

export const toNumber = (value: unknown): number => {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

export const toText = (value: unknown, fallback = ''): string =>
    typeof value === 'string' ? value : fallback;

// ── Currency / money formatting ───────────────────────────────────────

export function formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
    }).format(amount);
}

export const formatMoney = (value: number, currency = 'EUR') =>
    `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

// ── Card helpers ──────────────────────────────────────────────────────

export function maskPAN(pan: string): string {
    if (pan.length < 13) return pan;
    return `${pan.substring(0, 4)}${'*'.repeat(pan.length - 8)}${pan.substring(pan.length - 4)}`;
}

export const getCardBrand = (maskedPan: string) => {
    if (maskedPan.startsWith('4')) return 'VISA';
    if (maskedPan.startsWith('5')) return 'MASTERCARD';
    if (maskedPan.startsWith('3')) return 'AMEX';
    return 'CARD';
};

export const getLastFour = (maskedPan: string) => {
    const digits = maskedPan.replace(/\D/g, '');
    return digits.length >= 4 ? digits.slice(-4) : '****';
};

// ── STAN ──────────────────────────────────────────────────────────────

export function generateSTAN(): string {
    return Date.now().toString().slice(-6);
}

// ── Date / time formatting ────────────────────────────────────────────

export function formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'medium',
    }).format(date);
}

export const formatDateTimeString = (value: string | null): string => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('fr-FR');
};

export function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'medium',
    }).format(date);
}

export function formatTime(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
        timeStyle: 'short',
    }).format(date);
}

// ── Status / type mapping ─────────────────────────────────────────────

export const mapStatus = (status: string): 'approved' | 'declined' | 'pending' | 'voided' => {
    const n = status.toUpperCase();
    if (n === 'APPROVED') return 'approved';
    if (n === 'DECLINED') return 'declined';
    if (n === 'CANCELLED' || n === 'REFUNDED' || n === 'REVERSED') return 'voided';
    return 'pending';
};

export const mapType = (type: string): 'sale' | 'refund' | 'void' => {
    const n = type.toUpperCase();
    if (n === 'REFUND') return 'refund';
    if (n === 'VOID') return 'void';
    return 'sale';
};
