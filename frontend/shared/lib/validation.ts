/**
 * Shared Validation Utilities
 * Card and payment data validation functions
 */

/**
 * Validate PAN using Luhn algorithm
 * @param pan - Primary Account Number (card number)
 * @returns true if valid, false otherwise
 */
export function validateLuhn(pan: string): boolean {
    // Remove non-digits
    const digits = pan.replace(/\D/g, '');

    if (digits.length < 13 || digits.length > 19) {
        return false;
    }

    let sum = 0;
    let isEven = false;

    // Loop through digits from right to left
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
}

/**
 * Validate expiry date (MM/YY or MM/YYYY format)
 * @param expiry - Expiration date string
 * @returns true if valid and not expired, false otherwise
 */
export function validateExpiryDate(expiry: string): boolean {
    const parts = expiry.split('/');
    if (parts.length !== 2) return false;

    const month = parseInt(parts[0], 10);
    let year = parseInt(parts[1], 10);

    // Convert YY to YYYY
    if (year < 100) {
        year += 2000;
    }

    // Validate month range
    if (month < 1 || month > 12) return false;

    // Check if expired
    const now = new Date();
    const expiryDate = new Date(year, month - 1);
    const currentDate = new Date(now.getFullYear(), now.getMonth());

    return expiryDate >= currentDate;
}

/**
 * Validate CVV (Card Verification Value)
 * @param cvv - CVV code (3 or 4 digits)
 * @returns true if valid format, false otherwise
 */
export function validateCVV(cvv: string): boolean {
    return /^[0-9]{3,4}$/.test(cvv);
}

/**
 * Validate amount (must be positive and reasonable)
 * @param amount - Transaction amount
 * @param maxAmount - Maximum allowed amount (default 10000)
 * @returns true if valid, false otherwise
 */
export function validateAmount(amount: number, maxAmount = 10000): boolean {
    return amount > 0 && amount <= maxAmount && !isNaN(amount);
}

/**
 * Validate PIN (4-6 digits)
 * @param pin - PIN code
 * @returns true if valid format, false otherwise
 */
export function validatePIN(pin: string): boolean {
    return /^[0-9]{4,6}$/.test(pin);
}

/**
 * Validate email format
 * @param email - Email address
 * @returns true if valid format, false otherwise
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
