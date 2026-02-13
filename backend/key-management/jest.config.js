module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 70,
            lines: 70,
            statements: 70
        }
    },
    collectCoverageFrom: [
        'src/services/**/*.ts',
        '!src/**/*.d.ts'
    ],
    verbose: true
};
