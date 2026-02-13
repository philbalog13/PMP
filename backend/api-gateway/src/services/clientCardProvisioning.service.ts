import bcrypt from 'bcrypt';
import { query } from '../config/database';
import { logger } from '../utils/logger';

export const CLIENT_CARD_TYPES = ['DEBIT', 'CREDIT', 'PREPAID'] as const;
export type ClientCardType = (typeof CLIENT_CARD_TYPES)[number];

export const CLIENT_CARD_NETWORKS = ['VISA', 'MASTERCARD', 'CB', 'AMEX'] as const;
export type ClientCardNetwork = (typeof CLIENT_CARD_NETWORKS)[number];

type IssueClientCardInput = {
    clientId: string;
    amount: number;
    cardholderName?: string | null;
    cardType?: ClientCardType;
    network?: ClientCardNetwork;
    isAutoIssued?: boolean;
};

const DEFAULT_AUTO_CARD_BALANCE = 1000;
const DEFAULT_CARD_TYPE: ClientCardType = 'DEBIT';
const DEFAULT_CARD_NETWORK: ClientCardNetwork = 'VISA';
const DEFAULT_CARD_CVV = '123';
const PAN_LENGTH = 16;
const CARDHOLDER_MAX_LENGTH = 100;
const MAX_CREATE_ATTEMPTS = 5;

const PAN_PREFIX_BY_NETWORK: Record<ClientCardNetwork, string> = {
    VISA: '4916',
    MASTERCARD: '5568',
    CB: '4970',
    AMEX: '3714'
};

let cachedIsAutoIssuedColumnAvailable: boolean | null = null;

const toNumber = (value: any): number => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const randomDigits = (length: number): string => {
    let output = '';
    for (let index = 0; index < length; index++) {
        output += Math.floor(Math.random() * 10);
    }
    return output;
};

const normalizeCardholderName = (value: string | null | undefined): string | null => {
    if (!value) {
        return null;
    }

    const normalized = value
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, CARDHOLDER_MAX_LENGTH);

    if (!normalized) {
        return null;
    }

    return normalized;
};

const generatePan = (network: ClientCardNetwork): string => {
    const prefix = PAN_PREFIX_BY_NETWORK[network] || PAN_PREFIX_BY_NETWORK.VISA;
    const missingDigits = Math.max(PAN_LENGTH - prefix.length, 0);
    return `${prefix}${randomDigits(missingDigits)}`;
};

const maskPan = (pan: string): string => {
    if (pan.length <= 8) {
        return pan;
    }

    return `${pan.slice(0, 4)}****${pan.slice(-4)}`;
};

const generateExpiryDate = (): string => {
    const now = new Date();
    const expiry = new Date(now.setFullYear(now.getFullYear() + 2));
    const month = String(expiry.getMonth() + 1).padStart(2, '0');
    const year = String(expiry.getFullYear()).slice(-2);
    return `${month}/${year}`;
};

export const isAutoIssuedColumnAvailable = async (): Promise<boolean> => {
    if (cachedIsAutoIssuedColumnAvailable !== null) {
        return cachedIsAutoIssuedColumnAvailable;
    }

    const result = await query(
        `SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'client'
              AND table_name = 'virtual_cards'
              AND column_name = 'is_auto_issued'
        ) AS has_column`
    );

    cachedIsAutoIssuedColumnAvailable = Boolean(result.rows[0]?.has_column);
    return cachedIsAutoIssuedColumnAvailable;
};

const resolveCardholderName = async (
    clientId: string,
    providedCardholderName?: string | null
): Promise<string> => {
    const explicitName = normalizeCardholderName(providedCardholderName);
    if (explicitName) {
        return explicitName;
    }

    const userResult = await query(
        `SELECT first_name, last_name, username, email
         FROM users.users
         WHERE id = $1`,
        [clientId]
    );

    const user = userResult.rows[0] || {};
    const candidate = [user.first_name, user.last_name]
        .filter((value: any) => Boolean(value))
        .join(' ')
        .trim() || user.username || user.email || 'CLIENT PMP';

    return normalizeCardholderName(candidate) || 'CLIENT PMP';
};

const normalizeAmount = (value: number): number => {
    return Math.round(value * 100) / 100;
};

export const isClientCardType = (value: string): value is ClientCardType => {
    return (CLIENT_CARD_TYPES as readonly string[]).includes(value);
};

export const isClientCardNetwork = (value: string): value is ClientCardNetwork => {
    return (CLIENT_CARD_NETWORKS as readonly string[]).includes(value);
};

