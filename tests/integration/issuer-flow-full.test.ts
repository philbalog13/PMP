
import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import { authorizeTransaction, AuthorizationRequest } from '../../backend/sim-issuer-service/src/services/issuer.service';
import { config } from '../../backend/sim-issuer-service/src/config';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Issuer Authorization Flow (Full Sequence)', () => {

    beforeAll(() => {
        // Setup initial mocks
        mockedAxios.post.mockResolvedValue({ data: {} });
    });

    afterAll(() => {
        jest.clearAllMocks();
    });

    it('should execute full flow: Decrypt PIN -> Verify -> Fraud -> Auth -> Sign -> Encrypt -> KCV', async () => {
        // Arrange
        const request: AuthorizationRequest = {
            transactionId: 'TX123',
            pan: '1234567890123456',
            amount: 100,
            currency: 'EUR',
            merchantId: 'M123',
            mcc: '5411',
            transactionType: 'PURCHASE',
            pinBlock: 'AABBCCDDEEFF0011'
        };

        // Mock Responses
        // 1. PIN Decrypt
        mockedAxios.post.mockResolvedValueOnce({ data: { pin: '1234' } });
        // 2. Fraud Check
        mockedAxios.post.mockResolvedValueOnce({ data: { riskScore: 10 } });
        // 3. Auth Engine
        mockedAxios.post.mockResolvedValueOnce({ data: { approved: true, responseCode: '00' } });
        // 4. MAC Generation
        mockedAxios.post.mockResolvedValueOnce({ data: { mac: 'MAC_123456' } });
        // 5. Encrypt Sensitive Data
        mockedAxios.post.mockResolvedValueOnce({ data: { encryptedData: 'ENC_DATA_XYZ' } });
        // 6. Calculate KCV
        mockedAxios.post.mockResolvedValueOnce({ data: { kcv: 'KCV_999' } });

        // Act
        const response = await authorizeTransaction(request);

        // Assert
        expect(response.approved).toBe(true);
        expect(response.cryptogram).toBe('MAC_123456');

        // Verify Call Sequence
        const calls = mockedAxios.post.mock.calls;
        expect(calls.length).toBeGreaterThanOrEqual(6);

        // Check Endpoint URLs
        expect(calls[0][0]).toContain('/hsm/decrypt-pin');
        expect(calls[1][0]).toContain('/check'); // Fraud
        expect(calls[2][0]).toContain('/api/authorize'); // Auth Engine
        expect(calls[3][0]).toContain('/hsm/generate-mac');
        expect(calls[4][0]).toContain('/hsm/encrypt-data');
        expect(calls[5][0]).toContain('/hsm/calculate-kcv');

        // Verify Educational Metadata
        expect(response._educational?.hsmOperations).toContain('Response MAC Generation (HMAC-SHA256)');
        expect(response._educational?.hsmOperations).toContain('Encrypt Sensitive Data (TDES)');
        expect(response._educational?.hsmOperations).toContain('Calculate KCV (Key Check Value)');
    });
});
