-- Seed data: BLOC 3 – Infrastructure & Systèmes de Paiement
-- 5 modules, 70 heures (60% pratique)

INSERT INTO learning.cursus (id, title, description, icon, color, level, estimated_hours, tags, is_published, module_count)
VALUES (
    'bloc-3-infrastructure-paiement',
    'BLOC 3 – Infrastructure & Systèmes de Paiement',
    'Découvrir le cœur du réseau bancaire et ses failles. Architecture des systèmes, switch monétique, HSM, ISO 8583/20022, tokenisation et P2PE. 60% pratique avec MoneticLab.',
    'server',
    'purple',
    'AVANCE',
    70,
    ARRAY['switch','HSM','ISO 8583','ISO 20022','tokenisation','P2PE','DUKPT','architecture','haute disponibilité'],
    true,
    5
) ON CONFLICT (id) DO NOTHING;

-- Module 3.1 – Architecture des systèmes de paiement (12h)
INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-3.1-architecture',
    'bloc-3-infrastructure-paiement',
    'Architecture des systèmes de paiement',
    'Cartographie de l''infrastructure bancaire (front/middle/back-office), contraintes opérationnelles (99,999%), SPOF, topologies de déploiement, tendances 2026.',
    1, 720, '3', 3
) ON CONFLICT (id) DO NOTHING;

-- Module 3.2 – Switch monétique & routage (15h)
INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-3.2-switch',
    'bloc-3-infrastructure-paiement',
    'Switch monétique & routage transactionnel',
    'Fonction du switch (concentrateur, routeur, traducteur), tables de routage BIN, fallback, rejeu, sécurité du switch, détection d''anomalies.',
    2, 900, '4', 4
) ON CONFLICT (id) DO NOTHING;

-- Module 3.3 – HSM (15h)
INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-3.3-hsm',
    'bloc-3-infrastructure-paiement',
    'HSM – Hardware Security Modules',
    'Architecture interne d''un HSM bancaire, cycle de vie des clés, commandes Thales payShield, DUKPT en profondeur, HSM cloud, attaques et contremesures.',
    3, 900, '4', 4
) ON CONFLICT (id) DO NOTHING;

-- Module 3.4 – ISO 8583 & ISO 20022 (18h)
INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-3.4-messaging',
    'bloc-3-infrastructure-paiement',
    'ISO 8583 & ISO 20022',
    'Syntaxe ISO 8583 avancée, migration vers ISO 20022, messages MX (pain.001, pacs.008, camt.054), passerelle de traduction, coexistence des formats.',
    4, 1080, '3', 4
) ON CONFLICT (id) DO NOTHING;

-- Module 3.5 – Tokenisation & P2PE (10h)
INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-3.5-tokenisation',
    'bloc-3-infrastructure-paiement',
    'Tokenisation & P2PE',
    'Tokenisation vs chiffrement, EMV Payment Tokenisation (TSP, PAR, cryptogramme), P2PE (PCI P2PE v3.1), réduction du périmètre PCI DSS.',
    5, 600, '3', 4
) ON CONFLICT (id) DO NOTHING;
