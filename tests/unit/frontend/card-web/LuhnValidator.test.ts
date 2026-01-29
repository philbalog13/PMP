/**
 * Payment Card Luhn Validator Tests
 * Tests the checksum algorithm specifically for the frontend
 */

import { describe, it, expect } from '@jest/globals';

function luhnCheck(pan: string): boolean {
    if (!/^\d+$/.test(pan)) return false;
    let sum = 0;
    let even = false;
    for (let i = pan.length - 1; i >= 0; i--) {
        let n = parseInt(pan.charAt(i), 10);
        if (even) {
            n *= 2;
            if (n > 9) n -= 9;
        }
        sum += n;
        even = !even;
    }
    return (sum % 10) === 0;
}

describe('LuhnValidator', () => {
    it('should validate valid VISA', () => {
        expect(luhnCheck('4242424242424242')).toBe(true);
    });

    it('should invalidate invalid checksum', () => {
        expect(luhnCheck('4242424242424241')).toBe(false);
    });

    it('should invalidate non-numeric', () => {
        expect(luhnCheck('4242A24242424242')).toBe(false);
    });
});
