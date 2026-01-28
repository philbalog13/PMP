"use strict";
/**
 * Authorization Models
 * Core interfaces for the authorization engine
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseCodes = void 0;
// ===========================================
// Response Codes (ISO 8583)
// ===========================================
exports.ResponseCodes = {
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
};
//# sourceMappingURL=authorization.model.js.map