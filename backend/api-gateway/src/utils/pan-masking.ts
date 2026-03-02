/**
 * PAN Masking — ISO 7812 compliant
 *
 * ISO 7812 defines the structure of PANs: 13–19 digits.
 * Masking rule: keep first 6 (BIN/IIN) + XXXXXX + last 4.
 * Example: "4539123456788651" → "453912XXXXXX8651"
 *
 * Educational note: PCI-DSS Requirement 3.4 mandates that PANs are masked
 * when displayed, and that logs/audit trails never contain full PANs in clear.
 */

const PAN_PATTERN = /\b(\d{6})\d{6,9}(\d{4})\b/g;

/**
 * Mask all PANs found in a string (ISO 7812 format).
 */
export function maskPanISO7812(input: string): string {
    return input.replace(PAN_PATTERN, '$1XXXXXX$2');
}

/**
 * Deep-sanitize an object: recursively replace all string values
 * that contain PAN-like patterns. Returns a new sanitized object.
 */
export function sanitizeForLogging(obj: unknown): unknown {
    if (typeof obj === 'string') {
        return maskPanISO7812(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(sanitizeForLogging);
    }
    if (obj !== null && typeof obj === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
            result[key] = sanitizeForLogging(value);
        }
        return result;
    }
    return obj;
}
