import { validateLuhn, validateExpiryDate, validateCVV, validateAmount, detectCardNetwork } from '@/lib/utils/validation';

describe('Validation Utils', () => {
    describe('validateLuhn', () => {
        it('should validate correct card numbers', () => {
            expect(validateLuhn('4111111111111111')).toBe(true); // Visa
            expect(validateLuhn('5500000000000004')).toBe(true); // Mastercard
            expect(validateLuhn('340000000000009')).toBe(true); // Amex
        });

        it('should reject invalid card numbers', () => {
            expect(validateLuhn('4111111111111112')).toBe(false);
            expect(validateLuhn('1234567890123456')).toBe(false);
            expect(validateLuhn('0000000000000000')).toBe(false);
        });

        it('should handle cards with spaces', () => {
            expect(validateLuhn('4111 1111 1111 1111')).toBe(true);
        });

        it('should reject too short or too long numbers', () => {
            expect(validateLuhn('411111111111')).toBe(false);
            expect(validateLuhn('41111111111111111111')).toBe(false);
        });
    });

    describe('validateExpiryDate', () => {
        it('should validate valid future dates', () => {
            expect(validateExpiryDate('12/30')).toBe(true);
            expect(validateExpiryDate('01/27')).toBe(true);
        });

        it('should reject expired dates', () => {
            expect(validateExpiryDate('01/20')).toBe(false);
            expect(validateExpiryDate('12/19')).toBe(false);
        });

        it('should reject invalid formats', () => {
            expect(validateExpiryDate('13/25')).toBe(false); // Invalid month
            expect(validateExpiryDate('00/25')).toBe(false); // Invalid month
            expect(validateExpiryDate('1225')).toBe(false); // Wrong format
        });
    });

    describe('validateCVV', () => {
        it('should accept 3-digit CVV', () => {
            expect(validateCVV('123')).toBe(true);
            expect(validateCVV('000')).toBe(true);
        });

        it('should accept 4-digit CVV (Amex)', () => {
            expect(validateCVV('1234')).toBe(true);
        });

        it('should reject invalid CVV', () => {
            expect(validateCVV('12')).toBe(false);
            expect(validateCVV('12345')).toBe(false);
            expect(validateCVV('abc')).toBe(false);
        });
    });

    describe('validateAmount', () => {
        it('should validate correct amounts', () => {
            expect(validateAmount(10.50)).toEqual({ valid: true });
            expect(validateAmount(0.01)).toEqual({ valid: true });
            expect(validateAmount(9999.99)).toEqual({ valid: true });
        });

        it('should reject zero or negative', () => {
            expect(validateAmount(0)).toEqual({
                valid: false,
                error: 'Le montant doit être supérieur à 0'
            });
            expect(validateAmount(-10)).toEqual({
                valid: false,
                error: 'Le montant doit être supérieur à 0'
            });
        });

        it('should reject amounts over limit', () => {
            expect(validateAmount(10000)).toEqual({
                valid: false,
                error: 'Le montant ne peut pas dépasser 9999.99 EUR'
            });
        });
    });

    describe('detectCardNetwork', () => {
        it('should detect VISA', () => {
            expect(detectCardNetwork('4111111111111111')).toBe('VISA');
        });

        it('should detect MASTERCARD', () => {
            expect(detectCardNetwork('5500000000000004')).toBe('MASTERCARD');
        });

        it('should detect AMEX', () => {
            expect(detectCardNetwork('340000000000009')).toBe('AMEX');
            expect(detectCardNetwork('370000000000002')).toBe('AMEX');
        });

        it('should detect DISCOVER', () => {
            expect(detectCardNetwork('6011000000000004')).toBe('DISCOVER');
        });

        it('should return UNKNOWN for unrecognized cards', () => {
            expect(detectCardNetwork('9111111111111111')).toBe('UNKNOWN');
        });
    });
});
