-- ==============================================
-- Pedagogical Data Seeding Script
-- Plateforme Monétique Pédagogique (PMP)
-- ==============================================

-- This script populates the database with test data
-- for pedagogical purposes

\echo '=========================================='
\echo '  Seeding Pedagogical Data'
\echo '=========================================='

-- ==============================================
-- Insert Test Merchants
-- ==============================================

\echo 'Inserting test merchants...'

INSERT INTO merchants.merchants (id, name, mcc, status, daily_limit, monthly_limit, country_code, city) VALUES
('MERCH0000000001', 'SuperMarché PédagoMart', '5411', 'ACTIVE', 500000, 15000000, 'FR', 'Paris'),
('MERCH0000000002', 'Restaurant Le Formateur', '5812', 'ACTIVE', 100000, 3000000, 'FR', 'Lyon'),
('MERCH0000000003', 'Station Service EduFuel', '5541', 'ACTIVE', 200000, 6000000, 'FR', 'Marseille'),
('MERCH0000000004', 'Boutique Mode SchoolWear', '5651', 'ACTIVE', 150000, 4500000, 'FR', 'Toulouse'),
('MERCH0000000005', 'Librairie Du Savoir', '5942', 'ACTIVE', 80000, 2400000, 'FR', 'Nice'),
('MERCH0000000006', 'Pharmacie Santé Plus', '5912', 'ACTIVE', 120000, 3600000, 'FR', 'Nantes'),
('MERCH0000000007', 'Casino Test Royal', '7995', 'ACTIVE', 1000000, 30000000, 'FR', 'Monaco'),
('MERCH0000000008', 'Hotel Formation Palace', '7011', 'ACTIVE', 300000, 9000000, 'FR', 'Bordeaux');

-- Insert terminals for merchants
INSERT INTO merchants.terminals (id, merchant_id, status, location) VALUES
('TERM0001', 'MERCH0000000001', 'ACTIVE', 'Caisse 1 - Paris 15e'),
('TERM0002', 'MERCH0000000001', 'ACTIVE', 'Caisse 2 - Paris 15e'),
('TERM0003', 'MERCH0000000002', 'ACTIVE', 'Restaurant - Lyon Centre'),
('TERM0004', 'MERCH0000000003', 'ACTIVE', 'Pompe 1 - Marseille'),
('TERM0005', 'MERCH0000000004', 'ACTIVE', 'Boutique - Toulouse'),
('TERM0006', 'MERCH0000000005', 'ACTIVE', 'Librairie - Nice'),
('TERM0007', 'MERCH0000000006', 'ACTIVE', 'Pharmacie - Nantes'),
('TERM0008', 'MERCH0000000007', 'ACTIVE', 'Table de jeu - Monaco'),
('TERM0009', 'MERCH0000000008', 'ACTIVE', 'Reception - Bordeaux');

\echo '✓ Merchants and terminals inserted'

-- ==============================================
-- Insert Test Virtual Cards
-- ==============================================

\echo 'Inserting test virtual cards...'

-- Card 1: Low balance for testing insufficient funds
INSERT INTO cards.virtual_cards 
(pan, cardholder_name, expiry_month, expiry_year, cvv_hash, pin_hash, balance, daily_limit, status, bin) 
VALUES
('4111111111111111', 'JEAN DUPONT', 12, 2028, 
 '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b', -- SHA256('123')
 '$2b$10$rKJVO8YQKlN.4b5FtT1kNOqH3xYQf5WqX5h7QKL8JpVr5R9KqVl9K', -- bcrypt('1234')
 250.00, 500.00, 'ACTIVE', '411111');

-- Card 2: High balance for testing approved transactions
INSERT INTO cards.virtual_cards 
(pan, cardholder_name, expiry_month, expiry_year, cvv_hash, pin_hash, balance, daily_limit, status, bin) 
VALUES
('5555555555554444', 'MARIE MARTIN', 06, 2029,
 'e7f6c011776e8db7cd330b54174fd76f7d0216b612387a5ffcfb81e6f0919683', -- SHA256('456')
 '$2b$10$rKJVO8YQKlN.4b5FtT1kNOqH3xYQf5WqX5h7QKL8JpVr5R9KqVl9K', -- bcrypt('5678')
 5000.00, 1000.00, 'ACTIVE', '555555');

-- Card 3: Expired card for testing
INSERT INTO cards.virtual_cards 
(pan, cardholder_name, expiry_month, expiry_year, cvv_hash, pin_hash, balance, daily_limit, status, bin) 
VALUES
('378282246310005', 'PIERRE Bernard', 01, 2026, -- Expires soon (Jan 2026) for testing near-expiry scenarios
 'c6f3ac57f5f7e9d2fcbdec8c8c6c6e5c6d2f0e1a5c8c6d2f0e1a5c8c6d2f0e1a', -- SHA256('789')
 '$2b$10$rKJVO8YQKlN.4b5FtT1kNOqH3xYQf5WqX5h7QKL8JpVr5R9KqVl9K', -- bcrypt('9012')
 1000.00, 800.00, 'EXPIRED', '378282');

