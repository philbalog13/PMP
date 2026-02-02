-- Create schemas
CREATE SCHEMA IF NOT EXISTS client;
CREATE SCHEMA IF NOT EXISTS merchant;

-- Client: Virtual Cards
CREATE TABLE IF NOT EXISTS client.virtual_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES users.users(id),
    pan VARCHAR(20),
    masked_pan VARCHAR(20),
    cardholder_name VARCHAR(100),
    expiry_date VARCHAR(10),
    cvv_hash VARCHAR(100),
    card_type VARCHAR(20) DEFAULT 'DEBIT',
    network VARCHAR(20) DEFAULT 'VISA',
    status VARCHAR(20) DEFAULT 'ACTIVE',
    daily_limit DECIMAL DEFAULT 1000,
    monthly_limit DECIMAL DEFAULT 5000,
    single_txn_limit DECIMAL DEFAULT 500,
    daily_spent DECIMAL DEFAULT 0,
    monthly_spent DECIMAL DEFAULT 0,
    balance DECIMAL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'EUR',
    threeds_enrolled BOOLEAN DEFAULT FALSE,
    contactless_enabled BOOLEAN DEFAULT TRUE,
    international_enabled BOOLEAN DEFAULT TRUE,
    ecommerce_enabled BOOLEAN DEFAULT TRUE,
    issue_date TIMESTAMP DEFAULT NOW(),
    last_used_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- Merchant: POS Terminals
CREATE TABLE IF NOT EXISTS merchant.pos_terminals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES users.users(id),
    terminal_id VARCHAR(50) UNIQUE,
    terminal_name VARCHAR(100),
    terminal_type VARCHAR(20),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    mcc VARCHAR(10),
    merchant_name VARCHAR(100),
    location_name VARCHAR(100),
    address VARCHAR(200),
    city VARCHAR(100),
    country VARCHAR(100),
    accepts_contactless BOOLEAN DEFAULT TRUE,
    accepts_chip BOOLEAN DEFAULT TRUE,
    accepts_magstripe BOOLEAN DEFAULT TRUE,
    accepts_manual_entry BOOLEAN DEFAULT FALSE,
    supports_3ds BOOLEAN DEFAULT FALSE,
    last_transaction_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Client: Transactions (also used for Merchant view)
CREATE TABLE IF NOT EXISTS client.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(50) UNIQUE,
    stan VARCHAR(20),
    card_id UUID REFERENCES client.virtual_cards(id),
    client_id UUID REFERENCES users.users(id),
    merchant_id UUID REFERENCES users.users(id),
    terminal_id VARCHAR(50), 
    masked_pan VARCHAR(20),
    amount DECIMAL,
    currency VARCHAR(3),
    type VARCHAR(20), -- PURCHASE, REFUND
    status VARCHAR(20), -- APPROVED, DECLINED, PENDING
    response_code VARCHAR(10),
    authorization_code VARCHAR(20),
    merchant_name VARCHAR(100),
    merchant_mcc VARCHAR(10),
    merchant_location VARCHAR(100),
    threeds_version VARCHAR(10),
    threeds_status VARCHAR(10),
    eci VARCHAR(10),
    fraud_score INTEGER,
    settled_at TIMESTAMP,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Merchant: API Keys
CREATE TABLE IF NOT EXISTS merchant.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES users.users(id),
    key_name VARCHAR(100),
    api_key_hash VARCHAR(100),
    api_key_prefix VARCHAR(20),
    permissions JSONB,
    allowed_ips JSONB,
    rate_limit_per_minute INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMP,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Merchant: Reports
CREATE TABLE IF NOT EXISTS merchant.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES users.users(id),
    report_type VARCHAR(50),
    report_date DATE,
    total_transactions INTEGER,
    total_amount DECIMAL,
    total_refunds INTEGER,
    refund_amount DECIMAL,
    net_amount DECIMAL,
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);
