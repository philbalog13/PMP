-- ==========================================================
-- SCRIPT D'INITIALISATION DES PERSONAS DE TEST (PMP) - FIX V3
-- ==========================================================

-- ----------------------------------------------------------
-- 0. PRÉPARATION DES SCHÉMAS
-- ----------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS cards;
CREATE SCHEMA IF NOT EXISTS merchants;
CREATE SCHEMA IF NOT EXISTS transactions;
CREATE SCHEMA IF NOT EXISTS security;

-- ----------------------------------------------------------
-- 1. CRÉATION DES TABLES SI ABSENTES (Robustesse)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'USER',
    status VARCHAR(20) DEFAULT 'ACTIVE',
    group_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 2. NETTOYAGE
-- ----------------------------------------------------------
\echo '--- Phase 1 : Nettoyage ---'

DELETE FROM security.audit_logs;
DELETE FROM transactions.auth_requests;
DELETE FROM merchants.terminals;
DELETE FROM merchants.merchants;
DELETE FROM cards.virtual_cards;
DELETE FROM users.users;

-- ----------------------------------------------------------
-- 3. RÔLES PÉDAGOGIQUES
-- ----------------------------------------------------------
ALTER TABLE users.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users.users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('ROLE_CLIENT', 'ROLE_MARCHAND', 'ROLE_ETUDIANT', 'ROLE_FORMATEUR', 'ADMIN', 'USER', 'MERCHANT'));

-- ----------------------------------------------------------
-- 4. UTILISATEURS
-- Hash pour mot de passe: qa-pass-123 (bcrypt 12 rounds)
-- ----------------------------------------------------------
INSERT INTO users.users (username, email, password_hash, first_name, last_name, role, status) VALUES
('client_test', 'client@pmp.edu', '$2b$12$I12xcmCIkntg.DCVukTlsuLVQ/8GyGxvOW60rxtH.waGhTGHPHj5.', 'Jean', 'Client', 'ROLE_CLIENT', 'ACTIVE'),
('marchand_boulangerie', 'bakery@pmp.edu', '$2b$12$I12xcmCIkntg.DCVukTlsuLVQ/8GyGxvOW60rxtH.waGhTGHPHj5.', 'Boulangerie', 'Pédago', 'ROLE_MARCHAND', 'ACTIVE'),
('etudiant_01', 'student01@pmp.edu', '$2b$12$I12xcmCIkntg.DCVukTlsuLVQ/8GyGxvOW60rxtH.waGhTGHPHj5.', 'Marc', 'Etudiant', 'ROLE_ETUDIANT', 'ACTIVE'),
('admin_secure', 'trainer@pmp.edu', '$2b$12$I12xcmCIkntg.DCVukTlsuLVQ/8GyGxvOW60rxtH.waGhTGHPHj5.', 'Sophie', 'Formateur', 'ROLE_FORMATEUR', 'ACTIVE');

-- ----------------------------------------------------------
-- 5. CARTES
-- ----------------------------------------------------------
INSERT INTO cards.virtual_cards (pan, cardholder_name, expiry_month, expiry_year, cvv_hash, pin_hash, balance, bin, status) VALUES
('4916885387051344', 'Jean Client', 12, 2028, 'e3b0c442...', '$2b$10$rKJ...', 1000.00, '491688', 'ACTIVE'),
('4556325612718875', 'Jean Client', 06, 2027, 'e3b0c442...', '$2b$10$rKJ...', 500.00, '455632', 'ACTIVE');

-- ----------------------------------------------------------
-- 6. MARCHAND & TERMINAL
-- ----------------------------------------------------------
INSERT INTO merchants.merchants (id, name, mcc, status, city, country_code) VALUES
('MERCH_BKRY_01', 'Boulangerie Trad', '5462', 'ACTIVE', 'Paris', 'FR');

INSERT INTO merchants.terminals (id, merchant_id, status, location) VALUES
('TPE_BK01', 'MERCH_BKRY_01', 'ACTIVE', 'Comptoir');

-- ----------------------------------------------------------
-- 7. PROGRESSION & LOGS
-- ----------------------------------------------------------
INSERT INTO security.audit_logs (service_name, action, details, severity) VALUES
('pmp-lab-service', 'WORKSHOP_FINISHED', '{"workshop_id": 1, "student": "etudiant_01"}', 'INFO'),
('api-gateway', 'ADMIN_LOGIN_2FA', '{"user": "admin_secure", "status": "verified"}', 'INFO'),
('hsm-simulator', 'KEY_ACCESS_REDACTED', '{"key": "MASTER_ZMK"}', 'CRITICAL');

\echo '✅ Seeding Persona Fix V3 Terminé'
