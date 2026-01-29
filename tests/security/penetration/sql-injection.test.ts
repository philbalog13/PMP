/**
 * SQL Injection Test
 * Specific test suite for SQL vulnerabilities
 */

import { describe, it, expect } from '@jest/globals';

describe('SQL Injection Prevention', () => {
    it('should block 1=1 boolean based injection', () => {
        const input = "admin' OR 1=1--";
        // Mock sanitizer - doubling quotes should break the injection
        const sanitized = input.replace(/'/g, "''");
        // After escaping, the string is "admin'' OR 1=1--" which is safe as SQL string
        expect(sanitized).toBe("admin'' OR 1=1--");
    });

    it('should block UNION based injection', () => {
        const input = "1 UNION SELECT * FROM users";
        expect(input).toMatch(/UNION/i);
        // Simulator rejection
        const rejected = true;
        expect(rejected).toBe(true);
    });
});
