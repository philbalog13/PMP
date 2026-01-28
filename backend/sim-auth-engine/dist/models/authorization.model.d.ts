/**
 * Authorization Models
 * Core interfaces for the authorization engine
 */
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
export type RuleCategory = 'BALANCE' | 'CARD_STATUS' | 'LIMITS' | 'FRAUD' | 'SECURITY' | 'VELOCITY' | 'CUSTOM';
/**
 * Rule definition for creating rules
 * (without the function - uses rule code)
 */
export interface RuleDefinition {
    id: string;
    name: string;
    description: string;
    ruleCode: string;
    parameters?: Record<string, unknown>;
    action: RuleAction;
    responseCode: string;
    responseMessage: string;
    priority: number;
    enabled: boolean;
    category: RuleCategory;
}
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
export type TransactionType = 'PURCHASE' | 'CASH_ADVANCE' | 'REFUND' | 'VOID' | 'BALANCE_INQUIRY' | 'TRANSFER';
/**
 * Card status
 */
export type CardStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'EXPIRED' | 'STOLEN' | 'LOST' | 'PENDING_ACTIVATION';
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
/**
 * Account status
 */
export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'CLOSED';
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
export declare const ResponseCodes: {
    readonly '00': "Approved";
    readonly '01': "Refer to card issuer";
    readonly '03': "Invalid merchant";
    readonly '04': "Pick up card";
    readonly '05': "Do not honor";
    readonly '12': "Invalid transaction";
    readonly '13': "Invalid amount";
    readonly '14': "Invalid card number";
    readonly '30': "Format error";
    readonly '41': "Lost card - pick up";
    readonly '43': "Stolen card - pick up";
    readonly '51': "Insufficient funds";
    readonly '54': "Expired card";
    readonly '55': "Invalid PIN";
    readonly '57': "Transaction not permitted";
    readonly '58': "Transaction not permitted to terminal";
    readonly '59': "Suspected fraud";
    readonly '61': "Exceeds withdrawal limit";
    readonly '62': "Restricted card";
    readonly '63': "Security violation";
    readonly '65': "Soft decline - 3DS required";
    readonly '68': "Response received too late";
    readonly '75': "PIN tries exceeded";
    readonly '85': "No reason to decline";
    readonly '91': "Issuer unavailable";
    readonly '94': "Duplicate transaction";
    readonly '96': "System malfunction";
};
export type ResponseCode = keyof typeof ResponseCodes;
export type SimulationScenario = 'APPROVED' | 'INSUFFICIENT_FUNDS' | 'EXPIRED_CARD' | 'STOLEN_CARD' | 'OVER_LIMIT' | 'VELOCITY_EXCEEDED' | '3DS_REQUIRED' | 'FRAUD_SUSPECTED' | 'SYSTEM_ERROR';
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
//# sourceMappingURL=authorization.model.d.ts.map