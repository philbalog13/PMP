/**
 * Routing Service Unit Tests
 */
import { RoutingService } from '../../src/services/routing.service';
import { CardNetwork } from '../../src/models';

describe('RoutingService', () => {
    let routingService: RoutingService;

    beforeEach(() => {
        routingService = new RoutingService();
    });

    describe('identifyNetwork', () => {
        it('should identify VISA cards (starting with 4)', () => {
            expect(routingService.identifyNetwork('4111111111111111')).toBe(CardNetwork.VISA);
            expect(routingService.identifyNetwork('4000056655665556')).toBe(CardNetwork.VISA);
        });

        it('should identify MASTERCARD cards (starting with 51-55)', () => {
            expect(routingService.identifyNetwork('5555555555554444')).toBe(CardNetwork.MASTERCARD);
            expect(routingService.identifyNetwork('5105105105105100')).toBe(CardNetwork.MASTERCARD);
        });

        it('should identify AMEX cards (starting with 34 or 37)', () => {
            expect(routingService.identifyNetwork('378282246310005')).toBe(CardNetwork.AMEX);
            expect(routingService.identifyNetwork('340000000000009')).toBe(CardNetwork.AMEX);
        });

        it('should identify DISCOVER cards (starting with 6011 or 65)', () => {
            expect(routingService.identifyNetwork('6011111111111117')).toBe(CardNetwork.DISCOVER);
            expect(routingService.identifyNetwork('6500000000000002')).toBe(CardNetwork.DISCOVER);
        });

        it('should identify UNIONPAY cards (starting with 62)', () => {
            expect(routingService.identifyNetwork('6200000000000005')).toBe(CardNetwork.UNIONPAY);
        });

        it('should return UNKNOWN for unrecognized PANs', () => {
            expect(routingService.identifyNetwork('9999999999999999')).toBe(CardNetwork.UNKNOWN);
            expect(routingService.identifyNetwork('1111111111111111')).toBe(CardNetwork.UNKNOWN);
        });

        it('should handle PANs with non-numeric characters', () => {
            expect(routingService.identifyNetwork('4111-1111-1111-1111')).toBe(CardNetwork.VISA);
            expect(routingService.identifyNetwork('4111 1111 1111 1111')).toBe(CardNetwork.VISA);
        });
    });

    describe('getBinConfig', () => {
        it('should return BIN config for known PANs', () => {
            const config = routingService.getBinConfig('4111111111111111');

            expect(config).not.toBeNull();
            expect(config?.network).toBe(CardNetwork.VISA);
            expect(config?.issuerCode).toBe('VISA_FR_001');
        });

        it('should return null for unknown BINs', () => {
            const config = routingService.getBinConfig('9999999999999999');
            expect(config).toBeNull();
        });

        it('should use longest prefix match', () => {
            // 411111 is more specific than 4
            const config = routingService.getBinConfig('4111111111111111');
            expect(config?.binPrefix).toBe('411111');
        });
    });

    describe('getSupportedNetworks', () => {
        it('should return all supported networks', () => {
            const networks = routingService.getSupportedNetworks();

            expect(networks).toContain(CardNetwork.VISA);
            expect(networks).toContain(CardNetwork.MASTERCARD);
            expect(networks).toContain(CardNetwork.AMEX);
            expect(networks).toContain(CardNetwork.DISCOVER);
            expect(networks).toContain(CardNetwork.UNIONPAY);
            expect(networks).toHaveLength(5);
        });
    });

    describe('getBinTable', () => {
        it('should return non-empty BIN table', () => {
            const table = routingService.getBinTable();

            expect(Array.isArray(table)).toBe(true);
            expect(table.length).toBeGreaterThan(0);
        });

        it('should have valid BIN entries', () => {
            const table = routingService.getBinTable();

            table.forEach(entry => {
                expect(entry).toHaveProperty('binPrefix');
                expect(entry).toHaveProperty('network');
                expect(entry).toHaveProperty('issuerCode');
                expect(entry).toHaveProperty('cardType');
                expect(entry).toHaveProperty('country');
            });
        });
    });

    describe('determineRoute', () => {
        const mockTransaction = {
            mti: '0100',
            pan: '4111111111111111',
            processingCode: '000000',
            amount: 100.00,
            currency: 'EUR',
            transmissionDateTime: '0128101530',
            localTransactionTime: '101530',
            localTransactionDate: '0128',
            stan: '000001',
            terminalId: 'TERM0001',
            merchantId: 'MERCH001',
            merchantCategoryCode: '5411',
            expiryDate: '2812',
            posEntryMode: '051',
            acquirerReferenceNumber: 'ACQ123456789',
        };

        it('should return routing decision for valid transaction', async () => {
            const decision = await routingService.determineRoute(mockTransaction);

            expect(decision).toHaveProperty('network');
            expect(decision).toHaveProperty('issuerUrl');
            expect(decision).toHaveProperty('priority');
            expect(decision).toHaveProperty('routingReason');
            expect(decision.network).toBe(CardNetwork.VISA);
        });

        it('should identify UNKNOWN network for invalid PAN', async () => {
            const invalidTransaction = { ...mockTransaction, pan: '9999999999999999' };
            const decision = await routingService.determineRoute(invalidTransaction);

            expect(decision.network).toBe(CardNetwork.UNKNOWN);
        });
    });
});
