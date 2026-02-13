import * as cardService from '../card.service';

// Mock database query
jest.mock('../../config/database', () => ({
    query: jest.fn()
}));
import { query } from '../../config/database';

describe('Card Service', () => {

    // Mock data
    const mockCard = {
        id: '123',
        pan: '4111111111111111',
        cardholder_name: 'TEST USER',
        expiry_month: 12,
        expiry_year: 2028,
        cvv_hash: 'sha256_123',
        pin_hash: 'hash',
        balance: '0',
        daily_limit: '1000',
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date()
    };

    beforeEach(() => {
        (query as jest.Mock).mockReset();
    });

    describe('createCard', () => {
        it('should create VISA card with valid data', async () => {
            // Mock PAN uniqueness check (0 rows = unique)
            (query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 0 }) // check unique
                .mockResolvedValueOnce({ rows: [mockCard] }); // insert return

            const card = await cardService.createCard({ cardholderName: 'TEST USER', cardType: 'VISA' });

            expect(card.cardholderName).toBe('TEST USER');
            expect(card.status).toBe('ACTIVE');
            expect(card.pan).toBeDefined();
            expect(card.cvv).toBeDefined();
        });
    });

    describe('getCardByPan', () => {
        it('should retrieve card by PAN', async () => {
            (query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [mockCard] });

            const retrieved = await cardService.getCardByPan('4111111111111111');

            expect(retrieved).toBeDefined();
            expect(retrieved?.pan).toBe('4111111111111111');
        });

        it('should return null for non-existent PAN', async () => {
            (query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

            const retrieved = await cardService.getCardByPan('0000000000000000');

            expect(retrieved).toBeNull();
        });
    });

    describe('updateCardStatus', () => {
        it('should block a card', async () => {
            const blockedCard = { ...mockCard, status: 'BLOCKED' };
            (query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [blockedCard] });

            const updated = await cardService.updateCardStatus(mockCard.pan, 'BLOCKED');

            expect(updated?.status).toBe('BLOCKED');
        });
    });

    describe('validateCard', () => {
        it('should pass for valid active card', async () => {
            (query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [mockCard] });

            const result = await cardService.validateCard('4111111111111111', '123', 12, 2028);

            expect(result.valid).toBe(true);
        });

        it('should fail for wrong CVV', async () => {
            (query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [mockCard] });

            const result = await cardService.validateCard('4111111111111111', '999', 12, 2028);

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid CVV');
        });
    });

    describe('getAllCards', () => {
        it('should return paginated list', async () => {
            (query as jest.Mock)
                .mockResolvedValueOnce({ rows: [{ count: '20' }] }) // count
                .mockResolvedValueOnce({ rows: Array(20).fill(mockCard) }); // select

            const result = await cardService.getAllCards(1, 20);

            expect(result.cards).toHaveLength(20);
            expect(result.total).toBe(20);
        });
    });
});
