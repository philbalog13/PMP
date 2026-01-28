// Transaction Types
export type TransactionType = 'PURCHASE' | 'REFUND' | 'VOID' | 'PRE_AUTH';

export type TransactionState =
    | 'idle'
    | 'amount-input'
    | 'card-wait'
    | 'processing'
    | 'approved'
    | 'declined';

export interface TransactionRequest {
    stan: string;
    pan: string;
    mti: string;
    processingCode: string;
    amount: number;
    currency: string;
    type: TransactionType;
    merchantId: string;
    terminalId: string;
    mcc: string;
    posEntryMode: string;
    pinEntered: boolean;
    pinBlock?: string;
    cvvProvided: boolean;
    threeDsAuthenticated: boolean;
    isRecurring: boolean;
    isEcommerce: boolean;
    location?: {
        country: string;
        city?: string;
    };
    timestamp: Date;
}

export interface MatchedRule {
    ruleId: string;
    ruleName: string;
    action: 'APPROVE' | 'DENY' | 'REVIEW' | 'REFER';
    responseCode: string;
    wasDeciding: boolean;
}

export interface TransactionResponse {
    approved: boolean;
    responseCode: string;
    responseMessage: string;
    authorizationCode?: string;
    matchedRules: MatchedRule[];
    processingTime: number;
    timestamp: Date;
}

export interface TransactionRecord {
    id: string;
    amount: number;
    type: TransactionType;
    status: 'APPROVED' | 'DECLINED';
    responseCode: string;
    authorizationCode?: string;
    maskedPan: string;
    timestamp: Date;
    matchedRules: string[];
}

export interface CardData {
    pan: string;
    expiryDate: string;
    cvv?: string;
    cardholderName?: string;
}

// Pedagogical Debug Types
export interface ISO8583Field {
    field: number;
    name: string;
    value: string;
    format: 'n' | 'an' | 'ans' | 'b';
}

export interface DebugData {
    request: TransactionRequest;
    response: TransactionResponse;
    iso8583Fields: ISO8583Field[];
    logs: string[];
}
