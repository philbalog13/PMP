-- Migration 008: Add processing_steps to client.transactions
-- Stores the detailed timeline of each transaction step for visualization

ALTER TABLE client.transactions
    ADD COLUMN IF NOT EXISTS processing_steps JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_transactions_processing_steps
    ON client.transactions USING gin(processing_steps);

COMMENT ON COLUMN client.transactions.processing_steps IS
    'Array of processing step objects for transaction timeline visualization';