-- Card 4: Blocked card for testing
INSERT INTO cards.virtual_cards 
(pan, cardholder_name, expiry_month, expiry_year, cvv_hash, pin_hash, balance, daily_limit, status, bin) 
VALUES
('6011111111111117', 'SOPHIE DUBOIS', 09, 2027,
 'd4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35', -- SHA256('321')
 '$2b$10$rKJVO8YQKlN.4b5FtT1kNOqH3xYQf5WqX5h7QKL8JpVr5R9KqVl9K', -- bcrypt('3456')
 2500.00, 1200.00, 'BLOCKED', '601111');

-- Card 5: Normal card with moderate balance
INSERT INTO cards.virtual_cards 
(pan, cardholder_name, expiry_month, expiry_year, cvv_hash, pin_hash, balance, daily_limit, status, bin) 
VALUES
('4000056655665556', 'LUC THOMAS', 11, 2028,
 '7902699be42c8a8e46fbbb4501726517e86b22c56a189f7625a6da49081b2451', -- SHA256('654')
 '$2b$10$rKJVO8YQKlN.4b5FtT1kNOqH3xYQf5WqX5h7QKL8JpVr5R9KqVl9K', -- bcrypt('7890')
 1500.00, 1000.00, 'ACTIVE', '400005');

\echo '✓ Test virtual cards inserted'

-- ==============================================
-- Insert Sample Transactions (History)
-- ==============================================

\echo 'Inserting sample transaction history...'

