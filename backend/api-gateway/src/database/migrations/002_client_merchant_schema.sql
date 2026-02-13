-- Migration 002: Client and Merchant Schema for PMP
-- Tables for virtual cards, transactions, POS terminals, and merchant data

-- Create schemas if not exist
CREATE SCHEMA IF NOT EXISTS client;
CREATE SCHEMA IF NOT EXISTS merchant;

-- =============================================================================
-- VIRTUAL CARDS TABLE (CLIENT)
-- Virtual payment cards for simulation
-- =============================================================================
CREATE TABLE IF NOT EXISTS client.virtual_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    pan VARCHAR(19) NOT NULL UNIQUE,
    masked_pan VARCHAR(19) NOT NULL,
    cardholder_name VARCHAR(100) NOT NULL,
    expiry_date VARCHAR(5) NOT NULL, -- MM/YY format
    cvv_hash VARCHAR(255) NOT NULL,
    card_type VARCHAR(20) DEFAULT 'DEBIT' CHECK (card_type IN ('DEBIT', 'CREDIT', 'PREPAID')),
    network VARCHAR(20) DEFAULT 'VISA' CHECK (network IN ('VISA', 'MASTERCARD', 'CB', 'AMEX')),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BLOCKED', 'EXPIRED', 'CANCELLED')),

    -- Limits
    daily_limit DECIMAL(15, 2) DEFAULT 1000.00,
    monthly_limit DECIMAL(15, 2) DEFAULT 5000.00,
    single_txn_limit DECIMAL(15, 2) DEFAULT 500.00,
    daily_spent DECIMAL(15, 2) DEFAULT 0.00,
    monthly_spent DECIMAL(15, 2) DEFAULT 0.00,

    -- Features
    threeds_enrolled BOOLEAN DEFAULT true,
    contactless_enabled BOOLEAN DEFAULT true,
    international_enabled BOOLEAN DEFAULT false,
    ecommerce_enabled BOOLEAN DEFAULT true,

    -- Balance (for prepaid cards)
    balance DECIMAL(15, 2) DEFAULT 1000.00,
    currency VARCHAR(3) DEFAULT 'EUR',

    -- Security
    pin_hash VARCHAR(255),
    failed_pin_attempts INTEGER DEFAULT 0,
    pin_blocked BOOLEAN DEFAULT false,

    -- Timestamps
    issue_date TIMESTAMP DEFAULT NOW(),
    last_used_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for card lookups
CREATE INDEX IF NOT EXISTS idx_virtual_cards_client_id ON client.virtual_cards(client_id);
CREATE INDEX IF NOT EXISTS idx_virtual_cards_pan ON client.virtual_cards(pan);
CREATE INDEX IF NOT EXISTS idx_virtual_cards_status ON client.virtual_cards(status);

-- =============================================================================
-- TRANSACTIONS TABLE (SHARED)
-- Payment transactions for both clients and merchants
-- =============================================================================
CREATE TABLE IF NOT EXISTS client.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(50) UNIQUE NOT NULL,
    stan VARCHAR(12),

    -- Card info
    card_id UUID REFERENCES client.virtual_cards(id),
    masked_pan VARCHAR(19),

    -- Parties
    client_id UUID REFERENCES users.users(id),
    merchant_id UUID REFERENCES users.users(id),

    -- Amount
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',

    -- Transaction details
    type VARCHAR(30) NOT NULL CHECK (type IN ('PURCHASE', 'REFUND', 'PREAUTH', 'CAPTURE', 'VOID', 'WITHDRAWAL', 'TRANSFER')),
    status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED', 'REFUNDED', 'REVERSED')),
    response_code VARCHAR(3),
    authorization_code VARCHAR(10),

    -- Merchant info
    merchant_name VARCHAR(100),
    merchant_mcc VARCHAR(4),
    merchant_location VARCHAR(200),
    terminal_id VARCHAR(20),

    -- 3DS info
    threeds_version VARCHAR(10),
    threeds_status VARCHAR(20),
    eci VARCHAR(2),

    -- ISO 8583 raw data (for educational purposes)
    iso_message JSONB,

    -- Fraud detection
    fraud_score DECIMAL(5, 2),
    fraud_rules_triggered JSONB,

    -- Timestamps
    timestamp TIMESTAMP DEFAULT NOW(),
    settled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for transaction lookups
CREATE INDEX IF NOT EXISTS idx_transactions_client_id ON client.transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant_id ON client.transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_card_id ON client.transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON client.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON client.transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON client.transactions(transaction_id);

-- =============================================================================
-- POS TERMINALS TABLE (MERCHANT)
-- Virtual POS terminals for merchants
-- =============================================================================
CREATE TABLE IF NOT EXISTS merchant.pos_terminals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    terminal_id VARCHAR(20) UNIQUE NOT NULL,
    terminal_name VARCHAR(100),
    terminal_type VARCHAR(30) DEFAULT 'STANDARD' CHECK (terminal_type IN ('STANDARD', 'MPOS', 'SOFTPOS', 'ECOMMERCE', 'VPOS')),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'BLOCKED')),

    -- Configuration
    accepts_contactless BOOLEAN DEFAULT true,
    accepts_chip BOOLEAN DEFAULT true,
    accepts_magstripe BOOLEAN DEFAULT false,
    accepts_manual_entry BOOLEAN DEFAULT true,
    supports_3ds BOOLEAN DEFAULT true,

    -- Location
    location_name VARCHAR(100),
    address VARCHAR(200),
    city VARCHAR(100),
    country VARCHAR(2) DEFAULT 'FR',

    -- Business
    mcc VARCHAR(4) NOT NULL,
    merchant_name VARCHAR(100) NOT NULL,

    -- Timestamps
    last_transaction_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for POS lookups
