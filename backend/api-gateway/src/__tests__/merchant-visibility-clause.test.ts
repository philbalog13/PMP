import { buildMerchantTransactionVisibilityClause } from '../controllers/merchant.controller';

describe('buildMerchantTransactionVisibilityClause', () => {
    it('keeps merchant integrity mandatory without requiring a linked client', () => {
        const clause = buildMerchantTransactionVisibilityClause();

        expect(clause).toContain('FROM users.users u_merchant');
        expect(clause).toContain("u_merchant.role = 'ROLE_MARCHAND'");
        expect(clause).toContain('FROM merchant.accounts ma');
        expect(clause).toContain('client_id IS NULL');
        expect(clause).not.toContain('client_id IS NOT NULL');
        expect(clause).toContain('FROM client.bank_accounts ba');
    });

    it('qualifies every transaction field when an alias is provided', () => {
        const clause = buildMerchantTransactionVisibilityClause('t');

        expect(clause).toContain('u_merchant.id = t.merchant_id');
        expect(clause).toContain('t.client_id IS NULL');
        expect(clause).toContain('u_client.id = t.client_id');
        expect(clause).toContain('vc.id = t.card_id');
        expect(clause).toContain('vc.client_id = t.client_id');
    });
});
