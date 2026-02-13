import { QuizQuestion } from '../services/quizEvaluation.service';

export type WorkshopCatalogEntry = {
    id: string;
    title: string;
    description: string;
    sections: number;
    quizId: string | null;
    difficulty: string | null;
    estimatedMinutes: number | null;
    moduleOrder: number;
};

export type QuizDefinition = {
    id: string;
    title: string;
    workshopId: string;
    passPercentage: number;
    timeLimitMinutes: number | null;
    questions: QuizQuestion[];
};

export type WorkshopContent = {
    workshopId: string;
    title: string;
    description: string;
    sections: Array<{
        id: string;
        title: string;
        content: string;
    }>;
};

export type LabConditions = {
    latencyMs: number;
    authFailureRate: number;
    fraudInjection: boolean;
    hsmLatencyMs: number;
    networkErrors: boolean;
    updatedBy: string | null;
    updatedAt: string;
};

export const DEFAULT_WORKSHOPS = {
    intro: {
        title: 'Introduction aux Paiements',
        description: 'Fondamentaux de la monétique et du cycle transactionnel.',
        sections: 5,
        quizId: 'quiz-intro',
        difficulty: 'BEGINNER',
        estimatedMinutes: 60,
        moduleOrder: 1
    },
    iso8583: {
        title: 'ISO 8583 - Messages',
        description: 'Structure et interprétation des messages ISO 8583.',
        sections: 8,
        quizId: 'quiz-iso8583',
        difficulty: 'INTERMEDIATE',
        estimatedMinutes: 90,
        moduleOrder: 2
    },
    'hsm-keys': {
        title: 'HSM et Gestion des Clés',
        description: 'Cycle de vie des clés cryptographiques dans les HSM.',
        sections: 6,
        quizId: 'quiz-hsm',
        difficulty: 'INTERMEDIATE',
        estimatedMinutes: 90,
        moduleOrder: 3
    },
    '3ds-flow': {
        title: 'Flux 3D Secure',
        description: 'Parcours 3DS et authentification forte.',
        sections: 7,
        quizId: 'quiz-3ds',
        difficulty: 'INTERMEDIATE',
        estimatedMinutes: 75,
        moduleOrder: 4
    },
    'fraud-detection': {
        title: 'Détection de Fraude',
        description: 'Signaux de fraude et patterns de risque.',
        sections: 5,
        quizId: 'quiz-fraud',
        difficulty: 'ADVANCED',
        estimatedMinutes: 75,
        moduleOrder: 5
    },
    emv: {
        title: 'Cartes EMV',
        description: 'Principes EMV, cryptogrammes et sécurité carte-présente.',
        sections: 6,
        quizId: 'quiz-emv',
        difficulty: 'ADVANCED',
        estimatedMinutes: 90,
        moduleOrder: 6
    }
};

export const BADGES = {
    FIRST_LOGIN: { name: 'Bienvenue !', description: 'Première connexion', icon: 'star', xp: 10 },
    FIRST_QUIZ: { name: 'Premier Quiz', description: 'Passer son premier quiz', icon: 'clipboard-check', xp: 20 },
    QUIZ_MASTER: { name: 'Quiz Master', description: '5 quiz réussis', icon: 'award', xp: 50 },
    PERFECT_SCORE: { name: 'Score Parfait', description: '100% à un quiz', icon: 'trophy', xp: 100 },
    WORKSHOP_COMPLETE: { name: 'Atelier Terminé', description: 'Terminer un atelier', icon: 'book-open', xp: 30 },
    ALL_WORKSHOPS: { name: 'Expert Monétique', description: 'Tous les ateliers terminés', icon: 'graduation-cap', xp: 200 },
    FAST_LEARNER: { name: 'Apprenant Rapide', description: 'Quiz en moins de 5 minutes', icon: 'zap', xp: 25 },
    STREAK_7: { name: 'Semaine Complète', description: '7 jours consécutifs', icon: 'flame', xp: 50 },
    CTF_FIRST_FLAG: { name: 'Premier Flag CTF', description: 'Capturer son premier flag CTF', icon: 'flag', xp: 50 },
    CTF_FIRST_BLOOD: { name: 'First Blood', description: 'Premier à résoudre un challenge CTF', icon: 'droplet', xp: 200 },
    CTF_HACKER: { name: 'CTF Hacker', description: 'Résoudre 10 challenges CTF', icon: 'terminal', xp: 150 },
    CTF_MASTER: { name: 'CTF Master', description: 'Résoudre tous les challenges CTF', icon: 'crown', xp: 500 },
    CTF_CATEGORY_MASTER: { name: 'Category Master', description: 'Compléter une catégorie CTF', icon: 'layers', xp: 100 }
};

