import type { CtfChallengeSeed } from '../ctfChallenges';

const s = (n: number, t: string, d: string, type: 'CURL_COMMAND' | 'ANALYSIS' | 'EXPLOITATION' | 'CODE_SNIPPET' | 'EXPLANATION' | 'OBSERVATION', cmd?: string, exp?: string, hint?: string): any => ({ stepNumber: n, stepTitle: t, stepDescription: d, stepType: type, ...(cmd && { commandTemplate: cmd }), ...(exp && { expectedOutput: exp }), ...(hint && { hintText: hint }) });
const h = (n: number, t: string, c: number): any => ({ hintNumber: n, hintText: t, costPoints: c });

export const KEY_CHALLENGES: CtfChallengeSeed[] = [
    {
        code: 'KEY-001', title: 'La Ceremonie Baclee', description: 'Les composants de la LMK (Local Master Key) sont stockes dans un fichier de backup accessible. Reconstituez la LMK a partir de ses composants.', freeModeDescription: 'Trouvez le fichier de backup de la ceremonie de cles contenant les composants de la LMK.',
        category: 'KEY_MANAGEMENT', difficulty: 'INTERMEDIATE', points: 200, flagValue: 'PMP{LMK_COMPONENTS_IN_FILE}',
        targetService: 'hsm-simulator', targetEndpoint: 'GET http://hsm-simulator:8011/hsm/backup',
        vulnerabilityType: 'Key components stored insecurely', attackVector: 'Backup file discovery',
        learningObjectives: ['Comprendre la ceremonie de cles HSM', 'Identifier le stockage non securise des composants', 'Evaluer l impact de la reconstitution de LMK'],
        estimatedMinutes: 20, isActive: true, relatedWorkshopPath: '/student/theory/hsm-keys',
        guidedSteps: [
            s(1, 'Recherche de backups', 'Enumerez les endpoints du HSM pour trouver un fichier de backup.', 'CURL_COMMAND', 'for path in backup export dump ceremony-log key-components; do echo -n "/hsm/$path: "; curl -s -o /dev/null -w "%{http_code}" http://hsm-simulator:8011/hsm/$path; echo; done'),
            s(2, 'Extraction des composants', 'Recuperez les composants de la LMK depuis le backup.', 'CURL_COMMAND', 'curl -s http://hsm-simulator:8011/hsm/backup | jq .lmkComponents', 'Composants de la LMK en clair'),
            s(3, 'Reconstitution', 'Les composants de la LMK sont XOR-es ensemble pour former la LMK. Avec tous les composants, on reconstitue la cle maitre.', 'ANALYSIS'),
            s(4, 'Impact total', 'La LMK protege toutes les autres cles du HSM. Avec elle, on peut dechiffrer toutes les ZPK, ZAK, DEK.', 'ANALYSIS'),
            s(5, 'Capture du flag', 'Composants LMK dans un fichier.', 'EXPLOITATION'),
        ],
        hints: [h(1, 'Cherchez un endpoint /hsm/backup ou /hsm/ceremony-log.', 5), h(2, 'Le backup contient les composants de la LMK en clair.', 10), h(3, 'Le flag suit le format PMP{...}. Validez votre exploitation pour le recuperer.', 25)],
    },
    {
        code: 'KEY-002', title: 'Le KEK Partage', description: 'Tous les terminaux partagent la meme KEK (Key Encryption Key). La compromission d un terminal compromet toutes les ZPK.', freeModeDescription: 'Extrayez la KEK d un terminal et utilisez-la pour dechiffrer les ZPK d autres terminaux.',
        category: 'KEY_MANAGEMENT', difficulty: 'ADVANCED', points: 280, flagValue: 'PMP{SHARED_KEK_ALL_TERMINALS}',
        prerequisiteChallengeCode: 'KEY-001',
        targetService: 'hsm-simulator', targetEndpoint: 'GET http://hsm-simulator:8011/hsm/terminal-keys',
        vulnerabilityType: 'Shared KEK across terminals', attackVector: 'Key hierarchy exploitation',
        learningObjectives: ['Comprendre la hierarchie des cles (LMK > KEK > ZPK)', 'Exploiter le partage de KEK', 'Proposer une KEK unique par terminal'],
        estimatedMinutes: 30, isActive: true, relatedWorkshopPath: '/student/theory/hsm-keys',
        guidedSteps: [
            s(1, 'Listing des terminaux', 'Recuperez la liste des terminaux et leurs cles associees.', 'CURL_COMMAND', 'curl -s http://hsm-simulator:8011/hsm/terminal-keys | jq .', 'Terminaux avec KEK et ZPK chiffrees'),
            s(2, 'Comparaison des KEK', 'Comparez les KEK de differents terminaux.', 'CURL_COMMAND', 'curl -s http://hsm-simulator:8011/hsm/terminal-keys | jq "[.[].kek] | unique | length"', '1 — tous les terminaux partagent la meme KEK'),
            s(3, 'Dechiffrement de ZPK', 'Avec la KEK d un terminal, dechiffrez la ZPK de tous les autres.', 'ANALYSIS', undefined, undefined, 'Une seule KEK = une seule faille compromet tout.'),
            s(4, 'Capture du flag', 'KEK partagee entre tous les terminaux.', 'EXPLOITATION'),
        ],
        hints: [h(1, 'Comparez les KEK de differents terminaux. Sont-elles uniques ?', 5), h(2, 'Tous les terminaux ont la meme KEK. Un terminal compromis = tous compromis.', 15), h(3, 'Le flag suit le format PMP{...}. Validez votre exploitation pour le recuperer.', 25)],
    },
    {
        code: 'KEY-003', title: 'La Rotation Oubliee', description: 'La ZPK n a jamais ete rotee depuis le deploiement initial. Sa date de creation est identique a la date de setup du systeme.', freeModeDescription: 'Verifiez la date de creation/rotation des cles du HSM. Trouvez une cle qui n a jamais ete rotee.',
        category: 'KEY_MANAGEMENT', difficulty: 'INTERMEDIATE', points: 160, flagValue: 'PMP{ZPK_NEVER_ROTATED}',
        targetService: 'hsm-simulator', targetEndpoint: 'GET http://hsm-simulator:8011/hsm/keys',
        vulnerabilityType: 'No key rotation', attackVector: 'Key metadata inspection',
        learningObjectives: ['Comprendre l importance de la rotation de cles', 'Detecter une cle jamais rotee', 'Calculer le risque cumule sur la duree'],
        estimatedMinutes: 15, isActive: true, relatedWorkshopPath: '/student/theory/hsm-keys',
        guidedSteps: [
            s(1, 'Inspection des metadonnees', 'Recuperez les metadonnees des cles avec date de creation et derniere rotation.', 'CURL_COMMAND', 'curl -s http://hsm-simulator:8011/hsm/keys | jq ".[] | {label, createdAt, lastRotated}"'),
            s(2, 'Detection', 'Cherchez les cles ou createdAt == lastRotated (jamais rotees).', 'ANALYSIS', undefined, undefined, 'Si createdAt et lastRotated sont identiques, la cle n a jamais ete rotee.'),
            s(3, 'Risque cumule', 'Chaque jour sans rotation = plus de PIN blocks chiffres avec la meme cle. Si compromise, toute la periode est exposee.', 'ANALYSIS'),
            s(4, 'Capture du flag', 'ZPK jamais rotee.', 'EXPLOITATION'),
        ],
        hints: [h(1, 'Regardez les champs createdAt et lastRotated pour chaque cle.', 5), h(2, 'La ZPK a la meme date de creation et de derniere rotation — jamais rotee.', 10), h(3, 'Le flag suit le format PMP{...}. Validez votre exploitation pour le recuperer.', 25)],
    },
    {
        code: 'KEY-004', title: 'L Export Implicite', description: 'Le HSM permet d exporter une cle sensible sous une cle de chiffrement plus faible. L attaquant exporte puis brute-force.', freeModeDescription: 'Utilisez l export HSM pour exporter une cle forte sous une cle faible, puis brute-forcez le chiffrement.',
        category: 'KEY_MANAGEMENT', difficulty: 'EXPERT', points: 350, flagValue: 'PMP{KEY_EXPORT_UNDER_WEAK}',
        prerequisiteChallengeCode: 'KEY-002',
        targetService: 'hsm-simulator', targetEndpoint: 'POST http://hsm-simulator:8011/hsm/export-key',
        vulnerabilityType: 'Key export under weak key', attackVector: 'Key hierarchy downgrade',
        learningObjectives: ['Comprendre les commandes d export HSM', 'Exploiter le downgrade de cle de chiffrement', 'Proposer des controles anti-export'],
        estimatedMinutes: 35, isActive: true, relatedWorkshopPath: '/student/theory/hsm-keys',
        guidedSteps: [
            s(1, 'Decouverte de l export', 'Trouvez l endpoint d export de cles du HSM.', 'CURL_COMMAND', 'curl -s -X POST http://hsm-simulator:8011/hsm/export-key -H "Content-Type: application/json" -d "{\\"keyLabel\\":\\"ZPK_001\\",\\"wrapperKeyLabel\\":\\"ZPK_TEST\\"}" | jq .', 'Cle ZPK_001 exportee sous la cle faible ZPK_TEST'),
            s(2, 'Brute-force', 'ZPK_TEST a une valeur triviale (1111...). Dechiffrez la cle exportee.', 'ANALYSIS', undefined, undefined, 'La cle wrapper est 1111...1111. Le dechiffrement est trivial.'),
            s(3, 'Impact', 'Exploit chain : exporter une cle forte sous une cle faible = recuperer la cle forte en clair.', 'ANALYSIS'),
            s(4, 'Capture du flag', 'Export de cle sous cle faible.', 'EXPLOITATION'),
        ],
        hints: [h(1, 'L endpoint /hsm/export-key accepte un wrapperKeyLabel. Utilisez une cle faible.', 5), h(2, 'Exportez ZPK_001 sous ZPK_TEST (cle faible connue). Le dechiffrement est trivial.', 15), h(3, 'Le flag suit le format PMP{...}. Validez votre exploitation pour le recuperer.', 25)],
    },
];


