import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { RequireRole, UserRole } from '../middleware/roles';
import * as ctfController from '../controllers/ctf.controller';

const router = Router();

router.use(authMiddleware);

router.get('/challenges', RequireRole(UserRole.ETUDIANT), ctfController.getChallenges);
router.get('/challenges/:code', RequireRole(UserRole.ETUDIANT), ctfController.getChallengeDetail);
router.post('/challenges/:code/start', RequireRole(UserRole.ETUDIANT), ctfController.startChallenge);
router.post('/challenges/:code/step/next', RequireRole(UserRole.ETUDIANT), ctfController.advanceGuidedStep);
router.post('/challenges/:code/submit', RequireRole(UserRole.ETUDIANT), ctfController.submitFlag);
router.post('/challenges/:code/hint/:number', RequireRole(UserRole.ETUDIANT), ctfController.unlockHint);
router.get('/progress', RequireRole(UserRole.ETUDIANT), ctfController.getProgress);
router.get('/leaderboard', RequireRole(UserRole.ETUDIANT), ctfController.getLeaderboard);

router.get('/admin/submissions', RequireRole(UserRole.FORMATEUR), ctfController.getAdminSubmissions);
router.get('/admin/analytics', RequireRole(UserRole.FORMATEUR), ctfController.getAdminAnalytics);
router.post('/admin/reset/:studentId', RequireRole(UserRole.FORMATEUR), ctfController.resetStudentProgress);

export default router;
