import axios from 'axios';
import { config } from './config';

// Increase timeout for all tests
jest.setTimeout(30000);

// Global axios defaults
axios.defaults.timeout = config.timeout;
axios.defaults.validateStatus = () => true; // Don't throw on non-2xx

// Before all tests
beforeAll(async () => {
    console.log('🧪 Starting E2E Test Suite for PMP');
    console.log('📍 Testing against services:');
    Object.entries(config.services).forEach(([name, url]) => {
        console.log(`   - ${name}: ${url}`);
    });
});

// After all tests
afterAll(async () => {
    console.log('✅ E2E Test Suite completed');
});
