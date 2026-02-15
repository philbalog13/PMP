-- Migration 013: Student Vulnerability Sandbox
-- Adds per-student vulnerability flags, defense quizzes, and resource isolation overrides.

CREATE SCHEMA IF NOT EXISTS learning;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Vulnerability Catalog
CREATE TABLE IF NOT EXISTS learning.vuln_catalog (
    vuln_code VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    severity VARCHAR(20) CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    bloc_number INTEGER NOT NULL,
    module_number INTEGER,
    attack_type VARCHAR(50),
    defense_hint TEXT,
    points INTEGER DEFAULT 100,
    flag_value VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE learning.vuln_catalog
    ADD COLUMN IF NOT EXISTS module_number INTEGER,
    ADD COLUMN IF NOT EXISTS attack_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS defense_hint TEXT,
    ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 100,
    ADD COLUMN IF NOT EXISTS flag_value VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 2. Defense Quizzes (linked to vulnerability fix)
CREATE TABLE IF NOT EXISTS learning.defense_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vuln_code VARCHAR(50) NOT NULL REFERENCES learning.vuln_catalog(vuln_code) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of strings ["Option A", "Option B", ...]
    correct_option_index INTEGER NOT NULL, -- 0-based index
    explanation TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE learning.defense_quizzes
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS uq_defense_quizzes_vuln_code
    ON learning.defense_quizzes(vuln_code);

-- 3. Student Vulnerability State
CREATE TABLE IF NOT EXISTS learning.student_vuln_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    vuln_code VARCHAR(50) NOT NULL REFERENCES learning.vuln_catalog(vuln_code) ON DELETE CASCADE,
    is_vulnerable BOOLEAN NOT NULL DEFAULT true,
    exploited_at TIMESTAMP,
    fixed_at TIMESTAMP,
    fix_method VARCHAR(30),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, vuln_code)
);

ALTER TABLE learning.student_vuln_state
    ADD COLUMN IF NOT EXISTS exploited_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS fixed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS fix_method VARCHAR(30),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 4. Resource Overrides (for data isolation)
-- Allows a student to "modify" a shared resource without affecting others
CREATE TABLE IF NOT EXISTS learning.resource_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL, -- 'CARD', 'USER', 'TRANSACTION'
    resource_id VARCHAR(100) NOT NULL, -- e.g. PAN or UUID
    field_name VARCHAR(50) NOT NULL, -- e.g. 'status', 'balance'
    new_value TEXT NOT NULL, -- JSON stringified value
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, resource_type, resource_id, field_name)
);

ALTER TABLE learning.resource_overrides
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_student_vuln_state_student ON learning.student_vuln_state(student_id);
CREATE INDEX IF NOT EXISTS idx_student_vuln_state_vuln ON learning.student_vuln_state(vuln_code);
CREATE INDEX IF NOT EXISTS idx_student_vuln_state_exploited ON learning.student_vuln_state(student_id, exploited_at);
CREATE INDEX IF NOT EXISTS idx_resource_overrides_lookup ON learning.resource_overrides(student_id, resource_type, resource_id);

