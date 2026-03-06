/** @type {import('jest').Config} */
module.exports = {
    rootDir: __dirname,
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['./'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    verbose: true
};
