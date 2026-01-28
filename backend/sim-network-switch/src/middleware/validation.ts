/**
 * Joi Validation Schemas
 * Input validation for all endpoints
 */
import Joi from 'joi';

/**
 * Transaction request validation schema
 */
export const transactionRequestSchema = Joi.object({
    mti: Joi.string()
        .pattern(/^\d{4}$/)
        .required()
        .description('Message Type Indicator (4 digits)'),

    pan: Joi.string()
        .pattern(/^\d{13,19}$/)
        .required()
        .description('Primary Account Number (13-19 digits)'),

    processingCode: Joi.string()
        .pattern(/^\d{6}$/)
        .required()
        .description('Processing Code (6 digits)'),

    amount: Joi.number()
        .positive()
        .max(999999999.99)
        .required()
        .description('Transaction amount'),

    currency: Joi.string()
        .length(3)
        .uppercase()
        .default('EUR')
        .description('Currency code (ISO 4217)'),

    transmissionDateTime: Joi.string()
        .pattern(/^\d{10}$/)
        .required()
        .description('Transmission date/time (MMDDHHmmss)'),

    localTransactionTime: Joi.string()
        .pattern(/^\d{6}$/)
        .required()
        .description('Local transaction time (HHmmss)'),

    localTransactionDate: Joi.string()
        .pattern(/^\d{4}$/)
        .required()
        .description('Local transaction date (MMDD)'),

    stan: Joi.string()
        .pattern(/^\d{6}$/)
        .required()
        .description('System Trace Audit Number'),

    terminalId: Joi.string()
        .max(8)
        .required()
        .description('Terminal ID'),

    merchantId: Joi.string()
        .max(15)
        .required()
        .description('Merchant ID'),

    merchantCategoryCode: Joi.string()
        .pattern(/^\d{4}$/)
        .required()
        .description('Merchant Category Code'),

    expiryDate: Joi.string()
        .pattern(/^\d{4}$/)
        .required()
        .description('Card expiry date (YYMM)'),

    pinBlock: Joi.string()
        .pattern(/^[0-9A-Fa-f]{16}$/)
        .optional()
        .description('Encrypted PIN Block (16 hex chars)'),

    posEntryMode: Joi.string()
        .pattern(/^\d{3}$/)
        .required()
        .description('Point of Service Entry Mode'),

    acquirerReferenceNumber: Joi.string()
        .max(23)
        .required()
        .description('Acquirer Reference Number'),

    additionalData: Joi.object()
        .optional()
        .description('Additional transaction data'),
});

/**
 * Validate transaction request
 */
export const validateTransactionRequest = (data: unknown) => {
    return transactionRequestSchema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
    });
};

/**
 * BIN lookup validation schema
 */
export const binLookupSchema = Joi.object({
    pan: Joi.string()
        .pattern(/^\d{6,19}$/)
        .required()
        .description('PAN or BIN prefix (6-19 digits)'),
});

/**
 * Validate BIN lookup request
 */
export const validateBinLookup = (data: unknown) => {
    return binLookupSchema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
    });
};

export default {
    transactionRequestSchema,
    validateTransactionRequest,
    binLookupSchema,
    validateBinLookup,
};