export const DEFAULT_WORKSHOP_CATALOG: WorkshopCatalogEntry[] = Object.entries(DEFAULT_WORKSHOPS)
    .map(([id, workshop]) => ({
        id,
        title: workshop.title,
        description: workshop.description,
        sections: workshop.sections,
        quizId: workshop.quizId || null,
        difficulty: workshop.difficulty,
        estimatedMinutes: workshop.estimatedMinutes,
        moduleOrder: workshop.moduleOrder
    }))
    .sort((a, b) => a.moduleOrder - b.moduleOrder);

export const DEFAULT_QUIZZES: Record<string, QuizDefinition> = {
    'quiz-intro': {
        id: 'quiz-intro',
        title: 'Quiz - Introduction aux Paiements',
        workshopId: 'intro',
        passPercentage: 80,
        timeLimitMinutes: 15,
        questions: [
            {
                id: 'intro-q1',
                question: 'Qui autorise definitivement une transaction carte ?',
                options: ['Le terminal', 'La banque emettrice', 'Le marchand', 'Le reseau uniquement'],
                correctOptionIndex: 1,
                explanation: 'La banque emettrice est responsable de la decision d autorisation.'
            },
            {
                id: 'intro-q2',
                question: 'Quel element identifie principalement la banque emettrice dans un PAN ?',
                options: ['Le CVV', 'Le BIN', 'Le STAN', 'Le MCC'],
                correctOptionIndex: 1,
                explanation: 'Le BIN est la partie initiale du PAN qui identifie l emetteur.'
            },
            {
                id: 'intro-q3',
                question: 'Quel est le minimum de phases d une transaction complete ?',
                options: ['Autorisation puis compensation', 'Seulement compensation', 'Seulement tokenisation', 'Aucune phase'],
                correctOptionIndex: 0,
                explanation: 'Le cycle inclut au moins une autorisation et une compensation/reglement.'
            },
            {
                id: 'intro-q4',
                question: 'Quel acteur gere le compte du commercant ?',
                options: ['Acquereur', 'Emetteur', 'Porteur', 'ACS'],
                correctOptionIndex: 0,
                explanation: 'L acquereur est la banque cote marchand.'
            },
            {
                id: 'intro-q5',
                question: 'Quel est l objectif principal de la tokenisation ?',
                options: ['Augmenter les frais', 'Remplacer le PAN sensible', 'Supprimer l authentification', 'Changer le MCC'],
                correctOptionIndex: 1,
                explanation: 'La tokenisation remplace le PAN par une valeur non sensible.'
            }
        ]
    },
    'quiz-iso8583': {
        id: 'quiz-iso8583',
        title: 'Quiz - ISO 8583',
        workshopId: 'iso8583',
        passPercentage: 80,
        timeLimitMinutes: 20,
        questions: [
            {
                id: 'iso-q1',
                question: 'Que represente le MTI 0100 ?',
                options: ['Authorization request', 'Reversal response', 'Network echo', 'Settlement request'],
                correctOptionIndex: 0,
                explanation: '0100 correspond a une demande d autorisation.'
            },
            {
                id: 'iso-q2',
                question: 'Quel DE contient generalement le code reponse ?',
                options: ['DE2', 'DE11', 'DE39', 'DE55'],
                correctOptionIndex: 2,
                explanation: 'DE39 contient le code de reponse de la transaction.'
            },
            {
                id: 'iso-q3',
                question: 'Quel est le role du bitmap ?',
                options: ['Chiffrer le message', 'Lister les champs presents', 'Identifier le terminal', 'Calculer le CVV'],
                correctOptionIndex: 1,
                explanation: 'Le bitmap indique les data elements presents dans le message.'
            },
            {
                id: 'iso-q4',
                question: 'Que signifie un code 00 en reponse ?',
                options: ['Transaction refusee', 'Transaction approuvee', 'PIN invalide', 'Systeme indisponible'],
                correctOptionIndex: 1,
                explanation: '00 signifie une approbation de la transaction.'
            },
            {
                id: 'iso-q5',
                question: 'Quel champ est souvent utilise pour tracer de maniere unique une transaction ?',
                options: ['STAN (DE11)', 'MCC', 'Terminal country code', 'Service code'],
                correctOptionIndex: 0,
                explanation: 'Le STAN aide au suivi et a l anti-rejeu des messages.'
            }
        ]
    },
    'quiz-hsm': {
        id: 'quiz-hsm',
        title: 'Quiz - HSM et Cles',
        workshopId: 'hsm-keys',
        passPercentage: 80,
        timeLimitMinutes: 20,
        questions: [
            {
                id: 'hsm-q1',
                question: 'Quel est le role principal du LMK ?',
                options: ['Signer les emails', 'Proteger les cles internes du HSM', 'Verifier le solde', 'Router les messages'],
                correctOptionIndex: 1,
                explanation: 'Le LMK protege les cles de travail a l interieur du HSM.'
            },
            {
                id: 'hsm-q2',
                question: 'Une ZMK sert principalement a ...',
                options: ['Stocker les logs', 'Echanger des cles entre institutions', 'Calculer le STAN', 'Tokeniser les cartes'],
                correctOptionIndex: 1,
                explanation: 'Une ZMK (ou KEK) permet le transport securise de cles.'
            },
            {
                id: 'hsm-q3',
                question: 'Quel principe renforce la securite operationnelle des cles ?',
                options: ['Single control', 'Dual control', 'No control', 'Public control'],
                correctOptionIndex: 1,
                explanation: 'Le dual control evite qu une seule personne detienne tout le secret.'
            },
            {
                id: 'hsm-q4',
                question: 'Que permet le KCV ?',
                options: ['Verifier une cle sans l exposer en clair', 'Creer un PAN', 'Generer un MTI', 'Supprimer une transaction'],
                correctOptionIndex: 0,
                explanation: 'Le KCV valide qu une cle chargee est la bonne.'
            },
            {
                id: 'hsm-q5',
                question: 'Le PIN en clair doit etre ...',
                options: ['Stocke en base', 'Visible en logs', 'Traite uniquement dans un module securise', 'Envoye par email'],
                correctOptionIndex: 2,
                explanation: 'Le PIN ne doit jamais etre expose en clair hors environnement securise.'
            }
        ]
    },
    'quiz-3ds': {
        id: 'quiz-3ds',
        title: 'Quiz - 3D Secure',
        workshopId: '3ds-flow',
        passPercentage: 80,
        timeLimitMinutes: 20,
        questions: [
            {
                id: 'three-q1',
                question: 'Le statut Y dans 3DS signifie ...',
                options: ['Challenge requis', 'Authentification reussie', 'Tentative uniquement', 'Erreur reseau'],
                correctOptionIndex: 1,
                explanation: 'Y indique une authentification reussie du porteur.'
            },
            {
                id: 'three-q2',
                question: 'Quel composant decide frictionless ou challenge ?',
                options: ['Le terminal', 'ACS', 'Le marchand', 'Le STAN'],
                correctOptionIndex: 1,
                explanation: 'L ACS prend la decision selon l analyse de risque.'
            },
            {
                id: 'three-q3',
                question: 'Le CAVV sert a ...',
                options: ['Encoder le PIN', 'Prouver le resultat d authentification', 'Calculer le montant', 'Choisir le reseau'],
                correctOptionIndex: 1,
                explanation: 'Le CAVV transporte la preuve cryptographique d authentification.'
            },
            {
                id: 'three-q4',
                question: 'Le \"3\" de 3DS fait reference a ...',
                options: ['3 types de cartes', '3 domaines', '3 banques', '3 devises'],
                correctOptionIndex: 1,
                explanation: 'Les trois domaines: emetteur, acquereur, interop.'
            },
            {
                id: 'three-q5',
                question: 'Un flux frictionless vise surtout a ...',
                options: ['Augmenter la friction', 'Reduire la friction utilisateur', 'Bloquer toutes les transactions', 'Supprimer l autorisation'],
                correctOptionIndex: 1,
                explanation: 'Le flux frictionless limite les interruptions utilisateur.'
            }
        ]
    },
    'quiz-fraud': {
        id: 'quiz-fraud',
        title: 'Quiz - Detection de Fraude',
        workshopId: 'fraud-detection',
        passPercentage: 80,
        timeLimitMinutes: 15,
        questions: [
            {
                id: 'fraud-q1',
                question: 'Un pic de transactions en peu de temps est un signal ...',
                options: ['De performance', 'De velocity fraud', 'De maintenance', 'De cashback'],
                correctOptionIndex: 1,
                explanation: 'Une frequence anormale peut indiquer une fraude de type velocity.'
            },
            {
                id: 'fraud-q2',
                question: 'Quel indicateur complete utilement les regles statiques ?',
                options: ['MCC fixe', 'Scoring de risque', 'Nom du terminal', 'Longueur du PAN'],
                correctOptionIndex: 1,
                explanation: 'Le scoring de risque ajoute une vue probabiliste dynamique.'
            },
            {
                id: 'fraud-q3',
                question: 'Que faire si une transaction parait fortement suspecte ?',
                options: ['Toujours approuver', 'Declencher challenge/revue', 'Ignorer le signal', 'Supprimer l historique'],
                correctOptionIndex: 1,
                explanation: 'Il faut augmenter la verification ou passer en revue manuelle.'
            },
            {
                id: 'fraud-q4',
                question: 'Les faux positifs doivent etre ...',
                options: ['Maximises', 'Maitrises', 'Caches', 'Fixes a 100%'],
                correctOptionIndex: 1,
                explanation: 'Un bon systeme de fraude limite les faux positifs.'
            },
            {
                id: 'fraud-q5',
                question: 'Un systeme anti-fraude mature combine ...',
                options: ['Une seule regle', 'Regles + scoring + supervision', 'Seulement des logs', 'Seulement du 3DS'],
                correctOptionIndex: 1,
                explanation: 'La robustesse vient de la combinaison de plusieurs mecanismes.'
            }
        ]
    },
    'quiz-emv': {
        id: 'quiz-emv',
        title: 'Quiz - Cartes EMV',
        workshopId: 'emv',
        passPercentage: 80,
        timeLimitMinutes: 20,
        questions: [
            {
                id: 'emv-q1',
                question: 'Le cryptogramme ARQC est genere par ...',
                options: ['Le terminal', 'La carte EMV', 'Le marchand', 'Le DS'],
                correctOptionIndex: 1,
                explanation: 'La carte EMV genere un ARQC unique par transaction.'
            },
            {
                id: 'emv-q2',
                question: 'Objectif principal EMV ?',
                options: ['Augmenter les delais', 'Limiter la fraude carte presente', 'Supprimer le PIN', 'Remplacer ISO 8583'],
                correctOptionIndex: 1,
                explanation: 'EMV reduit notamment la fraude par clonage en carte presente.'
            },
            {
                id: 'emv-q3',
                question: 'Quel element est essentiel pour eviter le rejeu ?',
                options: ['Un cryptogramme dynamique', 'Un CVV statique', 'Le nom marchand', 'Un seul terminal'],
                correctOptionIndex: 0,
                explanation: 'Le cryptogramme dynamique rend le rejeu beaucoup plus difficile.'
            },
            {
                id: 'emv-q4',
                question: 'Le mode offline en EMV implique ...',
                options: ['Toujours aucune verification', 'Certaines verifications locales', 'Absence totale de risque', 'Suppression de l EMV'],
                correctOptionIndex: 1,
                explanation: 'Certaines decisions peuvent etre prises localement selon les parametres EMV.'
            },
            {
                id: 'emv-q5',
                question: 'Le PIN online est valide par ...',
                options: ['Le porteur', 'L emetteur via son systeme', 'Le terminal seul', 'Le marchand'],
                correctOptionIndex: 1,
                explanation: 'Le PIN online est valide cote emetteur, generalement via HSM.'
            }
        ]
    }
};

