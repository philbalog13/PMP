#!/bin/bash

# ==============================================
# PostgreSQL Database Initialization Script
# Plateforme Monétique Pédagogique (PMP)
# ==============================================

set -e

echo "=========================================="
echo "  PMP Database Initialization"
echo "=========================================="

# Wait for PostgreSQL to be ready
until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
  echo "Waiting for PostgreSQL to start..."
  sleep 2
done

echo "✓ PostgreSQL is ready"

# Function to execute SQL
execute_sql() {
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        $1
EOSQL
}

# ==============================================
# Create Schemas
# ==============================================

echo "Creating database schemas..."

execute_sql "
-- Drop schemas if they exist (for clean reinstall)
DROP SCHEMA IF EXISTS cards CASCADE;
DROP SCHEMA IF EXISTS transactions CASCADE;
DROP SCHEMA IF EXISTS security CASCADE;
DROP SCHEMA IF EXISTS merchants CASCADE;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS cards;
CREATE SCHEMA IF NOT EXISTS transactions;
CREATE SCHEMA IF NOT EXISTS security;
CREATE SCHEMA IF NOT EXISTS merchants;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA cards TO $POSTGRES_USER;
GRANT ALL PRIVILEGES ON SCHEMA transactions TO $POSTGRES_USER;
GRANT ALL PRIVILEGES ON SCHEMA security TO $POSTGRES_USER;
GRANT ALL PRIVILEGES ON SCHEMA merchants TO $POSTGRES_USER;
"

echo "✓ Schemas created successfully"

# ==============================================
# Create Tables - Cards Schema
# ==============================================

echo "Creating cards schema tables..."

execute_sql "
CREATE TABLE IF NOT EXISTS cards.virtual_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pan VARCHAR(16) UNIQUE NOT NULL,
    cardholder_name VARCHAR(100) NOT NULL,
    expiry_month INTEGER CHECK (expiry_month BETWEEN 1 AND 12),
    expiry_year INTEGER CHECK (expiry_year >= EXTRACT(YEAR FROM CURRENT_DATE)),
    cvv_hash VARCHAR(64) NOT NULL,
    pin_hash VARCHAR(64) NOT NULL,
    balance DECIMAL(12, 2) DEFAULT 0 CHECK (balance >= 0),
    daily_limit DECIMAL(10, 2) DEFAULT 1000,
    monthly_limit DECIMAL(12, 2) DEFAULT 5000,
    total_spent_today DECIMAL(10, 2) DEFAULT 0,
    total_spent_month DECIMAL(12, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BLOCKED', 'EXPIRED', 'SUSPENDED')),
    bin VARCHAR(6) NOT NULL,
    user_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_transaction_date DATE
);

-- Indexes for performance
CREATE INDEX idx_virtual_cards_pan ON cards.virtual_cards(pan);
CREATE INDEX idx_virtual_cards_status ON cards.virtual_cards(status);
CREATE INDEX idx_virtual_cards_user_id ON cards.virtual_cards(user_id);
CREATE INDEX idx_virtual_cards_bin ON cards.virtual_cards(bin);
"

echo "✓ Cards tables created"

# ==============================================
# Create Tables - Transactions Schema
# ==============================================

echo "Creating transactions schema tables..."

execute_sql "
CREATE TABLE IF NOT EXISTS transactions.auth_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id VARCHAR(15) NOT NULL,
    terminal_id VARCHAR(8) NOT NULL,
    pan VARCHAR(16) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DECLINED', 'TIMEOUT', 'ERROR')),
    response_code VARCHAR(2),
    auth_code VARCHAR(6),
    mcc VARCHAR(4),
    pos_entry_mode VARCHAR(3),
    processing_code VARCHAR(6),
    stan VARCHAR(6),
    fraud_score INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    timeout_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 seconds')
);

CREATE TABLE IF NOT EXISTS transactions.settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_request_id UUID REFERENCES transactions.auth_requests(id),
    merchant_id VARCHAR(15) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    settlement_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for transactions
CREATE INDEX idx_auth_requests_pan ON transactions.auth_requests(pan);
CREATE INDEX idx_auth_requests_status ON transactions.auth_requests(status, created_at DESC);
CREATE INDEX idx_auth_requests_merchant ON transactions.auth_requests(merchant_id);
CREATE INDEX idx_auth_requests_created_at ON transactions.auth_requests(created_at DESC);
CREATE INDEX idx_settlements_merchant ON transactions.settlements(merchant_id, settlement_date);
"

echo "✓ Transactions tables created"

# ==============================================
# Create Tables - Merchants Schema
# ==============================================

echo "Creating merchants schema tables..."

