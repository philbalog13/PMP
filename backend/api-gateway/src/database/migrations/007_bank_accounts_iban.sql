-- Migration 007: Unified bank accounts + IBAN provisioning
-- - Creates client bank accounts with IBAN
-- - Adds IBAN metadata to merchant settlement accounts
-- - Provisions banking data automatically for CLIENT/MARCHAND users

CREATE SCHEMA IF NOT EXISTS bank;

-- -----------------------------------------------------------------------------
-- IBAN helpers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION bank.to_numeric_iban(input_value TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    idx INTEGER;
    ch TEXT;
BEGIN
    IF input_value IS NULL THEN
        RETURN '';
    END IF;

    FOR idx IN 1..LENGTH(UPPER(input_value)) LOOP
        ch := SUBSTRING(UPPER(input_value) FROM idx FOR 1);

        IF ch ~ '[0-9]' THEN
            result := result || ch;
        ELSIF ch ~ '[A-Z]' THEN
            result := result || (ASCII(ch) - 55)::TEXT;
        END IF;
    END LOOP;

    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION bank.mod97(input_value TEXT)
RETURNS INTEGER AS $$
DECLARE
    remainder NUMERIC := 0;
    idx INTEGER;
BEGIN
    IF input_value IS NULL OR input_value = '' THEN
        RETURN 0;
    END IF;

    FOR idx IN 1..LENGTH(input_value) LOOP
        remainder := MOD((remainder * 10) + SUBSTRING(input_value FROM idx FOR 1)::INTEGER, 97);
    END LOOP;

    RETURN remainder::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- -----------------------------------------------------------------------------
-- Client bank accounts + entries
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL UNIQUE REFERENCES users.users(id) ON DELETE CASCADE,
    iban VARCHAR(34) NOT NULL UNIQUE,
    bic VARCHAR(11) NOT NULL DEFAULT 'PMPAFRPPXXX',
    account_holder_name VARCHAR(150) NOT NULL,
    account_label VARCHAR(120) NOT NULL DEFAULT 'Compte principal',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'FROZEN', 'CLOSED')),
    balance DECIMAL(15, 2) NOT NULL DEFAULT 2500.00,
    available_balance DECIMAL(15, 2) NOT NULL DEFAULT 2500.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    daily_transfer_limit DECIMAL(15, 2) NOT NULL DEFAULT 2000.00,
    monthly_transfer_limit DECIMAL(15, 2) NOT NULL DEFAULT 20000.00,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CHECK (balance >= 0),
    CHECK (available_balance >= 0),
    CHECK (daily_transfer_limit >= 0),
    CHECK (monthly_transfer_limit >= 0)
);

CREATE INDEX IF NOT EXISTS idx_client_bank_accounts_status ON client.bank_accounts(status);
CREATE INDEX IF NOT EXISTS idx_client_bank_accounts_updated_at ON client.bank_accounts(updated_at DESC);

