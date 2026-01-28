/**
 * Test Setup
 * Runs before all tests
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '8004';
process.env.HOST = '0.0.0.0';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.ISSUER_SERVICE_URL = 'http://localhost:8005';

// Increase timeout for integration tests
jest.setTimeout(10000);

// Global beforeAll
beforeAll(() => {
    // Suppress console during tests
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'info').mockImplementation(() => { });
});

// Global afterAll
afterAll(() => {
    jest.restoreAllMocks();
});