export const DEFAULT_WORKSHOP_CONTENT: Record<string, WorkshopContent> = {
    intro: {
        workshopId: 'intro',
        title: 'Introduction aux Paiements',
        description: 'Bases du fonctionnement des paiements cartes en environnement moderne.',
        sections: [
            {
                id: 'intro-1',
                title: 'Acteurs de l ecosysteme',
                content: 'Porteur, marchand, acquereur, emetteur et reseaux. Chacun a un role precis dans la transaction.'
            },
            {
                id: 'intro-2',
                title: 'Cycle transactionnel',
                content: 'Autorisation temps reel, compensation et reglement en differes. Le cycle complet va bien au-dela du moment du paiement.'
            },
            {
                id: 'intro-3',
                title: 'Securite de base',
                content: 'PIN, CVV, tokenisation, chiffrement et controles anti-fraude constituent des couches complementaires.'
            }
        ]
    },
    iso8583: {
        workshopId: 'iso8583',
        title: 'ISO 8583 - Messages',
        description: 'Comprendre le format des messages financiers cartes.',
        sections: [
            {
                id: 'iso-1',
                title: 'MTI et classes de messages',
                content: 'Le MTI decrit type, fonction et origine du message. Ex: 0100, 0110, 0200.'
            },
            {
                id: 'iso-2',
                title: 'Bitmap et Data Elements',
                content: 'Le bitmap indique quels champs sont presents. Les DE portent les donnees utiles (PAN, montant, STAN, code reponse).'
            },
            {
                id: 'iso-3',
                title: 'Codes de reponse',
                content: 'DE39 permet d interpreter l issue transactionnelle: approbation, refus fonctionnel, erreur technique.'
            }
        ]
    },
    'hsm-keys': {
        workshopId: 'hsm-keys',
        title: 'HSM et Gestion des Cles',
        description: 'Principes de securite cryptographique en environnement carte.',
        sections: [
            {
                id: 'hsm-1',
                title: 'Hierarchie de cles',
                content: 'LMK, ZMK, ZPK et cles de travail structurent la securite des operations de paiement.'
            },
            {
                id: 'hsm-2',
                title: 'Dual control et ceremonies',
                content: 'Les cles critiques sont gerees par separation des responsabilites et procedures de controle fortes.'
            },
            {
                id: 'hsm-3',
                title: 'Operations PIN/MAC',
                content: 'Le HSM traite les secrets sans exposition en clair dans les systemes applicatifs.'
            }
        ]
    },
    '3ds-flow': {
        workshopId: '3ds-flow',
        title: 'Flux 3D Secure',
        description: 'Authentification e-commerce et SCA.',
        sections: [
            {
                id: '3ds-1',
                title: 'Domaines 3DS',
                content: 'Acquereur, emetteur et interoperabilite travaillent ensemble pour authentifier le porteur.'
            },
            {
                id: '3ds-2',
                title: 'Frictionless vs challenge',
                content: 'L analyse de risque decide si une interaction utilisateur est necessaire.'
            },
            {
                id: '3ds-3',
                title: 'Resultat d authentification',
                content: 'Statuts et CAVV sont reutilises dans la decision d autorisation.'
            }
        ]
    },
    'fraud-detection': {
        workshopId: 'fraud-detection',
        title: 'Detection de Fraude',
        description: 'Methodes de reduction du risque transactionnel.',
        sections: [
            {
                id: 'fraud-1',
                title: 'Signaux de fraude',
                content: 'Velocity, geographie, device et comportement utilisateur sont des indicateurs utiles.'
            },
            {
                id: 'fraud-2',
                title: 'Regles et scoring',
                content: 'Les regles deterministes et les modeles de score se completent pour mieux decider.'
            },
            {
                id: 'fraud-3',
                title: 'Operations de supervision',
                content: 'La revue manuelle et le monitoring en continu limitent les pertes et les faux positifs.'
            }
        ]
    },
    emv: {
        workshopId: 'emv',
        title: 'Cartes EMV',
        description: 'Authentification carte presente et securite chip.',
        sections: [
            {
                id: 'emv-1',
                title: 'Cryptogrammes EMV',
                content: 'ARQC/ARPC apportent une preuve cryptographique dynamique a chaque transaction.'
            },
            {
                id: 'emv-2',
                title: 'Decision locale et online',
                content: 'Selon les regles EMV, certaines verifications peuvent etre offline avant l autorisation online.'
            },
            {
                id: 'emv-3',
                title: 'Contre-mesures anti-clonage',
                content: 'Le chip et les donnees dynamiques reduisent la fraude carte presente.'
            }
        ]
    }
};

export const DEFAULT_LAB_CONDITIONS: LabConditions = {
    latencyMs: 150,
    authFailureRate: 5,
    fraudInjection: false,
    hsmLatencyMs: 50,
    networkErrors: false,
    updatedBy: null,
    updatedAt: new Date().toISOString()
};
