-- Migration 018: Expand CTF categories to support premium challenge catalog.

DO $$
DECLARE
    constraint_to_drop text;
BEGIN
    SELECT tc.constraint_name
    INTO constraint_to_drop
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc
      ON cc.constraint_name = tc.constraint_name
    WHERE tc.table_schema = 'learning'
      AND tc.table_name = 'ctf_challenges'
      AND tc.constraint_type = 'CHECK'
      AND tc.constraint_name <> 'ctf_challenges_category_check'
      AND cc.check_clause LIKE '%category%'
    ORDER BY tc.constraint_name
    LIMIT 1;

    IF constraint_to_drop IS NOT NULL THEN
        EXECUTE format('ALTER TABLE learning.ctf_challenges DROP CONSTRAINT IF EXISTS %I', constraint_to_drop);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'learning'
          AND t.relname = 'ctf_challenges'
          AND c.conname = 'ctf_challenges_category_check'
    ) THEN
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
    END IF;
END $$;
