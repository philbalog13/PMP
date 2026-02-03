-- Migration 005: Workshops catalog for dynamic labs/workshops management
-- Enables centralized workshop metadata instead of hardcoded IDs in API code.

CREATE TABLE IF NOT EXISTS learning.workshops (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    module_order INTEGER NOT NULL CHECK (module_order > 0),
    sections INTEGER NOT NULL DEFAULT 1 CHECK (sections >= 1),
    quiz_id VARCHAR(50),
    difficulty VARCHAR(20) CHECK (difficulty IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT')),
    estimated_minutes INTEGER CHECK (estimated_minutes IS NULL OR estimated_minutes > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workshops_is_active_order
    ON learning.workshops(is_active, module_order);
CREATE INDEX IF NOT EXISTS idx_workshops_quiz_id
    ON learning.workshops(quiz_id);

-- Idempotent seed for current workshop set used by the API.
INSERT INTO learning.workshops (id, title, description, module_order, sections, quiz_id, difficulty, estimated_minutes, is_active)
VALUES
    ('intro', 'Introduction aux Paiements', 'Fondamentaux de la monetique et chaine de paiement.', 1, 5, 'quiz-intro', 'BEGINNER', 60, true),
    ('iso8583', 'ISO 8583 - Messages', 'Structure des messages ISO 8583 et champs principaux.', 2, 8, 'quiz-iso8583', 'INTERMEDIATE', 90, true),
    ('hsm-keys', 'HSM et Gestion des Cles', 'Cycle de vie des cles cryptographiques en environnement HSM.', 3, 6, 'quiz-hsm', 'INTERMEDIATE', 90, true),
    ('3ds-flow', 'Flux 3D Secure', 'Parcours d authentification 3DS de bout en bout.', 4, 7, 'quiz-3ds', 'INTERMEDIATE', 75, true),
    ('fraud-detection', 'Detection de Fraude', 'Regles et signaux pour detecter des comportements suspects.', 5, 5, 'quiz-fraud', 'ADVANCED', 75, true),
    ('emv', 'Cartes EMV', 'Fonctionnement EMV, cryptogrammes et securisation carte-presente.', 6, 6, 'quiz-emv', 'ADVANCED', 90, true)
ON CONFLICT (id) DO NOTHING;

-- Keep timestamp behavior consistent with other learning tables.
CREATE OR REPLACE FUNCTION learning.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_workshops_updated_at ON learning.workshops;
CREATE TRIGGER update_workshops_updated_at
    BEFORE UPDATE ON learning.workshops
    FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at_column();
