module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests/integration'],
    testMatch: ['**/*.test.ts'],
    setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],
};
