-- Migration 019: Synchronize CTF category constraint with the premium challenge catalog.

DO $$
BEGIN
    ALTER TABLE learning.ctf_challenges
        DROP CONSTRAINT IF EXISTS ctf_challenges_category_check;

    BEGIN
        ALTER TABLE learning.ctf_challenges
            ADD CONSTRAINT ctf_challenges_category_check
            CHECK (category IN (
                'PIN_CRACKING',
                'REPLAY_ATTACK',
                'MITM',
                'FRAUD_CNP',
                'ISO8583_MANIPULATION',
                'HSM_ATTACK',
                '3DS_BYPASS',
                'CRYPTO_WEAKNESS',
                'PRIVILEGE_ESCALATION',
                'EMV_CLONING',
                'TOKEN_VAULT',
                'NETWORK_ATTACK',
                'KEY_MANAGEMENT',
                'ADVANCED_FRAUD',
                'SUPPLY_CHAIN',
                'BOSS'
            ));
    EXCEPTION
        WHEN duplicate_object THEN
            NULL;
    END;
END $$;
