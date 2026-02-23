import * as crypto from 'crypto';

const FLAG_BASES: Record<string, string> = {
    'ISO-001': 'BIN_TABLE_EXPOSED',
    'ISO-002': 'ISO_AMOUNT_OVERFLOW',
    'MITM-001': 'CVV_CLEARTEXT_LEAK',
    'REPLAY-001': 'REPLAY_NO_DEDUP',
    // EMV challenges
    'EMV-001': 'MAGSTRIPE_FALLBACK_ACCEPTED',
    'EMV-002': 'NFC_RELAY_NO_DISTANCE',
    'EMV-003': 'TC_NOT_VERIFIED_REALTIME',
    'EMV-004': 'CHIP_TO_MAGSTRIPE_DOWNGRADE',
    'EMV-005': 'UN_SEQUENTIAL_PREPLAY',
    // Network ISO 8583 challenges
    'NET-001': 'ISO_CLEARTEXT_NO_TLS',
    'NET-002': 'ISO_SQLI_DE43',
    'NET-003': 'MTI_RESPONSE_INJECTION',
    'NET-004': 'STAN_SEQUENTIAL_REVERSAL',
    'NET-005': 'ISO_NO_MAC_INTEGRITY',
    // INFRA challenge that uses network-switch logs
    'INFRA-003': 'PCI_DATA_IN_LOGS',
    // Advanced Fraud challenges that target network-switch
    'ADV-FRAUD-001': 'CARD_TESTING_UNDETECTED',
    'ADV-FRAUD-002': 'SPLIT_PAYMENT_NO_AGGREGATION',
};

export function generateFlag(studentId: string, challengeCode: string): string | null {
    const base = FLAG_BASES[challengeCode];
    if (!base || !studentId) return null;
    const secret = process.env.CTF_FLAG_SECRET || 'pmp_ctf_default_secret_change_in_prod';
    const hmac = crypto.createHmac('sha256', secret)
        .update(`${challengeCode}:${studentId}`)
        .digest('hex')
        .slice(0, 6)
        .toUpperCase();
    return `PMP{${base}_${hmac}}`;
}
