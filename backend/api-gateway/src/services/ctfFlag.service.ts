import * as crypto from 'crypto';

// Mapping challenge code → base flag string (sans le suffix dynamique)
const CHALLENGE_FLAG_BASES: Record<string, string> = {
    'HSM-001': 'HSM_KEYS_NO_AUTH',
    'HSM-002': 'WEAK_ZPK_KEY',
    'HSM-003': 'KEY_LEAK_IN_LOGS',
    'HSM-004': 'ECB_LEAKS_PATTERNS',
    'HSM-005': 'TIMING_ATTACK_MAC',
    'REPLAY-001': 'REPLAY_NO_DEDUP',
    'REPLAY-002': 'VELOCITY_RESET_ON_RESTART',
    '3DS-001': '3DS_STATIC_OTP',
    '3DS-002': '3DS_BACKDOOR_SUCCESS',
    '3DS-003': 'SCA_THRESHOLD_BYPASS',
    'FRAUD-001': 'FRAUD_FAILOPEN_APPROVE',
    'FRAUD-002': 'FRAUD_SCORE_GAMING',
    'ISO-001': 'BIN_TABLE_EXPOSED',
    'ISO-002': 'ISO_AMOUNT_OVERFLOW',
    'PIN-001': 'PIN_VERIFY_FAILOPEN',
    'PIN-002': 'MATH_RANDOM_PIN_BLOCK',
    'MITM-001': 'CVV_CLEARTEXT_LEAK',
    'PRIV-001': 'BALANCE_UPDATE_NO_AUTH',
    'CRYPTO-001': 'TOKEN_PREDICTABLE_PRNG',
    'CRYPTO-002': 'AUTHCODE_WEAK_PRNG',
    // THM-like rooms
    'PAY-001': 'PAY_TERMINAL_CLEARTEXT',
    'PCI-001': 'PCI_DSS_AUDIT_CHAIN',
    'SOC-001': 'SOC_ENGINEERING_WIRE',
    'API-001': 'API_BOLA_CHAIN',
    'DORA-001': 'DORA_RECOVERY_REPORT',
    // Phase 2 — EMV
    'EMV-001': 'MAGSTRIPE_FALLBACK_ACCEPTED',
    'EMV-002': 'NFC_RELAY_NO_DISTANCE',
    'EMV-003': 'TC_NOT_VERIFIED_REALTIME',
    'EMV-004': 'CHIP_TO_MAGSTRIPE_DOWNGRADE',
    'EMV-005': 'UN_SEQUENTIAL_PREPLAY',
    // Phase 2 — Tokenisation
    'TOKEN-001': 'TOKEN_VAULT_ERROR_LEAK',
    'TOKEN-002': 'TOKEN_COLLISION_DETECTED',
    'TOKEN-003': 'DETOKENIZE_NO_RATELIMIT',
    'TOKEN-004': 'FPE_KEY_DERIVATION_WEAK',
    // Phase 2 — Réseau ISO 8583
    'NET-001': 'ISO_CLEARTEXT_NO_TLS',
    'NET-002': 'ISO_SQLI_DE43',
    'NET-003': 'MTI_RESPONSE_INJECTION',
    'NET-004': 'STAN_SEQUENTIAL_REVERSAL',
    'NET-005': 'ISO_NO_MAC_INTEGRITY',
    // Phase 2 — Key Management
    'KEY-001': 'LMK_COMPONENTS_IN_FILE',
    'KEY-002': 'SHARED_KEK_ALL_TERMINALS',
    'KEY-003': 'ZPK_NEVER_ROTATED',
    'KEY-004': 'KEY_EXPORT_UNDER_WEAK',
    // Phase 2 — Fraude avancée
    'ADV-FRAUD-001': 'CARD_TESTING_UNDETECTED',
    'ADV-FRAUD-002': 'SPLIT_PAYMENT_NO_AGGREGATION',
    'ADV-FRAUD-003': 'VELOCITY_PAN_ONLY_NO_DEVICE',
    'ADV-FRAUD-004': 'ML_SCORE_EVASION',
    // Phase 2 — Infrastructure / Supply Chain
    'INFRA-001': 'MAGECART_JS_INJECTION',
    'INFRA-002': 'TMS_DEFAULT_CREDENTIALS',
    'INFRA-003': 'PCI_DATA_IN_LOGS',
    'INFRA-004': 'DEBUG_ENDPOINT_EXPOSED',
    // Phase 2 — Boss challenges
    'BOSS-001': 'FULL_CHAIN_POS_TO_ISSUER',
    'BOSS-002': 'THREE_DS_FULL_BYPASS_10K',
    'BOSS-003': 'INSIDE_JOB_FULL_CHAIN',
    'BOSS-004': 'PERFECT_HEIST_COMPLETE',
};

function getSecret(): string {
    return process.env.CTF_FLAG_SECRET || 'pmp_ctf_default_secret_change_in_prod';
}

/**
 * Génère un flag unique par étudiant et par challenge.
 * Format : PMP{BASE_XXXXXX} où XXXXXX = 6 chars hexadécimaux issus du HMAC
 * Exemple : PMP{HSM_KEYS_NO_AUTH_A1B2C3}
 */
export function generateFlag(studentId: string, challengeCode: string): string {
    const base = CHALLENGE_FLAG_BASES[challengeCode];
    if (!base) {
        throw new Error(`Unknown challenge code: ${challengeCode}`);
    }
    const hmac = crypto.createHmac('sha256', getSecret())
        .update(`${challengeCode}:${studentId}`)
        .digest('hex')
        .slice(0, 6)
        .toUpperCase();
    return `PMP{${base}_${hmac}}`;
}

/**
 * Valide un flag soumis par un étudiant pour un challenge donné.
 * Recalcule le flag attendu et compare en timing-safe.
 */
export function validateDynamicFlag(
    submitted: string,
    studentId: string,
    challengeCode: string
): boolean {
    try {
        const expected = generateFlag(studentId, challengeCode);
        const submittedNorm = submitted.trim().toUpperCase();
        const expectedNorm = expected.toUpperCase();

        const submittedBuf = Buffer.from(crypto.createHash('sha256').update(submittedNorm).digest('hex'));
        const expectedBuf = Buffer.from(crypto.createHash('sha256').update(expectedNorm).digest('hex'));

        if (submittedBuf.length !== expectedBuf.length) return false;
        return crypto.timingSafeEqual(submittedBuf, expectedBuf);
    } catch {
        return false;
    }
}

/**
 * Vérifie si un challenge code est supporté par le système de flags dynamiques.
 */
export function isDynamicFlagChallenge(challengeCode: string): boolean {
    return challengeCode in CHALLENGE_FLAG_BASES;
}