execute_sql "
CREATE TABLE IF NOT EXISTS merchants.merchants (
    id VARCHAR(15) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    mcc VARCHAR(4) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    daily_limit DECIMAL(12, 2) DEFAULT 100000,
    monthly_limit DECIMAL(15, 2) DEFAULT 3000000,
    country_code VARCHAR(2) DEFAULT 'FR',
    city VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS merchants.terminals (
    id VARCHAR(8) PRIMARY KEY,
    merchant_id VARCHAR(15) REFERENCES merchants.merchants(id),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    location VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_merchants_mcc ON merchants.merchants(mcc);
CREATE INDEX idx_terminals_merchant ON merchants.terminals(merchant_id);
"

echo "✓ Merchants tables created"

# ==============================================
# Create Tables - Security Schema
# ==============================================

echo "Creating security schema tables..."

execute_sql "
CREATE TABLE IF NOT EXISTS security.crypto_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_name VARCHAR(50) UNIQUE NOT NULL,
    key_type VARCHAR(20) NOT NULL CHECK (key_type IN ('KEK', 'PIN_ENC', 'MAC', 'DATA_ENC', 'CVV_KEY')),
    algorithm VARCHAR(20) NOT NULL,
    key_value_encrypted TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    rotated_at TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    max_usage INTEGER DEFAULT 100000
);

CREATE TABLE IF NOT EXISTS security.key_distribution_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id UUID REFERENCES security.crypto_keys(id),
    recipient_service VARCHAR(50) NOT NULL,
    distributed_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    user_id UUID,
    pan_last4 VARCHAR(4),
    ip_address INET,
    severity VARCHAR(20) CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_crypto_keys_type ON security.crypto_keys(key_type, status);
CREATE INDEX idx_audit_logs_service ON security.audit_logs(service_name, created_at DESC);
CREATE INDEX idx_audit_logs_severity ON security.audit_logs(severity, created_at DESC);
"

echo "✓ Security tables created"

# ==============================================
# Create Functions and Triggers
# ==============================================

echo "Creating database functions and triggers..."

execute_sql "
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS \$\$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
\$\$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_virtual_cards_updated_at BEFORE UPDATE ON cards.virtual_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE ON merchants.merchants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to reset daily spending at midnight
CREATE OR REPLACE FUNCTION reset_daily_spending()
RETURNS void AS \$\$
BEGIN
    UPDATE cards.virtual_cards
    SET total_spent_today = 0
    WHERE last_transaction_date < CURRENT_DATE;
END;
\$\$ LANGUAGE plpgsql;
"

echo "✓ Functions and triggers created"

# ==============================================
# Create Views
# ==============================================

echo "Creating database views..."

execute_sql "
-- View for transaction statistics
CREATE OR REPLACE VIEW transactions.daily_stats AS
SELECT 
    DATE(created_at) as transaction_date,
    COUNT(*) as total_transactions,
    COUNT(*) FILTER (WHERE status = 'APPROVED') as approved_count,
    COUNT(*) FILTER (WHERE status = 'DECLINED') as declined_count,
    SUM(amount) FILTER (WHERE status = 'APPROVED') as approved_amount,
    AVG(amount) FILTER (WHERE status = 'APPROVED') as avg_transaction_amount
FROM transactions.auth_requests
GROUP BY DATE(created_at);

-- View for card activity
CREATE OR REPLACE VIEW cards.card_activity AS
SELECT 
    c.id,
    c.pan,
    c.cardholder_name,
    c.status,
    c.balance,
    COUNT(t.id) as transaction_count,
    SUM(t.amount) FILTER (WHERE t.status = 'APPROVED') as total_spent
FROM cards.virtual_cards c
LEFT JOIN transactions.auth_requests t ON c.pan = t.pan
GROUP BY c.id, c.pan, c.cardholder_name, c.status, c.balance;
"

echo "✓ Views created"

# ==============================================
# Grant Permissions
# ==============================================

echo "Setting up permissions..."

execute_sql "
-- Grant all permissions to application user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cards TO $POSTGRES_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA transactions TO $POSTGRES_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA security TO $POSTGRES_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA merchants TO $POSTGRES_USER;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA cards TO $POSTGRES_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA transactions TO $POSTGRES_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA security TO $POSTGRES_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA merchants TO $POSTGRES_USER;
"

echo "✓ Permissions granted"

# ==============================================
# Summary
# ==============================================

echo ""
echo "=========================================="
echo "  ✓ Database initialization complete!"
echo "=========================================="
echo "Schemas created: 4"
echo "Tables created: 10+"
echo "Views created: 2"
echo "Triggers created: 3"
echo ""
echo "Ready for pedagogical data seeding..."
echo "=========================================="
