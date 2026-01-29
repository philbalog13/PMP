/**
 * Virtual Card Generator Unit Tests
 * Tests card number generation
 */

import { describe, it, expect } from '@jest/globals';

class CardGenerator {
    generatePan(bin: string): string {
        return `${bin}${Math.random().toString().slice(2, 12)}`; // Simplified
    }
}

describe('CardGenerator', () => {
    it('should generate PAN starting with BIN', () => {
        const generator = new CardGenerator();
        const pan = generator.generatePan('411111');
        expect(pan.startsWith('411111')).toBe(true);
    });

    it('should generate 16 digit PANs', () => {
        const generator = new CardGenerator();
        const pan = generator.generatePan('411111');
        expect(pan.length).toBe(16);
    });
});
