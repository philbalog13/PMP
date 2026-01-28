/**
 * Authorization Models
 * Core interfaces for the authorization engine
 */

// ===========================================
// Authorization Rules
// ===========================================

/**
 * Action to take when a rule matches
 */
export type RuleAction = 'APPROVE' | 'DENY' | 'REVIEW' | 'REFER';

import { RuleCondition } from '../engine/RuleParser';

/**
 * Authorization Rule Interface
 * Defines a configurable rule for transaction processing
 */
export interface AuthorizationRule {
    /** Unique rule identifier */
    id: string;

    /** Human-readable rule name */
    name: string;

    /** Description of what the rule does */
    description: string;

    /** Condition function to evaluate */
    condition: RuleCondition;

    /** Action to take when condition matches */
    action: RuleAction;

    /** ISO 8583 response code (00, 51, 54, etc.) */
    responseCode: string;

    /** Response message */
    responseMessage: string;

    /** Priority (lower = higher priority, evaluated first) */
    priority: number;

    /** Whether rule is active */
    enabled: boolean;

    /** Category for grouping */
    category: RuleCategory;

    /** Creation timestamp */
    createdAt: Date;

    /** Last update timestamp */
    updatedAt: Date;
}

/**
 * Rule categories for organization
 */
export type RuleCategory =
    | 'BALANCE'      // Balance-related rules
    | 'CARD_STATUS'  // Card status rules
    | 'LIMITS'       // Transaction limits
    | 'FRAUD'        // Fraud detection
    | 'SECURITY'     // Security (3DS, etc.)
    | 'VELOCITY'     // Transaction velocity
    | 'CUSTOM';      // Custom rules

/**
 * Rule definition for creating rules
 * (without the function - uses rule code)
 */
export interface RuleDefinition {
    id: string;
    name: string;
    description: string;
    ruleCode: string; // Code identifier for built-in conditions
    parameters?: Record<string, unknown>;
    action: RuleAction;
    responseCode: string;
    responseMessage: string;
    priority: number;
    enabled: boolean;
    category: RuleCategory;
}

// ===========================================
// Transaction Context
// ===========================================

/**
 * Authorization context - all data needed for authorization
 */
export interface AuthorizationContext {
    /** Transaction being authorized */
    transaction: Transaction;

    /** Card information */
    card: Card;

    /** Account information */
    account: Account;

    /** Transaction history */
    history: TransactionHistory;

    /** Current timestamp */
    timestamp: Date;

    /** Additional metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Transaction to be authorized
 */
export interface Transaction {
    /** System Trace Audit Number */
    stan: string;

    /** Primary Account Number (masked in logs) */
    pan: string;

    /** Message Type Indicator */
    mti: string;

    /** Processing code */
    processingCode: string;

    /** Transaction amount */
    amount: number;

    /** Currency code (EUR, USD, etc.) */
    currency: string;

    /** Transaction type */
    type: TransactionType;

    /** Merchant ID */
    merchantId: string;

    /** Terminal ID */
    terminalId: string;

    /** Merchant Category Code */
    mcc: string;

    /** Point of Service Entry Mode */
    posEntryMode: string;

    /** PIN entered? */
    pinEntered: boolean;

    /** PIN block (encrypted) */
    pinBlock?: string;

    /** CVV provided? */
    cvvProvided: boolean;

    /** 3DS authenticated? */
    threeDsAuthenticated: boolean;

    /** Recurring transaction? */
    isRecurring: boolean;

    /** E-commerce transaction? */
    isEcommerce: boolean;

    /** Geographic location */
    location?: {
        country: string;
        city?: string;
        latitude?: number;
        longitude?: number;
    };

    /** Timestamp */
    timestamp: Date;
}

export type TransactionType =
    | 'PURCHASE'
    | 'CASH_ADVANCE'
    | 'REFUND'
    | 'VOID'
    | 'BALANCE_INQUIRY'
    | 'TRANSFER';

// ===========================================
// Card Model
// ===========================================

/**
 * Card status
 */
export type CardStatus =
    | 'ACTIVE'
    | 'INACTIVE'
    | 'BLOCKED'
    | 'EXPIRED'
    | 'STOLEN'
    | 'LOST'
    | 'PENDING_ACTIVATION';

/**
 * Card information
 */
export interface Card {
    /** Primary Account Number */
    pan: string;

    /** Masked PAN for display */
    maskedPan: string;

    /** Expiry date (MMYY) */
    expiryDate: string;

    /** Card status */
    status: CardStatus;

    /** Card type */
    cardType: 'DEBIT' | 'CREDIT' | 'PREPAID';

    /** Card network */
    network: 'VISA' | 'MASTERCARD' | 'AMEX' | 'DISCOVER';

    /** Cardholder name */
    cardholderName: string;

    /** CVV (for validation, not stored in production) */
    cvv: string;

    /** PIN hash (pedagogical) */
    pinHash: string;

    /** 3DS enrolled? */
    threeDsEnrolled: boolean;

    /** Contactless enabled? */
    contactlessEnabled: boolean;

    /** International enabled? */
    internationalEnabled: boolean;

    /** Ecommerce enabled? */
    ecommerceEnabled: boolean;

    /** Linked account ID */
    accountId: string;

    /** Issue date */
    issueDate: Date;

    /** Last used date */
    lastUsedDate?: Date;

    /** Consecutive failed PIN attempts */
    failedPinAttempts: number;

