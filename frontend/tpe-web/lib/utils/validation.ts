/**
 * Validation Luhn pour numéros de carte bancaire
 */
export function validateLuhn(cardNumber: string): boolean {
    const digits = cardNumber.replace(/\D/g, '');

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
}

/**
 * Validation date d'expiration (MM/YY)
 */
export function validateExpiryDate(expiry: string): boolean {
    const match = expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!match) return false;

    const [, month, year] = match;
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt('20' + year, 10);

    if (monthNum < 1 || monthNum > 12) return false;

    const now = new Date();
    const expiryDate = new Date(yearNum, monthNum - 1);

    return expiryDate > now;
}

/**
 * Validation CVV
 */
export function validateCVV(cvv: string): boolean {
    return /^\d{3,4}$/.test(cvv);
}

/**
 * Détection du réseau carte
 */
export function detectCardNetwork(pan: string): string {
    const digits = pan.replace(/\D/g, '');

    if (/^4/.test(digits)) return 'VISA';
    if (/^5[1-5]/.test(digits)) return 'MASTERCARD';
    if (/^3[47]/.test(digits)) return 'AMEX';
    if (/^6(?:011|5)/.test(digits)) return 'DISCOVER';

    return 'UNKNOWN';
}

/**
 * Validation montant transaction
 */
export function validateAmount(amount: number): { valid: boolean; error?: string } {
    if (amount <= 0) {
        return { valid: false, error: 'Le montant doit être supérieur à 0' };
    }

    if (amount > 9999.99) {
        return { valid: false, error: 'Le montant ne peut pas dépasser 9999.99 EUR' };
    }

    return { valid: true };
}


