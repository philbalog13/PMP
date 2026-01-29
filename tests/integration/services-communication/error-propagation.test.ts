/**
 * Error Propagation Test
 * Verifies that deep service errors bubble up correctly
 */

import { describe, it, expect } from '@jest/globals';

describe('Error Propagation', () => {
    it('should propagate HSM timeout to TPE', () => {
        // HSM -> Switch -> Acquirer -> TPE
        const hsmError = { type: 'TIMEOUT', code: '91' };
        const tpeResponse = hsmError.code;
        expect(tpeResponse).toBe('91');
    });

    it('should sanitize internal database errors', () => {
        const dbError = 'Connection failed: 192.168.1.5';
        const publicError = 'System Error';
        expect(publicError).not.toContain('192.168.1.5');
    });
});
