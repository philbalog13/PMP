import { Router, Request, Response, NextFunction } from 'express';
import { HSMController } from '../controllers/hsm.controller';
import { VulnEngine } from '../services/VulnEngine';

const router = Router();
const controller = new HSMController();

// ─── Internal Admin Routes ──────────────────────────────────────────────────
// These routes are for the API Gateway only. Protected by INTERNAL_HSM_SECRET.
// Students never see or call these endpoints.
function requireInternalSecret(req: Request, res: Response, next: NextFunction): void {
    const secret = process.env.INTERNAL_HSM_SECRET;
    const provided = req.headers['x-internal-secret'] as string | undefined;
    if (secret && provided !== secret) {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
    }
    next();
}

// Initialize a student's vulnerability config when they start a challenge
router.post('/admin/init-challenge', requireInternalSecret, async (req: Request, res: Response) => {
    const { studentId, challengeCode, overrides } = req.body as {
        studentId: string;
        challengeCode: string;
        overrides?: Record<string, boolean>;
    };
    if (!studentId || !challengeCode) {
        res.status(400).json({ success: false, error: 'studentId and challengeCode required' });
        return;
    }
    await VulnEngine.initStudentForChallenge(studentId, challengeCode, overrides);
    res.json({ success: true, studentId, challengeCode });
});

// Update a student's config (used for progressive challenge scenarios)
router.patch('/admin/student-config', requireInternalSecret, async (req: Request, res: Response) => {
    const { studentId, config, challengeCode } = req.body as {
        studentId: string;
        config: Record<string, boolean>;
        challengeCode?: string;
    };
    if (!studentId || !config) {
        res.status(400).json({ success: false, error: 'studentId and config required' });
        return;
    }
    await VulnEngine.updateStudentConfig(studentId, config, challengeCode);
    res.json({ success: true });
});

// Reset a student's config (called on challenge reset from instructor console)
router.delete('/admin/student-config/:studentId', requireInternalSecret, async (req: Request, res: Response) => {
    await VulnEngine.resetStudent(req.params.studentId);
    res.json({ success: true });
});

// ─── PIN Operations ──────────────────────────────────────────────────────────
router.post('/encrypt-pin', controller.encryptPin);
router.post('/decrypt-pin', controller.decryptPin);

// ─── MAC Operations ──────────────────────────────────────────────────────────
router.post('/generate-mac', controller.generateMac);
router.post('/verify-mac', controller.verifyMac);

// ─── Crypto & Data ───────────────────────────────────────────────────────────
router.post('/encrypt-data', controller.encryptData);
router.post('/calculate-kcv', controller.calculateKcv);

// ─── Key Management ──────────────────────────────────────────────────────────
router.post('/translate-key', controller.translateKey);
router.post('/export-key', controller.exportKey);

// ─── CVV Operations ──────────────────────────────────────────────────────────
router.post('/generate-cvv', controller.generateCvv);

// ─── Discoverable Admin Routes (CTF targets) ─────────────────────────────────
// NOTE: /hsm/config (GET + POST) has been REMOVED.
// Vulnerabilities are no longer self-activated by students.
// They are pre-configured per challenge by the gateway.
router.get('/keys', controller.listKeys);
router.get('/backup', controller.backup);
router.get('/terminal-keys', controller.terminalKeys);
router.get('/status', controller.status);

// /hsm/pin/verify and /hsm/pin/generate-block are on the root app (legacy routes)

export const hsmRoutes = router;