CREATE INDEX IF NOT EXISTS idx_pos_terminals_merchant_id ON merchant.pos_terminals(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pos_terminals_terminal_id ON merchant.pos_terminals(terminal_id);
CREATE INDEX IF NOT EXISTS idx_pos_terminals_status ON merchant.pos_terminals(status);

-- =============================================================================
-- MERCHANT REPORTS TABLE
-- Daily/weekly/monthly reports for merchants
-- =============================================================================
CREATE TABLE IF NOT EXISTS merchant.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM')),
    report_date DATE NOT NULL,

    -- Summary
    total_transactions INTEGER DEFAULT 0,
    total_amount DECIMAL(15, 2) DEFAULT 0.00,
    total_refunds INTEGER DEFAULT 0,
    refund_amount DECIMAL(15, 2) DEFAULT 0.00,
    net_amount DECIMAL(15, 2) DEFAULT 0.00,

    -- Breakdown
    approved_count INTEGER DEFAULT 0,
    declined_count INTEGER DEFAULT 0,
    pending_count INTEGER DEFAULT 0,

    -- By card type
    visa_amount DECIMAL(15, 2) DEFAULT 0.00,
    mastercard_amount DECIMAL(15, 2) DEFAULT 0.00,
    other_amount DECIMAL(15, 2) DEFAULT 0.00,

    -- Data
    data JSONB,

    -- Status
    status VARCHAR(20) DEFAULT 'GENERATED' CHECK (status IN ('PENDING', 'GENERATED', 'EXPORTED')),

    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(merchant_id, report_type, report_date)
);

-- Index for report lookups
CREATE INDEX IF NOT EXISTS idx_merchant_reports_merchant_id ON merchant.reports(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_reports_report_date ON merchant.reports(report_date);

-- =============================================================================
-- API KEYS TABLE (MERCHANT)
-- API keys for merchant integrations
-- =============================================================================
CREATE TABLE IF NOT EXISTS merchant.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    key_name VARCHAR(100) NOT NULL,
    api_key_hash VARCHAR(255) NOT NULL,
    api_key_prefix VARCHAR(10) NOT NULL, -- First 8 chars for identification

    -- Permissions
    permissions JSONB DEFAULT '["transactions.read", "transactions.create"]'::jsonb,

    -- Restrictions
    allowed_ips JSONB,
    rate_limit_per_minute INTEGER DEFAULT 60,

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP,

    -- Timestamps
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP
);

-- Index for API key lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_merchant_id ON merchant.api_keys(merchant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON merchant.api_keys(api_key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON merchant.api_keys(is_active);

-- =============================================================================
-- WEBHOOKS TABLE (MERCHANT)
-- Webhook configurations for merchants
-- =============================================================================
CREATE TABLE IF NOT EXISTS merchant.webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    events JSONB NOT NULL DEFAULT '["transaction.approved", "transaction.declined"]'::jsonb,
    secret_hash VARCHAR(255) NOT NULL,

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP,
    consecutive_failures INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_webhooks_merchant_id ON merchant.webhooks(merchant_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON merchant.webhooks(is_active);

-- =============================================================================
-- TRIGGER: Update updated_at timestamp
-- =============================================================================
CREATE OR REPLACE FUNCTION client.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION merchant.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_virtual_cards_updated_at ON client.virtual_cards;
CREATE TRIGGER update_virtual_cards_updated_at
    BEFORE UPDATE ON client.virtual_cards
    FOR EACH ROW EXECUTE FUNCTION client.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pos_terminals_updated_at ON merchant.pos_terminals;
CREATE TRIGGER update_pos_terminals_updated_at
    BEFORE UPDATE ON merchant.pos_terminals
    FOR EACH ROW EXECUTE FUNCTION merchant.update_updated_at_column();

DROP TRIGGER IF EXISTS update_webhooks_updated_at ON merchant.webhooks;
CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON merchant.webhooks
    FOR EACH ROW EXECUTE FUNCTION merchant.update_updated_at_column();

-- =============================================================================
-- VIEWS: Merchant Dashboard Stats
-- =============================================================================
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
    ) as approval_rate
FROM users.users m
LEFT JOIN client.transactions t ON m.id = t.merchant_id
    AND DATE(t.timestamp) = CURRENT_DATE
WHERE m.role = 'ROLE_MARCHAND'
GROUP BY m.id;

-- =============================================================================
-- VIEWS: Client Card Summary
-- =============================================================================
DROP VIEW IF EXISTS client.card_summary;
CREATE OR REPLACE VIEW client.card_summary AS
SELECT
    c.id as client_id,
    COUNT(vc.id) as total_cards,
    COUNT(CASE WHEN vc.status = 'ACTIVE' THEN 1 END) as active_cards,
    COALESCE(SUM(vc.balance), 0) as total_balance,
    (
        SELECT COUNT(*)
        FROM client.transactions t
        WHERE t.client_id = c.id
        AND DATE(t.timestamp) = CURRENT_DATE
    ) as transactions_today
FROM users.users c
LEFT JOIN client.virtual_cards vc ON c.id = vc.client_id
WHERE c.role = 'ROLE_CLIENT'
GROUP BY c.id;