export const issueClientCard = async (input: IssueClientCardInput) => {
    const parsedAmount = Number(input.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
        throw new Error('Card amount must be a positive number');
    }
    if (parsedAmount === 0 && input.isAutoIssued !== true) {
        throw new Error('Card amount must be a positive number');
    }

    const cardType = input.cardType || DEFAULT_CARD_TYPE;
    const network = input.network || DEFAULT_CARD_NETWORK;

    if (!isClientCardType(cardType)) {
        throw new Error('Invalid card type');
    }

    if (!isClientCardNetwork(network)) {
        throw new Error('Invalid card network');
    }

    const amount = normalizeAmount(parsedAmount);
    const expiryDate = generateExpiryDate();
    const cvvHash = await bcrypt.hash(DEFAULT_CARD_CVV, 10);
    const cardholderName = await resolveCardholderName(input.clientId, input.cardholderName);
    const autoIssuedColumnAvailable = await isAutoIssuedColumnAvailable();

    for (let attempt = 1; attempt <= MAX_CREATE_ATTEMPTS; attempt++) {
        const pan = generatePan(network);
        const maskedPan = maskPan(pan);

        try {
            const result = await query(
                autoIssuedColumnAvailable
                    ? `INSERT INTO client.virtual_cards
                        (client_id, pan, masked_pan, cardholder_name, expiry_date, cvv_hash, card_type, network, balance, is_auto_issued)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                       RETURNING
                            id,
                            masked_pan,
                            cardholder_name,
                            expiry_date,
                            card_type,
                            network,
                            status,
                            daily_limit,
                            monthly_limit,
                            single_txn_limit,
                            daily_spent,
                            monthly_spent,
                            threeds_enrolled,
                            contactless_enabled,
                            international_enabled,
                            ecommerce_enabled,
                            balance,
                            currency,
                            issue_date,
                            last_used_date,
                            is_auto_issued,
                            created_at`
                    : `INSERT INTO client.virtual_cards
                        (client_id, pan, masked_pan, cardholder_name, expiry_date, cvv_hash, card_type, network, balance)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                       RETURNING
                            id,
                            masked_pan,
                            cardholder_name,
                            expiry_date,
                            card_type,
                            network,
                            status,
                            daily_limit,
                            monthly_limit,
                            single_txn_limit,
                            daily_spent,
                            monthly_spent,
                            threeds_enrolled,
                            contactless_enabled,
                            international_enabled,
                            ecommerce_enabled,
                            balance,
                            currency,
                            issue_date,
                            last_used_date,
                            created_at`,
                autoIssuedColumnAvailable
                    ? [
                        input.clientId,
                        pan,
                        maskedPan,
                        cardholderName,
                        expiryDate,
                        cvvHash,
                        cardType,
                        network,
                        amount,
                        input.isAutoIssued === true
                    ]
                    : [
                        input.clientId,
                        pan,
                        maskedPan,
                        cardholderName,
                        expiryDate,
                        cvvHash,
                        cardType,
                        network,
                        amount
                    ]
            );

            if (result.rowCount === 0) {
                throw new Error('Failed to create card');
            }

            return {
                ...result.rows[0],
                is_auto_issued: autoIssuedColumnAvailable
                    ? Boolean(result.rows[0].is_auto_issued)
                    : false
            };
        } catch (error: any) {
            if (error?.code === '23505' && attempt < MAX_CREATE_ATTEMPTS) {
                logger.warn('PAN collision detected while creating card, retrying', {
                    clientId: input.clientId,
                    attempt
                });
                continue;
            }

            throw error;
        }
    }

    throw new Error('Unable to generate unique card PAN');
};

export const ensureAutoIssuedClientCard = async (clientId: string): Promise<void> => {
    const autoIssuedColumnAvailable = await isAutoIssuedColumnAvailable();
    const accountBalanceResult = await query(
        `SELECT balance
         FROM client.bank_accounts
         WHERE client_id = $1
         LIMIT 1`,
        [clientId]
    );
    const accountBalance = normalizeAmount(
        accountBalanceResult.rowCount && accountBalanceResult.rows[0]
            ? toNumber(accountBalanceResult.rows[0].balance)
            : DEFAULT_AUTO_CARD_BALANCE
    );

    if (autoIssuedColumnAvailable) {
        const existingAutoCard = await query(
            `SELECT id, balance
             FROM client.virtual_cards
             WHERE client_id = $1
               AND is_auto_issued = true
             LIMIT 1`,
            [clientId]
        );

        if ((existingAutoCard.rowCount || 0) > 0) {
            const currentBalance = normalizeAmount(toNumber(existingAutoCard.rows[0].balance));
            if (currentBalance !== accountBalance) {
                await query(
                    `UPDATE client.virtual_cards
                     SET balance = $2
                     WHERE id = $1`,
                    [existingAutoCard.rows[0].id, accountBalance]
                );
            }
            return;
        }
    }

    const oldestCard = await query(
        `SELECT id
         FROM client.virtual_cards
         WHERE client_id = $1
         ORDER BY created_at ASC, id ASC
         LIMIT 1`,
        [clientId]
    );

    if ((oldestCard.rowCount || 0) > 0) {
        if (autoIssuedColumnAvailable) {
            await query(
                `UPDATE client.virtual_cards
                 SET is_auto_issued = true,
                     balance = $2
                 WHERE id = $1`,
                [oldestCard.rows[0].id, accountBalance]
            );
        }
        return;
    }

    const createdCard = await issueClientCard({
        clientId,
        amount: accountBalance,
        cardType: DEFAULT_CARD_TYPE,
        network: DEFAULT_CARD_NETWORK,
        isAutoIssued: autoIssuedColumnAvailable
    });

    logger.info('Auto-issued client card created', {
        clientId,
        cardId: createdCard.id,
        cardBalance: toNumber(createdCard.balance)
    });
};

export const getAdditionalCardsAllocatedBalance = async (clientId: string): Promise<number> => {
    const autoIssuedColumnAvailable = await isAutoIssuedColumnAvailable();

    const result = await query(
        autoIssuedColumnAvailable
            ? `SELECT COALESCE(SUM(balance), 0) AS allocated_balance
               FROM client.virtual_cards
               WHERE client_id = $1
                 AND is_auto_issued = false
                 AND status <> 'CANCELLED'`
            : `WITH ranked_cards AS (
                    SELECT
                        balance,
                        ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS card_rank
                    FROM client.virtual_cards
                    WHERE client_id = $1
                      AND status <> 'CANCELLED'
               )
               SELECT COALESCE(SUM(balance) FILTER (WHERE card_rank > 1), 0) AS allocated_balance
               FROM ranked_cards`,
        [clientId]
    );

    return normalizeAmount(toNumber(result.rows[0]?.allocated_balance));
};
