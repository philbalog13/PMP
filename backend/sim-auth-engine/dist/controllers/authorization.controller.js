"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulate = exports.getTransactions = exports.authorize = void 0;
const joi_1 = __importDefault(require("joi"));
const services_1 = require("../services");
// Validation schemas
const transactionSchema = joi_1.default.object({
    stan: joi_1.default.string().pattern(/^\d{1,12}$/).required(),
    pan: joi_1.default.string().pattern(/^\d{13,19}$/).required(),
    mti: joi_1.default.string().pattern(/^\d{4}$/).default('0100'),
    processingCode: joi_1.default.string().pattern(/^\d{6}$/).default('000000'),
    amount: joi_1.default.number().positive().required(),
    currency: joi_1.default.string().length(3).uppercase().default('EUR'),
    type: joi_1.default.string().valid('PURCHASE', 'CASH_ADVANCE', 'REFUND', 'VOID', 'BALANCE_INQUIRY', 'TRANSFER').default('PURCHASE'),
    merchantId: joi_1.default.string().max(15).required(),
    terminalId: joi_1.default.string().max(8).required(),
    mcc: joi_1.default.string().pattern(/^\d{4}$/).default('5999'),
    posEntryMode: joi_1.default.string().pattern(/^\d{3}$/).default('051'),
    pinEntered: joi_1.default.boolean().default(false),
    pinBlock: joi_1.default.string().pattern(/^[0-9A-Fa-f]{16}$/).optional(),
    cvvProvided: joi_1.default.boolean().default(false),
    threeDsAuthenticated: joi_1.default.boolean().default(false),
    isRecurring: joi_1.default.boolean().default(false),
    isEcommerce: joi_1.default.boolean().default(false),
    location: joi_1.default.object({
        country: joi_1.default.string().length(2).uppercase().required(),
        city: joi_1.default.string().optional(),
        latitude: joi_1.default.number().optional(),
        longitude: joi_1.default.number().optional(),
    }).optional(),
});
/**
 * POST /authorize - Process authorization request
 */
const authorize = async (req, res, next) => {
    try {
        const { error, value } = transactionSchema.validate(req.body, { abortEarly: false });
        if (error) {
            console.error('[AUTH-ENGINE] Validation Error:', JSON.stringify(error.details));
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: error.details },
            });
            return;
        }
        const transaction = {
            ...value,
            timestamp: new Date(),
        };
        const result = await services_1.authorizationService.authorize(transaction);
        res.status(200).json({
            success: result.approved,
            data: result,
            meta: { requestId: req.requestId },
        });
    }
    catch (err) {
        next(err);
    }
};
exports.authorize = authorize;
/**
 * GET /transactions/:pan - Get transaction history
 */
const getTransactions = async (req, res, next) => {
    try {
        const { pan } = req.params;
        if (!/^\d{13,19}$/.test(pan)) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Invalid PAN format' },
            });
            return;
        }
        const transactions = services_1.authorizationService.getTransactionHistory(pan);
        const accountInfo = services_1.authorizationService.getAccountInfo(pan);
        res.status(200).json({
            success: true,
            data: {
                transactions,
                count: transactions.length,
                accountInfo,
            },
            meta: { requestId: req.requestId },
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getTransactions = getTransactions;
/**
 * POST /simulate/:scenario - Run simulation scenario
 */
const simulate = async (req, res, next) => {
    try {
        const { scenario } = req.params;
        const validScenarios = [
            'APPROVED', 'INSUFFICIENT_FUNDS', 'EXPIRED_CARD', 'STOLEN_CARD',
            'OVER_LIMIT', 'VELOCITY_EXCEEDED', '3DS_REQUIRED', 'FRAUD_SUSPECTED', 'SYSTEM_ERROR',
        ];
        if (!validScenarios.includes(scenario)) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_SCENARIO',
                    message: `Invalid scenario. Valid: ${validScenarios.join(', ')}`
                },
            });
            return;
        }
        const result = await services_1.authorizationService.simulate(scenario);
        res.status(200).json({
            success: true,
            data: result,
            meta: { requestId: req.requestId },
        });
    }
    catch (err) {
        next(err);
    }
};
exports.simulate = simulate;
exports.default = {
    authorize: exports.authorize,
    getTransactions: exports.getTransactions,
    simulate: exports.simulate
};
//# sourceMappingURL=authorization.controller.js.map