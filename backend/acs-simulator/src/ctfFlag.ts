import * as crypto from 'crypto';

const FLAG_BASES: Record<string, string> = {
    '3DS-001': '3DS_STATIC_OTP',
    '3DS-002': '3DS_BACKDOOR_SUCCESS',
    '3DS-003': 'SCA_THRESHOLD_BYPASS',
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
