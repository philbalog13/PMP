-- Migration 036 : Ajout colonne preferences sur users.users
-- Stocke les préférences pédagogiques (niveau apprenant, objectif, onboarding_done)

ALTER TABLE users.users
    ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Index GIN pour requêtes JSONB futures
CREATE INDEX IF NOT EXISTS idx_users_preferences ON users.users USING GIN (preferences);
