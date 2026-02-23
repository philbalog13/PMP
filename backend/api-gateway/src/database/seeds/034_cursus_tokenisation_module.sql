-- Seed 034 : Module Tokenisation & Cloud Payments
-- Inserts into an existing cursus (Bloc 5 or creates a dedicated module).
-- Depends on learning.cursus_modules and learning.cursus_chapters tables.

DO $$
DECLARE
    v_cursus_id UUID;
    v_module_id UUID;
BEGIN
    -- Use the first available active cursus (id-agnostic approach)
    SELECT id INTO v_cursus_id FROM learning.cursus WHERE is_active = true ORDER BY created_at LIMIT 1;
    IF v_cursus_id IS NULL THEN RETURN; END IF;

    -- Insert module if it doesn't exist yet
    INSERT INTO learning.cursus_modules (cursus_id, title, description, module_order, is_active)
    VALUES (
        v_cursus_id,
        'Tokenisation & Cloud Payments',
        'Apple Pay, Google Pay, VTS/MDES, PCI scope reduction, and token-based attacks.',
        60,
        true
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_module_id;

    IF v_module_id IS NULL THEN
        SELECT id INTO v_module_id FROM learning.cursus_modules
        WHERE cursus_id = v_cursus_id AND title = 'Tokenisation & Cloud Payments' LIMIT 1;
    END IF;

    IF v_module_id IS NULL THEN RETURN; END IF;

    -- Chapter 1: Apple Pay & Google Pay internals
    INSERT INTO learning.cursus_chapters (module_id, title, content, key_points, chapter_order, estimated_minutes, is_active)
    VALUES (v_module_id,
        'Apple Pay & Google Pay — Comment ça marche ?',
        E'## Le paiement mobile sans contact\n\nQuand vous payez avec Apple Pay ou Google Pay, votre **PAN** réel n''est jamais transmis au commerçant. À la place, un **DPAN** (Device Primary Account Number) est utilisé — un token unique lié à votre appareil.\n\n## Architecture technique\n\n```\nUser → iPhone → Secure Enclave → Token Requestor → VTS/MDES → Réseau Visa/MC → Acquéreur\n```\n\n### Étapes clés\n\n1. **Provisionnement** : L''application bancaire demande un token à Visa Token Service (VTS) ou Mastercard Digital Enablement Service (MDES).\n2. **Stockage sécurisé** : Le DPAN est stocké dans le Secure Element (SE) ou le Trusted Execution Environment (TEE).\n3. **Paiement** : Le terminal NFC reçoit le DPAN + un iCVV dynamique généré pour la transaction.\n4. **Dé-tokenisation** : Le réseau card (Visa/MC) résout le DPAN → PAN réel avant d''envoyer à l''émetteur.\n\n## Avantages sécurité\n\n| Risque | Avec PAN classique | Avec Token |\n|--------|-------------------|------------|\n| Interception NFC | PAN exposé | DPAN inutilisable sans contexte |\n| Compromission commerçant | PAN volé | Token limité à cet appareil |\n| Replay attack | Possible | Impossible (iCVV dynamique) |\n\n> **Pourquoi c''est important ?** Le DPAN est lié à un appareil ET à un usage spécifique (merchant, device). Même si un attaquant intercepte la transaction, le token ne peut pas être réutilisé ailleurs.\n\n## MPAN vs DPAN\n\n- **DPAN** (Device PAN) : lié à un appareil mobile (Apple Pay, Google Pay)\n- **MPAN** (Merchant PAN) : lié à un commerçant pour les paiements récurrents',
        '["Le DPAN remplace le PAN lors du paiement mobile", "VTS = Visa Token Service, MDES = Mastercard Digital Enablement Service", "Le Secure Element stocke le token en isolation", "iCVV dynamique = chaque transaction a un code unique", "Dé-tokenisation transparente côté réseau"]',
        1, 20, true)
    ON CONFLICT DO NOTHING;

    -- Chapter 2: Network Tokenisation (VTS/MDES)
    INSERT INTO learning.cursus_chapters (module_id, title, content, key_points, chapter_order, estimated_minutes, is_active)
    VALUES (v_module_id,
        'Network Tokenisation — VTS & MDES',
        E'## Qu''est-ce que la tokenisation réseau ?\n\nLa tokenisation réseau remplace le PAN dans toutes les interactions digitales par un token géré au niveau du réseau de paiement (Visa ou Mastercard).\n\n## Token Requestor\n\nUn **Token Requestor** est toute entité autorisée à demander des tokens. Il peut s''agir :\n- D''un wallet mobile (Apple Pay, Google Pay, Samsung Pay)\n- D''un commerçant en ligne (Amazon, Netflix)\n- D''une banque pour ses propres services\n\n```\nToken Requestor → [Demande token] → VTS/MDES\n                                         ↓\n                              [Retourne DPAN/MPAN]\n                                         ↓\n                              [Stocke dans Token Vault]\n```\n\n## Cycle de vie d''un token\n\n1. **Provisionnement** : Création et liaison token ↔ PAN\n2. **Activation** : Vérification identité du porteur (Step-up auth)\n3. **Utilisation** : Paiement avec contrôle de domaine\n4. **Suspension** : Appareil perdu → token suspendu\n5. **Révocation** : Suppression permanente\n\n> **Astuce** : La suspension/révocation d''un token n''affecte pas la carte physique. L''utilisateur peut continuer à payer en boutique.\n\n## PCI DSS scope reduction\n\nUn commerçant qui **ne reçoit jamais de PAN réels** mais uniquement des tokens peut bénéficier d''une réduction significative du périmètre PCI DSS (CDE réduit). C''est l''un des grands avantages business de la tokenisation.',
        '["Token Requestor = entité qui demande des tokens (wallet, merchant)", "Cycle de vie : Provisionnement → Activation → Utilisation → Révocation", "Suspension token ≠ annulation carte physique", "Tokenisation réseau réduit le périmètre PCI DSS", "Token Vault = base de données centralisée token↔PAN côté réseau"]',
        2, 18, true)
    ON CONFLICT DO NOTHING;

    -- Chapter 3: PCI DSS scope reduction
    INSERT INTO learning.cursus_chapters (module_id, title, content, key_points, chapter_order, estimated_minutes, is_active)
    VALUES (v_module_id,
        'PCI DSS Scope Reduction via Tokenisation',
        E'## Le problème du CDE\n\nLe **Cardholder Data Environment (CDE)** est l''ensemble des systèmes qui stockent, traitent ou transmettent des données de carte. Chaque système dans le CDE doit respecter les 12 exigences PCI DSS.\n\n## Comment la tokenisation réduit le scope\n\nAvec la tokenisation :\n- Le commerçant ne voit jamais le PAN réel\n- Les tokens transmis ne sont pas des données de carte au sens PCI\n- Le CDE peut être réduit au système de dé-tokenisation seul (chez le TSP)\n\n```\nCDE SANS tokenisation :\n[Checkout] → [API] → [DB] → [Logs] → [Backups] = TOUT dans le CDE\n\nCDE AVEC tokenisation :\n[Token] → [TSP seulement] = CDE minimal\n```\n\n## SAQ et niveau de compliance\n\n| Type commerçant | Sans token | Avec token |\n|----------------|-----------|------------|\n| E-commerce | SAQ D (329 questions) | SAQ A (22 questions) |\n| POS physique | SAQ B+ | SAQ B |\n\n> **Attention** : La réduction de scope s''applique uniquement si l''intégration est correctement implémentée. Un token mal géré (stocké côté merchant avec lien vers PAN) ne réduit pas le scope.\n\n## Le rôle du Token Service Provider (TSP)\n\nLe TSP (VTS, MDES, ou PSP tiers) est responsable du Token Vault. Il doit lui-même être certifié PCI DSS Level 1.',
        '["CDE = périmètre des systèmes manipulant des données carte", "Tokenisation déplace la responsabilité PCI vers le TSP", "SAQ A (22 questions) vs SAQ D (329 questions) : énorme différence d'effort", "Token mal géré = pas de réduction de scope", "TSP doit être certifié PCI DSS Level 1"]',
        3, 15, true)
    ON CONFLICT DO NOTHING;

    -- Chapter 4: Token attacks
    INSERT INTO learning.cursus_chapters (module_id, title, content, key_points, chapter_order, estimated_minutes, is_active)
    VALUES (v_module_id,
        'Attaques sur les Tokens',
        E'## Les tokens ne sont pas invulnérables\n\nBien que les tokens soient beaucoup plus sécurisés que les PAN, des vecteurs d''attaque existent.\n\n## Token Brute-Force (BIN Attack sur tokens)\n\nCertains Token Service Providers utilisent des espaces de tokens prédictibles. Un attaquant peut :\n1. Obtenir un token valide\n2. Incrémenter ou modifier des chiffres\n3. Tester si le token modifié est valide\n4. Si le TSP ne limite pas les tentatives → énumération possible\n\n**Mitigation** : Tokens aléatoires cryptographiquement sûrs (CSPRNG), rate limiting strict sur l''API de validation.\n\n## Détournement de token (Token Hijacking)\n\nUn token lié à un appareil peut être volé si :\n- L''application stocke le token dans un stockage non sécurisé (ex: SharedPreferences Android)\n- L''appareil est rooté/jailbreaké (contournement du SE)\n- Attaque MITM sur le provisionnement (si TLS non validé)\n\n## Dé-tokenisation non autorisée\n\nSi l''API du TSP n''implémente pas correctement le contrôle d''accès (BOLA), un attaquant pourrait envoyer un token et récupérer le PAN réel.\n\n```bash\n# Attaque BOLA sur API de dé-tokenisation\nGET /api/detokenize?token=4000000000001234\nAuthorization: Bearer [token_etudiant_volé]\n# Si BOLA → retourne le vrai PAN\n```\n\n> **Pourquoi c''est important ?** Cette vulnérabilité est la cible du challenge CTF **TOKEN-003** que tu vas attaquer ensuite.',
        '["Token brute-force possible si espace non-aléatoire", "Token Hijacking via stockage non sécurisé sur appareil", "BOLA sur API de dé-tokenisation = accès non autorisé aux PAN", "CSPRNG + rate limiting = mitigations essentielles", "Appareil rooté contourne le Secure Element"]',
        4, 22, true)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Seed 034: Tokenisation module inserted for cursus %', v_cursus_id;
END $$;
