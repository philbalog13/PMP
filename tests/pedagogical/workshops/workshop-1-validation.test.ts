/**
 * Workshop 1 Validation Test
 * Pedagogical validation for "Understanding Authentication"
 */

import { describe, it, expect } from '@jest/globals';

class WorkshopValidator {
    validatePinBlock(input: string): boolean {
        // Workshop goal: Match format "0LPPPPFFFFFFFF"
        return /^0[4-9]\d{4}[F]{10}$/.test(input) || /^0[4-9]\d{4}.*$/.test(input); // Simplified
    }

    validateCvv(pan: string, exp: string, cvv: string): boolean {
        // Simple algo for workshop
        const sum = parseInt(pan.slice(-1)) + parseInt(exp.slice(0, 1));
        return parseInt(cvv) === (sum * 111) % 1000;
    }
}

describe('Workshop 1: Authentication Basics', () => {
    const validator = new WorkshopValidator();

    it('Task 1: Should validate correctly formatted PIN Block', () => {
        const validBlock = '041234FFFFFFFFFF'; // ISO-0 simplified
        expect(validator.validatePinBlock(validBlock)).toBe(true);
    });

    it('Task 2: Should calculate correct CVV dynamic', () => {
        // PAN ends 5, Exp starts 1 => sum=6. 6*111 = 666
        expect(validator.validateCvv('...5', '1225', '666')).toBe(true);
    });

    it('Failure Case: Invalid PIN Block format', () => {
        expect(validator.validatePinBlock('INVALID')).toBe(false);
    });
});
