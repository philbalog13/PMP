-- ==========================================================
-- Add Refresh Tokens Table
-- ==========================================================

-- Create refresh_tokens table in security schema
CREATE TABLE IF NOT EXISTS security.refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    last_used_at TIMESTAMP NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON security.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON security.refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON security.refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON security.refresh_tokens(revoked_at) WHERE revoked_at IS NULL;

-- Comments
COMMENT ON TABLE security.refresh_tokens IS 'Stores refresh tokens for extending JWT sessions';
COMMENT ON COLUMN security.refresh_tokens.token_hash IS 'Bcrypt hash of the refresh token (never store plaintext)';
COMMENT ON COLUMN security.refresh_tokens.revoked_at IS 'Timestamp when token was revoked (NULL if still valid)';
COMMENT ON COLUMN security.refresh_tokens.last_used_at IS 'Last time this refresh token was used';

\echo '✅ Refresh tokens table created successfully';
