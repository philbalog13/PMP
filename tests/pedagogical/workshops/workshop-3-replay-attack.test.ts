/**
 * Workshop 3 Validation: Replay Attack
 * Validates replay attack simulations
 */

import { describe, it, expect } from '@jest/globals';

describe('Workshop 3: Replay Attacks', () => {
    it('should detect duplicate transaction ID', () => {
        const seenIds = new Set(['TX1']);
        const newId = 'TX1';
        expect(seenIds.has(newId)).toBe(true);
    });

    it('should validate timestamp freshness', () => {
        const txTime = Date.now() - 600000; // 10 mins ago
        const isFresh = (Date.now() - txTime) < 300000; // 5 mins limit
        expect(isFresh).toBe(false);
    });
});
