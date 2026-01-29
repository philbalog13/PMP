import { jest } from '@jest/globals';

// Global setup
global.console = {
    ...console,
    // error: jest.fn(), // Valid comment to avoid masking errors during dev
};
