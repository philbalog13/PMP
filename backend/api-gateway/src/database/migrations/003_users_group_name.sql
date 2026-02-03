-- Migration 003: Optional pedagogical group for student management
-- Adds support for storing promotion/group from instructor onboarding forms.

ALTER TABLE users.users
ADD COLUMN IF NOT EXISTS group_name VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_users_group_name ON users.users(group_name);
