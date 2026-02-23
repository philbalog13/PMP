import { Request, Response } from 'express';
import * as fraudService from '../services/fraud.service';
import { generateFlag } from '../ctfFlag';

// In-memory tracking for ADV-FRAUD detection (per student, resets on restart)
const cardTestingTracker: Map<string, { count: number; pans: Set<string>; lastSeen: number }> = new Map();
const splitPaymentTracker: Map<string, { merchants: Set<string>; totalAmount: number; lastSeen: number }> = new Map();
const devicePanTracker: Map<string, Set<string>> = new Map();
const replayResetTracker: Map<string, { velocityLimitSeen: boolean; resetTriggered: boolean }> = new Map();

export const checkFraud = (req: Request, res: Response): void => {
    const { pan, amount, merchantId, mcc, country, ip } = req.body;
    const deviceFingerprint = req.body.deviceFingerprint as string | undefined;
    const studentId = req.headers['x-student-id'] as string | undefined;

    if (!pan || !amount) {
        res.status(400).json({ success: false, error: 'pan and amount are required' });
        return;
    }

    const result = fraudService.checkFraud({ pan, amount, merchantId, mcc, country, ip });

    const response: Record<string, unknown> = {
        success: true,
        ...result,
        score: result.riskScore,
        decision: result.recommendation,
        _educational: {
            rulesApplied: [
                'Velocity: Max transactions per hour',
                'Amount: High value threshold',
                'MCC: Suspicious merchant categories',
                'Geography: Blocked countries',
                'Behavior: First transaction patterns'
            ],
            scoringExplanation: 'Score 0-100: LOW (0-30), MEDIUM (30-50), HIGH (50-70), CRITICAL (70+)'
        }
    };

    // FRAUD-001 : fail-open — flag quand simulateFailure=true et failMode='open' → transaction approuvée malgré erreur
    if (studentId && fraudService.getRuntimeConfig().simulateFailure && fraudService.getRuntimeConfig().failMode === 'open') {
        const flag = generateFlag(studentId, 'FRAUD-001');
        if (flag) {
            response.flag = flag;
            response._ctf = 'FRAUD-001: Moteur de fraude en fail-open — toutes les transactions approuvées pendant la panne';
        }
    }

    // FRAUD-002 : score gaming — flag quand le score est < 40 malgré un montant élevé (>= 500)
    if (studentId && !fraudService.getRuntimeConfig().simulateFailure && result.riskScore < 40 && amount >= 500) {
        const flag = generateFlag(studentId, 'FRAUD-002');
        if (flag) {
            response.flag = response.flag ?? flag;
            response._ctf = 'FRAUD-002: Score gaming réussi — montant élevé mais score faible grâce aux paramètres optimisés';
        }
    }

    if (studentId) {
        const replayState = replayResetTracker.get(studentId) || {
            velocityLimitSeen: false,
            resetTriggered: false
        };
        const velocityExceeded = result.reasons.some((reason) => reason.startsWith('Velocity:'));
        const velocitySignal = result.reasons.some((reason) => reason.toLowerCase().includes('velocity'));

        if (velocityExceeded) {
            replayState.velocityLimitSeen = true;
        }

        // REPLAY-002: velocity state cleared after reset (memory-only counters).
        if (replayState.resetTriggered && replayState.velocityLimitSeen && !velocitySignal) {
            const flag = generateFlag(studentId, 'REPLAY-002');
            if (flag) {
                response.flag = response.flag ?? flag;
                response._ctf_replay002 = 'REPLAY-002: Velocity counters were reset and prior limit no longer applies';
            }
            replayState.velocityLimitSeen = false;
            replayState.resetTriggered = false;
        }

        replayResetTracker.set(studentId, replayState);

        const now = Date.now();
        const windowMs = 60_000; // 1 minute window

        // ADV-FRAUD-001 : card testing — micro-TX (amount <= 1) sur PANs différents, même merchant
        if (amount <= 1 && merchantId) {
            const key = `${studentId}:${merchantId}`;
            const tracker = cardTestingTracker.get(key) || { count: 0, pans: new Set<string>(), lastSeen: now };
            if (now - tracker.lastSeen > windowMs) {
                tracker.count = 0;
                tracker.pans = new Set<string>();
            }
            tracker.pans.add(pan);
            tracker.count++;
            tracker.lastSeen = now;
            cardTestingTracker.set(key, tracker);

            if (tracker.pans.size >= 10) {
                const flag = generateFlag(studentId, 'ADV-FRAUD-001');
                if (flag) {
                    response.flag = response.flag ?? flag;
                    response._ctf = `ADV-FRAUD-001: Card testing détecté — ${tracker.pans.size} PANs différents testés sur le même merchant`;
                }
            }
        }

        // ADV-FRAUD-002 : split payment — même PAN, montants < 300, merchants différents
        if (amount > 0 && amount < 300 && pan && merchantId) {
            const key = `${studentId}:${pan}`;
            const tracker = splitPaymentTracker.get(key) || { merchants: new Set<string>(), totalAmount: 0, lastSeen: now };
            if (now - tracker.lastSeen > windowMs * 5) {
                tracker.merchants = new Set<string>();
                tracker.totalAmount = 0;
            }
            tracker.merchants.add(merchantId);
            tracker.totalAmount += amount;
            tracker.lastSeen = now;
            splitPaymentTracker.set(key, tracker);

            if (tracker.merchants.size >= 3 && tracker.totalAmount >= 500) {
                const flag = generateFlag(studentId, 'ADV-FRAUD-002');
                if (flag) {
                    response.flag = response.flag ?? flag;
                    response._ctf = `ADV-FRAUD-002: Split payment détecté — ${tracker.merchants.size} merchants, total ${tracker.totalAmount}€ sans agrégation cross-merchant`;
                }
            }
        }

        // ADV-FRAUD-003 : device fingerprint sans tracking — même device, PAN différent passe sans limite
        if (deviceFingerprint && pan) {
            const key = `${studentId}:${deviceFingerprint}`;
            const pansForDevice = devicePanTracker.get(key) || new Set<string>();
            pansForDevice.add(pan);
            devicePanTracker.set(key, pansForDevice);

            if (pansForDevice.size >= 3) {
                const flag = generateFlag(studentId, 'ADV-FRAUD-003');
                if (flag) {
                    response.flag = response.flag ?? flag;
                    response._ctf = `ADV-FRAUD-003: Velocity PAN-only — ${pansForDevice.size} PANs différents depuis le même device ${deviceFingerprint}`;
                }
            }
        }

        // ADV-FRAUD-004 : ML score evasion — montant élevé (>= 2000) avec score très bas (< 35)
        if (!fraudService.getRuntimeConfig().simulateFailure && amount >= 2000 && result.riskScore < 35) {
            const flag = generateFlag(studentId, 'ADV-FRAUD-004');
            if (flag) {
                response.flag = response.flag ?? flag;
                response._ctf = `ADV-FRAUD-004: ML score evasion — ${amount}€ approuvé avec score ${result.riskScore} grâce à l'optimisation des features`;
            }
        }
    }

    res.json(response);
};

