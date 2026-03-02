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

// ─── Cold Boot / N.A.C Key Exchange ──────────────────────────────────────────
// Derives a Zone PIN Key (ZPK) for a POS terminal Cold Boot sequence.
// Called by sim-network-switch during NAC initialization flow.
router.post('/session-key', (req: Request, res: Response) => {
    const { terminalId, sessionId } = req.body as { terminalId?: string; sessionId?: string };
    // Generate a cryptographically-realistic ZPK (32 random hex bytes = 256-bit AES key)
    const crypto = require('crypto');
    const zpk = crypto.randomBytes(32).toString('hex').toUpperCase();
    const zmkId = `ZMK_MoneTIC_${new Date().getFullYear()}`;
    const kcv = zpk.substring(0, 6); // Key Check Value (first 3 bytes of ECB encrypt)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

    console.log(`[HSM] Cold Boot: ZPK generated for terminal ${terminalId || 'UNKNOWN'}`);

    res.json({
        success: true,
        data: {
            zpk,
            zpkKcv: kcv,
            zmkId,
            sessionId: sessionId || crypto.randomUUID(),
            terminalId: terminalId || 'UNKNOWN',
            expiresAt,
            algorithm: 'AES-256',
            keyUsage: 'PIN_ENCRYPTION'
        },
        _educational: {
            description: 'Zone PIN Key (ZPK) — Clé de session dérivée du ZMK pour chiffrement PIN du TPE',
            flow: 'NAC (Nouvelle Architecture Cryptographique): TPE→Acquéreur→Switch→HSM',
            note: 'En production, le ZPK est chiffré sous ZMK avant transmission. Ici affiché en clair à des fins pédagogiques.'
        }
    });
});

// ─── Discoverable Admin Routes (CTF targets) ─────────────────────────────────
router.get('/keys', controller.listKeys);
router.delete('/keys/:label', controller.deleteKey);
router.get('/logs', controller.getLogs);
router.get('/backup', controller.backup);
router.get('/terminal-keys', controller.terminalKeys);
router.get('/status', controller.status);
router.get('/config', controller.getConfig);
router.post('/config', controller.setConfig);

// /hsm/pin/verify and /hsm/pin/generate-block are on the root app (legacy routes)

export const hsmRoutes = router;
