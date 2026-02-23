/**
 * Glossaire monétique & cybersécurité — ~80 termes
 * Utilisé par CourseRichRenderer pour les tooltips contextuels.
 */

export const GLOSSARY: Record<string, string> = {
  // ── Protocoles & Standards ──────────────────────────────────────────
  'EMV': 'Standard de paiement par puce (Europay, Mastercard, Visa) — remplace la piste magnétique',
  'ISO 8583': 'Format standard des messages de transactions par carte bancaire (champs DE)',
  '3DS': '3D-Secure — protocole d\'authentification forte pour les paiements en ligne (DSP2)',
  'TLS': 'Transport Layer Security — protocole de chiffrement des communications réseau (v1.3 recommandé)',
  'mTLS': 'Mutual TLS — authentification mutuelle client + serveur par certificats X.509',
  'PKI': 'Public Key Infrastructure — infrastructure à clé publique (CA, certificats, révocation)',

  // ── Acteurs du paiement ──────────────────────────────────────────────
  'PSP': 'Payment Service Provider — prestataire de services de paiement (ex: Stripe, Adyen, Worldline)',
  'TPE': 'Terminal de Paiement Électronique — terminal physique en point de vente',
  'TMS': 'Terminal Management System — système de gestion à distance du parc de TPE',
  'AISP': 'Account Information Service Provider — agrégateur de comptes (DSP2 / Open Banking)',
  'PISP': 'Payment Initiation Service Provider — initiateur de paiement tiers (DSP2)',
  'ASPSP': 'Account Servicing Payment Service Provider — banque teneur de compte (DSP2)',
  'QSA': 'Qualified Security Assessor — auditeur certifié PCI DSS mandaté par les schémas',

  // ── Données de carte ─────────────────────────────────────────────────
  'PAN': 'Primary Account Number — numéro de carte (jusqu\'à 19 chiffres, validé par algorithme Luhn)',
  'CVV': 'Card Verification Value — code de sécurité 3 chiffres (CVV2 pour e-commerce, iCVV pour puce)',
  'CVV2': 'Card Verification Value 2 — code de sécurité imprimé au dos, non stockable (PCI DSS req. 3)',
  'iCVV': 'Integrated CVV — CVV dynamique calculé par la puce EMV, différent du CVV2',
  'PIN': 'Personal Identification Number — code secret 4 à 6 chiffres, jamais stocké en clair',
  'BIN': 'Bank Identification Number — 6 premiers chiffres du PAN identifiant l\'émetteur',
  'DPAN': 'Device PAN — PAN tokenisé lié à un appareil mobile (Apple Pay, Google Pay)',
  'MPAN': 'Merchant PAN — PAN tokenisé côté commerçant (transaction récurrente)',

  // ── Cryptographie ────────────────────────────────────────────────────
  'HSM': 'Hardware Security Module — module matériel certifié FIPS 140-2 pour les opérations cryptographiques',
  'AES': 'Advanced Encryption Standard — chiffrement symétrique par blocs (128/192/256 bits)',
  'DES': 'Data Encryption Standard — algorithme de chiffrement obsolète (56 bits, cassable)',
  '3DES': 'Triple DES — 3 passages DES successifs, vulnérable à Sweet32 (bloc 64 bits), déprécié',
  'RSA': 'Algorithme de chiffrement asymétrique (Rivest, Shamir, Adleman) — utilisé en EMV',
  'HMAC': 'Hash-based Message Authentication Code — code d\'intégrité basé sur un hash',
  'SHA': 'Secure Hash Algorithm — famille de fonctions de hachage (SHA-256 recommandé)',
  'ECB': 'Electronic Codebook — mode de chiffrement vulnérable : blocs identiques → chiffrés identiques',
  'CBC': 'Cipher Block Chaining — mode de chiffrement en chaîne (plus sûr qu\'ECB)',
  'GCM': 'Galois/Counter Mode — mode AEAD authentifié pour AES (intégrité + confidentialité)',
  'MAC': 'Message Authentication Code — code d\'intégrité d\'un message financier (ISO 9797)',
  'PRNG': 'Pseudo-Random Number Generator — générateur de nombres pseudo-aléatoires',
  'CSPRNG': 'Cryptographically Secure PRNG — PRNG sûr pour usage cryptographique bancaire',

  // ── Gestion des clés ─────────────────────────────────────────────────
  'ZPK': 'Zone PIN Key — clé de chiffrement du PIN entre TPE et HSM processeur',
  'ZMK': 'Zone Master Key — clé maître de zone pour la dérivation des clés de session',
  'KEK': 'Key Encryption Key — clé de chiffrement de clé (chiffre les clés de session)',
  'DUKPT': 'Derived Unique Key Per Transaction — clé dérivée unique par transaction (limite l\'impact d\'une compromission)',
  'KSN': 'Key Serial Number — identifiant de 10 octets de la clé DUKPT courante',

  // ── Authentification EMV ─────────────────────────────────────────────
  'ARQC': 'Authorization Request Cryptogram — cryptogramme généré par la puce pour l\'autorisation en ligne',
  'ARPC': 'Authorization Response Cryptogram — réponse cryptographique de l\'émetteur à l\'ARQC',
  'TC': 'Transaction Certificate — cryptogramme EMV final (transaction approuvée et complétée)',
  'AAC': 'Application Authentication Cryptogram — cryptogramme EMV de refus offline',
  'CDA': 'Combined Data Authentication — authentification dynamique EMV puce + signature terminal',
  'DDA': 'Dynamic Data Authentication — authentification dynamique EMV côté puce uniquement',
  'SDA': 'Static Data Authentication — authentification statique EMV (vulnérable au clonage)',
  'CVM': 'Cardholder Verification Method — méthode de vérification du porteur (PIN, signature, no CVM)',

  // ── 3D-Secure ────────────────────────────────────────────────────────
  'ACS': 'Access Control Server — serveur 3DS côté émetteur qui authentifie le porteur',
  'CAVV': 'Cardholder Authentication Verification Value — preuve cryptographique d\'authentification 3DS',
  'ECI': 'E-Commerce Indicator — indicateur du niveau d\'authentification 3DS (05=full, 06=attempted, 07=not enrolled)',
  'SCA': 'Strong Customer Authentication — authentification forte imposée par DSP2 (2 facteurs)',
  'OTP': 'One-Time Password — mot de passe à usage unique (ex: code SMS)',
  'TOTP': 'Time-based One-Time Password — OTP basé sur le temps (RFC 6238, ex: Google Authenticator)',

  // ── Compliance ───────────────────────────────────────────────────────
  'PCI DSS': 'Payment Card Industry Data Security Standard — norme de sécurité des données de paiement (12 exigences)',
  'CDE': 'Cardholder Data Environment — périmètre de données porteur soumis au PCI DSS',
  'SAQ': 'Self-Assessment Questionnaire — auto-évaluation PCI DSS selon le type de commerçant (SAQ A, B, D…)',
  'DSP2': 'Directive sur les Services de Paiement 2 — réglementation européenne imposant SCA et Open Banking',
  'PSD2': 'Payment Services Directive 2 — équivalent anglais de DSP2',
  'IFR': 'Interchange Fee Regulation — règlement UE plafonnant les commissions interbancaires (0,2% débit, 0,3% crédit)',
  'DORA': 'Digital Operational Resilience Act — règlement UE sur la résilience numérique des entités financières',

  // ── Flux & Compensation ──────────────────────────────────────────────
  'STAN': 'System Trace Audit Number — numéro de trace unique par transaction dans ISO 8583 (DE 11)',
  'RRN': 'Retrieval Reference Number — référence unique attribuée par l\'acquéreur (DE 37)',
  'MCC': 'Merchant Category Code — code catégorie de l\'activité du commerçant (ex: 5411 = alimentation)',
  'MDR': 'Merchant Discount Rate — commission globale payée par le commerçant (interchange + marge acquéreur)',
  'TC33': 'Fichier de compensation Visa — format IPM standard des fichiers de clearing',
  'IPM': 'Interchange Processing Message — format Mastercard des fichiers de clearing interbancaire',

  // ── Tokenisation ─────────────────────────────────────────────────────
  'VTS': 'Visa Token Service — service de tokenisation réseau de Visa',
  'MDES': 'Mastercard Digital Enablement Service — service de tokenisation de Mastercard',
  'NFC': 'Near Field Communication — technologie sans contact (ISO 14443, 13,56 MHz)',

  // ── Fraude & Sécurité ────────────────────────────────────────────────
  'MITM': 'Man-in-the-Middle — attaque d\'interception et de modification des communications',
  'DoS': 'Denial of Service — attaque visant à rendre un service indisponible (saturation)',
  'SIEM': 'Security Information and Event Management — centralisation et corrélation des logs sécurité',
  'BOLA': 'Broken Object Level Authorization — faille API exposant des ressources sans vérification d\'identité',

  // ── Open Banking & API ───────────────────────────────────────────────
  'JWT': 'JSON Web Token — token d\'authentification signé (header.payload.signature en Base64)',
  'PKCE': 'Proof Key for Code Exchange — extension OAuth2 contre les attaques d\'interception de code',
  'OAuth2': 'Framework d\'autorisation déléguée (RFC 6749) — standard Open Banking',

  // ── SRE / Résilience ─────────────────────────────────────────────────
  'SLA': 'Service Level Agreement — accord de niveau de service (disponibilité, temps de réponse)',
  'SLO': 'Service Level Objective — objectif mesurable de niveau de service (ex: 99,9% uptime)',
  'SRE': 'Site Reliability Engineering — discipline d\'ingénierie de la fiabilité des systèmes',

  // ── Luhn ─────────────────────────────────────────────────────────────
  'Luhn': 'Algorithme de validation du chiffre de contrôle d\'un PAN (ISO 7812)',
};

/** Termes reconnus triés par longueur décroissante pour longest-match-first */
export const GLOSSARY_TERMS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);

/** Regex compilée une fois, insensible à la casse, sur des frontières de mots */
export const GLOSSARY_REGEX = new RegExp(
  `\\b(${GLOSSARY_TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'g'
);
