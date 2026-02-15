-- Migration 015: Schema Compatibility Patch
-- Purpose: Ensure core client/merchant journey queries work even if earlier tables
-- existed before newer columns were introduced (CREATE TABLE IF NOT EXISTS does not add columns).

-- ---------------------------------------------------------------------------
-- client.transactions: add created_at used by API responses and filters
-- ---------------------------------------------------------------------------
ALTER TABLE client.transactions
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Backfill created_at from the business timestamp where available
UPDATE client.transactions
SET created_at = COALESCE(created_at, timestamp, NOW())
WHERE created_at IS NULL;

-- ---------------------------------------------------------------------------
-- merchant.pos_terminals: add updated_at required by update trigger
-- ---------------------------------------------------------------------------
ALTER TABLE merchant.pos_terminals
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

UPDATE merchant.pos_terminals
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

