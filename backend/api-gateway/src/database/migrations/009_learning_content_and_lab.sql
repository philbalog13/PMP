-- Migration 009: Learning content, quiz bank and lab state foundation
-- Adds tables used by the pedagogical APIs for server-side quiz scoring,
-- lesson delivery, trainer lab controls and certificate issuance.

-- -----------------------------------------------------------------------------
-- QUIZ QUESTION BANK
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id VARCHAR(80) NOT NULL,
    workshop_id VARCHAR(50),
    quiz_title VARCHAR(255),
    pass_percentage INTEGER NOT NULL DEFAULT 80 CHECK (pass_percentage >= 1 AND pass_percentage <= 100),
    time_limit_minutes INTEGER CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0),
    question_id VARCHAR(120) NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option_index INTEGER NOT NULL CHECK (correct_option_index >= 0),
    explanation TEXT,
    question_order INTEGER NOT NULL DEFAULT 1 CHECK (question_order > 0),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (quiz_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_order
    ON learning.quiz_questions(quiz_id, question_order);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_workshop
    ON learning.quiz_questions(workshop_id);

-- -----------------------------------------------------------------------------
-- WORKSHOP LESSON CONTENT
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning.workshop_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workshop_id VARCHAR(50) NOT NULL,
    workshop_title VARCHAR(255),
    workshop_description TEXT,
    section_id VARCHAR(120) NOT NULL,
    section_title VARCHAR(255) NOT NULL,
    section_content TEXT NOT NULL,
    section_order INTEGER NOT NULL DEFAULT 1 CHECK (section_order > 0),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (workshop_id, section_id)
);

CREATE INDEX IF NOT EXISTS idx_workshop_lessons_workshop_order
    ON learning.workshop_lessons(workshop_id, section_order);

-- -----------------------------------------------------------------------------
-- LAB ENVIRONMENT STATE (trainer controls)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning.lab_environment_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    latency_ms INTEGER NOT NULL DEFAULT 150 CHECK (latency_ms >= 0),
    auth_failure_rate INTEGER NOT NULL DEFAULT 5 CHECK (auth_failure_rate >= 0 AND auth_failure_rate <= 100),
    fraud_injection BOOLEAN NOT NULL DEFAULT false,
    hsm_latency_ms INTEGER NOT NULL DEFAULT 50 CHECK (hsm_latency_ms >= 0),
    network_errors BOOLEAN NOT NULL DEFAULT false,
    updated_by UUID REFERENCES users.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_environment_state_updated_at
    ON learning.lab_environment_state(updated_at DESC);

-- -----------------------------------------------------------------------------
-- CERTIFICATES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    certificate_code VARCHAR(120) NOT NULL UNIQUE,
    issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB,
    UNIQUE (student_id)
);

CREATE INDEX IF NOT EXISTS idx_certificates_student_id
    ON learning.certificates(student_id);

