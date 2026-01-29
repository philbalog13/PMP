/**
 * HSM Simulator Unit Tests
 * Tests commands: Generate KEY, Translate PIN, Verify MAC
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

class HSMSimulator {
    generateKey(): string {
        return 'K_' + Math.random().toString(36).substring(7).toUpperCase();
    }

    translatePinBlock(pinBlock: string, keyIn: string, keyOut: string): string {
        // Simplified simulation: XOR logical
        return `TRANS_${pinBlock.substring(0, 4)}`;
    }

    verifyMac(data: string, mac: string): boolean {
        return mac.length === 16;
    }
}

describe('HSMSimulator', () => {
    let hsm: HSMSimulator;

    beforeEach(() => { hsm = new HSMSimulator(); });

    it('should generate unique keys', () => {
        const k1 = hsm.generateKey();
        const k2 = hsm.generateKey();
        expect(k1).not.toBe(k2);
        expect(k1).toMatch(/^K_[0-9A-Z]+$/);
    });

    it('should translate PIN block', () => {
        const out = hsm.translatePinBlock('1234PINBLOCK', 'K_ZPK1', 'K_ZPK2');
        expect(out).toContain('TRANS_1234');
    });

    it('should verify MAC format', () => {
        expect(hsm.verifyMac('data', '0000000000000000')).toBe(true);
        expect(hsm.verifyMac('data', 'SHORT')).toBe(false);
    });
});
