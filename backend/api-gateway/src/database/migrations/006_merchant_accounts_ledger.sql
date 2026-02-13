-- Migration 006: Advanced Merchant Accounts & Ledger
-- Adds merchant settlement accounts, immutable ledger entries, and SQL helpers.

CREATE TABLE IF NOT EXISTS merchant.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL UNIQUE REFERENCES users.users(id) ON DELETE CASCADE,
    account_number VARCHAR(34) NOT NULL UNIQUE
        DEFAULT ('MRC' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 21))),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'UNDER_REVIEW', 'SUSPENDED', 'CLOSED')),

    available_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    pending_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    reserve_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,

    fee_percent DECIMAL(6, 4) NOT NULL DEFAULT 1.5000,
    fixed_fee DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    minimum_payout_amount DECIMAL(15, 2) NOT NULL DEFAULT 10.00,
    settlement_delay_days INTEGER NOT NULL DEFAULT 1,

    total_volume DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_refunds DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_fees DECIMAL(15, 2) NOT NULL DEFAULT 0.00,

    last_settlement_at TIMESTAMP,
    last_payout_at TIMESTAMP,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CHECK (fee_percent >= 0),
    CHECK (fixed_fee >= 0),
    CHECK (minimum_payout_amount >= 0),
    CHECK (settlement_delay_days >= 0)
);

CREATE INDEX IF NOT EXISTS idx_merchant_accounts_status ON merchant.accounts(status);
CREATE INDEX IF NOT EXISTS idx_merchant_accounts_updated_at ON merchant.accounts(updated_at DESC);

