export type CtfCategory =
    | 'PIN_CRACKING'
    | 'REPLAY_ATTACK'
    | 'MITM'
    | 'FRAUD_CNP'
    | 'ISO8583_MANIPULATION'
    | 'HSM_ATTACK'
    | '3DS_BYPASS'
    | 'CRYPTO_WEAKNESS'
    | 'PRIVILEGE_ESCALATION'
    | 'EMV_CLONING'
    | 'TOKEN_VAULT'
    | 'NETWORK_ATTACK'
    | 'KEY_MANAGEMENT'
    | 'ADVANCED_FRAUD'
    | 'SUPPLY_CHAIN'
    | 'BOSS';

export type CtfDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export type CtfStepType =
    | 'EXPLANATION'
    | 'CURL_COMMAND'
    | 'CODE_SNIPPET'
    | 'OBSERVATION'
    | 'ANALYSIS'
    | 'EXPLOITATION'
    | 'HINT';

export interface CtfGuidedStepSeed {
    stepNumber: number;
    stepTitle: string;
    stepDescription: string;
    stepType: CtfStepType;
    commandTemplate?: string;
    expectedOutput?: string;
    hintText?: string;
}

export interface CtfHintSeed {
    hintNumber: number;
    hintText: string;
    costPoints: number;
}

export interface CtfMissionBriefSeed {
    role: string;
    businessContext: string;
    incidentTrigger: string;
    objective: string;
    successCriteria: string;
}

export interface CtfIncidentArtifactSeed {
    artifactId: string;
    artifactType: 'LOG' | 'TRACE' | 'TICKET' | 'SIEM';
    title: string;
    description: string;
    sample: string;
}

export interface CtfRubricCriterionSeed {
    criterion: string;
    weight: number;
    description: string;
}

export interface CtfProofRubricSeed {
    technical: CtfRubricCriterionSeed[];
    communication: CtfRubricCriterionSeed[];
    passingScore: number;
}

export interface CtfDebriefTemplateSeed {
    rootCausePrompt: string;
    impactPrompt: string;
    mitigationPrompt: string;
    evidencePrompt: string;
    checklist: string[];
}

export interface CtfChallengeSeed {
    code: string;
    title: string;
    description: string;
    freeModeDescription: string;
    category: CtfCategory;
    difficulty: CtfDifficulty;
    points: number;
    flagValue: string;
    prerequisiteChallengeCode?: string;
    targetService: string;
    targetEndpoint: string;
    vulnerabilityType: string;
    attackVector: string;
    learningObjectives: string[];
    estimatedMinutes: number;
    isActive: boolean;
    relatedWorkshopPath?: string;
    guidedSteps: CtfGuidedStepSeed[];
    hints: CtfHintSeed[];
    missionBrief?: CtfMissionBriefSeed;
    incidentArtifacts?: CtfIncidentArtifactSeed[];
    proofRubric?: CtfProofRubricSeed;
    debriefTemplate?: CtfDebriefTemplateSeed;
    /**
     * Initial vulnerability configuration applied to each student when they start this challenge.
     * Set by the gateway via the HSM internal admin endpoint — never toggled by students.
     * Keys match VulnerabilityConfig fields in VulnEngine.ts.
     */
    initialVulnConfig?: Record<string, boolean>;
}

import { HSM_CHALLENGES } from './ctf/hsmChallenges';
import { REPLAY_CHALLENGES } from './ctf/replayChallenges';
import { THREEDS_CHALLENGES } from './ctf/threedsChallenges';
import { FRAUD_CHALLENGES } from './ctf/fraudChallenges';
import { ISO_CHALLENGES, PIN_CHALLENGES, MITM_CHALLENGES, PRIVESC_CHALLENGES, CRYPTO_CHALLENGES, INFRA_CHALLENGES } from './ctf/otherChallenges';
import { PHASE2_CHALLENGES } from './ctf/phase2Challenges';

