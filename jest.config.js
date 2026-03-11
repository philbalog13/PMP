const path = require('path');

const tsJestTransformer = require.resolve('./tests/integration/node_modules/ts-jest');
const jestTsconfig = path.resolve(__dirname, 'tsconfig.jest.json');
const axiosModule = require.resolve('./backend/sim-issuer-service/node_modules/axios');
const jestGlobalsModule = require.resolve('./tests/integration/node_modules/@jest/globals');

module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/tests/unit'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    modulePaths: [path.resolve(__dirname, 'tests/integration/node_modules')],
    transform: {
        '^.+\\.tsx?$': [tsJestTransformer, { tsconfig: jestTsconfig }],
    },
    moduleNameMapper: {
        '^axios$': axiosModule,
        '^@jest/globals$': jestGlobalsModule,
        '^@/(.*)$': '<rootDir>/frontend/tpe-web/$1',
    },
    verbose: true,
};
