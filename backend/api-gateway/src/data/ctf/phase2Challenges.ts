import type { CtfChallengeSeed } from '../ctfChallenges';
import { EMV_CHALLENGES } from './emvChallenges';
import { TOKEN_CHALLENGES } from './tokenChallenges';
import { NET_CHALLENGES } from './networkChallenges';
import { KEY_CHALLENGES } from './keyChallenges';
import { ADV_FRAUD_CHALLENGES, INFRA_CHALLENGES, BOSS_CHALLENGES } from './advancedChallenges';

export const PHASE2_CHALLENGES: CtfChallengeSeed[] = [
    ...EMV_CHALLENGES,
    ...TOKEN_CHALLENGES,
    ...NET_CHALLENGES,
    ...KEY_CHALLENGES,
    ...ADV_FRAUD_CHALLENGES,
    ...INFRA_CHALLENGES,
    ...BOSS_CHALLENGES,
];