const RAW_CTF_CHALLENGES: CtfChallengeSeed[] = [
    ...HSM_CHALLENGES,
    ...REPLAY_CHALLENGES,
    ...THREEDS_CHALLENGES,
    ...FRAUD_CHALLENGES,
    ...ISO_CHALLENGES,
    ...PIN_CHALLENGES,
    ...MITM_CHALLENGES,
    ...PRIVESC_CHALLENGES,
    ...CRYPTO_CHALLENGES,
    ...INFRA_CHALLENGES,
    ...PHASE2_CHALLENGES,
];

const HINT_LEVEL_1_COST = 5;
const HINT_LEVEL_2_COST = 12;
const HINT_LEVEL_3_COST = 25;
const LEVEL_1_FALLBACK = 'Analysez la surface exposee puis confirmez un comportement anormal.';

const CATEGORY_ATTACK_CLASS: Record<CtfCategory, string> = {
    PIN_CRACKING: 'Weak authentication / credential handling',
    REPLAY_ATTACK: 'Broken anti-replay controls',
    MITM: 'Insecure transport / cleartext exposure',
    FRAUD_CNP: 'Business logic abuse (fraud decisioning)',
    ISO8583_MANIPULATION: 'Protocol message tampering',
    HSM_ATTACK: 'Broken access control / cryptographic misuse',
    '3DS_BYPASS': 'Authentication workflow bypass',
    CRYPTO_WEAKNESS: 'Weak cryptography / weak randomness',
    PRIVILEGE_ESCALATION: 'Broken authorization',
    EMV_CLONING: 'EMV trust boundary bypass',
    TOKEN_VAULT: 'Sensitive data exposure',
    NETWORK_ATTACK: 'Insecure network trust model',
    KEY_MANAGEMENT: 'Key lifecycle and segregation failure',
    ADVANCED_FRAUD: 'Adaptive fraud evasion',
    SUPPLY_CHAIN: 'Supply chain compromise',
    BOSS: 'Multi-stage chained exploitation',
};

const CATEGORY_TOOL_HINT: Record<CtfCategory, string> = {
    PIN_CRACKING: 'nmap, curl',
    REPLAY_ATTACK: 'curl, burp repeater',
    MITM: 'nmap, tshark',
    FRAUD_CNP: 'curl, jq',
    ISO8583_MANIPULATION: 'nmap, pyiso8583',
    HSM_ATTACK: 'nmap, ffuf',
    '3DS_BYPASS': 'curl, jq',
    CRYPTO_WEAKNESS: 'curl, python',
    PRIVILEGE_ESCALATION: 'ffuf, curl',
    EMV_CLONING: 'tshark, curl',
    TOKEN_VAULT: 'curl, jq',
    NETWORK_ATTACK: 'nmap, tshark',
    KEY_MANAGEMENT: 'curl, jq',
    ADVANCED_FRAUD: 'curl, jq',
    SUPPLY_CHAIN: 'curl, grep',
    BOSS: 'nmap, tshark, ffuf',
};

const CATEGORY_EVIDENCE_AREA: Record<CtfCategory, string> = {
    PIN_CRACKING: 'Comparez la decision avant/apres indisponibilite du composant critique.',
    REPLAY_ATTACK: 'Comparez les reponses de deux requetes strictement identiques.',
    MITM: 'Inspectez la charge utile capturee sur le reseau, pas seulement la reponse applicative.',
    FRAUD_CNP: 'Observez le champ de score/decision et ses variations selon les attributs.',
    ISO8583_MANIPULATION: 'Visez les champs protocole sensibles et la logique de validation serveur.',
    HSM_ATTACK: 'Cherchez une fuite dans les metadonnees, les erreurs ou les logs.',
    '3DS_BYPASS': 'Surveillez la transition des statuts d authentification et les identifiants de session.',
    CRYPTO_WEAKNESS: 'Cherchez la preuve dans la structure du token ou la prevision de sequence.',
    PRIVILEGE_ESCALATION: 'Verifiez si la meme action est possible sans role attendu.',
    EMV_CLONING: 'Inspectez les metadonnees terminales et l absence de controles contextuels.',
    TOKEN_VAULT: 'Regardez la difference entre erreurs, format de token et donnees renvoyees.',
    NETWORK_ATTACK: 'Priorite aux paquets et aux traces de transport plutot qu au front-end.',
    KEY_MANAGEMENT: 'Concentrez-vous sur les metadonnees de cycle de vie et les operations d export.',
    ADVANCED_FRAUD: 'Mesurez les seuils et les effets de cumul manquants.',
    SUPPLY_CHAIN: 'Recherchez les artefacts tiers et les surfaces d administration exposees.',
    BOSS: 'Reliez les preuves de chaque etape de la chaine dans un ordre defensible.',
};

