-- Seed data: BLOC 5 – Maîtrise d'Œuvre en Monétique (Option)
-- 6 modules, 92 heures (85% pratique)

INSERT INTO learning.cursus (id, title, description, icon, color, level, estimated_hours, tags, is_published, module_count)
VALUES (
    'bloc-5-maitrise-oeuvre',
    'BLOC 5 – Option : Maîtrise d''Œuvre en Monétique',
    'Spécialisation technique avancée — Devenir architecte développeur monétique. JavaCard, Android HCE, cryptographie appliquée (DUKPT, CVV, ARQC, ECC), GlobalPlatform, bases de données bancaires. 85% coding.',
    'code',
    'violet',
    'EXPERT',
    92,
    ARRAY['JavaCard','Android','HCE','DUKPT','CVV','ARQC','ECC','GlobalPlatform','NFC','base de données','PC/SC','APDU'],
    true,
    6
) ON CONFLICT (id) DO NOTHING;

-- Module 5.1 – Transactions Contact ISO 7816 (TP) – 4h
INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-5.1-contact',
    'bloc-5-maitrise-oeuvre',
    'Transactions Contact : ISO/IEC 7816 (TP)',
    'Maîtriser le dialogue APDU entre terminal et carte. Implémenter un émulateur de terminal en Java (PC/SC). Tracer et analyser des échanges APDU en temps réel. Protocoles T=0, T=1.',
    1, 240, '3', 3
) ON CONFLICT (id) DO NOTHING;

-- Module 5.2 – Android et Applications Smartphone – 15,5h
INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-5.2-android',
    'bloc-5-maitrise-oeuvre',
    'Android et Applications Smartphone',
    'API NFC Android (lecture, écriture, HCE). Développer une app de lecture de carte bancaire (EMV). Implémenter un émulateur de carte via HCE. Bridge NFC, EMV Kernel 8.',
    2, 930, '4', 4
) ON CONFLICT (id) DO NOTHING;

-- Module 5.3 – Cryptographie (TD & TP) – 12,5h
INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-5.3-crypto',
    'bloc-5-maitrise-oeuvre',
    'Cryptographie appliquée (TD & TP)',
    'Implémenter DUKPT, CVV/CVV2, ARQC/ARPC. Secure channel ECC/AES du Kernel 8. 3DES, AES, RSA, ECC appliqués au paiement.',
    3, 750, '4', 4
) ON CONFLICT (id) DO NOTHING;

-- Module 5.4 – JavaCard et GlobalPlatform – 22h
INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-5.4-javacard',
    'bloc-5-maitrise-oeuvre',
    'JavaCard et GlobalPlatform',
    'Architecture JavaCard (JCRE, runtime, API). Développer des applets de la conception au déploiement. GlobalPlatformPro pour gestion de cartes. Applet EMV simplifié, contremesures side-channel.',
    4, 1320, '5', 5
) ON CONFLICT (id) DO NOTHING;

-- Module 5.5 – Java pour Embarqué – 12h
INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-5.5-java-embarque',
    'bloc-5-maitrise-oeuvre',
    'Java pour Embarqué (prérequis JavaCard)',
    'Spécificités Java embarqué (JavaCard, Java ME). Restrictions de la VM, adaptation du code, optimisation mémoire, transactions atomiques JCRE.',
    5, 720, '3', 3
) ON CONFLICT (id) DO NOTHING;

-- Module 5.6 – Base de Données – 26h
INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-5.6-bdd',
    'bloc-5-maitrise-oeuvre',
    'Base de Données bancaire',
    'Persistance des transactions et données sensibles. Couche d''accès sécurisée (chiffrement, tokenisation). Optimisation temps réel, haute disponibilité, schéma de switch monétique.',
    6, 1560, '3', 4
) ON CONFLICT (id) DO NOTHING;
