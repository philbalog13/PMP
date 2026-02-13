export interface CtfRemediationPlaybook {
    code: string;
    title: string;
    weakness: string;
    objective: string;
    immediateContainment: string[];
    longTermFixes: string[];
    detectionRules: string[];
    verificationChecklist: string[];
    relatedWorkshopPath?: string;
}

const CTF_REMEDIATION_PLAYBOOKS: Record<string, CtfRemediationPlaybook> = {
    'HSM-001': {
        code: 'HSM-001',
        title: 'Le Coffre Ouvert',
        weakness: 'Endpoint HSM admin expose sans authentification',
        objective: 'Supprimer l exposition des cles et fermer l acces non autorise',
        immediateContainment: [
            'Bloquer /hsm/keys au gateway et restreindre par IP interne uniquement.',
            'Rotater toutes les cles potentiellement exposees (ZPK, ZAK, DEK).',
            'Auditer les journaux pour identifier qui a consulte les cles.',
        ],
        longTermFixes: [
            'Imposer auth forte + RBAC strict sur toutes les routes admin HSM.',
            'Separer endpoints debug/admin des endpoints transactionnels.',
            'Ajouter un test de securite CI qui echoue si une route sensible est publique.',
        ],
        detectionRules: [
            'Alerte sur tout GET /hsm/keys hors role admin.',
            'Alerte sur pic de 200 OK sur endpoints admin HSM.',
        ],
        verificationChecklist: [
            'Un utilisateur non admin recoit 401/403 sur /hsm/keys.',
            'Les cles rotaees produisent de nouveaux KCV valides.',
            'Les flux HSM normaux restent operationnels.',
        ],
        relatedWorkshopPath: '/workshops/hsm-keys',
    },
    'HSM-002': {
        code: 'HSM-002',
        title: 'Cles Previsibles',
        weakness: 'Cles faibles/predictibles dans le stockage HSM',
        objective: 'Garantir une generation de cles a haute entropie',
        immediateContainment: [
            'Desactiver immediatement les labels de cles de test faibles.',
            'Bloquer usage des cles non conformes dans les operations crypto.',
        ],
        longTermFixes: [
            'Generer les cles via CSPRNG certifie et politiques de complexite.',
            'Interdire les cles hardcodees dans le code source.',
            'Mettre un controle automatique d entropie avant chargement HSM.',
        ],
        detectionRules: [
            'Alerte si pattern repetitif detecte dans une nouvelle cle.',
            'Alerte si une cle marquee TEST est utilisee en flux critique.',
        ],
        verificationChecklist: [
            'Aucune cle active ne contient de motif trivial.',
            'Toutes les cles sensibles ont une rotation datee et tracee.',
        ],
        relatedWorkshopPath: '/workshops/hsm-keys',
    },
    'HSM-003': {
        code: 'HSM-003',
        title: 'Fuite dans les Logs',
        weakness: 'Materiel sensible journalise en clair',
        objective: 'Eliminer toute fuite de secret dans les traces',
        immediateContainment: [
            'Desactiver keyLeakInLogs et couper la collecte des logs compromis.',
            'Restreindre acces aux index de logs touches.',
            'Purger les traces contenant secrets critiques.',
        ],
        longTermFixes: [
            'Mettre en place redaction centralisee des champs sensibles.',
            'Ajouter tests automatiques no-secrets-in-logs.',
            'Durcir retention et chiffrement des logs sensibles.',
        ],
        detectionRules: [
            'Detection regex sur key, pinBlock, clearKey, cvv.',
            'Alerte immediate sur tag [VULN:LEAK].',
        ],
        verificationChecklist: [
            'Aucune operation HSM ne logge de secret en clair.',
            'Les outils SIEM ne retrouvent plus les patterns sensibles.',
        ],
        relatedWorkshopPath: '/workshops/hsm-keys',
    },
    'HSM-004': {
        code: 'HSM-004',
        title: 'Le Pingouin ECB',
        weakness: 'Mode ECB expose des patterns de donnees',
        objective: 'Migrer vers des modes robustes (CBC/GCM)',
        immediateContainment: [
            'Interdire mode ECB dans les config runtime.',
            'Forcer mode approuve pour tout nouvel appel encrypt-data.',
        ],
        longTermFixes: [
            'Migrer vers AES-GCM avec IV/nonce unique.',
            'Centraliser politique cryptographique par service.',
            'Rechiffrer les donnees historiques si necessaire.',
        ],
        detectionRules: [
            'Alerte si mode ECB apparait dans une requete.',
            'Detection de repetition de blocs ciphertext suspects.',
        ],
        verificationChecklist: [
            'Deux payloads repetitifs ne produisent plus de motifs identiques en sortie.',
            'Les tests crypto de non-regression passent en CI.',
        ],
        relatedWorkshopPath: '/workshops/hsm-keys',
    },
    'HSM-005': {
        code: 'HSM-005',
        title: 'Course contre la Montre',
        weakness: 'Verification MAC vulnerable au timing side-channel',
        objective: 'Rendre la comparaison MAC constante en temps',
        immediateContainment: [
            'Rate-limit agressif sur verify-mac.',
            'Bloquer sources qui font du probing haute frequence.',
        ],
        longTermFixes: [
            'Utiliser comparaison constant-time sur MAC.',
            'Ajouter jitter defensif uniquement temporaire en mitigation.',
            'Mettre des tests de variance de latence en pipeline securite.',
        ],
        detectionRules: [
            'Alerte sur grand volume verify-mac avec variation minime de payload.',
            'Alerte sur correlations latence-prefixe MAC.',
        ],
        verificationChecklist: [
            'La latence n est plus correlee au prefixe correct du MAC.',
            'Les tentatives de bruteforce sont bloquees rapidement.',
        ],
        relatedWorkshopPath: '/workshops/hsm-keys',
    },
    'REPLAY-001': {
        code: 'REPLAY-001',
        title: 'Deja Vu',
        weakness: 'Protection anti-replay absente ou desactivee',
        objective: 'Empêcher l execution multiple d une meme transaction',
        immediateContainment: [
            'Desactiver allowReplay et activer blocage duplicate strict.',
            'Filtrer en urgence les doubles requetes identiques.',
        ],
        longTermFixes: [
            'Imposer nonce/idempotency key obligatoire.',
            'Stocker et verifier les empreintes de transaction avec TTL.',
            'Signer les elements critiques de la transaction.',
        ],
        detectionRules: [
            'Alerte sur duplicate (pan, amount, stan, merchant) dans une fenetre courte.',
            'Alerte sur doubles autorisations succes avec meme empreinte.',
        ],
        verificationChecklist: [
            'Une requete rejouee est rejetee de maniere deterministe.',
            'Les retry legitimes sont distingues des replays malveillants.',
        ],
        relatedWorkshopPath: '/workshops/iso8583',
    },
    'REPLAY-002': {
        code: 'REPLAY-002',
        title: 'Reset et Recommence',
        weakness: 'Compteurs velocity stockes uniquement en memoire',
        objective: 'Rendre les controles fraude persistants aux redemarrages',
        immediateContainment: [
            'Geler temporairement les transactions a risque apres restart.',
            'Activer seuils conservateurs en mode degrade.',
        ],
        longTermFixes: [
            'Persister compteurs velocity (Redis/Postgres).',
            'Rehydrater l etat au boot avec fallback robuste.',
            'Ajouter runbook restart incluant verifications anti-fraude.',
        ],
        detectionRules: [
            'Alerte quand compteurs velocity chutent a zero apres restart.',
            'Alerte sur spike transactionnel post-redemarrage.',
        ],
        verificationChecklist: [
            'Redemarrage du service ne reset plus les limites fraude.',
            'Le comportement pre/post restart est identique.',
        ],
        relatedWorkshopPath: '/workshops/fraud-detection',
    },
    '3DS-001': {
        code: '3DS-001',
        title: 'Le Numero Magique',
        weakness: 'OTP 3DS hardcode',
        objective: 'Assurer un challenge OTP unique, court et non predictible',
        immediateContainment: [
            'Invalider OTP statique et couper flow vulnerable.',
            'Surveiller transactions recentes validees avec OTP suspect.',
        ],
        longTermFixes: [
            'Generer OTP via CSPRNG avec expiration courte.',
            'Limiter tentatives et verrouiller adaptativement.',
            'Tracer completement la chaine challenge/verification.',
        ],
        detectionRules: [
            'Alerte si un meme OTP est valide pour plusieurs sessions.',
            'Alerte sur taux de succes anormal du meme code OTP.',
        ],
        verificationChecklist: [
            'Chaque OTP est unique et expire correctement.',
            'Un OTP reutilise est refuse.',
        ],
        relatedWorkshopPath: '/workshops/3ds-flow',
    },
    '3DS-002': {
        code: '3DS-002',
        title: 'Le Mot de Passe',
        weakness: 'Backdoor logique via valeur magique',
        objective: 'Supprimer toute condition de contournement non metier',
        immediateContainment: [
            'Bloquer la valeur magique en validation entree.',
            'Revoir et rejouer les transactions validees en bypass.',
        ],
        longTermFixes: [
            'Supprimer definitivement la condition backdoor.',
            'Mettre validation schema stricte sur tous les champs 3DS.',
            'Ajouter revues secure code ciblees sur logique d approbation.',
        ],
        detectionRules: [
            'Alerte sur valeurs d entree anormales (SUCCESS, TEST, DEBUG).',
            'Alerte sur frictionless force sans risque coherent.',
        ],
        verificationChecklist: [
            'La valeur magique ne change plus la decision 3DS.',
            'Le flow respecte les regles attendues en toutes conditions.',
        ],
        relatedWorkshopPath: '/workshops/3ds-flow',
    },
    '3DS-003': {
        code: '3DS-003',
        title: 'Juste en Dessous',
        weakness: 'Bypass SCA via seuil statique unique',
        objective: 'Limiter le contournement par transaction juste sous seuil',
        immediateContainment: [
            'Activer step-up sur patterns proches du seuil.',
            'Surveiller et limiter rafales 499.99 / edge threshold.',
        ],
        longTermFixes: [
            'Utiliser une logique de risque dynamique multi-signaux.',
            'Ajouter cumul montant/frequence par fenetre temporelle.',
            'Documenter et tester les exemptions SCA en non-regression.',
        ],
        detectionRules: [
            'Alerte sur concentration des montants juste sous seuil.',
            'Alerte sur split payments suspects.',
        ],
        verificationChecklist: [
            'Le simple ajustement 500 -> 499.99 ne suffit plus a bypass SCA.',
            'Les faux positifs restent maitrises.',
        ],
        relatedWorkshopPath: '/workshops/3ds-flow',
    },
    'FRAUD-001': {
        code: 'FRAUD-001',
        title: 'Quand la Fraude Dort',
        weakness: 'Decision fail-open en cas de panne fraude',
        objective: 'Passer en posture de securite degradee fail-safe',
        immediateContainment: [
            'Forcer fail-closed sur segments a risque eleve.',
            'Activer mode degrade securise tant que le service fraude est indisponible.',
        ],
        longTermFixes: [
            'Implementer circuit breaker securise avec policy claire.',
            'Definir matrice de decision fallback par criticite.',
            'Tester pannes dependances en chaos engineering.',
        ],
        detectionRules: [
            'Alerte quand fallback fraude approve une transaction.',
            'Alerte indisponibilite du service fraude > seuil SLA.',
        ],
        verificationChecklist: [
            'En panne fraude, les transactions riskees sont bloquees.',
            'Le service revient proprement sans trou de controle.',
        ],
        relatedWorkshopPath: '/workshops/fraud-detection',
    },
    'FRAUD-002': {
        code: 'FRAUD-002',
        title: 'Score Optimise',
        weakness: 'Contournement des seuils par score gaming',
        objective: 'Rendre le modele robuste aux strategies d optimisation malveillante',
        immediateContainment: [
            'Mettre revue manuelle sur plage score juste sous seuil.',
            'Limiter patterns repetitifs sur memes attributs evasifs.',
        ],
        longTermFixes: [
            'Ajouter signaux comportementaux et temporels.',
            'Recalibrer regulièrement les seuils et poids de regles.',
            'Introduire random checks / second niveau sur zone grise.',
        ],
        detectionRules: [
            'Alerte sur concentration de score 66-69.',
            'Alerte sur combinaison attributs recurrente evasive.',
        ],
        verificationChecklist: [
            'Les transactions camouflees sont reclassifiees correctement.',
            'Le taux de contournement sous seuil diminue nettement.',
        ],
        relatedWorkshopPath: '/workshops/fraud-detection',
    },
    'ISO-001': {
        code: 'ISO-001',
        title: 'Table de Routage Exposee',
        weakness: 'Fuite topologique via endpoint de debug non protege',
        objective: 'Supprimer l exposition des informations de routage',
        immediateContainment: [
            'Retirer endpoint bin-table des surfaces publiques.',
            'Restreindre acces a l administration interne seulement.',
        ],
        longTermFixes: [
            'Exiger auth et autorisations fines sur introspection.',
            'Segmenter debug APIs et runtime APIs.',
            'Mettre un audit periodique d information disclosure.',
        ],
        detectionRules: [
            'Alerte sur acces anonymes a /transaction/bin-table.',
            'Alerte sur enumeration sequencee des endpoints switch.',
        ],
        verificationChecklist: [
            'Sans privileges, l endpoint est inaccessible.',
            'Les informations sensibles de topologie ne sont plus exposees.',
        ],
        relatedWorkshopPath: '/workshops/iso8583',
    },
    'ISO-002': {
        code: 'ISO-002',
        title: 'Montant Maximum',
        weakness: 'Limite technique trop haute par rapport au metier',
        objective: 'Aligner les bornes de validation avec la realite business',
        immediateContainment: [
            'Appliquer hard cap metier au gateway et au switch.',
            'Bloquer transactions hors profil montant attendu.',
        ],
        longTermFixes: [
            'Definir limites par segment marchand/MCC.',
            'Ajouter validation multicouche (API, service, DB).',
            'Tester les bornes min/max en CI sur tous les flux.',
        ],
        detectionRules: [
            'Alerte sur montant au-dessus des seuils business.',
            'Alerte sur anomalies montant par merchant.',
        ],
        verificationChecklist: [
            '999999999.99 est refuse de bout en bout.',
            'Les limites legitimes restent fonctionnelles.',
        ],
        relatedWorkshopPath: '/workshops/iso8583',
    },
    'PIN-001': {
        code: 'PIN-001',
        title: 'Le Fallback Silencieux',
        weakness: 'Validation PIN fail-open quand HSM indisponible',
        objective: 'Garantir fail-closed sur controle PIN',
        immediateContainment: [
            'Forcer refus PIN si verification HSM indisponible.',
            'Surveiller approvals anormales pendant incidents HSM.',
        ],
        longTermFixes: [
            'Formaliser politique de securite fail-closed pour PIN.',
            'Ajouter timeout/retry maitrises sans bypass automatique.',
            'Tester scenarii de latence/panne HSM en preproduction.',
        ],
        detectionRules: [
            'Alerte timeout HSM suivi d approvals PIN elevees.',
            'Alerte ecart fort entre PIN invalide et taux d approbation.',
        ],
        verificationChecklist: [
            'PIN invalide reste refuse meme en panne HSM.',
            'Le chemin degrade ne contourne plus la verification.',
        ],
        relatedWorkshopPath: '/workshops/hsm-keys',
    },
    'PIN-002': {
        code: 'PIN-002',
        title: 'Random Previsible',
        weakness: 'PRNG non crypto pour generation de padding PIN',
        objective: 'Utiliser exclusivement un generateur cryptographique',
        immediateContainment: [
            'Bloquer deployment des versions utilisant Math.random en crypto.',
            'Auditer rapidement toutes les fonctions PIN block.',
        ],
        longTermFixes: [
            'Remplacer par crypto.randomBytes.',
            'Ajouter regle lint interdisant Math.random dans code crypto.',
            'Centraliser primitives cryptographiques approuvees.',
        ],
        detectionRules: [
            'SAST: detection de PRNG non crypto dans modules sensibles.',
            'Alerte en CI sur pattern Math.random dans dossiers crypto.',
        ],
        verificationChecklist: [
            'Aucun appel Math.random dans la chaine PIN.',
            'La distribution des sorties est conforme aux attentes CSPRNG.',
        ],
        relatedWorkshopPath: '/workshops/hsm-keys',
    },
    'MITM-001': {
        code: 'MITM-001',
        title: 'Le CVV Voyageur',
        weakness: 'CVV transporte en clair hors contexte autorise',
        objective: 'Atteindre conformite PCI-DSS sur le cycle CVV',
        immediateContainment: [
            'Stopper propagation CVV apres la decision d autorisation.',
            'Masquer CVV dans logs/queues/events.',
        ],
        longTermFixes: [
            'Supprimer CVV des payloads inter-services non necessaires.',
            'Mettre mTLS et schema filtering strict sur les champs sensibles.',
            'Ajouter controles DLP et tests PCI automatiques.',
        ],
        detectionRules: [
            'Alerte DLP sur motifs CVV dans flux applicatifs/logs.',
            'Alerte sur presence de champ cvv en aval du composant autorisation.',
        ],
        verificationChecklist: [
            'Aucun CVV visible en clair dans logs ou payloads post-auth.',
            'Les transactions restent valides sans retention CVV.',
        ],
        relatedWorkshopPath: '/workshops/iso8583',
    },
    'PRIV-001': {
        code: 'PRIV-001',
        title: 'Le Compte en Banque Infini',
        weakness: 'Endpoint de modification solde sans auth',
        objective: 'Proteger strictement les operations de solde',
        immediateContainment: [
            'Bloquer endpoint balance update hors role admin.',
            'Geler et auditer comptes modifies sans autorisation.',
        ],
        longTermFixes: [
            'Appliquer RBAC + ABAC sur endpoints financiers critiques.',
            'Signer les requetes internes sensibles.',
            'Tracer toutes les mutations de solde avec correlationId.',
        ],
        detectionRules: [
            'Alerte sur update solde sans token admin valide.',
            'Alerte sur variations de solde hors workflow transactionnel.',
        ],
        verificationChecklist: [
            'Un etudiant/client ne peut plus changer un solde directement.',
            'Les changements legitimes sont audites et justifiables.',
        ],
        relatedWorkshopPath: '/workshops/intro',
    },
    'CRYPTO-001': {
        code: 'CRYPTO-001',
        title: 'Token Predictible',
        weakness: 'Generation token faible/predictible',
        objective: 'Rendre les tokens non devinables et non corrélables',
        immediateContainment: [
            'Invalider tokens emis sur la periode a risque.',
            'Activer throttling sur endpoint de resolution token.',
        ],
        longTermFixes: [
            'Generer tokens via CSPRNG avec longueur suffisante.',
            'Ajouter signature/entropie minimale et rotation de cle.',
            'Tester collisions et randomisation en CI.',
        ],
        detectionRules: [
            'Alerte sur collisions token et motifs repetitifs.',
            'Alerte sur bruteforce lookup token.',
        ],
        verificationChecklist: [
            'Pas de collision observee sur echantillon large.',
            'Pattern predictible absent dans les tokens emis.',
        ],
        relatedWorkshopPath: '/workshops/session-security',
    },
    'CRYPTO-002': {
        code: 'CRYPTO-002',
        title: 'Auth Code Guessable',
        weakness: 'Code d autorisation genere par PRNG faible',
        objective: 'Renforcer la robustesse des auth codes transactionnels',
        immediateContainment: [
            'Reduire duree de vie des auth codes actuels.',
            'Activer limites tentatives et lock adaptatif.',
        ],
        longTermFixes: [
            'Generer auth codes via CSPRNG et binder au contexte transaction.',
            'Ajouter validation anti-rejeu des codes.',
            'Verifier statistiquement la distribution en pipeline.',
        ],
        detectionRules: [
            'Alerte sur tentatives multiples de codes voisins.',
            'Alerte sur taux d echec inhabituel par compte/session.',
        ],
        verificationChecklist: [
            'Les codes ne suivent plus de sequence devinable.',
            'Les tentatives repetitives sont neutralisees rapidement.',
        ],
        relatedWorkshopPath: '/workshops/intro',
    },
};

const DEFAULT_PLAYBOOK: CtfRemediationPlaybook = {
    code: 'GENERIC',
    title: 'Remediation Generique',
    weakness: 'Point d entree de securite a corriger',
    objective: 'Supprimer la faille et verifier son elimination durable',
    immediateContainment: [
        'Bloquer temporairement le chemin d attaque.',
        'Rotater secrets/cles potentiellement exposes.',
    ],
    longTermFixes: [
        'Corriger la cause racine dans le code et la configuration.',
        'Ajouter tests de non-regression securite en CI/CD.',
    ],
    detectionRules: [
        'Creer une alerte de detection specifique a la faille.',
        'Instrumenter les logs avec correlationId et contexte utilisateur.',
    ],
    verificationChecklist: [
        'Le replay de l attaque echoue.',
        'Les parcours legitimes restent fonctionnels.',
    ],
};

export function getCtfRemediationPlaybook(code: string): CtfRemediationPlaybook {
    const normalizedCode = String(code || '').toUpperCase();
    return CTF_REMEDIATION_PLAYBOOKS[normalizedCode] || {
        ...DEFAULT_PLAYBOOK,
        code: normalizedCode || DEFAULT_PLAYBOOK.code,
    };
}