-- SEED DATA: Insert/update the 15 vulnerabilities
INSERT INTO learning.vuln_catalog (
    vuln_code, title, description, severity, bloc_number, module_number,
    attack_type, defense_hint, points, flag_value
) VALUES
('WEAK_JWT_SECRET', 'Secret JWT faible', 'Le secret JWT est faible ou expose.', 'CRITICAL', 1, 2, 'AUTHN', 'Utiliser un secret fort en variable d environnement.', 120, 'FLAG{PMP_B1_WEAK_JWT_SECRET}'),
('DEV_TOKEN_OPEN', 'Endpoint dev-token ouvert', 'Un endpoint de generation de token reste actif.', 'CRITICAL', 1, 2, 'BACKDOOR', 'Retirer les endpoints debug du runtime.', 120, 'FLAG{PMP_B1_DEV_TOKEN_OPEN}'),
('IDOR_CARDS_NO_AUTH', 'IDOR sur les cartes', 'Acces objet sans controle de propriete.', 'HIGH', 1, 3, 'AUTHZ', 'Verifier ownership et permissions a chaque acces objet.', 100, 'FLAG{PMP_B1_IDOR_CARDS}'),
('CARD_STATUS_NO_AUTH', 'Statut carte sans autorisation', 'Changement de statut carte sans controle fort.', 'HIGH', 1, 4, 'AUTHZ', 'Controler role + ownership avant mutation.', 100, 'FLAG{PMP_B1_CARD_STATUS}'),
('NEGATIVE_AMOUNT', 'Montant negatif accepte', 'Validation metier insuffisante sur les montants.', 'HIGH', 1, 1, 'BUSINESS_LOGIC', 'Refuser montants <= 0 et normaliser devise.', 90, 'FLAG{PMP_B1_NEG_AMOUNT}'),
('NO_REPLAY_PROTECTION', 'Absence protection replay', 'Transactions rejouables sans anti-replay.', 'MEDIUM', 1, 3, 'REPLAY', 'Utiliser nonce, fenetre temporelle et idempotence.', 80, 'FLAG{PMP_B1_REPLAY}'),
('NO_RATE_LIMIT_OTP', 'Bruteforce OTP 3DS', 'Pas de limitation des tentatives OTP.', 'HIGH', 2, 6, 'BRUTEFORCE', 'Rate-limit + verrouillage progressif + telemetry.', 100, 'FLAG{PMP_B2_OTP_BRUTEFORCE}'),
('HSM_NO_AUTH', 'HSM accessible publiquement', 'API HSM exposees sans authentification.', 'CRITICAL', 3, 3, 'EXPOSURE', 'Isoler reseau + mTLS + allowlist stricte.', 130, 'FLAG{PMP_B3_HSM_PUBLIC}'),
('CRYPTO_ORACLE_NO_AUTH', 'Oracle de chiffrement non protege', 'Service crypto utilisable sans controle d acces.', 'HIGH', 1, 5, 'CRYPTO_MISUSE', 'Restreindre appels + audit + separation des cles.', 110, 'FLAG{PMP_B1_CRYPTO_ORACLE}'),
('HEALTH_INFO_DISCLOSURE', 'Health endpoint bavard', 'Les endpoints health divulguent trop de details.', 'MEDIUM', 3, 1, 'INFO_DISCLOSURE', 'Retourner status minimal en public.', 70, 'FLAG{PMP_B3_HEALTH_DISCLOSURE}'),
('SWITCH_NO_VALIDATION', 'Switch sans validation', 'Messages switch acceptes sans controles stricts.', 'HIGH', 3, 2, 'INPUT_VALIDATION', 'Valider schema, DE critiques et auth message.', 110, 'FLAG{PMP_B3_SWITCH_VALIDATION}'),
('PAN_NOT_MASKED', 'PAN non masque', 'PAN complet expose en reponse API ou logs.', 'HIGH', 4, 1, 'DATA_EXPOSURE', 'Masquer PAN (BIN + 4) et journaliser de facon sure.', 100, 'FLAG{PMP_B4_PAN_MASKING}'),
('NO_RATE_LIMIT_LOGIN', 'Bruteforce login', 'Pas de limitation de debit login.', 'MEDIUM', 4, 2, 'BRUTEFORCE', 'Rate-limit + lockout + alerting.', 80, 'FLAG{PMP_B4_LOGIN_BRUTEFORCE}'),
('SQL_INJECTION', 'Injection SQL', 'Entrees non parametrees dans requetes SQL.', 'CRITICAL', 5, 6, 'INJECTION', 'Toujours parametrer requetes et filtrer entrees.', 130, 'FLAG{PMP_B5_SQLI}'),
('REDIS_NO_AUTH', 'Redis sans auth', 'Instance Redis exposee sans authentification.', 'HIGH', 5, 6, 'MISCONFIG', 'Activer auth, reseau prive et ACL.', 100, 'FLAG{PMP_B5_REDIS_AUTH}')
ON CONFLICT (vuln_code) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    severity = EXCLUDED.severity,
    bloc_number = EXCLUDED.bloc_number,
    module_number = EXCLUDED.module_number,
    attack_type = EXCLUDED.attack_type,
    defense_hint = EXCLUDED.defense_hint,
    points = EXCLUDED.points,
    flag_value = EXCLUDED.flag_value,
    updated_at = NOW();

