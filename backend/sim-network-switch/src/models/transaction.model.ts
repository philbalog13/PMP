/**
 * Transaction Models - ISO 8583 Inspired
 * Interfaces for payment transaction messages
 */

/**
 * Card network types supported by the switch
 */
export enum CardNetwork {
    VISA = 'VISA',
    MASTERCARD = 'MASTERCARD',
    AMEX = 'AMEX',
    DISCOVER = 'DISCOVER',
    UNIONPAY = 'UNIONPAY',
    UNKNOWN = 'UNKNOWN',
}

/**
 * Transaction types (ISO 8583 Processing Code)
 */
export enum TransactionType {
    PURCHASE = '00',
    CASH_ADVANCE = '01',
    REFUND = '20',
    BALANCE_INQUIRY = '30',
    TRANSFER = '40',
}

/**
 * Transaction status
 */
export enum TransactionStatus {
    PENDING = 'PENDING',
    ROUTING = 'ROUTING',
    SENT_TO_ISSUER = 'SENT_TO_ISSUER',
    APPROVED = 'APPROVED',
    DECLINED = 'DECLINED',
    TIMEOUT = 'TIMEOUT',
    ERROR = 'ERROR',
}

/**
 * ISO 8583 Response Codes
 */
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
    '41': 'Lost card',
    '43': 'Stolen card',
    '51': 'Insufficient funds',
    '54': 'Expired card',
    '55': 'Invalid PIN',
    '57': 'Transaction not permitted',
    '58': 'Transaction not permitted to terminal',
    '59': 'Suspected fraud',
    '61': 'Exceeds withdrawal limit',
    '62': 'Restricted card',
    '63': 'Security violation',
    '65': 'Exceeds withdrawal frequency',
    '68': 'Response received too late',
    '75': 'PIN tries exceeded',
    '91': 'Issuer unavailable',
    '94': 'Duplicate transaction',
    '96': 'System malfunction',
} as const;

export type ResponseCode = keyof typeof ResponseCodes;

/**
 * Incoming transaction request from acquirer
 */
export interface TransactionRequest {
    // Message Type Indicator (ISO 8583)
    mti: string;

    // Primary Account Number (Card Number)
    pan: string;

    // Processing Code (Transaction Type)
    processingCode: string;

    // Transaction Amount
    amount: number;
    currency: string;

    // Date/Time
    transmissionDateTime: string;
    localTransactionTime: string;
    localTransactionDate: string;

    // System Trace Audit Number
    stan: string;

    // Terminal Information
    terminalId: string;
    merchantId: string;
    merchantCategoryCode: string;

    // Card Information
    expiryDate: string;

    // Encrypted PIN Block (if present)
    pinBlock?: string;

    // Point of Service Entry Mode
    posEntryMode: string;

    // Acquirer Reference
    acquirerReferenceNumber: string;

    // Additional Data
    additionalData?: Record<string, unknown>;
}

/**
 * Transaction response to acquirer
 */
export interface TransactionResponse {
    // Original request reference
    stan: string;
    acquirerReferenceNumber: string;

    // Response
    responseCode: ResponseCode;
    responseMessage: string;

    // Authorization (if approved)
    authorizationCode?: string;

    // Network routing info
    networkId: CardNetwork;
    issuerRoutingInfo: string;

    // Timestamps
    processedAt: string;
    responseTime: number; // ms

    // Additional response data
    additionalData?: Record<string, unknown>;
}

/**
 * Internal routing decision
 */
export interface RoutingDecision {
    network: CardNetwork;
    issuerUrl: string;
    priority: number;
    fallbackUrl?: string;
    routingReason: string;
}

/**
 * BIN (Bank Identification Number) Configuration
 */
export interface BinConfig {
    binPrefix: string;
    network: CardNetwork;
    issuerCode: string;
    issuerName: string;
    cardType: 'CREDIT' | 'DEBIT' | 'PREPAID';
    country: string;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
    status: 'healthy' | 'degraded' | 'unhealthy';
    version: string;
    uptime: number;
    timestamp: string;
    checks: {
        name: string;
        status: 'pass' | 'fail' | 'warn';
        message?: string;
        responseTime?: number;
    }[];
    metrics?: {
        requestsPerMinute: number;
        averageResponseTime: number;
        errorRate: number;
    };
}

/**
 * Service dependency status
 */
export interface DependencyStatus {
    name: string;
    url: string;
    status: 'connected' | 'disconnected' | 'degraded';
    latency: number;
    lastCheck: string;
    circuitBreakerState: 'closed' | 'open' | 'half-open';
}
