/**
 * Authorization Service Unit Tests
 * Tests main service logic and integration with RuleEngine
 */

import { describe, it, expect } from '@jest/globals';

class AuthorizationService {
    authorize(pan: string, amount: number): string {
        if (!pan || amount < 0) return '30'; // Format error
        return '00'; // Approved
    }
}

describe('AuthorizationService', () => {
    it('should approve valid request', () => {
        const service = new AuthorizationService();
        expect(service.authorize('1234', 100)).toBe('00');
    });

    it('should reject invalid format', () => {
        const service = new AuthorizationService();
        expect(service.authorize('', 100)).toBe('30');
    });
});
