-- Seed data: BLOC 4 – Sécurité & Gestion des Risques
-- 5 modules, 65 heures (50% TD)

INSERT INTO learning.cursus (id, title, description, icon, color, level, estimated_hours, tags, is_published, module_count)
VALUES (
    'bloc-4-securite-risques',
    'BLOC 4 – Sécurité & Gestion des Risques',
    'Maîtriser la sécurité des systèmes de paiement. PCI DSS v4.0.1, analyses de risques, anti-fraude, conformité DSP2/RGPD, audit et réponse à incident. 50% travaux dirigés.',
    'shield',
    'red',
    'AVANCE',
    65,
    ARRAY['PCI DSS','fraude','scoring','DSP2','RGPD','audit','OWASP','LCB-FT','forensics','compliance'],
    true,
    5
) ON CONFLICT (id) DO NOTHING;

-- Module 4.1 – PCI DSS v4.0.1 (18h)
INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-4.1-pcidss',
    'bloc-4-securite-risques',
    'PCI DSS v4.0.1 : le référentiel complet',
    'Les 12 exigences PCI DSS v4.0.1, l''approche personnalisée, SAQ, périmètre, évaluation QSA, objectif de sécurité vs contrôles prescriptifs.',
    1, 1080, '3', 4
) ON CONFLICT (id) DO NOTHING;

-- Module 4.2 – Anti-fraude (15h)
INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-4.2-antifraude',
    'bloc-4-securite-risques',
    'Détection et prévention de la fraude',
    'Typologies de fraude (CNP, skimming, ingénierie sociale), scoring temps réel (règles + ML), machine learning appliqué, framework complet de scoring.',
    2, 900, '4', 4
) ON CONFLICT (id) DO NOTHING;

-- Module 4.3 – Conformité réglementaire (12h)
INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-4.3-conformite',
    'bloc-4-securite-risques',
    'Conformité : DSP2, RGPD, LCB-FT',
    'Obligations DSP2 (SCA, accès comptes, PISP/AISP), RGPD et données de paiement, LCB-FT (screening, déclarations de soupçon), interactions entre cadres réglementaires.',
    3, 720, '3', 4
) ON CONFLICT (id) DO NOTHING;

-- Module 4.4 – Audit & Tests d'intrusion (12h)
INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-4.4-audit',
    'bloc-4-securite-risques',
    'Audit, pentesting & réponse à incident',
    'Méthode d''audit PCI DSS (QSA, SAQ), tests d''intrusion sur composants de paiement, OWASP Top 10, réponse à incident et forensics.',
    4, 720, '4', 4
) ON CONFLICT (id) DO NOTHING;

-- Module 4.5 – Gestion des risques (8h)
INSERT INTO learning.cursus_modules (id, cursus_id, title, description, module_order, estimated_minutes, difficulty, chapter_count)
VALUES (
    'mod-4.5-risques',
    'bloc-4-securite-risques',
    'Analyse et gestion des risques',
    'Méthodologies (ISO 27005, EBIOS RM), cartographie des risques monétiques, plan de traitement, indicateurs de risque, gouvernance.',
    5, 480, '3', 3
) ON CONFLICT (id) DO NOTHING;
