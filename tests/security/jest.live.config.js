const baseConfig = require('./jest.base.config');

/** @type {import('jest').Config} */
module.exports = {
    ...baseConfig,
    displayName: 'security-live',
    testMatch: ['<rootDir>/penetration/sql-injection.test.ts']
};
