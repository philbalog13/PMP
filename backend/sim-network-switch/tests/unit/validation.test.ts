/**
 * Validation Middleware Unit Tests
 */
import { validateTransactionRequest, validateBinLookup } from '../../src/middleware/validation';

describe('Validation Middleware', () => {
    describe('validateTransactionRequest', () => {
        const validTransaction = {
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

        it('should validate correct transaction request', () => {
            const { error, value } = validateTransactionRequest(validTransaction);

            expect(error).toBeUndefined();
            expect(value).toBeDefined();
            expect(value.pan).toBe('4111111111111111');
        });

        it('should reject missing PAN', () => {
            const { pan, ...invalidTransaction } = validTransaction;
            const { error } = validateTransactionRequest(invalidTransaction);

            expect(error).toBeDefined();
            expect(error?.details[0].path).toContain('pan');
        });

        it('should reject invalid PAN format', () => {
            const invalidTransaction = { ...validTransaction, pan: '123' };
            const { error } = validateTransactionRequest(invalidTransaction);

            expect(error).toBeDefined();
            expect(error?.message).toContain('pan');
        });

        it('should reject negative amount', () => {
            const invalidTransaction = { ...validTransaction, amount: -100 };
            const { error } = validateTransactionRequest(invalidTransaction);

            expect(error).toBeDefined();
        });

        it('should reject invalid MTI format', () => {
            const invalidTransaction = { ...validTransaction, mti: '12' };
            const { error } = validateTransactionRequest(invalidTransaction);

            expect(error).toBeDefined();
        });

        it('should set default currency to EUR', () => {
            const { currency, ...transactionWithoutCurrency } = validTransaction;
            const { value } = validateTransactionRequest(transactionWithoutCurrency);

            expect(value?.currency).toBe('EUR');
        });

        it('should accept optional PIN block', () => {
            const transactionWithPin = { ...validTransaction, pinBlock: '1234567890ABCDEF' };
            const { error, value } = validateTransactionRequest(transactionWithPin);

            expect(error).toBeUndefined();
            expect(value?.pinBlock).toBe('1234567890ABCDEF');
        });

        it('should reject invalid PIN block format', () => {
            const transactionWithInvalidPin = { ...validTransaction, pinBlock: 'INVALID' };
            const { error } = validateTransactionRequest(transactionWithInvalidPin);

            expect(error).toBeDefined();
        });

        it('should strip unknown fields', () => {
            const transactionWithExtra = { ...validTransaction, unknownField: 'test' };
            const { value } = validateTransactionRequest(transactionWithExtra);

            expect(value).not.toHaveProperty('unknownField');
        });
    });

    describe('validateBinLookup', () => {
        it('should validate correct BIN lookup', () => {
            const { error, value } = validateBinLookup({ pan: '411111' });

            expect(error).toBeUndefined();
            expect(value?.pan).toBe('411111');
        });

        it('should accept full PAN', () => {
            const { error, value } = validateBinLookup({ pan: '4111111111111111' });

            expect(error).toBeUndefined();
            expect(value?.pan).toBe('4111111111111111');
        });

        it('should reject too short PAN', () => {
            const { error } = validateBinLookup({ pan: '411' });

            expect(error).toBeDefined();
        });

        it('should reject non-numeric PAN', () => {
            const { error } = validateBinLookup({ pan: '41111A' });

            expect(error).toBeDefined();
        });
    });
});