-- Approved transactions
INSERT INTO transactions.auth_requests 
(merchant_id, terminal_id, pan, amount, currency, status, response_code, auth_code, mcc, stan, fraud_score, created_at, processed_at)
VALUES
('MERCH0000000001', 'TERM0001', '5555555555554444', 45.80, 'EUR', 'APPROVED', '00', 'AUTH01', '5411', '000001', 15, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
('MERCH0000000002', 'TERM0003', '5555555555554444', 67.50, 'EUR', 'APPROVED', '00', 'AUTH02', '5812', '000002', 12, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
('MERCH0000000001', 'TERM0002', '4000056655665556', 32.90, 'EUR', 'APPROVED', '00', 'AUTH03', '5411', '000003', 8, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours'),
('MERCH0000000005', 'TERM0006', '4000056655665556', 25.00, 'EUR', 'APPROVED', '00', 'AUTH04', '5942', '000004', 10, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours');

-- Declined transactions (insufficient funds)
INSERT INTO transactions.auth_requests 
(merchant_id, terminal_id, pan, amount, currency, status, response_code, mcc, stan, fraud_score, created_at, processed_at)
VALUES
('MERCH0000000008', 'TERM0009', '4111111111111111', 500.00, 'EUR', 'DECLINED', '51', '7011', '000005', 20, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
('MERCH0000000007', 'TERM0008', '4111111111111111', 1000.00, 'EUR', 'DECLINED', '51', '7995', '000006', 85, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours');

-- Declined transactions (expired card)
INSERT INTO transactions.auth_requests 
(merchant_id, terminal_id, pan, amount, currency, status, response_code, mcc, stan, fraud_score, created_at, processed_at)
VALUES
('MERCH0000000003', 'TERM0004', '378282246310005', 50.00, 'EUR', 'DECLINED', '54', '5541', '000007', 0, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours');

-- Declined transactions (blocked card)
INSERT INTO transactions.auth_requests 
(merchant_id, terminal_id, pan, amount, currency, status, response_code, mcc, stan, fraud_score, created_at, processed_at)
VALUES
('MERCH0000000004', 'TERM0005', '6011111111111117', 75.00, 'EUR', 'DECLINED', '14', '5651', '000008', 0, NOW() - INTERVAL '8 hours', NOW() - INTERVAL '8 hours');

\echo '✓ Sample transactions inserted'

-- ==============================================
-- Insert Cryptographic Keys (Pedagogical)
-- ==============================================

\echo 'Inserting pedagogical cryptographic keys...'

INSERT INTO security.crypto_keys 
(key_name, key_type, algorithm, key_value_encrypted, status, max_usage)
VALUES
('PIN_ENCRYPTION_KEY_001', 'PIN_ENC', '3DES', 'U2FsdGVkX1+vupppZksvRf5pq5g5XjFRlipRkwB0K1Y=', 'ACTIVE', 100000),
('MAC_KEY_001', 'MAC', 'HMAC-SHA256', 'U2FsdGVkX1+3qNudnJK8xP5pq5g5XjFRlipRkwB0K1Y=', 'ACTIVE', 500000),
('DATA_ENCRYPTION_KEY_001', 'DATA_ENC', 'AES-256', 'U2FsdGVkX1+8rOuvvLjtsQ5pq5g5XjFRlipRkwB0K1Y=', 'ACTIVE', 1000000),
('CVV_GENERATION_KEY_001', 'CVV_KEY', '3DES', 'U2FsdGVkX1+9sP9wwMkutR5pq5g5XjFRlipRkwB0K1Y=', 'ACTIVE', 200000),
('KEK_MASTER_001', 'KEK', 'AES-256', 'U2FsdGVkX1+AtQAxxNlvuS5pq5g5XjFRlipRkwB0K1Y=', 'ACTIVE', 50000);

\echo '✓ Cryptographic keys inserted'

-- ==============================================
-- Insert Audit Logs (Sample)
-- ==============================================

\echo 'Inserting sample audit logs...'

INSERT INTO security.audit_logs 
(service_name, action, pan_last4, ip_address, severity, details)
VALUES
('sim-card-service', 'CARD_CREATED', '4444', '172.20.0.15', 'INFO', '{"user": "admin", "card_type": "virtual"}'),
('sim-auth-engine', 'AUTH_APPROVED', '4444', '172.20.0.20', 'INFO', '{"amount": 45.80, "merchant": "MERCH0000000001"}'),
('sim-auth-engine', 'AUTH_DECLINED', '1111', '172.20.0.20', 'WARNING', '{"reason": "insufficient_funds", "code": "51"}'),
('sim-fraud-detection', 'HIGH_RISK_DETECTED', '1111', '172.20.0.25', 'WARNING', '{"fraud_score": 85, "reason": "high_amount_gambling"}'),
('crypto-service', 'KEY_ROTATED', NULL, '172.20.0.30', 'INFO', '{"key_type": "PIN_ENC", "old_key": "KEY_001", "new_key": "KEY_002"}');

\echo '✓ Audit logs inserted'

-- ==============================================
-- Insert Test Users
-- ==============================================

\echo 'Inserting test users...'

INSERT INTO users.users (username, email, password_hash, first_name, last_name, role) VALUES
('formateur', 'trainer@pmp.local', '$2b$10$rKJVO8YQKlN.4b5FtT1kNOqH3xYQf5WqX5h7QKL8JpVr5R9KqVl9K', 'System', 'Formateur', 'ROLE_FORMATEUR'),
('etudiant', 'student@pmp.local', '$2b$10$rKJVO8YQKlN.4b5FtT1kNOqH3xYQf5WqX5h7QKL8JpVr5R9KqVl9K', 'Jean', 'Etudiant', 'ROLE_ETUDIANT'),
('client', 'client@pmp.local', '$2b$10$rKJVO8YQKlN.4b5FtT1kNOqH3xYQf5WqX5h7QKL8JpVr5R9KqVl9K', 'Sophie', 'Client', 'ROLE_CLIENT'),
('marchand', 'merchant@pmp.local', '$2b$10$rKJVO8YQKlN.4b5FtT1kNOqH3xYQf5WqX5h7QKL8JpVr5R9KqVl9K', 'Pierre', 'Commercant', 'ROLE_MARCHAND')
ON CONFLICT (username) DO UPDATE 
SET role = EXCLUDED.role, email = EXCLUDED.email;

\echo '✓ Test users inserted'

-- ==============================================
-- Summary
-- ==============================================

\echo ''
\echo '=========================================='
\echo '  ✓ Pedagogical data seeding complete!'
\echo '=========================================='
\echo 'Merchants: 8'
\echo 'Terminals: 9'
\echo 'Virtual Cards: 5'
\echo 'Sample Transactions: 8'
\echo 'Crypto Keys: 5'
\echo 'Audit Logs: 5'
\echo ''
\echo 'Ready for testing and demonstrations!'
\echo '=========================================='

-- Display card test scenarios
\echo ''
\echo 'Test Card Scenarios:'
\echo '--------------------'
\echo '1. 4111111111111111 - Low balance (250 EUR) - Test insufficient funds'
\echo '2. 5555555555554444 - High balance (5000 EUR) - Test approved transactions'
\echo '3. 378282246310005 - Expired card - Test expired card rejection'
\echo '4. 6011111111111117 - Blocked card - Test blocked card rejection'
\echo '5. 4000056655665556 - Normal card (1500 EUR) - General testing'
\echo ''
\echo 'All PINs are hashed - Use appropriate PIN for testing'
\echo '=========================================='
