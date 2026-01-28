/**
 * Authorization Controller
 * Handles authorization requests
 */
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { authorizationService } from '../services';
import { Transaction, SimulationScenario } from '../models';

// Validation schemas
const transactionSchema = Joi.object({
    stan: Joi.string().pattern(/^\d{1,12}$/).required(),
    pan: Joi.string().pattern(/^\d{13,19}$/).required(),
    mti: Joi.string().pattern(/^\d{4}$/).default('0100'),
    processingCode: Joi.string().pattern(/^\d{6}$/).default('000000'),
    amount: Joi.number().positive().required(),
    currency: Joi.string().length(3).uppercase().default('EUR'),
    type: Joi.string().valid('PURCHASE', 'CASH_ADVANCE', 'REFUND', 'VOID', 'BALANCE_INQUIRY', 'TRANSFER').default('PURCHASE'),
    merchantId: Joi.string().max(15).required(),
    terminalId: Joi.string().max(8).required(),
    mcc: Joi.string().pattern(/^\d{4}$/).default('5999'),
    posEntryMode: Joi.string().pattern(/^\d{3}$/).default('051'),
    pinEntered: Joi.boolean().default(false),
    pinBlock: Joi.string().pattern(/^[0-9A-Fa-f]{16}$/).optional(),
    cvvProvided: Joi.boolean().default(false),
    threeDsAuthenticated: Joi.boolean().default(false),
    isRecurring: Joi.boolean().default(false),
    isEcommerce: Joi.boolean().default(false),
    location: Joi.object({
        country: Joi.string().length(2).uppercase().required(),
        city: Joi.string().optional(),
        latitude: Joi.number().optional(),
        longitude: Joi.number().optional(),
    }).optional(),
});

/**
 * POST /authorize - Process authorization request
 */
export const authorize = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { error, value } = transactionSchema.validate(req.body, { abortEarly: false });
        if (error) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: error.details },
            });
            return;
        }

        const transaction: Transaction = {
            ...value,
            timestamp: new Date(),
        };

        const result = await authorizationService.authorize(transaction);

        res.status(200).json({
            success: result.approved,
            data: result,
            meta: { requestId: req.requestId },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /transactions/:pan - Get transaction history
 */
export const getTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { pan } = req.params;

        if (!/^\d{13,19}$/.test(pan)) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Invalid PAN format' },
            });
            return;
        }

        const transactions = authorizationService.getTransactionHistory(pan);
        const accountInfo = authorizationService.getAccountInfo(pan);

        res.status(200).json({
            success: true,
            data: {
                transactions,
                count: transactions.length,
                accountInfo,
            },
            meta: { requestId: req.requestId },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /simulate/:scenario - Run simulation scenario
 */
export const simulate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { scenario } = req.params;

        const validScenarios: SimulationScenario[] = [
            'APPROVED', 'INSUFFICIENT_FUNDS', 'EXPIRED_CARD', 'STOLEN_CARD',
            'OVER_LIMIT', 'VELOCITY_EXCEEDED', '3DS_REQUIRED', 'FRAUD_SUSPECTED', 'SYSTEM_ERROR',
        ];

        if (!validScenarios.includes(scenario as SimulationScenario)) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_SCENARIO',
                    message: `Invalid scenario. Valid: ${validScenarios.join(', ')}`
                },
            });
            return;
        }

        const result = await authorizationService.simulate(scenario as SimulationScenario);

        res.status(200).json({
            success: true,
            data: result,
            meta: { requestId: req.requestId },
        });
    } catch (err) {
        next(err);
    }
};

export default {
    authorize,
    getTransactions,
    simulate
};
