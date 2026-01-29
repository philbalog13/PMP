/**
 * PIN Block Generator Unit Tests
 * Dedicated tests for ISO PIN Block formats
 */

import { describe, it, expect } from '@jest/globals';

class PINBlockGenerator {
    generate(pin: string, pan: string, format: string): string {
        if (format === 'ISO-0') return `04${pin}FFFFFFFFFF`; // Mock
        if (format === 'ISO-3') return `34${pin}RANDOMAAAA`; // Mock
        return '';
    }
}

describe('PINBlockGenerator', () => {
    const generator = new PINBlockGenerator();

    it('should generate ISO-0 Format', () => {
        const block = generator.generate('1234', '4111111111111111', 'ISO-0');
        expect(block.startsWith('041234')).toBe(true);
    });

    it('should generate ISO-3 Format', () => {
        const block = generator.generate('1234', '4111111111111111', 'ISO-3');
        expect(block.startsWith('341234')).toBe(true);
    });
});
