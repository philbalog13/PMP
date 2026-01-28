import * as cardService from '../card.service';

describe('Card Service', () => {

    describe('createCard', () => {
        it('should create VISA card with valid data', () => {
            const card = cardService.createCard({ cardholderName: 'TEST USER', cardType: 'VISA' });

            expect(card.cardholderName).toBe('TEST USER');
            expect(card.cardType).toBe('VISA');
            expect(card.status).toBe('ACTIVE');
            expect(card.pan).toBeDefined();
            expect(card.cvv).toHaveLength(3);
        });

        it('should create MASTERCARD card', () => {
            const card = cardService.createCard({ cardholderName: 'MC USER', cardType: 'MASTERCARD' });

            expect(card.cardType).toBe('MASTERCARD');
            expect(card.pan.startsWith('5')).toBe(true);
        });

        it('should set expiry 3 years in future', () => {
            const card = cardService.createCard({ cardholderName: 'EXP USER', cardType: 'VISA' });
            const now = new Date();

            expect(card.expiryYear).toBeGreaterThanOrEqual(now.getFullYear() + 2);
        });
    });

    it('should retrieve card by PAN', () => {
        // Assuming createRequest is defined elsewhere or this is a placeholder for actual card creation data
        // For the purpose of this edit, we'll use a simplified createCard call
        const created = cardService.createCard({ cardholderName: 'TEST USER', cardType: 'VISA' });
        const retrieved = cardService.getCardByPan(created.pan);

        expect(retrieved).toBeDefined();
        expect(retrieved?.pan).toBe(created.pan);
    });

    it('should return null for non-existent PAN', () => {
        const retrieved = cardService.getCardByPan('0000000000000000');

        expect(retrieved).toBeNull();
    });


    describe('updateCardStatus', () => {
        it('should block a card', () => {
            const card = cardService.createCard({ cardholderName: 'BLOCK TEST', cardType: 'VISA' });
            const updated = cardService.updateCardStatus(card.pan, 'BLOCKED');

            expect(updated?.status).toBe('BLOCKED');
        });

        it('should activate a blocked card', () => {
            const card = cardService.createCard({ cardholderName: 'ACTIVATE TEST', cardType: 'VISA' });
            cardService.updateCardStatus(card.pan, 'BLOCKED');
            const updated = cardService.updateCardStatus(card.pan, 'ACTIVE');

            expect(updated?.status).toBe('ACTIVE');
        });

        it('should return null for non-existent card', () => {
            const result = cardService.updateCardStatus('9999999999999999', 'BLOCKED');

            expect(result).toBeNull();
        });
    });

    describe('validateCard', () => {
        it('should pass for valid active card', () => {
            const result = cardService.validateCard('4111111111111111', '123', 12, 2028);

            expect(result.valid).toBe(true);
        });

        it('should fail for wrong CVV', () => {
            const result = cardService.validateCard('4111111111111111', '999', 12, 2028);

            expect(result.valid).toBe(false);
            expect(result.error).toContain('CVV');
        });

        it('should fail for expired card', () => {
            const result = cardService.validateCard('4111111111111111', '123', 1, 2020);

            expect(result.valid).toBe(false);
            expect(result.error).toContain('expired');
        });
    });

    describe('getAllCards', () => {
        it('should return paginated list', () => {
            const result = cardService.getAllCards(1, 2);

            expect(result.cards).toHaveLength(20);
            expect(result.total).toBeGreaterThan(20);
            expect(result.cards[0].cvv).toBe('***'); // Check sanitization
        });

        it('should handle empty page', () => {
            const result = cardService.getAllCards(999, 10);

            expect(result.cards).toHaveLength(0);
        });
    });
});
