/**
 * Sanitized challenge metadata for the attackbox lab command.
 * Contains ONLY: code, title, category, points, description.
 * NO targetEndpoint, commandTemplate, flagValue, attackVector, guidedSteps.
 * Students must discover all technical details themselves.
 */

// HSM Challenges
const CHALLENGES_HSM = [
    { code: 'HSM-001', title: 'Le Coffre Ouvert', category: 'HSM_ATTACK', points: 100,
      description: 'Un endpoint admin du HSM expose les cles cryptographiques sans aucune authentification. Decouvrez-le, extrayez les cles et mesurez l impact.' },
    { code: 'HSM-002', title: 'Cles Previsibles', category: 'HSM_ATTACK', points: 150,
      description: 'Parmi les cles du HSM, une ZPK de test a une valeur triviale (motif repete). Une ZPK faible compromet la confidentialite de tous les PIN blocks.' },
    { code: 'HSM-003', title: 'Fuite dans les Logs', category: 'HSM_ATTACK', points: 200,
      description: 'Le HSM est deploye avec un mode de journalisation mis-configure qui logue le materiel cryptographique en clair. Decouvrez comment declencher la fuite et extrayez votre flag depuis les logs.' },
    { code: 'HSM-004', title: 'Le Pingouin ECB', category: 'HSM_ATTACK', points: 250,
      description: 'Le mode ECB chiffre chaque bloc independamment. Les patterns dans les donnees claires se retrouvent dans le chiffre — le celebre "pingouin ECB".' },
    { code: 'HSM-005', title: 'Course contre la Montre', category: 'HSM_ATTACK', points: 350,
      description: 'La verification MAC utilise une comparaison sequentielle. Le temps de reponse revele combien d octets sont corrects — timing side-channel.' },
];

// Replay Challenges
const CHALLENGES_REPLAY = [
    { code: 'REPLAY-001', title: 'Deja Vu', category: 'REPLAY_ATTACK', points: 100,
      description: 'Le systeme n a aucune protection anti-replay. Une transaction capturee peut etre rejouee indefiniment pour debiter le porteur plusieurs fois.' },
    { code: 'REPLAY-002', title: 'Reset et Recommence', category: 'REPLAY_ATTACK', points: 150,
      description: 'Les compteurs de velocite sont stockes en memoire. Apres un redemarrage du service, toutes les limites anti-fraude sont remises a zero.' },
];

// 3DS Challenges
const CHALLENGES_3DS = [
    { code: '3DS-001', title: 'Le Numero Magique', category: '3DS_BYPASS', points: 100,
      description: 'L OTP 3D Secure est hardcode. Un code statique valide toutes les authentifications — bypass total de l authentification forte.' },
    { code: '3DS-002', title: 'Le Mot de Passe', category: '3DS_BYPASS', points: 150,
      description: 'Une valeur magique dans le champ d authentification bypasse toute la logique de verification 3DS — une backdoor de developpement laissee en production.' },
    { code: '3DS-003', title: 'Juste en Dessous', category: '3DS_BYPASS', points: 200,
      description: 'Le seuil SCA est un montant statique unique. Les transactions juste en dessous (ex: 499.99 EUR) ne declenchent jamais de challenge 3DS.' },
];

// Fraud Challenges
const CHALLENGES_FRAUD = [
    { code: 'FRAUD-001', title: 'Quand la Fraude Dort', category: 'FRAUD_CNP', points: 200,
      description: 'En cas de panne du moteur de fraude, le switch approuve par defaut (fail-open). Un attaquant peut exploiter cette fenetre pour passer des transactions frauduleuses.' },
    { code: 'FRAUD-002', title: 'Score Optimise', category: 'FRAUD_CNP', points: 250,
      description: 'Le scoring fraude repose sur des seuils statiques. En manipulant les attributs de la transaction (montant, pays, MCC), on peut garder le score juste sous le seuil de blocage.' },
];

// Network / Protocol Challenges
const CHALLENGES_ISO = [
    { code: 'ISO-001', title: 'Table de Routage Exposee', category: 'ISO8583_MANIPULATION', points: 100,
      description: 'L endpoint de debug du switch expose la table de routage BIN complete. Un attaquant en deduit la topologie du reseau, les issuers connectes et les plages de cartes actives.' },
    { code: 'ISO-002', title: 'Montant Maximum', category: 'ISO8583_MANIPULATION', points: 150,
      description: 'La validation du montant dans le switch autorise des valeurs astronomiques. Un attaquant peut envoyer une transaction de 999 999 999.99 EUR car la limite technique est deconnectee de la realite metier.' },
];

