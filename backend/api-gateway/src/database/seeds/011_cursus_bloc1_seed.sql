-- Seed data: BLOC 1 – Fondamentaux des Paiements Électroniques
-- 6 modules, 69 heures

-- =============================================================================
-- CURSUS
-- =============================================================================
INSERT INTO learning.cursus (id, title, description, icon, color, level, estimated_hours, tags, is_published, module_count)
VALUES (
    'bloc-1-fondamentaux-paiements',
    'BLOC 1 – Fondamentaux des Paiements Électroniques',
    'Support de cours ultra-détaillé – Approche pédagogique TryHackMe. Environnement de lab : MoneticLab. Couvre les principes du paiement électronique, la cybersécurité, les paiements CP/CNP, les fonctions émetteur/acquéreur, la cryptographie appliquée et les schémas de paiement.',
    'credit-card',
    'emerald',
    'DEBUTANT',
    69,
    ARRAY['monétique','paiements','sécurité','PCI DSS','EMV','3D Secure','cryptographie'],
    true,
    6
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- MODULE 1.1 – Principes du paiement électronique (10h)
-- =============================================================================
INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-1.1-principes',
    'bloc-1-fondamentaux-paiements',
    'Principes du paiement électronique',
    'Définir le paiement électronique, identifier les acteurs, expliquer les 3 phases d''une transaction, calculer les commissions.',
    1, 600, '1', 4
) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-1.2-cybersecurite',
    'bloc-1-fondamentaux-paiements',
    'Cybersécurité appliquée aux paiements',
    'Menaces, PCI DSS, tokenisation, HSM. Identifier les violations de sécurité et proposer des corrections.',
    2, 600, '2', 4
) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-1.3-cp-cnp',
    'bloc-1-fondamentaux-paiements',
    'Paiements Carte Présente / Carte Non Présente',
    'EMV, NFC, 3-D Secure, liability shift. Analyse de trames CP et simulation 3DS.',
    3, 720, '2', 3
) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-1.4-emetteur-acquereur',
    'bloc-1-fondamentaux-paiements',
    'Fonctions Monétiques : Émetteur & Acquéreur',
    'Cycle de vie de la carte, autorisation, contrat commerçant, ISO 8583, chargebacks.',
    4, 600, '2', 3
) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-1.5-crypto',
    'bloc-1-fondamentaux-paiements',
    'Données Sensibles & Cryptographie Appliquée',
    'PAN, PIN, CVV, chiffrement symétrique/asymétrique, DUKPT, HSM, calcul du Luhn et PIN block.',
    5, 900, '3', 4
) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-1.6-schemas',
    'bloc-1-fondamentaux-paiements',
    'Schémas & Règles Marchand (Visa, MC, CB)',
    'Schémas ouverts/fermés, frais de schéma, règles marchand, chargebacks et codes raison.',
    6, 720, '2', 4
) ON CONFLICT (id) DO NOTHING;
