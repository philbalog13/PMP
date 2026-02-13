-- Seed data: BLOC 2 – Transactions Sécurisées
-- 6 modules, 67 heures (60% pratique)

-- =============================================================================
-- CURSUS
-- =============================================================================
INSERT INTO learning.cursus (id, title, description, icon, color, level, estimated_hours, tags, is_published, module_count)
VALUES (
    'bloc-2-transactions-securisees',
    'BLOC 2 – Transactions Sécurisées',
    'Maîtriser le chemin de la donnée, de la carte au switch. ISO 7816, NFC/ISO 14443, ISO 8583, EMV, PCI PTS, 3-D Secure. 60% pratique avec simulateurs MoneticLab.',
    'shield',
    'blue',
    'INTERMEDIAIRE',
    67,
    ARRAY['ISO 7816','APDU','NFC','ISO 8583','EMV','PCI PTS','3D Secure','cryptogramme','TPE'],
    true,
    6
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- MODULE 2.1 – Transactions contact : ISO/IEC 7816 (4h)
-- =============================================================================
INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-2.1-iso7816',
    'bloc-2-transactions-securisees',
    'Transactions contact : ISO/IEC 7816',
    'Modèle master-slave terminal/carte, structure des APDU (Command & Response), les 4 cas de figure, status words, dialogue EMV complet.',
    1, 240, '2', 3
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- MODULE 2.2 – Transactions sans contact (NFC, ISO 14443) (10h)
-- =============================================================================
INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-2.2-nfc',
    'bloc-2-transactions-securisees',
    'Transactions sans contact : NFC, ISO 14443',
    'Couches physiques et protocolaires ISO 14443, Type A vs Type B, NFC, anti-collision, EMV Contactless et kernels.',
    2, 600, '2', 3
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- MODULE 2.3 – Flux monétiques : APDU → ISO 8583 (8h)
-- =============================================================================
INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-2.3-iso8583',
    'bloc-2-transactions-securisees',
    'Flux monétiques : APDU → ISO 8583',
    'Transformation des APDU en messages réseau ISO 8583. MTI, bitmap, data elements. Mapping TLV EMV vers DE 55.',
    3, 480, '3', 4
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- MODULE 2.4 – EMV – Carte & Terminal (18h)
-- =============================================================================
INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-2.4-emv',
    'bloc-2-transactions-securisees',
    'EMV – Carte & Terminal',
    'Architecture EMV (Books 1-4, kernels), cycle de vie d''une transaction, TVR, TSI, ARQC, CVM, modes offline/online, scénarios de repli.',
    4, 1080, '4', 4
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- MODULE 2.5 – Terminaux de paiement & PIN Pad (PCI PTS) (15h)
-- =============================================================================
INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-2.5-pcipts',
    'bloc-2-transactions-securisees',
    'Terminaux de paiement & PIN Pad (PCI PTS)',
    'Architecture interne d''un TPE, PCI PTS POI v7.0, certifications SRED/EPP, injection de clés, mécanismes anti-fraude.',
    5, 900, '3', 4
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- MODULE 2.6 – 3-D Secure & Authentification forte (12h)
-- =============================================================================
INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-2.6-3dsecure',
    'bloc-2-transactions-securisees',
    '3-D Secure & Authentification forte',
    'Protocole 3DS v2.2.0, architecture ACS/DS/3DS Server, flux frictionless et challenge, ECI, CAVV, conformité DSP2.',
    6, 720, '3', 4
) ON CONFLICT (id) DO NOTHING;
