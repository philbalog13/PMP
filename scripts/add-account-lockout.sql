-- ==========================================================
-- Add Account Lockout Columns to users.users
-- ==========================================================

-- Add lockout tracking columns
ALTER TABLE users.users 
ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMP NULL;

-- Add index for locked_until for faster queries
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users.users(locked_until);

-- Add comment
COMMENT ON COLUMN users.users.failed_login_attempts IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN users.users.locked_until IS 'Account locked until this timestamp (NULL if not locked)';
COMMENT ON COLUMN users.users.last_failed_login IS 'Timestamp of last failed login attempt';

\echo '✅ Account lockout columns added successfully';
