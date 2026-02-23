/** @type {import('jest').Config} */
const tsJestTransformer = require.resolve('ts-jest');

module.exports = {
  testEnvironment: 'node',
  roots: ['./'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': tsJestTransformer
  },
  verbose: true,
  testTimeout: 30000
};
