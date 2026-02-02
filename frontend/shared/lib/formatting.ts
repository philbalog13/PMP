/**
 * Shared Formatting Utilities
 * Common formatting functions for currency, dates, and card data
 */

/**
 * Format amount to EUR currency with French locale
 */
export function formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
    }).format(amount);
}

/**
 * Mask PAN (Primary Account Number) for security
 * Shows first 4 and last 4 digits, masks middle with asterisks
 * Example: 4111111111111111 → 4111********1111
 */
export function maskPAN(pan: string): string {
    if (pan.length < 13) return pan;
    return `${pan.substring(0, 4)}${'*'.repeat(pan.length - 8)}${pan.substring(pan.length - 4)}`;
}

/**
 * Generate STAN (System Trace Audit Number)
 * 6-digit unique number from timestamp
 */
export function generateSTAN(): string {
    return Date.now().toString().slice(-6);
}

/**
 * Format date and time with French locale
 */
export function formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'medium',
    }).format(date);
}

/**
 * Format date only (no time)
 */
export function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'medium',
    }).format(date);
}

/**
 * Format time only (no date)
 */
export function formatTime(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
        timeStyle: 'short',
    }).format(date);
}