CREATE TABLE IF NOT EXISTS merchant.account_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES merchant.accounts(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,

    entry_type VARCHAR(30) NOT NULL
        CHECK (entry_type IN (
            'PURCHASE',
            'REFUND',
            'VOID',
            'SETTLEMENT_IN',
            'SETTLEMENT_OUT',
            'FEE',
            'PAYOUT',
            'ADJUSTMENT',
            'RESERVE_HOLD',
            'RESERVE_RELEASE',
            'CHARGEBACK',
            'INCIDENT'
        )),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('CREDIT', 'DEBIT')),
    balance_bucket VARCHAR(10) NOT NULL CHECK (balance_bucket IN ('AVAILABLE', 'PENDING', 'RESERVE')),

    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    balance_before DECIMAL(15, 2) NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,

    related_transaction_id VARCHAR(50),
    reference VARCHAR(100),
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMP DEFAULT NOW(),
    effective_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_account_entries_merchant_id ON merchant.account_entries(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_account_entries_account_created ON merchant.account_entries(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_merchant_account_entries_type_created ON merchant.account_entries(entry_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_merchant_account_entries_related_txn ON merchant.account_entries(related_transaction_id);

CREATE OR REPLACE FUNCTION merchant.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_merchant_accounts_updated_at ON merchant.accounts;
CREATE TRIGGER update_merchant_accounts_updated_at
    BEFORE UPDATE ON merchant.accounts
    FOR EACH ROW EXECUTE FUNCTION merchant.update_updated_at_column();

-- Backfill one account per existing merchant.
INSERT INTO merchant.accounts (merchant_id)
SELECT u.id
FROM users.users u
WHERE u.role = 'ROLE_MARCHAND'
ON CONFLICT (merchant_id) DO NOTHING;

CREATE OR REPLACE FUNCTION merchant.ensure_account_exists(p_merchant_id UUID)
RETURNS UUID AS $$
DECLARE
    v_account_id UUID;
BEGIN
    INSERT INTO merchant.accounts (merchant_id)
    SELECT u.id
    FROM users.users u
    WHERE u.id = p_merchant_id
      AND u.role = 'ROLE_MARCHAND'
    ON CONFLICT (merchant_id) DO NOTHING;

    SELECT a.id
    INTO v_account_id
    FROM merchant.accounts a
    WHERE a.merchant_id = p_merchant_id;

    IF v_account_id IS NULL THEN
        RAISE EXCEPTION 'Merchant account not found for merchant_id=%', p_merchant_id
            USING ERRCODE = 'P0001';
    END IF;

    RETURN v_account_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION merchant.apply_account_entry(
    p_merchant_id UUID,
    p_entry_type VARCHAR,
    p_direction VARCHAR,
    p_balance_bucket VARCHAR,
    p_amount DECIMAL(15, 2),
    p_related_transaction_id VARCHAR DEFAULT NULL,
    p_reference VARCHAR DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_allow_negative BOOLEAN DEFAULT false
)
RETURNS TABLE (
    entry_id UUID,
    account_id UUID,
    available_balance DECIMAL(15, 2),
    pending_balance DECIMAL(15, 2),
    reserve_balance DECIMAL(15, 2),
    currency VARCHAR(3),
    total_volume DECIMAL(15, 2),
    total_refunds DECIMAL(15, 2),
    total_fees DECIMAL(15, 2)
) AS $$
DECLARE
    v_account merchant.accounts%ROWTYPE;
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

    IF p_balance_bucket NOT IN ('AVAILABLE', 'PENDING', 'RESERVE') THEN
        RAISE EXCEPTION 'Invalid balance bucket: %', p_balance_bucket
            USING ERRCODE = '22023';
    END IF;

    IF p_metadata IS NULL THEN
        p_metadata := '{}'::jsonb;
    END IF;

    PERFORM merchant.ensure_account_exists(p_merchant_id);

    SELECT *
    INTO v_account
    FROM merchant.accounts a
    WHERE a.merchant_id = p_merchant_id
    FOR UPDATE;

    v_signed_amount := CASE WHEN p_direction = 'CREDIT' THEN p_amount ELSE -p_amount END;

    CASE p_balance_bucket
        WHEN 'AVAILABLE' THEN
            v_balance_before := v_account.available_balance;
            v_balance_after := v_account.available_balance + v_signed_amount;
        WHEN 'PENDING' THEN
            v_balance_before := v_account.pending_balance;
            v_balance_after := v_account.pending_balance + v_signed_amount;
        ELSE
            v_balance_before := v_account.reserve_balance;
            v_balance_after := v_account.reserve_balance + v_signed_amount;
    END CASE;

    IF NOT p_allow_negative AND v_balance_after < 0 THEN
        RAISE EXCEPTION 'Insufficient funds in % bucket', p_balance_bucket
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE merchant.accounts a
    SET
        available_balance = CASE
            WHEN p_balance_bucket = 'AVAILABLE' THEN a.available_balance + v_signed_amount
            ELSE a.available_balance
        END,
        pending_balance = CASE
            WHEN p_balance_bucket = 'PENDING' THEN a.pending_balance + v_signed_amount
            ELSE a.pending_balance
        END,
        reserve_balance = CASE
            WHEN p_balance_bucket = 'RESERVE' THEN a.reserve_balance + v_signed_amount
            ELSE a.reserve_balance
        END,
        total_volume = a.total_volume + CASE
            WHEN p_entry_type = 'PURCHASE' AND p_direction = 'CREDIT' THEN p_amount
            ELSE 0
        END,
        total_refunds = a.total_refunds + CASE
            WHEN p_entry_type IN ('REFUND', 'VOID') AND p_direction = 'DEBIT' THEN p_amount
            ELSE 0
        END,
        total_fees = a.total_fees + CASE
            WHEN p_entry_type = 'FEE' AND p_direction = 'DEBIT' THEN p_amount
            ELSE 0
        END,
        last_settlement_at = CASE
            WHEN p_entry_type = 'SETTLEMENT_IN' THEN NOW()
            ELSE a.last_settlement_at
        END,
        last_payout_at = CASE
            WHEN p_entry_type = 'PAYOUT' THEN NOW()
            ELSE a.last_payout_at
        END,
        updated_at = NOW()
    WHERE a.id = v_account.id
    RETURNING a.*
    INTO v_account;

    INSERT INTO merchant.account_entries (
        account_id,
        merchant_id,
        entry_type,
        direction,
        balance_bucket,
        amount,
        currency,
        balance_before,
        balance_after,
        related_transaction_id,
        reference,
        description,
        metadata
    ) VALUES (
        v_account.id,
        p_merchant_id,
        p_entry_type,
        p_direction,
        p_balance_bucket,
        p_amount,
        v_account.currency,
        v_balance_before,
        v_balance_after,
        p_related_transaction_id,
        p_reference,
        p_description,
        p_metadata
    )
    RETURNING id
    INTO entry_id;

    account_id := v_account.id;
    available_balance := v_account.available_balance;
    pending_balance := v_account.pending_balance;
    reserve_balance := v_account.reserve_balance;
    currency := v_account.currency;
    total_volume := v_account.total_volume;
    total_refunds := v_account.total_refunds;
    total_fees := v_account.total_fees;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION merchant.settle_pending_funds(
    p_merchant_id UUID,
    p_amount DECIMAL(15, 2) DEFAULT NULL,
    p_fee_percent DECIMAL(6, 4) DEFAULT NULL,
    p_fixed_fee DECIMAL(15, 2) DEFAULT NULL
)
RETURNS TABLE (
    settled_amount DECIMAL(15, 2),
    fee_amount DECIMAL(15, 2),
    net_amount DECIMAL(15, 2),
    available_balance DECIMAL(15, 2),
    pending_balance DECIMAL(15, 2),
    reserve_balance DECIMAL(15, 2),
    currency VARCHAR(3)
) AS $$
DECLARE
    v_account merchant.accounts%ROWTYPE;
    v_settle_amount DECIMAL(15, 2);
    v_fee_percent DECIMAL(6, 4);
    v_fixed_fee DECIMAL(15, 2);
    v_fee_amount DECIMAL(15, 2);
BEGIN
    PERFORM merchant.ensure_account_exists(p_merchant_id);

    SELECT *
    INTO v_account
    FROM merchant.accounts a
    WHERE a.merchant_id = p_merchant_id
    FOR UPDATE;

    v_settle_amount := COALESCE(p_amount, v_account.pending_balance);
    v_settle_amount := LEAST(v_settle_amount, v_account.pending_balance);

    IF v_settle_amount <= 0 THEN
        RAISE EXCEPTION 'No pending balance available for settlement'
            USING ERRCODE = 'P0001';
    END IF;

    v_fee_percent := COALESCE(p_fee_percent, v_account.fee_percent);
    v_fixed_fee := COALESCE(p_fixed_fee, v_account.fixed_fee);

    v_fee_amount := ROUND(((v_settle_amount * v_fee_percent) / 100.0) + v_fixed_fee, 2);
    v_fee_amount := GREATEST(v_fee_amount, 0);
    v_fee_amount := LEAST(v_fee_amount, v_settle_amount);

    PERFORM merchant.apply_account_entry(
        p_merchant_id,
        'SETTLEMENT_OUT',
        'DEBIT',
        'PENDING',
        v_settle_amount,
        NULL,
        'SETTLEMENT',
        'Release pending funds for settlement',
        jsonb_build_object('phase', 'out'),
        false
    );

    PERFORM merchant.apply_account_entry(
        p_merchant_id,
        'SETTLEMENT_IN',
        'CREDIT',
        'AVAILABLE',
        v_settle_amount,
        NULL,
        'SETTLEMENT',
        'Credit available balance from settlement',
        jsonb_build_object('phase', 'in'),
        false
    );

    IF v_fee_amount > 0 THEN
        PERFORM merchant.apply_account_entry(
            p_merchant_id,
            'FEE',
            'DEBIT',
            'AVAILABLE',
            v_fee_amount,
            NULL,
            'SETTLEMENT_FEE',
            'Settlement commission and processing fee',
            jsonb_build_object('feePercent', v_fee_percent, 'fixedFee', v_fixed_fee),
            false
        );
    END IF;

    SELECT *
    INTO v_account
    FROM merchant.accounts a
    WHERE a.merchant_id = p_merchant_id;

    settled_amount := v_settle_amount;
    fee_amount := v_fee_amount;
    net_amount := v_settle_amount - v_fee_amount;
    available_balance := v_account.available_balance;
    pending_balance := v_account.pending_balance;
    reserve_balance := v_account.reserve_balance;
    currency := v_account.currency;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION merchant.create_payout(
    p_merchant_id UUID,
    p_amount DECIMAL(15, 2),
    p_reference VARCHAR DEFAULT NULL,
    p_allow_overdraft BOOLEAN DEFAULT false
)
RETURNS TABLE (
    payout_amount DECIMAL(15, 2),
    available_balance DECIMAL(15, 2),
    pending_balance DECIMAL(15, 2),
    reserve_balance DECIMAL(15, 2),
    currency VARCHAR(3),
    payout_reference VARCHAR
) AS $$
DECLARE
    v_account merchant.accounts%ROWTYPE;
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Payout amount must be greater than zero'
            USING ERRCODE = '22003';
    END IF;

    PERFORM merchant.ensure_account_exists(p_merchant_id);

    SELECT *
    INTO v_account
    FROM merchant.accounts a
    WHERE a.merchant_id = p_merchant_id
    FOR UPDATE;

    IF p_amount < v_account.minimum_payout_amount THEN
        RAISE EXCEPTION 'Minimum payout amount is %', v_account.minimum_payout_amount
            USING ERRCODE = 'P0001';
    END IF;

    IF NOT p_allow_overdraft AND v_account.available_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient available balance for payout'
            USING ERRCODE = 'P0001';
    END IF;

    PERFORM merchant.apply_account_entry(
        p_merchant_id,
        'PAYOUT',
        'DEBIT',
        'AVAILABLE',
        p_amount,
        NULL,
        COALESCE(p_reference, 'PAYOUT'),
        'Merchant payout request',
        jsonb_build_object('allowOverdraft', p_allow_overdraft),
        p_allow_overdraft
    );

    SELECT *
    INTO v_account
    FROM merchant.accounts a
    WHERE a.merchant_id = p_merchant_id;

    payout_amount := p_amount;
    available_balance := v_account.available_balance;
    pending_balance := v_account.pending_balance;
    reserve_balance := v_account.reserve_balance;
    currency := v_account.currency;
    payout_reference := COALESCE(p_reference, 'PAYOUT');

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

DROP VIEW IF EXISTS merchant.account_overview;
CREATE OR REPLACE VIEW merchant.account_overview AS
SELECT
    a.merchant_id,
    a.account_number,
    a.currency,
    a.status,
    a.available_balance,
    a.pending_balance,
    a.reserve_balance,
    (a.available_balance + a.pending_balance - a.reserve_balance) AS gross_balance,
    a.total_volume,
    a.total_refunds,
    a.total_fees,
    a.last_settlement_at,
    a.last_payout_at,
    a.updated_at
FROM merchant.accounts a;

-- Extend dashboard view with account balances.
DROP VIEW IF EXISTS merchant.dashboard_stats;
CREATE OR REPLACE VIEW merchant.dashboard_stats AS
SELECT
    m.id as merchant_id,
    COUNT(t.id) as total_transactions_today,
    COALESCE(SUM(CASE WHEN t.status = 'APPROVED' THEN t.amount ELSE 0 END), 0) as revenue_today,
    COALESCE(SUM(CASE WHEN t.type = 'REFUND' THEN t.amount ELSE 0 END), 0) as refunds_today,
    COUNT(CASE WHEN t.status = 'APPROVED' THEN 1 END) as approved_count,
    COUNT(CASE WHEN t.status = 'DECLINED' THEN 1 END) as declined_count,
    ROUND(
        CASE
            WHEN COUNT(t.id) > 0
            THEN (COUNT(CASE WHEN t.status = 'APPROVED' THEN 1 END)::decimal / COUNT(t.id)) * 100
            ELSE 0
        END, 2
    ) as approval_rate,
    COALESCE(a.available_balance, 0) as available_balance,
    COALESCE(a.pending_balance, 0) as pending_balance,
    COALESCE(a.reserve_balance, 0) as reserve_balance,
    COALESCE(a.currency, 'EUR') as account_currency
FROM users.users m
LEFT JOIN client.transactions t ON m.id = t.merchant_id
    AND DATE(t.timestamp) = CURRENT_DATE
LEFT JOIN merchant.accounts a ON m.id = a.merchant_id
WHERE m.role = 'ROLE_MARCHAND'
GROUP BY m.id, a.available_balance, a.pending_balance, a.reserve_balance, a.currency;