CREATE TABLE IF NOT EXISTS client.bank_account_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES client.bank_accounts(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    entry_type VARCHAR(30) NOT NULL
        CHECK (entry_type IN ('OPENING', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT', 'CARD_TOPUP')),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('CREDIT', 'DEBIT')),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    balance_before DECIMAL(15, 2) NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,
    reference VARCHAR(120),
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_bank_entries_client_id ON client.bank_account_entries(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_bank_entries_account_id ON client.bank_account_entries(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_bank_entries_type ON client.bank_account_entries(entry_type, created_at DESC);

DROP TRIGGER IF EXISTS update_client_bank_accounts_updated_at ON client.bank_accounts;
CREATE TRIGGER update_client_bank_accounts_updated_at
    BEFORE UPDATE ON client.bank_accounts
    FOR EACH ROW EXECUTE FUNCTION client.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Merchant account enrichment
-- -----------------------------------------------------------------------------
ALTER TABLE merchant.accounts
    ADD COLUMN IF NOT EXISTS iban VARCHAR(34),
    ADD COLUMN IF NOT EXISTS bic VARCHAR(11) NOT NULL DEFAULT 'PMPAFRPPXXX',
    ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS card_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_merchant_accounts_iban_unique
    ON merchant.accounts(iban)
    WHERE iban IS NOT NULL;

CREATE OR REPLACE FUNCTION bank.generate_iban_fr()
RETURNS VARCHAR(34) AS $$
DECLARE
    bank_code TEXT := '20041';
    branch_code TEXT;
    account_number TEXT;
    key_code TEXT;
    bban TEXT;
    numeric_form TEXT;
    check_digits INTEGER;
    iban_value VARCHAR(34);
BEGIN
    LOOP
        branch_code := LPAD((FLOOR(RANDOM() * 100000)::INT)::TEXT, 5, '0');
        account_number := LPAD((FLOOR(RANDOM() * 100000000000)::BIGINT)::TEXT, 11, '0');
        key_code := LPAD((FLOOR(RANDOM() * 100)::INT)::TEXT, 2, '0');

        bban := bank_code || branch_code || account_number || key_code;
        numeric_form := bank.to_numeric_iban(bban || 'FR00');
        check_digits := 98 - bank.mod97(numeric_form);
        iban_value := 'FR' || LPAD(check_digits::TEXT, 2, '0') || bban;

        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM client.bank_accounts c WHERE c.iban = iban_value
            UNION ALL
            SELECT 1 FROM merchant.accounts m WHERE m.iban = iban_value
        );
    END LOOP;

    RETURN iban_value;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- Client account SQL helpers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION client.ensure_bank_account_exists(p_client_id UUID)
RETURNS UUID AS $$
DECLARE
    v_account_id UUID;
    v_iban VARCHAR(34);
    v_holder_name TEXT;
    v_opening_balance DECIMAL(15, 2) := 2500.00;
BEGIN
    SELECT id
    INTO v_account_id
    FROM client.bank_accounts
    WHERE client_id = p_client_id;

    IF v_account_id IS NOT NULL THEN
        RETURN v_account_id;
    END IF;

    SELECT
        COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''),
            u.username,
            u.email,
            'Client Account'
        )
    INTO v_holder_name
    FROM users.users u
    WHERE u.id = p_client_id
      AND u.role = 'ROLE_CLIENT';

    IF v_holder_name IS NULL THEN
        RAISE EXCEPTION 'Client account provisioning rejected for user_id=%', p_client_id
            USING ERRCODE = 'P0001';
    END IF;

    v_iban := bank.generate_iban_fr();

    INSERT INTO client.bank_accounts (
        client_id,
        iban,
        account_holder_name,
        balance,
        available_balance
    ) VALUES (
        p_client_id,
        v_iban,
        v_holder_name,
        v_opening_balance,
        v_opening_balance
    )
    ON CONFLICT (client_id) DO NOTHING
    RETURNING id INTO v_account_id;

    IF v_account_id IS NULL THEN
        SELECT id
        INTO v_account_id
        FROM client.bank_accounts
        WHERE client_id = p_client_id;

        RETURN v_account_id;
    END IF;

    INSERT INTO client.bank_account_entries (
        account_id,
        client_id,
        entry_type,
        direction,
        amount,
        currency,
        balance_before,
        balance_after,
        reference,
        description,
        metadata
    ) VALUES (
        v_account_id,
        p_client_id,
        'OPENING',
        'CREDIT',
        v_opening_balance,
        'EUR',
        0,
        v_opening_balance,
        'OPENING',
        'Initial account funding',
        jsonb_build_object('source', 'auto-provisioning')
    );

    RETURN v_account_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION client.apply_bank_account_entry(
    p_client_id UUID,
    p_entry_type VARCHAR,
    p_direction VARCHAR,
    p_amount DECIMAL(15, 2),
    p_reference VARCHAR DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_allow_negative BOOLEAN DEFAULT false
)
RETURNS TABLE (
    entry_id UUID,
    account_id UUID,
    balance DECIMAL(15, 2),
    available_balance DECIMAL(15, 2),
    currency VARCHAR(3)
) AS $$
DECLARE
    v_account client.bank_accounts%ROWTYPE;
    v_signed_amount DECIMAL(15, 2);
    v_balance_before DECIMAL(15, 2);
    v_balance_after DECIMAL(15, 2);
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be greater than zero'
            USING ERRCODE = '22003';
    END IF;

    IF p_direction NOT IN ('CREDIT', 'DEBIT') THEN
        RAISE EXCEPTION 'Invalid direction: %', p_direction
            USING ERRCODE = '22023';
    END IF;

    IF p_metadata IS NULL THEN
        p_metadata := '{}'::jsonb;
    END IF;

    PERFORM client.ensure_bank_account_exists(p_client_id);

    SELECT *
    INTO v_account
    FROM client.bank_accounts a
    WHERE a.client_id = p_client_id
    FOR UPDATE;

    v_balance_before := v_account.balance;
    v_signed_amount := CASE WHEN p_direction = 'CREDIT' THEN p_amount ELSE -p_amount END;
    v_balance_after := v_account.balance + v_signed_amount;

    IF NOT p_allow_negative AND v_balance_after < 0 THEN
        RAISE EXCEPTION 'Insufficient funds'
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE client.bank_accounts a
    SET
        balance = a.balance + v_signed_amount,
        available_balance = a.available_balance + v_signed_amount,
        updated_at = NOW()
    WHERE a.id = v_account.id
    RETURNING a.*
    INTO v_account;

    INSERT INTO client.bank_account_entries (
        account_id,
        client_id,
        entry_type,
        direction,
        amount,
        currency,
        balance_before,
        balance_after,
        reference,
        description,
        metadata
    ) VALUES (
        v_account.id,
        p_client_id,
        p_entry_type,
        p_direction,
        p_amount,
        v_account.currency,
        v_balance_before,
        v_balance_after,
        p_reference,
        p_description,
        p_metadata
    )
    RETURNING id INTO entry_id;

    account_id := v_account.id;
    balance := v_account.balance;
    available_balance := v_account.available_balance;
    currency := v_account.currency;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- Merchant IBAN helper
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION merchant.ensure_account_iban(p_merchant_id UUID)
RETURNS UUID AS $$
DECLARE
    v_account_id UUID;
    v_iban VARCHAR(34);
    v_holder_name TEXT;
BEGIN
    SELECT merchant.ensure_account_exists(p_merchant_id)
    INTO v_account_id;

    SELECT
        a.iban,
        COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''),
            u.username,
            u.email,
            'Merchant Account'
        )
    INTO v_iban, v_holder_name
    FROM merchant.accounts a
    JOIN users.users u ON u.id = a.merchant_id
    WHERE a.merchant_id = p_merchant_id
    FOR UPDATE;

    IF v_iban IS NULL OR TRIM(v_iban) = '' THEN
        UPDATE merchant.accounts
        SET
            iban = bank.generate_iban_fr(),
            account_holder_name = COALESCE(account_holder_name, v_holder_name),
            card_enabled = false,
            updated_at = NOW()
        WHERE merchant_id = p_merchant_id;
    ELSE
        UPDATE merchant.accounts
        SET
            account_holder_name = COALESCE(account_holder_name, v_holder_name),
            card_enabled = false,
            updated_at = NOW()
        WHERE merchant_id = p_merchant_id;
    END IF;

    RETURN v_account_id;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- Backfill existing users
