import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { generatePan, validateLuhn, maskPan } from './luhn.service';
import { query } from '../config/database';
import { logger } from '../utils/logger';

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
    balance?: number;
    dailyLimit?: number;
}

export interface CreateCardRequest {
    cardholderName: string;
    cardType?: 'VISA' | 'MASTERCARD' | 'AMEX' | 'DISCOVER';
    issuerId?: string;
    dailyLimit?: number;
    userId?: string;
    balance?: number;
}

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
export const createCard = async (request: CreateCardRequest): Promise<Card> => {
    const cardType = request.cardType || 'VISA';
    const bins = config.bins[cardType];
    const bin = bins[Math.floor(Math.random() * bins.length)];

    // Try generating a unique PAN (retries if collision)
    let pan = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
        pan = generatePan(bin, 16);
        const check = await query('SELECT 1 FROM cards.virtual_cards WHERE pan = $1', [pan]);
        if (check.rowCount === 0) {
            isUnique = true;
        }
        attempts++;
    }

    if (!isUnique) {
        throw new Error('Failed to generate unique PAN after 5 attempts');
    }

    const cvv = generateCvv();
    const expiry = getExpiryDate();

    // In a real system, we would hash CVV and PIN before storage
    // using crypto service. For simulation, strict separation is loose here but 
    // the DB schema expects hash. We will store raw for the 'sim' service and assume 
    // encryption happens at another layer or updated later.
    // However, to satisfy the schema NOT NULL constraint on hashes, we'll dummy hash them
    // or arguably the sim-card-service SHOULD call crypto-service first.
    // For this step, we will insert placeholder hashes to satisfy constraints.

    const cvvHash = `sha256_${cvv}`; // Placeholder
    const pinHash = `bcrypt_1234`;   // Placeholder default PIN

    const result = await query(
        `INSERT INTO cards.virtual_cards 
        (pan, cardholder_name, expiry_month, expiry_year, cvv_hash, pin_hash, balance, daily_limit, status, bin, user_id) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', $9, $10)
        RETURNING *`,
        [
            pan,
            request.cardholderName.toUpperCase(),
            expiry.month,
            expiry.year,
            cvvHash,
            pinHash,
            request.balance || 0, // Initial balance
            request.dailyLimit || 1000,
            bin,
            request.userId || null
        ]
    );

    const row = result.rows[0];

    // Return the card with sensitive data (CVV) only on creation
    return {
        id: row.id,
        pan: row.pan,
        maskedPan: maskPan(row.pan),
        cvv: cvv, // Return real CVV so user can see it once
        expiryMonth: row.expiry_month,
        expiryYear: row.expiry_year,
        cardholderName: row.cardholder_name,
        cardType: cardType,
        status: row.status,
        issuerId: request.issuerId || 'ISS001',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        balance: parseFloat(row.balance),
        dailyLimit: parseFloat(row.daily_limit)
    };
};

/**
 * Get all cards (paginated)
 */
export const getAllCards = async (page: number = 1, limit: number = 20): Promise<{ cards: Card[]; total: number }> => {
    const offset = (page - 1) * limit;

    const countRes = await query('SELECT COUNT(*) FROM cards.virtual_cards');
    const total = parseInt(countRes.rows[0].count);

    const res = await query(
        'SELECT * FROM cards.virtual_cards ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
    );

    const cards = res.rows.map(row => ({
        id: row.id,
        pan: row.pan,
        maskedPan: maskPan(row.pan),
        cvv: '***', // Masked
        expiryMonth: row.expiry_month,
        expiryYear: row.expiry_year,
        cardholderName: row.cardholder_name,
        cardType: 'VISA', // Simplified for demo
        status: row.status,
        issuerId: 'ISS001',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        balance: parseFloat(row.balance),
        dailyLimit: parseFloat(row.daily_limit)
    }));

    return { cards, total };
};

/**
 * Get card by PAN
 */
export const getCardByPan = async (pan: string): Promise<Card | null> => {
    const res = await query('SELECT * FROM cards.virtual_cards WHERE pan = $1', [pan]);

    if (res.rowCount === 0) return null;
    const row = res.rows[0];

    return {
        id: row.id,
        pan: row.pan,
        maskedPan: maskPan(row.pan),
        cvv: '***',
        expiryMonth: row.expiry_month,
        expiryYear: row.expiry_year,
        cardholderName: row.cardholder_name,
        cardType: 'VISA',
        status: row.status,
        issuerId: 'ISS001',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        balance: parseFloat(row.balance),
        dailyLimit: parseFloat(row.daily_limit)
    };
};

/**
 * Update card status
 */
export const updateCardStatus = async (pan: string, status: Card['status']): Promise<Card | null> => {
    const res = await query(
        'UPDATE cards.virtual_cards SET status = $1, updated_at = NOW() WHERE pan = $2 RETURNING *',
        [status, pan]
    );

    if (res.rowCount === 0) return null;
    const row = res.rows[0];

    return {
        id: row.id,
        pan: row.pan,
        maskedPan: maskPan(row.pan),
        cvv: '***', // Do not return CVV on update
        expiryMonth: row.expiry_month,
        expiryYear: row.expiry_year,
        cardholderName: row.cardholder_name,
        cardType: 'VISA',
        status: row.status,
        issuerId: 'ISS001',
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};

/**
 * Delete card
 */
export const deleteCard = async (pan: string): Promise<boolean> => {
    const res = await query('DELETE FROM cards.virtual_cards WHERE pan = $1', [pan]);
    return (res.rowCount ?? 0) > 0;
};

/**
 * Validate card for transaction
 */
export const validateCard = async (pan: string, cvv: string, expiryMonth: number, expiryYear: number): Promise<{
    valid: boolean;
    error?: string;
    card?: Card;
}> => {
    // Luhn validation first
    if (!validateLuhn(pan)) {
        return { valid: false, error: 'Invalid card number (Luhn check failed)' };
    }

    const res = await query('SELECT * FROM cards.virtual_cards WHERE pan = $1', [pan]);

    if (!res || (res.rowCount ?? 0) === 0) {
        return { valid: false, error: 'Card not found' };
    }

    const row = res.rows[0];

    // In simulation mode we persist a placeholder hash format: sha256_<cvv>.
    const expectedCvvHash = `sha256_${cvv}`;
    if (row.cvv_hash && row.cvv_hash !== expectedCvvHash && row.cvv_hash !== cvv) {
        return { valid: false, error: 'Invalid CVV' };
    }

    // Check expiry matches record
    if (row.expiry_month !== expiryMonth || row.expiry_year !== expiryYear) {
        return { valid: false, error: 'Invalid expiry date' };
    }

    if (row.status !== 'ACTIVE') {
        return { valid: false, error: `Card is ${row.status.toLowerCase()}` };
    }

    // Check if expired
    const now = new Date();
    const expiryDate = new Date(expiryYear, expiryMonth - 1);
    if (expiryDate < now) {
        return { valid: false, error: 'Card has expired' };
    }

    const card: Card = {
        id: row.id,
        pan: row.pan,
        maskedPan: maskPan(row.pan),
        cvv: '***',
        expiryMonth: row.expiry_month,
        expiryYear: row.expiry_year,
        cardholderName: row.cardholder_name,
        cardType: 'VISA',
        status: row.status,
        issuerId: 'ISS001',
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };

    return { valid: true, card };
};
