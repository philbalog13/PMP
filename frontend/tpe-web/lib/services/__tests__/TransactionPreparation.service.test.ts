
import { TransactionPreparationService, UserInput } from '../TransactionPreparation.service';

describe('TransactionPreparationService', () => {
    let service: TransactionPreparationService;

    beforeEach(() => {
        service = new TransactionPreparationService();
    });

    it('should successfully prepare a valid transaction', async () => {
        // Test basic happy path
        const input: UserInput = { amount: 20.00, currency: 'EUR' };
        const result = await service.prepareTransaction(input);

        expect(result).toBeDefined();
        expect(result.isoMessage.mti).toBe('0100');
        // Check amount formatting (20.00 -> 2000 cents, padded to 12 chars)
        expect(result.isoMessage.amount).toBe('000000002000');
        expect(result.riskAssessment.isValid).toBe(true);
        expect(result.preparationId).toBeDefined();
    });

    it('should detect high amount and require PIN simulation', async () => {
        // Test CVM Logic
        const input: UserInput = { amount: 100.00, currency: 'EUR' }; // > 50.00
        const result = await service.prepareTransaction(input);

        expect(result.isoMessage.pinBlock).toBeDefined();
        // Check audit trace for educational value
        expect(result.riskAssessment.auditTrace).toEqual(
            expect.arrayContaining([expect.stringContaining('[CVM] PIN Required')])
        );
    });

    it('should format transmission date correctly', async () => {
        const input: UserInput = { amount: 10.00, currency: 'EUR' };
        const result = await service.prepareTransaction(input);
        // Expect MMDDhhmmss (10 digits)
        expect(result.isoMessage.transmissionDate).toMatch(/^\d{10}$/);
    });
});
