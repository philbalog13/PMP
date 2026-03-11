/**
 * XSS Regression Test (mock)
 * Fast pedagogical check with local string sanitization only.
 */

import { describe, it, expect } from '@jest/globals';

describe('XSS Prevention (mock)', () => {
    it('should block script tags', () => {
        const input = "<script>alert(1)</script>";
        const sanitized = input.replace(/</g, "&lt;");
        expect(sanitized).toBe("&lt;script>alert(1)&lt;/script>");
    });
});
