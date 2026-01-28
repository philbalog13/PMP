import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { generatePan, validateLuhn, getCardNetwork, maskPan } from './luhn.service';

export interface Card {
    id: string;
    pan: string;
    maskedPan: string;
    cvv: string;
    expiryMonth: number;
    expiryYear: number;
    cardholderName: string;
    cardType: string;
    status: 'ACTIVE' | 'BLOCKED' | 'EXPIRED' | 'PENDING';
    issuerId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateCardRequest {
    cardholderName: string;
    cardType?: 'VISA' | 'MASTERCARD' | 'AMEX' | 'DISCOVER';
    issuerId?: string;
}

// In-memory storage (would be PostgreSQL in production)
const cards: Map<string, Card> = new Map();

// Pre-populate with test cards
const initTestCards = () => {
    const testCards: Omit<Card, 'id' | 'createdAt' | 'updatedAt'>[] = [
        {
            pan: '4111111111111111',
            maskedPan: maskPan('4111111111111111'),
            cvv: '123',
            expiryMonth: 12,
            expiryYear: 2028,
            cardholderName: 'TEST VISA USER',
            cardType: 'VISA',
            status: 'ACTIVE',
            issuerId: 'ISS001'
        },
        {
            pan: '5500000000000004',
            maskedPan: maskPan('5500000000000004'),
            cvv: '456',
            expiryMonth: 6,
            expiryYear: 2027,
            cardholderName: 'TEST MASTERCARD USER',
            cardType: 'MASTERCARD',
            status: 'ACTIVE',
            issuerId: 'ISS001'
        },
        {
            pan: '4000000000000002',
            maskedPan: maskPan('4000000000000002'),
            cvv: '789',
            expiryMonth: 3,
            expiryYear: 2025,
            cardholderName: 'EXPIRED CARD USER',
            cardType: 'VISA',
            status: 'EXPIRED',
            issuerId: 'ISS001'
        },
        {
            pan: '4000000000000051',
            maskedPan: maskPan('4000000000000051'),
            cvv: '321',
            expiryMonth: 12,
            expiryYear: 2028,
            cardholderName: 'INSUFFICIENT FUNDS',
            cardType: 'VISA',
            status: 'ACTIVE',
            issuerId: 'ISS001'
        }
    ];

    testCards.forEach(card => {
        const id = uuidv4();
        cards.set(card.pan, {
            ...card,
            id,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    });
};

initTestCards();

/**
 * Generate CVV (random 3 digits)
 */
const generateCvv = (): string => {
    return Math.floor(100 + Math.random() * 900).toString();
};

/**
 * Get expiry date (current date + configured years)
 */
const getExpiryDate = (): { month: number; year: number } => {
    const now = new Date();
    return {
        month: now.getMonth() + 1,
        year: now.getFullYear() + config.cardDefaults.expiryYears
    };
};

/**
 * Create a new card
 */
export const createCard = (request: CreateCardRequest): Card => {
    const cardType = request.cardType || 'VISA';
    const bins = config.bins[cardType];
    const bin = bins[Math.floor(Math.random() * bins.length)];

    const pan = generatePan(bin, 16);
    const cvv = generateCvv();
    const expiry = getExpiryDate();

    const card: Card = {
        id: uuidv4(),
        pan,
        maskedPan: maskPan(pan),
        cvv,
        expiryMonth: expiry.month,
        expiryYear: expiry.year,
        cardholderName: request.cardholderName.toUpperCase(),
        cardType,
        status: 'ACTIVE',
        issuerId: request.issuerId || 'ISS001',
        createdAt: new Date(),
        updatedAt: new Date()
    };

    cards.set(pan, card);
    return card;
};

/**
 * Get all cards (paginated)
 */
export const getAllCards = (page: number = 1, limit: number = 20): { cards: Card[]; total: number } => {
    const allCards = Array.from(cards.values());
    const start = (page - 1) * limit;
    const paginatedCards = allCards.slice(start, start + limit);

    // Return without sensitive data
    const sanitizedCards = paginatedCards.map(card => ({
        ...card,
        cvv: '***' // Hide CVV in list
    }));

    return {
        cards: sanitizedCards,
        total: allCards.length
    };
};

/**
 * Get card by PAN
 */
export const getCardByPan = (pan: string): Card | null => {
    return cards.get(pan) || null;
};

/**
 * Update card status
 */
export const updateCardStatus = (pan: string, status: Card['status']): Card | null => {
    const card = cards.get(pan);
    if (!card) return null;

    card.status = status;
    card.updatedAt = new Date();
    cards.set(pan, card);

    return card;
};

/**
 * Delete card
 */
export const deleteCard = (pan: string): boolean => {
    return cards.delete(pan);
};

/**
 * Validate card for transaction
 */
export const validateCard = (pan: string, cvv: string, expiryMonth: number, expiryYear: number): {
    valid: boolean;
    error?: string;
    card?: Card;
} => {
    // Luhn validation
    if (!validateLuhn(pan)) {
        return { valid: false, error: 'Invalid card number (Luhn check failed)' };
    }

    const card = cards.get(pan);
    if (!card) {
        return { valid: false, error: 'Card not found' };
    }

    if (card.cvv !== cvv) {
        return { valid: false, error: 'Invalid CVV' };
    }

    if (card.expiryMonth !== expiryMonth || card.expiryYear !== expiryYear) {
        return { valid: false, error: 'Invalid expiry date' };
    }

    if (card.status !== 'ACTIVE') {
        return { valid: false, error: `Card is ${card.status.toLowerCase()}` };
    }

    // Check if expired
    const now = new Date();
    const expiryDate = new Date(expiryYear, expiryMonth - 1);
    if (expiryDate < now) {
        return { valid: false, error: 'Card has expired' };
    }

    return { valid: true, card };
};