// PIN Challenges
const CHALLENGES_PIN = [
    { code: 'PIN-001', title: 'Le Fallback Silencieux', category: 'PIN_CRACKING', points: 250,
      description: 'Quand le HSM est indisponible, la verification PIN bascule en mode fail-open et approuve tous les PIN, meme invalides.' },
    { code: 'PIN-002', title: 'Random Previsible', category: 'PIN_CRACKING', points: 300,
      description: 'Le padding du PIN block utilise Math.random() au lieu d un CSPRNG. Le padding est previsible et le PIN block peut etre reconstruit.' },
];

// MITM Challenge
const CHALLENGES_MITM = [
    { code: 'MITM-001', title: 'Le CVV Voyageur', category: 'MITM', points: 200,
      description: 'Le CVV transite en clair dans les payloads inter-services apres la decision d autorisation. C est une violation PCI DSS Exigence 3.2.' },
];

// Privilege Escalation
const CHALLENGES_PRIV = [
    { code: 'PRIV-001', title: 'Le Compte en Banque Infini', category: 'PRIVILEGE_ESCALATION', points: 300,
      description: 'Un endpoint de modification de solde est accessible sans authentification. Un etudiant peut crediter n importe quel compte de montants arbitraires.' },
];

// Crypto Challenges
const CHALLENGES_CRYPTO = [
    { code: 'CRYPTO-001', title: 'Token Predictible', category: 'CRYPTO_WEAKNESS', points: 120,
      description: 'Les tokens de session sont generes avec un algorithme previsible. En observant quelques tokens, un attaquant peut predire les suivants et usurper des sessions.' },
    { code: 'CRYPTO-002', title: 'Auth Code Guessable', category: 'CRYPTO_WEAKNESS', points: 220,
      description: 'Les codes d autorisation transactionnels sont generes par un PRNG faible. Avec quelques observations, un attaquant peut predire les futurs auth codes.' },
    { code: 'INFRA-005', title: "L'Algorithme Fantome", category: 'CRYPTO_WEAKNESS', points: 200,
      description: 'Le serveur d autorisation accepte des JWT signes avec l algorithme "none". Un attaquant peut forger un token valide sans connaitre le secret de signature.' },
];

// EMV Challenges
const CHALLENGES_EMV = [
    { code: 'EMV-001', title: 'Le Clone Magnetique', category: 'EMV_CLONING', points: 120,
      description: 'Le switch accepte encore le fallback magstripe (posEntryMode=90). Un attaquant clone les donnees Track2 et envoie une autorisation via bande magnetique.' },
    { code: 'EMV-002', title: 'Le Relais Invisible', category: 'EMV_CLONING', points: 180,
      description: 'Le protocole NFC ne verifie pas la proximite reelle. Un relay attack transmet les APDU entre une carte et un terminal distants.' },
    { code: 'EMV-003', title: 'Le Cryptogramme Rejouable', category: 'EMV_CLONING', points: 250,
      description: 'Le TC (Transaction Certificate) genere par la carte n est pas verifie en temps reel par le switch. Un attaquant peut modifier le montant dans le cleartext.' },
    { code: 'EMV-004', title: 'Le Fallback Force', category: 'EMV_CLONING', points: 180,
      description: 'L envoi d un code erreur chip (6985/6A82) force le terminal a basculer en magstripe. Toutes les protections EMV sont perdues.' },
    { code: 'EMV-005', title: 'Le Pre-Play', category: 'EMV_CLONING', points: 350,
      description: 'Le nonce terminal (UN — Unpredictable Number) est un compteur sequentiel au lieu d un alea. Un attaquant peut pre-generer des cryptogrammes pour des transactions futures.' },
];

