-- Migration: Add TOTP 2FA support
-- Description: Adds columns for TOTP secret and 2FA status to users table

-- Add TOTP secret column (encrypted secret for authenticator apps)
ALTER TABLE users.users
ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255);

-- Add 2FA enabled flag
ALTER TABLE users.users
ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE;

-- Add timestamp for when 2FA was enabled
ALTER TABLE users.users
ADD COLUMN IF NOT EXISTS totp_enabled_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_totp_enabled ON users.users(totp_enabled) WHERE totp_enabled = TRUE;

-- Comment the columns
COMMENT ON COLUMN users.users.totp_secret IS 'Encrypted TOTP secret for authenticator apps (base32 encoded)';
COMMENT ON COLUMN users.users.totp_enabled IS 'Whether TOTP 2FA is enabled for this user';
COMMENT ON COLUMN users.users.totp_enabled_at IS 'Timestamp when TOTP 2FA was enabled';