const CATEGORY_ROLE: Record<CtfCategory, string> = {
    PIN_CRACKING: 'payment security engineer',
    REPLAY_ATTACK: 'incident responder',
    MITM: 'network security engineer',
    FRAUD_CNP: 'fraud analyst',
    ISO8583_MANIPULATION: 'payment switch engineer',
    HSM_ATTACK: 'crypto security engineer',
    '3DS_BYPASS': '3DS security specialist',
    CRYPTO_WEAKNESS: 'application security engineer',
    PRIVILEGE_ESCALATION: 'backend security engineer',
    EMV_CLONING: 'card issuing security engineer',
    TOKEN_VAULT: 'tokenization engineer',
    NETWORK_ATTACK: 'network defense engineer',
    KEY_MANAGEMENT: 'key management specialist',
    ADVANCED_FRAUD: 'senior fraud hunter',
    SUPPLY_CHAIN: 'platform security lead',
    BOSS: 'red team lead',
};

const CATEGORY_CONTEXT: Record<CtfCategory, string> = {
    PIN_CRACKING: 'Issuer authorization flow with PIN verification under PCI constraints.',
    REPLAY_ATTACK: 'Card payment API where transaction replay can create duplicate financial impact.',
    MITM: 'Inter-service payment traffic where cleartext or weak integrity can be intercepted.',
    FRAUD_CNP: 'Card-not-present fraud monitoring under high transaction velocity.',
    ISO8583_MANIPULATION: 'Switch and issuer message validation for ISO 8583 fields and business rules.',
    HSM_ATTACK: 'Cryptographic operations delegated to HSM services with strict access boundaries.',
    '3DS_BYPASS': 'Strong Customer Authentication path in 3DS challenge and verification flow.',
    CRYPTO_WEAKNESS: 'Critical token and authorization code generation path.',
    PRIVILEGE_ESCALATION: 'Access control checks on high-impact financial operations.',
    EMV_CLONING: 'EMV terminal and issuer interactions under anti-cloning controls.',
    TOKEN_VAULT: 'Token vault and detokenization controls for PAN protection.',
    NETWORK_ATTACK: 'Segmentation and trust boundaries in payment network topology.',
    KEY_MANAGEMENT: 'Cryptographic key lifecycle and separation of duties.',
    ADVANCED_FRAUD: 'Cross-signal fraud decisioning with adaptive defense requirements.',
    SUPPLY_CHAIN: 'Operational dependencies and third-party trust in payment infrastructure.',
    BOSS: 'Multi-stage incident combining exploitation, containment, and strategic remediation.',
};

const DEFAULT_PROOF_RUBRIC: CtfProofRubricSeed = {
    technical: [
        { criterion: 'Reproducible exploitation evidence', weight: 40, description: 'Commands, payloads, and outputs are replayable.' },
        { criterion: 'Root cause accuracy', weight: 30, description: 'Explains the exact control failure that enabled exploitation.' },
        { criterion: 'Patch validation before/after', weight: 30, description: 'Shows exploit works before and fails after mitigation.' },
    ],
    communication: [
        { criterion: 'Incident summary clarity', weight: 40, description: 'Executive-level summary is concise and accurate.' },
        { criterion: 'Prioritized mitigation plan', weight: 35, description: 'Actions are ordered by risk and delivery feasibility.' },
        { criterion: 'Evidence traceability', weight: 25, description: 'Each claim is linked to a concrete artifact.' },
    ],
    passingScore: 70,
};

function normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
}

function containsExplicitCommand(value: string): boolean {
    return /(\bcurl\b|\bwget\b|http:\/\/|https:\/\/|\bPOST\b|\bGET\b|\/[a-z0-9\-_]+\/[a-z0-9\-_]+)/i.test(value);
}

function sanitizeLevel1Hint(value: string): string {
    const compact = normalizeWhitespace(value)
        .replace(/PMP\{[^}]*\}/gi, 'PMP{...}')
        .replace(/\bflag\b/gi, 'preuve');

    if (!compact) {
        return LEVEL_1_FALLBACK;
    }

    if (containsExplicitCommand(compact)) {
        return LEVEL_1_FALLBACK;
    }

    return compact;
}

function sanitizeHint(value: string, fallback: string): string {
    const compact = normalizeWhitespace(value)
        .replace(/PMP\{[^}]*\}/gi, 'PMP{...}');

    return compact || fallback;
}

function sanitizeLevel2Cost(rawCost: number): number {
    if (Number.isFinite(rawCost) && rawCost >= 10 && rawCost <= 15) {
        return Math.floor(rawCost);
    }

    return HINT_LEVEL_2_COST;
}

function buildMissionBrief(challenge: CtfChallengeSeed): CtfMissionBriefSeed {
    return {
        role: CATEGORY_ROLE[challenge.category],
        businessContext: CATEGORY_CONTEXT[challenge.category],
        incidentTrigger: normalizeWhitespace(challenge.description),
        objective: `Exploit ${challenge.vulnerabilityType} on ${challenge.targetService} then produce a defensible remediation.`,
        successCriteria: `Recover a valid flag for ${challenge.code} and deliver root cause + prioritized mitigation with before/after proof.`,
    };
}

function buildIncidentArtifacts(challenge: CtfChallengeSeed): CtfIncidentArtifactSeed[] {
    const challengeSlug = challenge.code.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    return [
        {
            artifactId: `${challenge.code}-log`,
            artifactType: 'LOG',
            title: 'Application log extract',
            description: `Raw service logs captured during ${challenge.code} exploitation window.`,
            sample: `[${challengeSlug}] service=${challenge.targetService} endpoint="redacted-until-complete" signal="unexpected behavior"`,
        },
        {
            artifactId: `${challenge.code}-siem`,
            artifactType: 'SIEM',
            title: 'SIEM alert card',
            description: 'Synthetic SIEM card with anomaly context and impacted asset.',
            sample: `rule=ctf_${challengeSlug}_anomaly severity=high asset=${challenge.targetService} vector="${challenge.attackVector}"`,
        },
        {
            artifactId: `${challenge.code}-ticket`,
            artifactType: 'TICKET',
            title: 'Incident response ticket',
            description: 'Ops ticket to capture timeline, owner, and mitigation decisions.',
            sample: `INC-${challenge.code} status=open owner=SOC summary="${challenge.vulnerabilityType}"`,
        },
    ];
}

function buildDebriefTemplate(challenge: CtfChallengeSeed): CtfDebriefTemplateSeed {
    return {
        rootCausePrompt: `Explain why ${challenge.vulnerabilityType} was reachable and which control failed first.`,
        impactPrompt: 'Quantify business impact (fraud, compliance exposure, operational risk) with scope and severity.',
        mitigationPrompt: 'List prioritized mitigations with owner and timeline (immediate, short-term, structural).',
        evidencePrompt: 'Reference concrete artifacts (commands, logs, traces) proving exploit and post-patch protection.',
        checklist: [
            'Root cause explained with technical mechanism.',
            'Impact statement includes scope and severity.',
            'At least two prioritized mitigations are defined.',
            'Before/after validation evidence is attached.',
        ],
    };
}

