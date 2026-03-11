const baseConfig = require('./jest.base.config');

/** @type {import('jest').Config} */
module.exports = {
    ...baseConfig,
    displayName: 'security-service',
    testMatch: ['<rootDir>/service/**/*.test.ts']
};
