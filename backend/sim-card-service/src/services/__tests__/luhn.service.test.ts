import { validateLuhn, generatePan, getCardNetwork } from '../luhn.service';

describe('Luhn Service', () => {

    describe('validateLuhn', () => {
        it('should validate correct VISA PAN', () => {
            expect(validateLuhn('4111111111111111')).toBe(true);
        });

        it('should validate correct Mastercard PAN', () => {
            expect(validateLuhn('5500000000000004')).toBe(true);
        });

        it('should reject invalid PAN', () => {
            expect(validateLuhn('4111111111111112')).toBe(false);
        });

        it('should reject empty string', () => {
            expect(validateLuhn('')).toBe(false);
        });

        it('should reject non-numeric string', () => {
            expect(validateLuhn('411111111111111A')).toBe(false);
        });

        it('should reject too short PAN', () => {
            expect(validateLuhn('411111')).toBe(false);
        });
    });

    describe('generatePan', () => {
        it('should generate valid VISA PAN starting with 4', () => {
            const pan = generatePan('VISA');
            expect(pan.startsWith('4')).toBe(true);
            expect(pan.length).toBe(16);
            expect(validateLuhn(pan)).toBe(true);
        });

        it('should generate valid Mastercard PAN starting with 5', () => {
            const pan = generatePan('MASTERCARD');
            expect(pan.startsWith('5')).toBe(true);
            expect(pan.length).toBe(16);
            expect(validateLuhn(pan)).toBe(true);
        });

        it('should generate unique PANs', () => {
            const pan1 = generatePan('VISA');
            const pan2 = generatePan('VISA');
            expect(pan1).not.toBe(pan2);
        });
    });

    describe('getCardNetwork', () => {
        it('should identify VISA (starts with 4)', () => {
            expect(getCardNetwork('4111111111111111')).toBe('VISA');
        });

        it('should identify Mastercard (starts with 5)', () => {
            expect(getCardNetwork('5500000000000004')).toBe('MASTERCARD');
        });

        it('should identify AMEX (starts with 34)', () => {
            expect(getCardNetwork('340000000000009')).toBe('AMEX');
        });

        it('should identify AMEX (starts with 37)', () => {
            expect(getCardNetwork('370000000000002')).toBe('AMEX');
        });

        it('should return UNKNOWN for other prefixes', () => {
            expect(getCardNetwork('9000000000000005')).toBe('UNKNOWN');
        });
    });
});