function normalizeMissionBrief(challenge: CtfChallengeSeed): CtfMissionBriefSeed {
    const fallback = buildMissionBrief(challenge);
    const source = challenge.missionBrief || fallback;

    return {
        role: normalizeWhitespace(source.role || fallback.role),
        businessContext: normalizeWhitespace(source.businessContext || fallback.businessContext),
        incidentTrigger: normalizeWhitespace(source.incidentTrigger || fallback.incidentTrigger),
        objective: normalizeWhitespace(source.objective || fallback.objective),
        successCriteria: normalizeWhitespace(source.successCriteria || fallback.successCriteria),
    };
}

function normalizeIncidentArtifacts(challenge: CtfChallengeSeed): CtfIncidentArtifactSeed[] {
    const fallbackArtifacts = buildIncidentArtifacts(challenge);
    const sourceArtifacts = Array.isArray(challenge.incidentArtifacts) && challenge.incidentArtifacts.length > 0
        ? challenge.incidentArtifacts
        : fallbackArtifacts;

    return sourceArtifacts
        .map((artifact, index) => ({
            artifactId: normalizeWhitespace(artifact.artifactId || `${challenge.code}-artifact-${index + 1}`),
            artifactType: artifact.artifactType || 'LOG',
            title: normalizeWhitespace(artifact.title || `Artifact ${index + 1}`),
            description: normalizeWhitespace(artifact.description || 'Incident artifact'),
            sample: normalizeWhitespace(artifact.sample || 'n/a'),
        }))
        .slice(0, Math.max(2, sourceArtifacts.length));
}

function normalizeProofRubric(challenge: CtfChallengeSeed): CtfProofRubricSeed {
    const source = challenge.proofRubric || DEFAULT_PROOF_RUBRIC;

    const normalizeCriteria = (entries: CtfRubricCriterionSeed[]): CtfRubricCriterionSeed[] => entries.map((entry) => ({
        criterion: normalizeWhitespace(entry.criterion),
        weight: Math.max(0, Math.min(100, Math.round(entry.weight))),
        description: normalizeWhitespace(entry.description),
    }));

    return {
        technical: normalizeCriteria(source.technical && source.technical.length > 0 ? source.technical : DEFAULT_PROOF_RUBRIC.technical),
        communication: normalizeCriteria(source.communication && source.communication.length > 0 ? source.communication : DEFAULT_PROOF_RUBRIC.communication),
        passingScore: Math.max(50, Math.min(100, Math.round(source.passingScore || DEFAULT_PROOF_RUBRIC.passingScore))),
    };
}

function normalizeDebriefTemplate(challenge: CtfChallengeSeed): CtfDebriefTemplateSeed {
    const fallback = buildDebriefTemplate(challenge);
    const source = challenge.debriefTemplate || fallback;

    const checklist = Array.isArray(source.checklist) && source.checklist.length > 0
        ? source.checklist
        : fallback.checklist;

    return {
        rootCausePrompt: normalizeWhitespace(source.rootCausePrompt || fallback.rootCausePrompt),
        impactPrompt: normalizeWhitespace(source.impactPrompt || fallback.impactPrompt),
        mitigationPrompt: normalizeWhitespace(source.mitigationPrompt || fallback.mitigationPrompt),
        evidencePrompt: normalizeWhitespace(source.evidencePrompt || fallback.evidencePrompt),
        checklist: checklist.map((item) => normalizeWhitespace(item)).filter(Boolean),
    };
}

