/**
 * Routing Service Unit Tests
 * Tests BIN-based routing logic
 */

import { describe, it, expect } from '@jest/globals';

class RoutingService {
    getDestination(bin: string): string {
        if (bin.startsWith('4')) return 'VISA_NETWORK';
        if (bin.startsWith('5')) return 'MASTERCARD_NETWORK';
        return 'UNKNOWN';
    }
}

describe('RoutingService', () => {
    const router = new RoutingService();

    it('should route Visa cards starting with 4', () => {
        expect(router.getDestination('411111')).toBe('VISA_NETWORK');
    });

    it('should route Mastercard cards starting with 5', () => {
        expect(router.getDestination('550000')).toBe('MASTERCARD_NETWORK');
    });

    it('should return UNKNOWN for others', () => {
        expect(router.getDestination('340000')).toBe('UNKNOWN');
    });
});
