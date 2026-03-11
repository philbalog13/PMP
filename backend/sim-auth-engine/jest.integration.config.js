/** @type {import('jest').Config} */
module.exports = {
    displayName: 'integration',
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/integration/**/*.test.ts'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    coverageDirectory: 'coverage/integration',
    verbose: true,
    testTimeout: 30000,
};