// Token Challenges
const CHALLENGES_TOKEN = [
    { code: 'TOKEN-001', title: 'Le Vault Bavard', category: 'TOKEN_VAULT', points: 120,
      description: 'Le vault de tokenisation retourne des fragments de PAN dans ses messages d erreur quand une requete est malformee.' },
    { code: 'TOKEN-002', title: 'La Collision de Tokens', category: 'TOKEN_VAULT', points: 180,
      description: 'L algorithme de tokenisation genere des collisions : deux PAN differents peuvent produire le meme token.' },
    { code: 'TOKEN-003', title: 'Le Detokeniseur', category: 'TOKEN_VAULT', points: 250,
      description: 'L endpoint de detokenisation n a pas de rate-limiting. Un attaquant peut enumerer tous les tokens et recuperer les PAN.' },
    { code: 'TOKEN-004', title: 'Le Token Reversible', category: 'TOKEN_VAULT', points: 350,
      description: 'L algorithme FPE (Format-Preserving Encryption) utilise une cle derivee de facon previsible. Le token peut etre reverse-engineere pour retrouver le PAN.' },
];

// Network ISO Challenges
const CHALLENGES_NET = [
    { code: 'NET-001', title: 'Le Sniffer ISO', category: 'NETWORK_ATTACK', points: 120,
      description: 'Pas de TLS entre le switch et l acquereur. Les messages ISO 8583 transitent en clair avec PAN, PIN block et montants.' },
    { code: 'NET-002', title: "L'Injection ISO", category: 'NETWORK_ATTACK', points: 180,
      description: 'Le champ DE 43 (merchant name) n est pas assaini. Une injection SQL via ce champ corrompte le parsing et peut extraire des donnees.' },
    { code: 'NET-003', title: 'Le MTI Forge', category: 'NETWORK_ATTACK', points: 200,
      description: 'Le switch ne valide pas le MTI des messages recus. Un attaquant peut envoyer un 0110 (reponse) au lieu d un 0100 (requete) pour injecter une fausse approbation.' },
    { code: 'NET-004', title: 'Le STAN Predictible', category: 'NETWORK_ATTACK', points: 250,
      description: 'Le STAN (System Trace Audit Number) est sequentiel. Un attaquant peut predire le prochain STAN et forger un reversal pour annuler une transaction legitime.' },
    { code: 'NET-005', title: 'Le MAC Absent', category: 'NETWORK_ATTACK', points: 180,
      description: 'Les messages ISO 8583 ne contiennent pas de DE 64/128 (MAC). Un attaquant peut modifier le montant d un message en transit sans detection.' },
];

// Key Management Challenges
const CHALLENGES_KEY = [
    { code: 'KEY-001', title: 'La Ceremonie Baclee', category: 'KEY_MANAGEMENT', points: 200,
      description: 'Les composants de la LMK (Local Master Key) sont stockes dans un fichier de backup accessible. Reconstituez la LMK a partir de ses composants.' },
    { code: 'KEY-002', title: 'Le KEK Partage', category: 'KEY_MANAGEMENT', points: 280,
      description: 'Tous les terminaux partagent la meme KEK (Key Encryption Key). La compromission d un terminal compromet toutes les ZPK.' },
    { code: 'KEY-003', title: 'La Rotation Oubliee', category: 'KEY_MANAGEMENT', points: 160,
      description: 'La ZPK n a jamais ete rotee depuis le deploiement initial. Sa date de creation est identique a la date de setup du systeme.' },
    { code: 'KEY-004', title: "L'Export Implicite", category: 'KEY_MANAGEMENT', points: 350,
      description: 'Le HSM permet d exporter une cle sensible sous une cle de chiffrement plus faible. L attaquant exporte puis brute-force.' },
];

// Advanced Fraud Challenges
const CHALLENGES_ADV_FRAUD = [
    { code: 'ADV-FRAUD-001', title: 'Le Bot de Testing', category: 'ADVANCED_FRAUD', points: 200,
      description: 'Le systeme ne detecte pas le card testing : 500 autorisations de 1 EUR en 2 minutes sur des PAN differents.' },
    { code: 'ADV-FRAUD-002', title: 'Le Split Payment', category: 'ADVANCED_FRAUD', points: 250,
      description: 'Un achat de 800 EUR fractionne en 3 transactions de 266 EUR sur 3 merchants contourne le seuil SCA et les regles de velocite.' },
    { code: 'ADV-FRAUD-003', title: 'Le Compte Jetable', category: 'ADVANCED_FRAUD', points: 280,
      description: 'La velocite est trackee par PAN uniquement. Avec N comptes virtuels ayant le meme device fingerprint, les limites sont contournees.' },
    { code: 'ADV-FRAUD-004', title: "L'Evasion ML", category: 'ADVANCED_FRAUD', points: 350,
      description: 'Le modele de scoring a des features exploitables. En manipulant l heure, le pays, le MCC et le montant, on maintient le score juste sous le seuil.' },
];

