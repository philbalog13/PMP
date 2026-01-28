import { Request, Response } from 'express';
import * as cardService from '../services/card.service';
import { validateLuhn, getCardNetwork, maskPan } from '../services/luhn.service';

/**
 * Create a new card
 */
export const createCard = (req: Request, res: Response): void => {
    try {
        const { cardholderName, cardType, issuerId } = req.body;

        if (!cardholderName) {
            res.status(400).json({
                success: false,
                error: 'cardholderName is required'
            });
            return;
        }

        const card = cardService.createCard({ cardholderName, cardType, issuerId });

        res.status(201).json({
            success: true,
            data: {
                id: card.id,
                pan: card.pan, // Full PAN for newly created card (one-time display)
                maskedPan: card.maskedPan,
                cvv: card.cvv, // CVV shown only on creation
                expiryMonth: card.expiryMonth,
                expiryYear: card.expiryYear,
                cardholderName: card.cardholderName,
                cardType: card.cardType,
                status: card.status
            },
            _educational: {
                luhnValid: validateLuhn(card.pan),
                network: getCardNetwork(card.pan),
                note: 'Store these details securely - CVV will not be shown again'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to create card',
            details: (error as Error).message
        });
    }
};

/**
 * Get all cards (paginated)
 */
export const getAllCards = (req: Request, res: Response): void => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = cardService.getAllCards(page, limit);

    res.json({
        success: true,
        data: result.cards,
        pagination: {
            page,
            limit,
            total: result.total,
            pages: Math.ceil(result.total / limit)
        }
    });
};

/**
 * Get card by PAN
 */
export const getCardByPan = (req: Request, res: Response): void => {
    const { pan } = req.params;

    const card = cardService.getCardByPan(pan);

    if (!card) {
        res.status(404).json({
            success: false,
            error: 'Card not found'
        });
        return;
    }

    res.json({
        success: true,
        data: {
            ...card,
            cvv: '***', // Never expose CVV in GET
            pan: card.maskedPan // Return masked PAN
        },
        _educational: {
            network: getCardNetwork(card.pan),
            isTestCard: card.pan.startsWith('4111') || card.pan.startsWith('5500')
        }
    });
};

/**
 * Update card status
 */
export const updateCardStatus = (req: Request, res: Response): void => {
    const { pan } = req.params;
    const { status } = req.body;

    const validStatuses = ['ACTIVE', 'BLOCKED', 'EXPIRED', 'PENDING'];
    if (!validStatuses.includes(status)) {
        res.status(400).json({
            success: false,
            error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
        return;
    }

    const card = cardService.updateCardStatus(pan, status);

    if (!card) {
        res.status(404).json({
            success: false,
            error: 'Card not found'
        });
        return;
    }

    res.json({
        success: true,
        data: {
            pan: card.maskedPan,
            status: card.status,
            updatedAt: card.updatedAt
        }
    });
};

/**
 * Delete card
 */
export const deleteCard = (req: Request, res: Response): void => {
    const { pan } = req.params;

    const deleted = cardService.deleteCard(pan);

    if (!deleted) {
        res.status(404).json({
            success: false,
            error: 'Card not found'
        });
        return;
    }

    res.json({
        success: true,
        message: 'Card deleted successfully'
    });
};

/**
 * Validate PAN with Luhn
 */
export const validatePan = (req: Request, res: Response): void => {
    const { pan } = req.body;

    if (!pan) {
        res.status(400).json({
            success: false,
            error: 'pan is required'
        });
        return;
    }

    const isValid = validateLuhn(pan);
    const network = getCardNetwork(pan);

    res.json({
        success: true,
        data: {
            pan: maskPan(pan),
            valid: isValid,
            network,
            length: pan.length
        },
        _educational: {
            algorithm: 'Luhn (ISO/IEC 7812)',
            description: 'Checksum formula to validate identification numbers',
            steps: [
                '1. Starting from rightmost digit, double every second digit',
                '2. If doubling results in number > 9, subtract 9',
                '3. Sum all digits',
                '4. If total modulo 10 equals 0, number is valid'
            ]
        }
    });
};

/**
 * Validate card for transaction
 */
export const validateCardForTransaction = (req: Request, res: Response): void => {
    const { pan, cvv, expiryMonth, expiryYear } = req.body;

    if (!pan || !cvv || !expiryMonth || !expiryYear) {
        res.status(400).json({
            success: false,
            error: 'pan, cvv, expiryMonth, and expiryYear are required'
        });
        return;
    }

    const result = cardService.validateCard(pan, cvv, expiryMonth, expiryYear);

    res.json({
        success: result.valid,
        error: result.error,
        data: result.valid ? {
            cardType: result.card?.cardType,
            status: result.card?.status,
            issuerId: result.card?.issuerId
        } : undefined
    });
};