function normalizeHints(challenge: CtfChallengeSeed): CtfHintSeed[] {
    const attackClass = CATEGORY_ATTACK_CLASS[challenge.category];
    const tools = CATEGORY_TOOL_HINT[challenge.category];
    const evidenceArea = CATEGORY_EVIDENCE_AREA[challenge.category];

    return [
        {
            hintNumber: 1,
            hintText: `L1 Orientation: Classe d attaque: ${attackClass}. Cartographiez d abord la surface exposee.`,
            costPoints: HINT_LEVEL_1_COST,
        },
        {
            hintNumber: 2,
            hintText: `L2 Technique: Outils suggérés: ${tools}. Utilisez-les pour énumérer et tester, sans payload prêt-à-l-emploi.`,
            costPoints: HINT_LEVEL_2_COST,
        },
        {
            hintNumber: 3,
            hintText: `L3 Preuve: ${evidenceArea}`,
            costPoints: HINT_LEVEL_3_COST,
        },
    ];
}

function normalizeGuidedStep(step: CtfGuidedStepSeed): CtfGuidedStepSeed {
    return {
        ...step,
        stepTitle: normalizeWhitespace(step.stepTitle),
        stepDescription: normalizeWhitespace(step.stepDescription),
        commandTemplate: step.commandTemplate ? normalizeWhitespace(step.commandTemplate) : undefined,
        expectedOutput: step.expectedOutput ? normalizeWhitespace(step.expectedOutput) : undefined,
        hintText: step.hintText ? normalizeWhitespace(step.hintText) : undefined,
    };
}

function buildRealisticGuidedSteps(challenge: CtfChallengeSeed): CtfGuidedStepSeed[] {
    return [
        {
            stepNumber: 1,
            stepTitle: 'Reconnaissance reseau',
            stepDescription: 'Identifiez d abord les hôtes actifs et les ports exposés dans la zone cible sans supposer les noms DNS.',
            stepType: 'EXPLANATION',
            hintText: 'Commencez par une découverte réseau puis restreignez la cible.',
        },
        {
            stepNumber: 2,
            stepTitle: 'Enumeration services et endpoints',
            stepDescription: 'Dressez l inventaire des services accessibles puis des routes utiles sans dépendre d un chemin prédéfini.',
            stepType: 'EXPLANATION',
            hintText: 'Confirmez la méthode HTTP, le code de réponse et le comportement anormal.',
        },
        {
            stepNumber: 3,
            stepTitle: 'Identification de la vulnerabilite',
            stepDescription: `Validez techniquement la faiblesse (${challenge.vulnerabilityType}) avec un test reproductible et minimal.`,
            stepType: 'ANALYSIS',
            hintText: 'Documentez exactement quel contrôle manque ou se comporte mal.',
        },
        {
            stepNumber: 4,
            stepTitle: 'Exploitation controlee',
            stepDescription: 'Exploitez la faiblesse de manière contrôlée pour obtenir une preuve d impact sans dégrader le service.',
            stepType: 'EXPLOITATION',
        },
        {
            stepNumber: 5,
            stepTitle: 'Collecte de preuve',
            stepDescription: 'Capturez la preuve exploitable (requête, réponse, métrique, trace réseau ou log) et liez-la à votre identifiant étudiant.',
            stepType: 'OBSERVATION',
            hintText: 'La preuve doit être vérifiable et horodatée.',
        },
        {
            stepNumber: 6,
            stepTitle: 'Analyse post-exploitation',
            stepDescription: 'Expliquez l impact métier, la cause racine et les priorités de remédiation défensive.',
            stepType: 'EXPLANATION',
        },
    ];
}

function isRemediationStep(step: CtfGuidedStepSeed): boolean {
    return step.stepTitle.toLowerCase() === 'remediation defensive';
}

function isPostPatchVerificationStep(step: CtfGuidedStepSeed): boolean {
    return step.stepTitle.toLowerCase() === 'verification post-patch avant/apres';
}

function findLastExploitationIndex(steps: CtfGuidedStepSeed[]): number {
    for (let index = steps.length - 1; index >= 0; index -= 1) {
        if (steps[index].stepType === 'EXPLOITATION') {
            return index;
        }
    }

    return steps.length - 1;
}

