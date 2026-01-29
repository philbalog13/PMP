/**
 * Student Progression Test
 * Tracks completion of workshops
 */

import { describe, it, expect } from '@jest/globals';

describe('Student Progression', () => {
    it('should calculate progress percentage', () => {
        const workshops = [{ completed: true }, { completed: true }, { completed: false }];
        const progress = (workshops.filter(w => w.completed).length / workshops.length) * 100;
        expect(progress).toBeCloseTo(66.66);
    });
});
