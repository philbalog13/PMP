
import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import { ResponseWorkflow } from '../../src/workflows/ResponseWorkflow';
import { routingService } from '../../src/services/routing.service';
import { TransactionResponse, CardNetwork } from '../../src/models';

// Mock axios and routingService
jest.mock('axios', () => {
    const mockAxiosInstance = {
        interceptors: {
            response: {
                use: jest.fn(),
            },
        },
    };

    const mockAxios = {
        create: jest.fn(() => mockAxiosInstance),
        post: jest.fn(),
        interceptors: {
            response: {
                use: jest.fn(),
            },
        },
    };

    return {
        __esModule: true,
        default: mockAxios,
    };
});
jest.mock('axios-retry', () => jest.fn());
jest.mock('../../src/services/routing.service');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedRoutingService = routingService as jest.Mocked<typeof routingService>;

describe('Phase 8: Audit & BI Integration', () => {
    let workflow: ResponseWorkflow;

    beforeAll(() => {
        workflow = new ResponseWorkflow();
        process.env.BLOCKCHAIN_ENABLED = 'true';
    });

    afterAll(() => {
        jest.clearAllMocks();
    });

    it('should send data to monitoring and blockchain services', async () => {
        // Arrange
        const authResponse: TransactionResponse = {
            stan: '987654',
            acquirerReferenceNumber: 'ARN999',
            responseCode: '00',
            responseMessage: 'Approved',
            networkId: CardNetwork.MASTERCARD,
            issuerRoutingInfo: 'MC_FR_001',
            processedAt: new Date().toISOString(),
            responseTime: 120
        };

        const routedResponse = { ...authResponse };
        const tpeResponse = {
            ...routedResponse,
            userNotification: 'PAIEMENT ACCEPTE',
            merchantNotification: 'TRANS 987654 : 00',
            systemAlert: 'Success',
            amount: 50.00,
            merchantId: 'MERCH001'
        };

        // Mocks
        mockedRoutingService.routeBack.mockResolvedValue(routedResponse);
        mockedAxios.post.mockImplementation((url, data) => {
            const resolvedUrl = String(url);

            if (resolvedUrl.includes('transaction/process-response')) {
                return Promise.resolve({ data: routedResponse } as any);
            }

            if (resolvedUrl.includes('device/format-response')) {
                return Promise.resolve({ data: tpeResponse } as any);
            }

            return Promise.resolve({ data: {} } as any);
        });

        // Act
        await workflow.processResponse(authResponse);

        // Assert
        // Verify Blockchain Call
        expect(mockedAxios.post).toHaveBeenCalledWith(
            expect.stringContaining('ledger/log'),
            expect.objectContaining({ type: 'FINANCIAL_RESPONSE' })
        );

        // Verify Monitoring Call
        expect(mockedAxios.post).toHaveBeenCalledWith(
            expect.stringContaining('analytics/transaction'),
            expect.objectContaining({
                amount: 50.00,
                merchantId: 'MERCH001',
                responseCode: '00'
            })
        );
    });
});