function buildRemediationStep(challenge: CtfChallengeSeed): CtfGuidedStepSeed {
    return {
        stepNumber: 0,
        stepTitle: 'Remediation defensive',
        stepDescription: normalizeWhitespace(
            `Appliquez un correctif defensif pour neutraliser ${challenge.vulnerabilityType}. ` +
            'Traitez la cause racine, ajoutez un controle preventif et documentez le changement.'
        ),
        stepType: 'EXPLANATION',
        hintText: 'Priorisez un correctif qui bloque l attaque sans casser le flux legitime.',
    };
}

function buildPostPatchVerificationStep(challenge: CtfChallengeSeed): CtfGuidedStepSeed {
    return {
        stepNumber: 0,
        stepTitle: 'Verification post-patch avant/apres',
        stepDescription: normalizeWhitespace(
            'Executez le meme test d attaque que vous avez identifie avant puis apres avoir applique le correctif. ' +
            'Avant patch, la faille doit etre exploitable. Apres patch, l exploitation doit echouer et le flux legitime doit rester valide.'
        ),
        stepType: 'ANALYSIS',
        commandTemplate: 'echo "Before patch: exploit should succeed"; echo "After patch: exploit should fail with 4xx/blocked response";',
        expectedOutput: 'Avant patch: exploitation validee. Apres patch: exploitation bloquee + fonctionnement legitime confirme.',
        hintText: 'Conservez une preuve comparative avant/apres pour valider la correction.',
    };
}

function reindexSteps(steps: CtfGuidedStepSeed[]): CtfGuidedStepSeed[] {
    return steps.map((step, index) => ({
        ...step,
        stepNumber: index + 1,
    }));
}

function normalizeGuidedSteps(challenge: CtfChallengeSeed): CtfGuidedStepSeed[] {
    const normalized = buildRealisticGuidedSteps(challenge)
        .map(normalizeGuidedStep);

    const hasRemediation = normalized.some(isRemediationStep);
    const hasPostPatchVerification = normalized.some(isPostPatchVerificationStep);
    const insertionIndex = Math.max(0, findLastExploitationIndex(normalized));

    if (!hasRemediation) {
        normalized.splice(insertionIndex + 1, 0, buildRemediationStep(challenge));
    }

    if (!hasPostPatchVerification) {
        const remediationIndex = normalized.findIndex(isRemediationStep);
        const verificationInsertionIndex = remediationIndex >= 0 ? remediationIndex + 1 : normalized.length;
        normalized.splice(verificationInsertionIndex, 0, buildPostPatchVerificationStep(challenge));
    }

    return reindexSteps(normalized);
}

function normalizeChallenge(challenge: CtfChallengeSeed): CtfChallengeSeed {
    const initialDefaults: Record<string, Record<string, boolean>> = {
        'HSM-003': { keyLeakInLogs: true },
        'HSM-005': { timingAttackEnabled: true },
        'PIN-001': { simulateDown: false },
        'REPLAY-001': { allowReplay: true },
    };

    return {
        ...challenge,
        hints: normalizeHints(challenge),
        guidedSteps: normalizeGuidedSteps(challenge),
        missionBrief: normalizeMissionBrief(challenge),
        incidentArtifacts: normalizeIncidentArtifacts(challenge),
        proofRubric: normalizeProofRubric(challenge),
        debriefTemplate: normalizeDebriefTemplate(challenge),
        initialVulnConfig: {
            ...(initialDefaults[challenge.code] || {}),
            ...(challenge.initialVulnConfig || {}),
        },
    };
}

export const CTF_CHALLENGES: CtfChallengeSeed[] = RAW_CTF_CHALLENGES.map(normalizeChallenge);
export const CTF_CHALLENGE_BY_CODE = new Map(CTF_CHALLENGES.map((challenge) => [challenge.code, challenge]));

export const CTF_TOTAL_ACTIVE_CHALLENGES = CTF_CHALLENGES.length;