    /** PIN blocked? */
    pinBlocked: boolean;
}

// ===========================================
// Account Model
// ===========================================

/**
 * Account status
 */
export type AccountStatus =
    | 'ACTIVE'
    | 'INACTIVE'
    | 'BLOCKED'
    | 'CLOSED';

/**
 * Account information
 */
export interface Account {
    /** Account ID */
    id: string;

    /** Account number (IBAN-like) */
    accountNumber: string;

    /** Account holder name */
    holderName: string;

    /** Current balance */
    balance: number;

    /** Available balance (accounting for holds) */
    availableBalance: number;

    /** Currency */
    currency: string;

    /** Account type */
    accountType: 'CHECKING' | 'SAVINGS' | 'CREDIT';

    /** Account status */
    status: AccountStatus;

    /** Credit limit (for credit accounts) */
    creditLimit?: number;

    /** Daily transaction limit */
    dailyLimit: number;

    /** Single transaction limit */
    singleTxnLimit: number;

    /** Monthly limit */
    monthlyLimit: number;

    /** Amount spent today */
    dailySpent: number;

    /** Amount spent this month */
    monthlySpent: number;

    /** Number of transactions today */
    dailyTxnCount: number;

    /** Date of last daily reset */
    lastDailyReset: Date;

    /** Date of last monthly reset */
    lastMonthlyReset: Date;

    /** Overdraft allowed? */
    overdraftAllowed: boolean;

    /** Overdraft limit */
    overdraftLimit: number;

    /** Account creation date */
    createdAt: Date;

    /** Last activity date */
    lastActivity: Date;
}

// ===========================================
// Transaction History
// ===========================================

/**
 * Historical transaction record
 */
export interface TransactionRecord {
    /** Transaction ID */
    id: string;

    /** STAN */
    stan: string;

    /** PAN (masked) */
    maskedPan: string;

    /** Amount */
    amount: number;

    /** Currency */
    currency: string;

    /** Transaction type */
    type: TransactionType;

    /** Status */
    status: 'APPROVED' | 'DECLINED' | 'PENDING' | 'REVERSED';

    /** Response code */
    responseCode: string;

    /** Authorization code */
    authorizationCode?: string;

    /** Merchant ID */
    merchantId: string;

    /** MCC */
    mcc: string;

    /** Location */
    location?: string;

    /** Timestamp */
    timestamp: Date;

    /** Rules that matched */
    matchedRules: string[];
}

/**
 * Transaction history for a card/account
 */
export interface TransactionHistory {
    /** Recent transactions (last 30 days) */
    recentTransactions: TransactionRecord[];

    /** Total count in period */
    totalCount: number;

    /** Total approved amount in period */
    totalApprovedAmount: number;

    /** Total declined count */
    declinedCount: number;

    /** Last transaction date */
    lastTransactionDate?: Date;

    /** Distinct merchants count */
    distinctMerchants: number;

    /** Distinct countries */
    distinctCountries: string[];
}

// ===========================================
// Authorization Response
// ===========================================

/**
 * Authorization decision result
 */
export interface AuthorizationResult {
    /** Decision */
    approved: boolean;

    /** ISO 8583 response code */
    responseCode: string;

    /** Response message */
    responseMessage: string;

    /** Authorization code (if approved) */
    authorizationCode?: string;

    /** Rules that matched */
    matchedRules: MatchedRule[];

    /** Processing time (ms) */
    processingTime: number;

    /** Timestamp */
    timestamp: Date;

    /** Recommendations */
    recommendations?: string[];
}

/**
 * Information about a matched rule
 */
export interface MatchedRule {
    /** Rule ID */
    ruleId: string;

    /** Rule name */
    ruleName: string;

    /** Action taken */
    action: RuleAction;

    /** Response code */
    responseCode: string;

    /** Whether this was the deciding rule */
    wasDeciding: boolean;
}

// ===========================================
// Response Codes (ISO 8583)
// ===========================================

export const ResponseCodes = {
    '00': 'Approved',
    '01': 'Refer to card issuer',
    '03': 'Invalid merchant',
    '04': 'Pick up card',
    '05': 'Do not honor',
    '12': 'Invalid transaction',
    '13': 'Invalid amount',
    '14': 'Invalid card number',
    '30': 'Format error',
    '41': 'Lost card - pick up',
    '43': 'Stolen card - pick up',
    '51': 'Insufficient funds',
    '54': 'Expired card',
    '55': 'Invalid PIN',
    '57': 'Transaction not permitted',
    '58': 'Transaction not permitted to terminal',
    '59': 'Suspected fraud',
    '61': 'Exceeds withdrawal limit',
    '62': 'Restricted card',
    '63': 'Security violation',
    '65': 'Soft decline - 3DS required',
    '68': 'Response received too late',
    '75': 'PIN tries exceeded',
    '85': 'No reason to decline',
    '91': 'Issuer unavailable',
    '94': 'Duplicate transaction',
    '96': 'System malfunction',
} as const;

export type ResponseCode = keyof typeof ResponseCodes;

// ===========================================
// Simulation Scenarios
// ===========================================

export type SimulationScenario =
    | 'APPROVED'
    | 'INSUFFICIENT_FUNDS'
    | 'EXPIRED_CARD'
    | 'STOLEN_CARD'
    | 'OVER_LIMIT'
    | 'VELOCITY_EXCEEDED'
    | '3DS_REQUIRED'
    | 'FRAUD_SUSPECTED'
    | 'SYSTEM_ERROR';

export interface SimulationRequest {
    scenario: SimulationScenario;
    amount?: number;
    pan?: string;
    merchantId?: string;
}

export interface SimulationResult extends AuthorizationResult {
    scenario: SimulationScenario;
    description: string;
}
