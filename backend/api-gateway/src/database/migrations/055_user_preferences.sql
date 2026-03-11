-- Migration 055: add pedagogical preferences storage on users.users
-- Required by /api/users/me and /api/users/me/preferences

ALTER TABLE users.users
    ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

UPDATE users.users
SET preferences = '{}'::jsonb
WHERE preferences IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_preferences
    ON users.users
    USING GIN (preferences);
