const baseConfig = require('./jest.base.config');

/** @type {import('jest').Config} */
module.exports = {
    ...baseConfig,
    displayName: 'security-offline',
    testMatch: [
        '<rootDir>/penetration.test.ts',
        '<rootDir>/penetration/xss.test.ts',
        '<rootDir>/penetration/mitm-attack.test.ts',
        '<rootDir>/compliance/**/*.test.ts',
        '<rootDir>/service/**/*.test.ts'
    ]
};
