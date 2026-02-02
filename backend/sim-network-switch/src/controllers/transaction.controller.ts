/**
 * Transaction Controller
 * Handles transaction routing requests
 */
import { Request, Response, NextFunction } from 'express';
import { routingService } from '../services/routing.service';
import { validateTransactionRequest, validateBinLookup, ValidationError } from '../middleware';
import { TransactionRequest } from '../models';
import { logger } from '../utils/logger';
import { recordTransaction } from '../utils/metrics';

/**
 * Route a transaction through the network switch
 * POST /transaction
 */
export const routeTransaction = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const startTime = Date.now();

    try {
        // Log incoming request for debugging
        logger.info('Received transaction request', {
            body: JSON.stringify(req.body).substring(0, 500),
            requestId: req.requestId,
        });

        // Validate input
        const { error, value } = validateTransactionRequest(req.body);
        if (error) {
            logger.error('Validation failed', {
                details: JSON.stringify(error.details),
                requestId: req.requestId,
            });
            throw new ValidationError('Invalid transaction request', error.details);
        }

        const transaction: TransactionRequest = value;

        logger.info('Processing transaction', {
            stan: transaction.stan,
            amount: transaction.amount,
            currency: transaction.currency,
            merchantId: transaction.merchantId,
            requestId: req.requestId,
        });

        // Route transaction
        const response = await routingService.routeTransaction(transaction);

        // Record metrics
        const duration = Date.now() - startTime;
        recordTransaction(
            response.networkId,
            response.responseCode === '00' ? 'APPROVED' : 'DECLINED',
            response.responseCode,
            duration
        );

        // Send response
        res.status(200).json({
            success: response.responseCode === '00',
            data: response,
            meta: {
                requestId: req.requestId,
                processingTime: duration,
            },
        });

    } catch (err) {
        next(err);
    }
};

/**
 * Identify network from BIN
 * GET /transaction/network/:pan
 */
export const identifyNetwork = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { pan } = req.params;

        // Validate
        const { error, value } = validateBinLookup({ pan });
        if (error) {
            throw new ValidationError('Invalid PAN format', error.details);
        }

        const network = routingService.identifyNetwork(value.pan);
        const binConfig = routingService.getBinConfig(value.pan);

        res.status(200).json({
            success: true,
            data: {
                network,
                binConfig: binConfig ? {
                    network: binConfig.network,
                    issuerName: binConfig.issuerName,
                    cardType: binConfig.cardType,
                    country: binConfig.country,
                } : null,
            },
            meta: {
                requestId: req.requestId,
            },
        });

    } catch (err) {
        next(err);
    }
};

/**
 * Get supported networks
 * GET /transaction/networks
 */
export const getSupportedNetworks = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const networks = routingService.getSupportedNetworks();

        res.status(200).json({
            success: true,
            data: {
                networks,
                count: networks.length,
            },
            meta: {
                requestId: req.requestId,
            },
        });

    } catch (err) {
        next(err);
    }
};

/**
 * Get BIN routing table (admin/debug)
 * GET /transaction/bin-table
 */
export const getBinTable = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const binTable = routingService.getBinTable();

        res.status(200).json({
            success: true,
            data: {
                entries: binTable.length,
                table: binTable,
            },
            meta: {
                requestId: req.requestId,
            },
        });

    } catch (err) {
        next(err);
    }
};

export default {
    routeTransaction,
    identifyNetwork,
    getSupportedNetworks,
    getBinTable,
};
