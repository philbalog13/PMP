import * as fraudService from '../fraud.service';

describe('Fraud Detection Service', () => {

    describe('checkFraud', () => {
        const baseTransaction = {
            pan: '4111111111111111',
            amount: 50.00,
            merchantId: 'MERCHANT001',
            mcc: '5411',
            country: 'FR'
        };

        it('should return low risk for normal transaction', () => {
            const result = fraudService.checkFraud(baseTransaction);

            expect(result.riskScore).toBeLessThan(30);
            expect(result.riskLevel).toBe('LOW');
            expect(result.recommendation).toBe('APPROVE');
        });

        it('should flag high amount', () => {
            const result = fraudService.checkFraud({
                ...baseTransaction,
                amount: 5000.00
            });

            expect(result.riskScore).toBeGreaterThan(20);
            expect(result.reasons).toContain(expect.stringContaining('amount'));
        });

        it('should flag suspicious MCC (gambling)', () => {
            const result = fraudService.checkFraud({
                ...baseTransaction,
                mcc: '7995'
            });

            expect(result.riskScore).toBeGreaterThan(25);
            expect(result.reasons).toContain(expect.stringContaining('category'));
        });

        it('should flag blocked country', () => {
            const result = fraudService.checkFraud({
                ...baseTransaction,
                country: 'KP'
            });

            expect(result.riskScore).toBeGreaterThan(40);
            expect(result.recommendation).not.toBe('APPROVE');
        });

        it('should accumulate risk scores', () => {
            const result = fraudService.checkFraud({
                ...baseTransaction,
                amount: 5000.00,
                mcc: '7995'
            });

            // Should have both high amount and suspicious MCC
            expect(result.reasons.length).toBeGreaterThan(1);
        });
    });

    describe('checkFraud', () => {
        it('should approve low risk transaction', () => {
            const request = {
                pan: '4111111111111111',
                amount: 50,
                merchantId: 'M001',
                mcc: '5411', // Grocery
                country: 'FR'
            };

            const result = fraudService.checkFraud(request);

            expect(result.riskLevel).toBe('LOW');
            expect(result.recommendation).toBe('APPROVE');
            expect(result.flagged).toBe(false);
        });

        it('should flag high amount transaction', () => {
            const request = {
                pan: '4111111111111111',
                amount: 5000,
                merchantId: 'M001',
                mcc: '5411'
            };

            const result = fraudService.checkFraud(request);

            expect(result.riskScore).toBeGreaterThan(0);
            expect(result.reasons.some(r => r.includes('amount'))).toBe(true);
        });

        it('should decline blocked country', () => {
            const request = {
                pan: '4111111111111111',
                amount: 100,
                merchantId: 'M001',
                mcc: '5411',
                country: 'KP' // North Korea (example blocked)
            };

            const result = fraudService.checkFraud(request);

            expect(result.riskScore).toBeGreaterThan(0);
            expect(result.reasons.some(r => r.includes('country'))).toBe(true);
        });
    });

    describe('Alerts', () => {
        it('should create alert for high risk transaction', () => {
            // Trigger high risk
            const request = {
                pan: '4111111111111111',
                amount: 10000,
                merchantId: 'M001',
                mcc: '7995', // Gambling
                country: 'KP'
            };

            const result = fraudService.checkFraud(request);
            expect(result.flagged).toBe(true);

            // Check alerts list
            const alerts = fraudService.getAlerts();
            expect(alerts.length).toBeGreaterThan(0);
            expect(alerts[0].pan).toContain('****'); // Masked
        });
    });

    describe('getAlerts', () => {
        it('should return array of alerts', () => {
            const alerts = fraudService.getAlerts();

            expect(Array.isArray(alerts)).toBe(true);
        });
    });
});
