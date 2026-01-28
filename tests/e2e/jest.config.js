module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/*.test.ts'],
    setupFilesAfterEnv: ['<rootDir>/src/setup.ts'],
    testTimeout: 30000,
    verbose: true,
    collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
    moduleFileExtensions: ['ts', 'js', 'json'],
};
