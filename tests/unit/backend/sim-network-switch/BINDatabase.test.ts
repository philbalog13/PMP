/**
 * BIN Database Unit Tests
 * Tests retrieval of BIN information
 */

import { describe, it, expect } from '@jest/globals';

class BINDatabase {
    private bins = new Map<string, string>([
        ['411111', 'VISA CLASSIC'],
        ['422222', 'VISA GOLD'],
        ['550000', 'MASTERCARD STANDARD']
    ]);

    getBinInfo(bin: string): string | undefined {
        return this.bins.get(bin);
    }
}

describe('BINDatabase', () => {
    const db = new BINDatabase();

    it('should retrieve existing BIN info', () => {
        expect(db.getBinInfo('411111')).toBe('VISA CLASSIC');
    });

    it('should return undefined for unknown BIN', () => {
        expect(db.getBinInfo('000000')).toBeUndefined();
    });
});