-- SEED DATA: Quiz for each vulnerability (15 / 15)
INSERT INTO learning.defense_quizzes (vuln_code, question, options, correct_option_index, explanation) VALUES
('WEAK_JWT_SECRET', 'Quelle mesure corrige le mieux un secret JWT faible ?', '["Mettre le secret dans le frontend", "Utiliser un secret long en variable d environnement et rotation", "Encoder le token en base64", "Allonger la duree du token"]'::jsonb, 1, 'Le secret doit etre fort, hors code, et rotatif.'),
('DEV_TOKEN_OPEN', 'Quelle correction est la plus sure pour un endpoint de token de debug ?', '["Le renommer", "Le proteger avec captcha", "Le supprimer du runtime de production", "Le cacher derriere JavaScript"]'::jsonb, 2, 'Les backdoors dev doivent etre absentes en production.'),
('IDOR_CARDS_NO_AUTH', 'Quelle defense corrige une IDOR ?', '["Obfusquer les IDs", "Verifier ownership et permissions a chaque acces objet", "Ajouter HTTPS", "Ajouter un WAF uniquement"]'::jsonb, 1, 'Le controle d autorisation objet est obligatoire cote serveur.'),
('CARD_STATUS_NO_AUTH', 'Comment securiser le changement de statut d une carte ?', '["Verifier role et proprietaire avant update", "Cacher le bouton frontend", "Augmenter timeout", "Changer la route URL"]'::jsonb, 0, 'Le backend doit imposer role + ownership avant mutation.'),
('NEGATIVE_AMOUNT', 'Quel controle evite les montants negatifs frauduleux ?', '["Arrondir apres debit", "Accepter negatives puis corriger", "Valider montant > 0 et type numerique cote serveur", "Verifier uniquement cote frontend"]'::jsonb, 2, 'La validation metier doit etre stricte cote serveur.'),
('NO_REPLAY_PROTECTION', 'Quelle combinaison limite le replay ?', '["Nonce + timestamp + idempotency key", "TLS seul", "Captcha avant chaque transaction", "Changer user-agent"]'::jsonb, 0, 'Anti-replay = unicite + validite temporelle + deduplication.'),
('NO_RATE_LIMIT_OTP', 'Quelle defense contre le bruteforce OTP ?', '["Essais illimites sur 30 minutes", "Rate limit, backoff et verrouillage progressif", "OTP en 4 chiffres", "Desactiver logs"]'::jsonb, 1, 'Limiter les essais et ralentir attaques en temps reel.'),
('HSM_NO_AUTH', 'Quel controle prioritaire sur API HSM ?', '["Publier sur internet avec token simple", "mTLS + segmentation reseau + allowlist", "Autoriser tout le LAN", "Uniquement journaliser"]'::jsonb, 1, 'Les operations HSM doivent etre strictement cloisonnees.'),
('CRYPTO_ORACLE_NO_AUTH', 'Comment neutraliser un oracle de chiffrement ?', '["Exposer decrypt pour debug", "Authentifier et limiter operations chiffrement/dechiffrement", "Masquer les erreurs uniquement", "Activer cache CDN"]'::jsonb, 1, 'Controler qui peut appeler quelles operations crypto.'),
('HEALTH_INFO_DISCLOSURE', 'Que doit retourner un health endpoint public ?', '["Version exacte + env + dependencies", "Etat minimal sans details sensibles", "Stack traces", "Variables d environnement"]'::jsonb, 1, 'Le detail interne doit rester prive.'),
('SWITCH_NO_VALIDATION', 'Quel controle est critique sur un switch monetique ?', '["Accepter tout si format JSON", "Valider strictement schema et champs obligatoires", "Verifier uniquement PAN length", "Ignorer erreurs sur DE critiques"]'::jsonb, 1, 'Le switch doit refuser tout message incomplet ou invalide.'),
('PAN_NOT_MASKED', 'Quelle pratique est conforme pour afficher un PAN ?', '["Afficher PAN complet au support", "Masquer PAN (BIN + 4) dans API et logs", "Hasher uniquement en frontend", "Remplacer par CVV"]'::jsonb, 1, 'Le PAN complet ne doit pas sortir du perimetre protege.'),
('NO_RATE_LIMIT_LOGIN', 'Quelle mitigation contre bruteforce login ?', '["Rate-limit + lockout + alerting", "Allonger mot de passe max", "Afficher erreurs detaillees", "Doubler taille des sessions"]'::jsonb, 0, 'Limiter tentatives et detecter anomalies en continu.'),
('SQL_INJECTION', 'Quelle correction principale bloque SQL injection ?', '["Construire SQL avec concatenation fiable", "Requetes parametrees + validation entree", "Encoder HTML", "Augmenter timeout DB"]'::jsonb, 1, 'Parametrage SQL cote serveur est obligatoire.'),
('REDIS_NO_AUTH', 'Quel durcissement minimal pour Redis ?', '["Exposition publique sans mot de passe", "Auth/ACL + reseau prive + TLS selon contexte", "Port change uniquement", "Nom d instance obscure"]'::jsonb, 1, 'Redis doit etre authentifie et non expose publiquement.')
ON CONFLICT (vuln_code) DO UPDATE SET
    question = EXCLUDED.question,
    options = EXCLUDED.options,
    correct_option_index = EXCLUDED.correct_option_index,
    explanation = EXCLUDED.explanation,
    updated_at = NOW();