export const getAlerts = (req: Request, res: Response): void => {
    const unresolvedOnly = req.query.unresolved === 'true';
    res.json({ success: true, data: fraudService.getAlerts(unresolvedOnly) });
};

export const resolveAlert = (req: Request, res: Response): void => {
    const resolved = fraudService.resolveAlert(req.params.id);
    if (!resolved) {
        res.status(404).json({ success: false, error: 'Alert not found' });
        return;
    }
    res.json({ success: true, message: 'Alert resolved' });
};

export const getStats = (req: Request, res: Response): void => {
    res.json({ success: true, data: fraudService.getStats() });
};

export const getConfig = (_req: Request, res: Response): void => {
    res.json({
        success: true,
        ...fraudService.getRuntimeConfig()
    });
};

export const setConfig = (req: Request, res: Response): void => {
    const body = req.body ?? {};
    const updatedConfig = fraudService.updateRuntimeConfig({
        failMode: body.failMode,
        fallbackDecision: body.fallbackDecision,
        simulateFailure: body.simulateFailure
    });

    res.json({
        success: true,
        ...updatedConfig
    });
};

export const getStatus = (_req: Request, res: Response): void => {
    res.json({
        success: true,
        storageType: 'memory',
        config: fraudService.getRuntimeConfig(),
        stats: fraudService.getStats()
    });
};

export const resetState = (req: Request, res: Response): void => {
    const studentId = req.headers['x-student-id'] as string | undefined;
    fraudService.resetRuntimeState();
    if (studentId) {
        const replayState = replayResetTracker.get(studentId) || {
            velocityLimitSeen: false,
            resetTriggered: false
        };
        replayState.resetTriggered = true;
        replayResetTracker.set(studentId, replayState);
    }

    const response: Record<string, unknown> = {
        success: true,
        message: 'Fraud in-memory state reset'
    };

    if (studentId) {
        response._ctf = 'REPLAY-002: Reset executed. Re-run /fraud/check to verify counters were wiped';
    }

    res.json(response);
};
