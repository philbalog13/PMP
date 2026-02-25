import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { RequireRole, UserRole } from '../middleware/roles';
import * as ctfController from '../controllers/ctf.controller';
import * as ctfProofController from '../controllers/ctfProof.controller';

const router = Router();

// Internal route used by orchestrators/gateway jobs (protected with x-internal-secret in controller).
router.post('/internal/ctf/vuln-init', ctfController.internalVulnInit);
router.get('/internal/lab/sessions/:sessionCode/resolve', ctfController.resolveLabSessionAccess);
// Public proof routes (student identity from x-student-id or JWT user context).
router.post('/prove-mitm', ctfProofController.proveMitm);
router.post('/prove-timing-attack', ctfProofController.proveTimingAttack);

router.use(authMiddleware);

router.get('/challenges', RequireRole(UserRole.ETUDIANT), ctfController.getChallenges);
router.get('/challenges/:code', RequireRole(UserRole.ETUDIANT), ctfController.getChallengeDetail);
router.post('/challenges/:code/start', RequireRole(UserRole.ETUDIANT), ctfController.startChallenge);
router.get('/challenges/:code/session', RequireRole(UserRole.ETUDIANT), ctfController.getChallengeSession);
router.post('/challenges/:code/step/:number/submit', RequireRole(UserRole.ETUDIANT), ctfController.submitGuidedStepAnswer);
router.post('/challenges/:code/step/next', RequireRole(UserRole.ETUDIANT), ctfController.advanceGuidedStep);
router.post('/challenges/:code/submit', RequireRole(UserRole.ETUDIANT), ctfController.submitFlag);
router.post('/challenges/:code/hint/:number', RequireRole(UserRole.ETUDIANT), ctfController.unlockHint);
router.get('/challenges/:code/debrief', RequireRole(UserRole.ETUDIANT), ctfController.getDebrief);
router.post('/challenges/:code/debrief', RequireRole(UserRole.ETUDIANT), ctfController.submitDebrief);
router.post('/challenges/:code/learning-check', RequireRole(UserRole.ETUDIANT), ctfController.saveLearningCheck);
router.post('/sessions/:sessionId/extend', RequireRole(UserRole.ETUDIANT), ctfController.extendChallengeSession);
router.post('/sessions/:sessionId/reset', RequireRole(UserRole.ETUDIANT), ctfController.resetChallengeSession);
router.delete('/sessions/:sessionId', RequireRole(UserRole.ETUDIANT), ctfController.terminateChallengeSession);
router.get('/progress', RequireRole(UserRole.ETUDIANT), ctfController.getProgress);
router.get('/leaderboard', RequireRole(UserRole.ETUDIANT), ctfController.getLeaderboard);

router.get('/admin/submissions', RequireRole(UserRole.FORMATEUR), ctfController.getAdminSubmissions);
router.get('/admin/analytics', RequireRole(UserRole.FORMATEUR), ctfController.getAdminAnalytics);
router.post('/admin/reset/:studentId', RequireRole(UserRole.FORMATEUR), ctfController.resetStudentProgress);

export default router;