-- -----------------------------------------------------------------------------
UPDATE merchant.accounts
SET card_enabled = false
WHERE card_enabled IS DISTINCT FROM false;

UPDATE merchant.accounts a
SET account_holder_name = COALESCE(
    NULLIF(a.account_holder_name, ''),
    NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''),
    u.username,
    u.email,
    'Merchant Account'
)
FROM users.users u
WHERE u.id = a.merchant_id;

UPDATE merchant.accounts
SET iban = bank.generate_iban_fr()
WHERE iban IS NULL OR TRIM(iban) = '';

INSERT INTO client.bank_accounts (
    client_id,
    iban,
    account_holder_name,
    balance,
    available_balance
)
SELECT
    u.id,
    bank.generate_iban_fr(),
    COALESCE(
        NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''),
        u.username,
        u.email,
        'Client Account'
    ),
    2500.00,
    2500.00
FROM users.users u
WHERE u.role = 'ROLE_CLIENT'
ON CONFLICT (client_id) DO NOTHING;

INSERT INTO client.bank_account_entries (
    account_id,
    client_id,
    entry_type,
    direction,
    amount,
    currency,
    balance_before,
    balance_after,
    reference,
    description,
    metadata
)
SELECT
    a.id,
    a.client_id,
    'OPENING',
    'CREDIT',
    a.balance,
    a.currency,
    0,
    a.balance,
    'OPENING',
    'Initial account funding',
    jsonb_build_object('source', 'migration-007')
FROM client.bank_accounts a
WHERE NOT EXISTS (
    SELECT 1
    FROM client.bank_account_entries e
    WHERE e.account_id = a.id
);

-- -----------------------------------------------------------------------------
-- Auto-provision on user creation / role switch
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION users.provision_financial_account()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'ROLE_CLIENT' THEN
        PERFORM client.ensure_bank_account_exists(NEW.id);
    ELSIF NEW.role = 'ROLE_MARCHAND' THEN
        PERFORM merchant.ensure_account_iban(NEW.id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_provision_financial_account_insert ON users.users;
CREATE TRIGGER trg_users_provision_financial_account_insert
    AFTER INSERT ON users.users
    FOR EACH ROW EXECUTE FUNCTION users.provision_financial_account();

DROP TRIGGER IF EXISTS trg_users_provision_financial_account_role_update ON users.users;
CREATE TRIGGER trg_users_provision_financial_account_role_update
    AFTER UPDATE OF role ON users.users
    FOR EACH ROW
    WHEN (OLD.role IS DISTINCT FROM NEW.role)
    EXECUTE FUNCTION users.provision_financial_account();
