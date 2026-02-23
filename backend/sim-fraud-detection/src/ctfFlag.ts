import * as crypto from 'crypto';

const FLAG_BASES: Record<string, string> = {
    'FRAUD-001': 'FRAUD_FAILOPEN_APPROVE',
    'FRAUD-002': 'FRAUD_SCORE_GAMING',
    'REPLAY-001': 'REPLAY_NO_DEDUP',
    'REPLAY-002': 'VELOCITY_RESET_ON_RESTART',
    // Phase 2 — Advanced Fraud
    'ADV-FRAUD-001': 'CARD_TESTING_UNDETECTED',
    'ADV-FRAUD-002': 'SPLIT_PAYMENT_NO_AGGREGATION',
    'ADV-FRAUD-003': 'VELOCITY_PAN_ONLY_NO_DEVICE',
    'ADV-FRAUD-004': 'ML_SCORE_EVASION',
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