// Infrastructure / Supply Chain Challenges
const CHALLENGES_INFRA = [
    { code: 'INFRA-001', title: 'Le Magecart', category: 'SUPPLY_CHAIN', points: 200,
      description: 'Un CDN compromis injecte un script exfiltrant les donnees de carte depuis la page de checkout.' },
    { code: 'INFRA-002', title: "Le Serveur d'Admin", category: 'SUPPLY_CHAIN', points: 120,
      description: 'Le TMS (Terminal Management System) utilise des credentials par defaut (admin/admin). Un attaquant peut pousser des mises a jour malveillantes.' },
    { code: 'INFRA-003', title: 'Le Log Harvester', category: 'SUPPLY_CHAIN', points: 180,
      description: 'Les logs applicatifs contiennent des PAN, CVV et PIN blocks en clair, en violation de PCI DSS.' },
    { code: 'INFRA-004', title: 'La Porte de Service', category: 'SUPPLY_CHAIN', points: 100,
      description: 'Un endpoint /debug ou /metrics est expose en production avec des credentials et configurations internes.' },
];

// THM-like Financial Security Rooms
const CHALLENGES_THM = [
    { code: 'PAY-001', title: 'The Unsecured Payment Terminal', category: 'MITM', points: 150,
      description: 'Interceptez le trafic POS en clair, recuperez le user flag, puis exploitez une injection de commande admin.' },
    { code: 'PCI-001', title: 'PCI-DSS Showdown', category: 'TOKEN_VAULT', points: 180,
      description: 'Exploitez une SQLi e-commerce et reliez les preuves a un audit de controles PCI DSS.' },
    { code: 'SOC-001', title: "The Social Engineer's Wire", category: 'FRAUD_CNP', points: 140,
      description: 'Analyse d artefacts e-mail et de fraude au virement sans machine d exploitation classique.' },
    { code: 'API-001', title: 'API: Attack on Transactions', category: 'PRIVILEGE_ESCALATION', points: 220,
      description: 'Abusez une faille BOLA et enchainez vers une escalation de privileges sur API de paiement.' },
    { code: 'DORA-001', title: "DORA's Recovery", category: 'BOSS', points: 300,
      description: 'Compromission initiale puis reprise d activite et post-mortem selon une logique resilience.' },
];

// Boss Challenges
const CHALLENGES_BOSS = [
    { code: 'BOSS-001', title: 'Full Chain POS→Issuer', category: 'BOSS', points: 500,
      description: 'Chaine complete : sniffer le reseau, extraire le PIN block, dechiffrer avec la ZPK, forger une transaction modifiee, contourner le scoring fraude.' },
    { code: 'BOSS-002', title: 'Le Braquage 3DS', category: 'BOSS', points: 500,
      description: 'Chaine 3DS complete : bypass OTP, magic string, sub-threshold, replay — atteignez 10K EUR de transactions non authentifiees.' },
    { code: 'BOSS-003', title: "L'Inside Job", category: 'BOSS', points: 500,
      description: 'Escalade interne : credentials TMS, acces HSM admin, export de cles, dechiffrement de PIN en masse.' },
    { code: 'BOSS-004', title: 'Le Perfect Heist', category: 'BOSS', points: 600,
      description: 'Operation complete : OSINT, card testing, bypass 3DS, evasion fraude, cash out. Le braquage parfait de bout en bout.' },
];

export const ALL_CHALLENGES = [
    ...CHALLENGES_HSM,
    ...CHALLENGES_REPLAY,
    ...CHALLENGES_3DS,
    ...CHALLENGES_FRAUD,
    ...CHALLENGES_ISO,
    ...CHALLENGES_PIN,
    ...CHALLENGES_MITM,
    ...CHALLENGES_PRIV,
    ...CHALLENGES_CRYPTO,
    ...CHALLENGES_EMV,
    ...CHALLENGES_TOKEN,
    ...CHALLENGES_NET,
    ...CHALLENGES_KEY,
    ...CHALLENGES_ADV_FRAUD,
    ...CHALLENGES_INFRA,
    ...CHALLENGES_THM,
    ...CHALLENGES_BOSS,
];
