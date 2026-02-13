/**
 * Luhn Algorithm Service
 * Validates and generates credit card numbers using the Luhn checksum
 */

/**
 * Validate a PAN using Luhn algorithm
 */
export const validateLuhn = (pan: string): boolean => {
    const digits = pan.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) {
        return false;
    }

    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
        let digit = parseInt(digits[i], 10);

        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }

        sum += digit;
        isEven = !isEven;
    }

    return sum % 10 === 0;
};

/**
 * Generate Luhn check digit for a partial PAN
 */
export const generateCheckDigit = (partialPan: string): number => {
    const digits = partialPan.replace(/\D/g, '');
    let sum = 0;
    let isEven = true; // Start with true because we're adding a digit

    for (let i = digits.length - 1; i >= 0; i--) {
        let digit = parseInt(digits[i], 10);

        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }

        sum += digit;
        isEven = !isEven;
    }

    return (10 - (sum % 10)) % 10;
};

/**
 * Generate a valid PAN with Luhn checksum
 */
export const generatePan = (bin: string, length: number = 16): string => {
    const normalized = bin.trim().toUpperCase();
    const binOrPrefix = /^\d+$/.test(normalized)
        ? normalized
        : ({
            VISA: '4',
            MASTERCARD: '5',
            AMEX: '34',
            DISCOVER: '6011'
        }[normalized] || normalized);

    const randomLength = length - binOrPrefix.length - 1; // -1 for check digit
    let pan = binOrPrefix;

    for (let i = 0; i < randomLength; i++) {
        pan += Math.floor(Math.random() * 10).toString();
    }

    pan += generateCheckDigit(pan);
    return pan;
};

/**
 * Get card network from BIN
 */
export const getCardNetwork = (pan: string): string => {
    const first = pan.substring(0, 1);
    const firstTwo = pan.substring(0, 2);
    const firstFour = pan.substring(0, 4);

    if (first === '4') return 'VISA';
    if (['51', '52', '53', '54', '55'].includes(firstTwo)) return 'MASTERCARD';
    if (['34', '37'].includes(firstTwo)) return 'AMEX';
    if (firstFour === '6011' || firstTwo === '65') return 'DISCOVER';

    return 'UNKNOWN';
};

/**
 * Mask PAN for display (show first 4 and last 4)
 */
export const maskPan = (pan: string): string => {
    if (pan.length < 12) return pan;
    const first4 = pan.substring(0, 4);
    const last4 = pan.substring(pan.length - 4);
    const masked = '*'.repeat(pan.length - 8);
    return `${first4}${masked}${last4}`;
};
