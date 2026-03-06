/**
 * PAN masking service test (service)
 * Exercises the real monitoring-service masking utility in isolation.
 */

import { describe, expect, it } from '@jest/globals';
import {
    maskPanISO7812,
    sanitizeForLogging
} from '../../../backend/monitoring-service/src/utils/pan-masking';

describe('PAN Masking Utility (service)', () => {
    it('masks ISO 7812 PANs while preserving BIN and last four', () => {
        const message = 'Authorisation for card 4539123456788651 approved';

        expect(maskPanISO7812(message)).toBe('Authorisation for card 453912XXXXXX8651 approved');
    });

    it('does not alter strings without PAN-like data', () => {
        expect(maskPanISO7812('No sensitive card data here')).toBe('No sensitive card data here');
    });

    it('deep-sanitizes nested payloads without mutating the original object', () => {
        const original = {
            message: 'PAN 4539123456788651 seen by monitoring',
            nested: {
                track2: '4539123456788651=25122010000012345678'
            },
            list: ['safe', '4111111111111111']
        };

        const sanitized = sanitizeForLogging(original) as typeof original;

        expect(sanitized).toEqual({
            message: 'PAN 453912XXXXXX8651 seen by monitoring',
            nested: {
                track2: '453912XXXXXX8651=25122010000012345678'
            },
            list: ['safe', '411111XXXXXX1111']
        });
        expect(original.nested.track2).toBe('4539123456788651=25122010000012345678');
        expect(original.list[1]).toBe('4111111111111111');
    });
});
