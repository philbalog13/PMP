-- Seed 035 : Module Open Banking & API Security
-- Inserts into an existing active cursus.
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
        'Open Banking & API Security',
        'DSP2/PSD2, standards Berlin Group/STET, OAuth2+PKCE, et attaques sur les APIs open banking.',
        65,
        true
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_module_id;

    IF v_module_id IS NULL THEN
        SELECT id INTO v_module_id FROM learning.cursus_modules
        WHERE cursus_id = v_cursus_id AND title = 'Open Banking & API Security' LIMIT 1;
    END IF;

    IF v_module_id IS NULL THEN RETURN; END IF;

    -- Chapter 1: DSP2 / PSD2 et les acteurs
    INSERT INTO learning.cursus_chapters (module_id, title, content, key_points, chapter_order, estimated_minutes, is_active)
    VALUES (v_module_id,
        'DSP2 / PSD2 — Les acteurs et le cadre réglementaire',
        E'## Qu''est-ce que la DSP2 ?\\n\\nLa **DSP2** (Directive sur les Services de Paiement 2 — ou PSD2 en anglais) est la réglementation européenne qui impose aux banques d''ouvrir leurs systèmes aux tiers via des APIs standardisées. Elle est en vigueur depuis janvier 2018.\\n\\n## Les trois acteurs clés\\n\\n### AISP — Account Information Service Provider\\nUn **AISP** peut lire les données de compte du client (solde, transactions) après son consentement. Exemples : Bankin, Linxo, budget apps.\\n\\n```\\nClient → [Consentement] → AISP → [Access Token] → Banque (ASPSP)\\n                                                         ↓\\n                                              [Données compte] → AISP → Affichage\\n```\\n\\n### PISP — Payment Initiation Service Provider\\nUn **PISP** peut initier des virements depuis le compte du client. Exemples : Paylib, Lydia, Lyf.\\n\\n```\\nClient → [Consentement paiement] → PISP → [Ordre virement] → Banque → Exécution\\n```\\n\\n### ASPSP — Account Servicing Payment Service Provider\\nLa **banque** elle-même — elle doit exposer des APIs conformes DSP2 et traiter les demandes des AISP/PISP.\\n\\n## Authentification forte (SCA)\\n\\nLa DSP2 impose la **SCA** (Strong Customer Authentication) pour les paiements en ligne :\\n- Au moins 2 facteurs parmi : quelque chose que tu **sais** (PIN), **as** (téléphone), **es** (biométrie)\\n- Le **Dynamic Linking** : le code SCA doit être lié au montant ET au bénéficiaire\\n\\n> **Pourquoi c''est important ?** Dynamic linking empêche l''attaque "swap de bénéficiaire" : si le client valide un virement de 100€ vers X, le code SCA ne fonctionnera pas pour valider 100€ vers Y.\\n\\n## eIDAS — Les certificats électroniques\\n\\nLes TPP (Third Party Providers = AISP/PISP) doivent s''authentifier avec des **certificats eIDAS** :\\n- **QWAC** (Qualified Website Authentication Certificate) : identifie le TPP\\n- **QSealC** (Qualified Seal Certificate) : signe les messages API\\n\\n| Certificat | Usage | Émetteur |\\n|-----------|-------|---------|\\n| QWAC | TLS mutuel (mTLS) | QTSP agréé |\\n| QSealC | Signature des messages | QTSP agréé |\\n| QWAC-PSD2 | Identifie le rôle (AISP/PISP) | QTSP agréé |',
        '["DSP2 oblige les banques à ouvrir leurs APIs aux tiers (TPP)", "AISP = lecture de données, PISP = initiation paiement, ASPSP = banque", "SCA obligatoire avec dynamic linking pour les paiements", "eIDAS : QWAC pour mTLS, QSealC pour signatures de messages", "TPP enregistré auprès de l''autorité compétente nationale (ACPR en France)"]',
        1, 22, true)
    ON CONFLICT DO NOTHING;

    -- Chapter 2: Protocoles Open Banking (Berlin Group, STET, OAuth2+PKCE)
    INSERT INTO learning.cursus_chapters (module_id, title, content, key_points, chapter_order, estimated_minutes, is_active)
    VALUES (v_module_id,
        'Standards Open Banking — Berlin Group, STET, OAuth2+PKCE',
        E'## Les standards en Europe\\n\\nIl n''existe pas un seul format d''API open banking en Europe. Chaque marché a adopté une norme :\\n\\n| Standard | Marché | Porteur |\\n|---------|--------|---------|\\n| Berlin Group NextGenPSD2 | Europe (majoritaire) | Berlin Group |\\n| STET | France | STET (Société inter-bancaire) |\\n| Open Banking UK | Royaume-Uni | OBIE |\\n| Polish API | Pologne | ZBP |\\n\\n## Architecture OAuth2 en Open Banking\\n\\nLes APIs open banking utilisent **OAuth2** avec des extensions PSD2 :\\n\\n```\\n1. AISP (client) → [Authorization Request] → ASPSP Authorization Server\\n2. ASPSP → [Redirect] → Client (avec code)\\n3. Client → [Code + PKCE Verifier] → ASPSP Token Server\\n4. ASPSP → [Access Token + Refresh Token] → Client\\n5. Client → [API Call + Bearer Token] → Resource Server (API Bancaire)\\n```\\n\\n## PKCE — Proof Key for Code Exchange\\n\\n**PKCE** (RFC 7636) protège le flux OAuth2 contre l''interception du code d''autorisation :\\n\\n```bash\\n# Côté client : génération du verifier et challenge\\ncode_verifier = base64url(random_bytes(32))\\ncode_challenge = base64url(sha256(code_verifier))\\n\\n# Étape 1 : envoi du challenge (mais pas du verifier)\\nGET /authorize?code_challenge=XXXXX&code_challenge_method=S256\\n\\n# Étape 3 : envoi du verifier pour prouver qu''on est bien le demandeur\\nPOST /token?code=YYY&code_verifier=ZZZZZ\\n```\\n\\n> **Pourquoi c''est important ?** Sans PKCE, un attaquant qui intercepte le code d''autorisation (ex: dans les logs d''une app mobile) peut l''échanger contre un token. Avec PKCE, le code seul est inutile sans le verifier original.\\n\\n## Scopes DSP2 courants\\n\\n```\\naisp:read_accounts        — lire les comptes\\naisp:read_balances        — lire les soldes\\naisp:read_transactions    — lire les transactions\\npisp:create_payment       — initier un virement\\npisp:read_payment_status  — lire le statut d''un virement\\n```\\n\\n## Consentement granulaire\\n\\nChaque accès nécessite un **consentement explicite** du porteur, avec :\\n- La liste des comptes concernés\\n- Le type de données (solde, transactions)\\n- La durée du consentement (max 90 jours sans ré-authentification)\\n- La possibilité de révoquer à tout moment',
        '["Berlin Group NextGenPSD2 = standard le plus répandu en Europe", "OAuth2 + PKCE protège contre l''interception du code d''autorisation", "PKCE : code_challenge dans la requête, code_verifier dans l''échange de token", "Scopes granulaires : aisp:read_accounts, pisp:create_payment...", "Consentement valide 90 jours max sans nouvelle SCA"]',
        2, 20, true)
    ON CONFLICT DO NOTHING;

    -- Chapter 3: Attaques sur APIs Open Banking (BOLA, injection, token leakage)
    INSERT INTO learning.cursus_chapters (module_id, title, content, key_points, chapter_order, estimated_minutes, is_active)
    VALUES (v_module_id,
        'Attaques sur APIs Open Banking',
        E'## Les APIs open banking sont une cible de choix\\n\\nLes APIs PSD2 exposent des données financières sensibles à des tiers. Les vulnérabilités courantes sont celles de toute API REST, avec un impact financier direct.\\n\\n## BOLA — Broken Object Level Authorization\\n\\n**BOLA** (OWASP API Security #1) : un utilisateur accède aux ressources d''un autre utilisateur en changeant simplement un identifiant dans l''URL.\\n\\n```bash\\n# Scénario d''attaque BOLA sur une API AISP\\n# Token de l''attaquant (account ID = ACC-001)\\nGET /accounts/ACC-001/transactions\\nAuthorization: Bearer eyJ... (token attaquant)\\n# → 200 OK (normal)\\n\\n# Tentative BOLA : changer l''ID de compte\\nGET /accounts/ACC-002/transactions\\nAuthorization: Bearer eyJ... (même token)\\n# → Si 200 OK : fuite de données client B → BOLA confirmée\\n```\\n\\n**Mitigation** : Toujours vérifier que le `sub` du token correspond au propriétaire de la ressource demandée.\\n\\n## Redirect URI Manipulation (OAuth2)\\n\\n```\\nAttaquant → Phishing : lien OAuth2 avec redirect_uri=https://evil.com\\nVictime clique → Authentifie sur la vraie banque\\nBanque → Redirige le code vers evil.com\\nAttaquant → Échange le code contre un token\\n```\\n\\n**Mitigation** : Validation stricte de `redirect_uri` côté banque — exact match, pas de prefix match.\\n\\n## Token Leakage via Referrer\\n\\nSi un token Bearer est passé en paramètre d''URL (mauvaise pratique) :\\n```\\nhttps://app.bank.com/dashboard?access_token=eyJ...\\n```\\nLe token apparaît dans les logs serveur, les headers Referer des liens externes, et l''historique du navigateur.\\n\\n**Mitigation** : Tokens **uniquement** dans les headers HTTP (`Authorization: Bearer ...`), jamais dans les URLs.\\n\\n## Consent Replay Attack\\n\\nUn PISP malveillant garde le token de consentement et l''utilise après révocation côté banque, si la banque ne vérifie pas l''état du consentement à chaque appel.\\n\\n```bash\\n# Attaque\\n# 1. Client donne consentement → token émis\\n# 2. Client révoque le consentement (dans l''appli banque)\\n# 3. PISP malveillant rejoue le token révoqué\\nPOST /payments\\nAuthorization: Bearer [TOKEN RÉVOQUÉ]\\n# → Si la banque ne vérifie pas l''état → paiement exécuté !\\n```\\n\\n> **Pourquoi c''est important ?** Cette vulnérabilité est la cible du challenge CTF **INFRA-005** sur le JWT None algorithm — une variante où la banque accepte des tokens signés avec l''algorithme "none".\\n\\n## Injection dans les filtres de recherche\\n\\n```bash\\n# API de recherche de transactions\\nGET /accounts/ACC-001/transactions?fromDate=2024-01-01\\n\\n# Injection via le paramètre de date\\nGET /accounts/ACC-001/transactions?fromDate=2024-01-01''%20OR%20''1''=''1\\n# Si non protégé → injection SQL → accès à toutes les transactions\\n```\\n\\n**Mitigation** : Validation stricte des paramètres, requêtes paramétrées, ORM.\\n\\n## Score de risque OWASP API Security Top 10\\n\\n| Rang | Vulnérabilité | Fréquence Open Banking |\\n|-----|--------------|----------------------|\\n| #1 | BOLA | Très élevée |\\n| #2 | Broken Authentication | Élevée (OAuth mal implémenté) |\\n| #3 | Broken Object Property Auth | Élevée |\\n| #4 | Unrestricted Resource Consumption | Élevée (pas de rate-limit) |\\n| #5 | Broken Function Level Auth | Modérée |',
        '["BOLA #1 OWASP API = accès aux ressources d''un autre utilisateur via ID dans l''URL", "Redirect URI : validation exact-match obligatoire, pas de prefix", "Token Bearer uniquement dans les headers HTTP, jamais en URL parameter", "Consent Replay : vérifier l''état du consentement à chaque appel API", "Injection dans les paramètres de recherche : requêtes paramétrées obligatoires"]',
        3, 25, true)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Seed 035: Open Banking module inserted for cursus %', v_cursus_id;
END $$;
