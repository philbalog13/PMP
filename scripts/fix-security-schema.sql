-- Create security schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS security;

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS security.refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users.users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE,
    user_agent TEXT,
    ip_address VARCHAR(45)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON security.refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON security.refresh_tokens(user_id);
