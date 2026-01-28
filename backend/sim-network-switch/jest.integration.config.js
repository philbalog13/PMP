/**
 * Jest Configuration for Integration Tests
 */
module.exports = {
    displayName: 'integration',
    testEnvironment: 'node',
    testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    coverageDirectory: 'coverage/integration',
    verbose: true,
    testTimeout: 30000,
};
