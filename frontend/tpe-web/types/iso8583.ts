/**
 * ISO 8583 Message Type Indicator
 */
export interface ISOMessage {
    mti: string; // Message Type Indicator (ex: 0100, 0110)
    bitmap: string; // Primary bitmap
    secondaryBitmap?: string; // Secondary bitmap if present
    fields: Record<number, ISOField>;
    raw?: string; // Raw message
    parsed?: Record<string, unknown>; // Parsed data
}

/**
 * ISO 8583 Field Definition
 */
export interface ISOField {
    id: number;
    name: string;
    value: string;
    format: 'n' | 'an' | 'ans' | 'b'; // numeric, alphanumeric, alphanumeric+special, binary
    length: number;
    variable?: boolean; // LLVAR, LLLVAR
}

/**
 * ISO 8583 Field Definitions (subset for pedagogical purposes)
 */
export const ISO8583_FIELDS: Record<number, { name: string; format: 'n' | 'an' | 'ans' | 'b'; maxLength: number }> = {
    0: { name: 'Message Type Indicator', format: 'n', maxLength: 4 },
    2: { name: 'Primary Account Number', format: 'n', maxLength: 19 },
    3: { name: 'Processing Code', format: 'n', maxLength: 6 },
    4: { name: 'Amount, Transaction', format: 'n', maxLength: 12 },
    7: { name: 'Transmission Date & Time', format: 'n', maxLength: 10 },
    11: { name: 'Systems Trace Audit Number', format: 'n', maxLength: 6 },
    12: { name: 'Local Transaction Time', format: 'n', maxLength: 6 },
    13: { name: 'Local Transaction Date', format: 'n', maxLength: 4 },
    14: { name: 'Expiration Date', format: 'n', maxLength: 4 },
    22: { name: 'Point of Service Entry Mode', format: 'n', maxLength: 3 },
    25: { name: 'Point of Service Condition Code', format: 'n', maxLength: 2 },
    32: { name: 'Acquiring Institution ID', format: 'n', maxLength: 11 },
    37: { name: 'Retrieval Reference Number', format: 'an', maxLength: 12 },
    38: { name: 'Authorization ID Response', format: 'an', maxLength: 6 },
    39: { name: 'Response Code', format: 'an', maxLength: 2 },
    41: { name: 'Card Acceptor Terminal ID', format: 'ans', maxLength: 8 },
    42: { name: 'Card Acceptor ID', format: 'ans', maxLength: 15 },
    43: { name: 'Card Acceptor Name/Location', format: 'ans', maxLength: 40 },
    49: { name: 'Currency Code, Transaction', format: 'an', maxLength: 3 },
    52: { name: 'PIN Data', format: 'b', maxLength: 8 },
    53: { name: 'Security Related Control Info', format: 'n', maxLength: 16 },
    54: { name: 'Additional Amounts', format: 'an', maxLength: 120 },
    55: { name: 'ICC Data – EMV', format: 'ans', maxLength: 999 },
    64: { name: 'Message Authentication Code', format: 'b', maxLength: 8 },
    90: { name: 'Original Data Elements', format: 'n', maxLength: 42 },
    95: { name: 'Replacement Amounts', format: 'an', maxLength: 42 },
    102: { name: 'Account Identification 1', format: 'ans', maxLength: 28 },
    123: { name: 'POS Data Code', format: 'ans', maxLength: 15 },
};

/**
 * Message Type Indicator Categories
 */
export const MTI_CATEGORIES = {
    '0100': 'Authorization Request',
    '0110': 'Authorization Response',
    '0120': 'Authorization Advice',
    '0121': 'Authorization Advice Repeat',
    '0200': 'Financial Request',
    '0210': 'Financial Response',
    '0220': 'Financial Advice',
    '0221': 'Financial Advice Repeat',
    '0400': 'Reversal Request',
    '0410': 'Reversal Response',
    '0420': 'Reversal Advice',
    '0421': 'Reversal Advice Repeat',
    '0800': 'Network Management Request',
    '0810': 'Network Management Response',
} as const;

/**
 * Processing Code Structure
 * Format: TTFFAA
 * TT = Transaction Type
 * FF = From Account
 * AA = To Account
 */
export interface ProcessingCode {
    transactionType: string; // 00-99
    fromAccount: string; // 00-99
    toAccount: string; // 00-99
}

/**
 * Parse Processing Code
 */
export function parseProcessingCode(code: string): ProcessingCode {
    return {
        transactionType: code.substring(0, 2),
        fromAccount: code.substring(2, 4),
        toAccount: code.substring(4, 6),
    };
}

/**
 * Response Codes (ISO 8583)
 */
export const RESPONSE_CODES = {
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
    '65': 'Soft decline - exceeds frequency limit',
    '68': 'Response received too late',
    '75': 'PIN tries exceeded',
    '91': 'Issuer unavailable',
    '94': 'Duplicate transaction',
    '96': 'System malfunction',
} as const;

/**
 * Format ISO 8583 message for display
 */
export function formatISOMessage(message: ISOMessage): string {
    let formatted = `MTI: ${message.mti} (${MTI_CATEGORIES[message.mti as keyof typeof MTI_CATEGORIES] || 'Unknown'})\n\n`;

    Object.entries(message.fields)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .forEach(([fieldId, field]) => {
            formatted += `Field ${fieldId.padStart(3, '0')}: ${field.name}\n`;
            formatted += `  Value: ${field.value}\n`;
            formatted += `  Format: ${field.format} (${field.length} chars)\n\n`;
        });

    return formatted;
}
