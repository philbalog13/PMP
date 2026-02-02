
import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import { authorizeTransaction, AuthorizationRequest } from '../../src/services/issuer.service';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Issuer Authorization Flow (Full Sequence)', () => {

    beforeAll(() => {
        // Setup initial mocks
    });

    afterAll(() => {
        jest.clearAllMocks();
    });

    it('should execute full flow: Decrypt PIN -> Verify -> Fraud -> Auth -> Sign -> Encrypt -> KCV', async () => {
        // Arrange
        const request: AuthorizationRequest = {
            transactionId: 'TX123',
            pan: '4111111111111111', // Existing PAN in account.service.ts
            amount: 100,
            currency: 'EUR',
            merchantId: 'M123',
            mcc: '5411',
            transactionType: 'PURCHASE',
            pinBlock: 'AABBCCDDEEFF0011'
        };

        // Mock Responses based on URL
        mockedAxios.post.mockImplementation((url: string, data: any) => {
            if (url.includes('decrypt-pin')) return Promise.resolve({ data: { pin: '1234' } } as any);
            if (url.includes('check')) return Promise.resolve({ data: { riskScore: 10 } } as any);
            if (url.includes('authorize')) return Promise.resolve({ data: { approved: true, responseCode: '00' } } as any);
            // Simulating MAC/Cryptogram response
            if (url.includes('generate-mac')) return Promise.resolve({ data: { mac: 'MAC_VERIFIED_123' } } as any);
            // Simulating Encrypt Data response
            if (url.includes('encrypt-data')) return Promise.resolve({ data: { encryptedData: 'ENC_DATA_XYZ' } } as any);
            // Simulating KCV response
            if (url.includes('calculate-kcv')) return Promise.resolve({ data: { kcv: 'KCV_verified' } } as any);

            return Promise.resolve({ data: {} } as any);
        });

        // Act
        const response = await authorizeTransaction(request);

        // Assert
        expect(response.approved).toBe(true);
        expect(response.cryptogram).toBe('MAC_VERIFIED_123');

        // Verify Call Sequence
        const calls = mockedAxios.post.mock.calls;

        // Find calls by URL to ensure they were made
        const decryptCall = calls.find(c => c[0].includes('decrypt-pin'));
        const fraudCall = calls.find(c => c[0].includes('check'));
        const authCall = calls.find(c => c[0].includes('authorize'));
        const signCall = calls.find(c => c[0].includes('generate-mac'));
        const encryptCall = calls.find(c => c[0].includes('encrypt-data'));
        const kcvCall = calls.find(c => c[0].includes('calculate-kcv'));

        expect(decryptCall).toBeDefined();
        expect(fraudCall).toBeDefined();
        expect(authCall).toBeDefined();
        expect(signCall).toBeDefined();
        expect(encryptCall).toBeDefined();
        expect(kcvCall).toBeDefined();

        // Verify Educational Metadata
        expect(response._educational?.hsmOperations).toContain('Response MAC Generation (HMAC-SHA256)');
        expect(response._educational?.hsmOperations).toContain('Encrypt Sensitive Data (TDES)');
        expect(response._educational?.hsmOperations).toContain('Calculate KCV (Key Check Value)');
    });
});