-- -----------------------------------------------------------------------------
-- LEARNING PATHS FOUNDATION (phase 2 baseline)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning.learning_paths (
    id VARCHAR(80) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning.learning_path_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path_id VARCHAR(80) NOT NULL REFERENCES learning.learning_paths(id) ON DELETE CASCADE,
    workshop_id VARCHAR(50) NOT NULL,
    step_order INTEGER NOT NULL CHECK (step_order > 0),
    prerequisite_workshop_id VARCHAR(50),
    UNIQUE (path_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_learning_path_steps_path
    ON learning.learning_path_steps(path_id, step_order);

-- -----------------------------------------------------------------------------
-- TIMESTAMP TRIGGERS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION learning.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_workshop_lessons_updated_at ON learning.workshop_lessons;
CREATE TRIGGER update_workshop_lessons_updated_at
    BEFORE UPDATE ON learning.workshop_lessons
    FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at_column();

DROP TRIGGER IF EXISTS update_learning_paths_updated_at ON learning.learning_paths;
CREATE TRIGGER update_learning_paths_updated_at
    BEFORE UPDATE ON learning.learning_paths
    FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- SEED: Quiz bank (idempotent minimal seed)
-- -----------------------------------------------------------------------------
INSERT INTO learning.quiz_questions (
    quiz_id, workshop_id, quiz_title, pass_percentage, time_limit_minutes,
    question_id, question_text, options, correct_option_index, explanation, question_order
)
VALUES
    (
        'quiz-intro', 'intro', 'Quiz - Introduction aux Paiements', 80, 15,
        'intro-q1', 'Qui autorise definitivement une transaction carte ?',
        '["Le terminal","La banque emettrice","Le marchand","Le reseau uniquement"]'::jsonb, 1,
        'La banque emettrice prend la decision finale d autorisation.', 1
    ),
    (
        'quiz-iso8583', 'iso8583', 'Quiz - ISO 8583', 80, 20,
        'iso-q1', 'Que represente le MTI 0100 ?',
        '["Authorization request","Reversal response","Network echo","Settlement request"]'::jsonb, 0,
        '0100 correspond a une demande d autorisation.', 1
    ),
    (
        'quiz-hsm', 'hsm-keys', 'Quiz - HSM et Cles', 80, 20,
        'hsm-q1', 'Quel est le role principal du LMK ?',
        '["Signer les emails","Proteger les cles internes du HSM","Verifier le solde","Router les messages"]'::jsonb, 1,
        'Le LMK protege les cles de travail dans le HSM.', 1
    ),
    (
        'quiz-3ds', '3ds-flow', 'Quiz - 3D Secure', 80, 20,
        'three-q1', 'Le statut Y dans 3DS signifie ...',
        '["Challenge requis","Authentification reussie","Tentative uniquement","Erreur reseau"]'::jsonb, 1,
        'Y indique une authentification reussie.', 1
    ),
    (
        'quiz-fraud', 'fraud-detection', 'Quiz - Detection de Fraude', 80, 15,
        'fraud-q1', 'Un pic de transactions en peu de temps est un signal ...',
        '["De performance","De velocity fraud","De maintenance","De cashback"]'::jsonb, 1,
        'Une frequence anormale peut signaler une fraude de type velocity.', 1
    ),
    (
        'quiz-emv', 'emv', 'Quiz - Cartes EMV', 80, 20,
        'emv-q1', 'Le cryptogramme ARQC est genere par ...',
        '["Le terminal","La carte EMV","Le marchand","Le DS"]'::jsonb, 1,
        'La carte EMV genere l ARQC a chaque transaction.', 1
    )
ON CONFLICT (quiz_id, question_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- SEED: Workshop lesson content (idempotent minimal seed)
-- -----------------------------------------------------------------------------
INSERT INTO learning.workshop_lessons (
    workshop_id, workshop_title, workshop_description, section_id, section_title, section_content, section_order
)
VALUES
    (
        'intro',
        'Introduction aux Paiements',
        'Bases du fonctionnement des paiements cartes.',
        'intro-1',
        'Acteurs de l ecosysteme',
        'Porteur, marchand, acquereur, emetteur et reseaux jouent un role complementaire.',
        1
    ),
    (
        'iso8583',
        'ISO 8583 - Messages',
        'Format des messages financiers cartes.',
        'iso-1',
        'MTI et data elements',
        'Le MTI qualifie le message et le bitmap indique les champs presents.',
        1
    ),
    (
        'hsm-keys',
        'HSM et Gestion des Cles',
        'Securite cryptographique en production.',
        'hsm-1',
        'Hierarchie de cles',
        'LMK, ZMK et cles de travail structurent la protection des operations.',
        1
    ),
    (
        '3ds-flow',
        'Flux 3D Secure',
        'Authentification e-commerce et SCA.',
        '3ds-1',
        'Domaines 3DS',
        'Les domaines acquereur, emetteur et interop permettent le flux d authentification.',
        1
    ),
    (
        'fraud-detection',
        'Detection de Fraude',
        'Reduction du risque transactionnel.',
        'fraud-1',
        'Signaux de fraude',
        'Velocity, geographie et device contribuent a la decision anti-fraude.',
        1
    ),
    (
        'emv',
        'Cartes EMV',
        'Securisation des paiements carte presente.',
        'emv-1',
        'Cryptogrammes EMV',
        'ARQC et ARPC apportent une preuve dynamique a chaque transaction.',
        1
    )
ON CONFLICT (workshop_id, section_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- SEED: Default lab state
-- -----------------------------------------------------------------------------
INSERT INTO learning.lab_environment_state (
    latency_ms, auth_failure_rate, fraud_injection, hsm_latency_ms, network_errors
)
SELECT 150, 5, false, 50, false
WHERE NOT EXISTS (SELECT 1 FROM learning.lab_environment_state);

-- -----------------------------------------------------------------------------
-- SEED: Learning path baseline
-- -----------------------------------------------------------------------------
INSERT INTO learning.learning_paths (id, title, description, is_active)
VALUES (
    'pmp-core',
    'PMP Core Learning Path',
    'Parcours coeur pour valider les fondamentaux paiements et securite.',
    true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.learning_path_steps (path_id, workshop_id, step_order, prerequisite_workshop_id)
VALUES
    ('pmp-core', 'intro', 1, NULL),
    ('pmp-core', 'iso8583', 2, 'intro'),
    ('pmp-core', 'hsm-keys', 3, 'iso8583'),
    ('pmp-core', '3ds-flow', 4, 'hsm-keys'),
    ('pmp-core', 'fraud-detection', 5, '3ds-flow'),
    ('pmp-core', 'emv', 6, 'fraud-detection')
ON CONFLICT (path_id, step_order) DO NOTHING;
