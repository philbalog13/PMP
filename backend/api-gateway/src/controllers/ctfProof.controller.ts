import axios from 'axios';
import { Request, Response } from 'express';
import { config } from '../config';
import { generateFlag } from '../services/ctfFlag.service';
import { ctfProofStore } from '../services/ctfProofStore.service';
import { logger } from '../utils/logger';

type TimingEntry = {
    candidate: string;
    count: number;
    meanMs: number;
    varianceMs: number;
};

function getStudentId(req: Request): string | null {
    return (req as any).user?.userId
        || (req.headers['x-student-id'] as string | undefined)
        || null;
}

function normalizeHexByte(value: unknown): string {
    const hex = String(value || '').trim().toLowerCase();
    if (!/^[0-9a-f]{2}$/.test(hex)) {
        return '';
    }
    return hex;
}

function toNumberArray(value: unknown): number[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map((entry) => Number(entry))
        .filter((entry) => Number.isFinite(entry) && entry >= 0);
}

function mean(values: number[]): number {
    if (values.length === 0) {
        return 0;
    }
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values: number[], avg: number): number {
    if (values.length <= 1) {
        return 0;
    }
    const squared = values.reduce((sum, value) => {
        const delta = value - avg;
        return sum + delta * delta;
    }, 0);
    return squared / (values.length - 1);
}

function erf(x: number): number {
    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x);
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const t = 1 / (1 + p * absX);
    const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX));
    return sign * y;
}

function normalCdf(x: number): number {
    return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

function welchTScore(a: TimingEntry, b: TimingEntry): number {
    const numerator = a.meanMs - b.meanMs;
    const denominator = Math.sqrt((a.varianceMs / a.count) + (b.varianceMs / b.count));
    if (denominator === 0) {
        return 0;
    }
    return numerator / denominator;
}

function approximateTwoTailedPValueFromT(t: number): number {
    const absT = Math.abs(t);
    return 2 * (1 - normalCdf(absT));
}

async function getExpectedTimingByte(studentId: string): Promise<string> {
    const response = await axios.post(
        `${config.services.hsmSimulator}/hsm/generate-mac`,
        {
            // Student-specific data — each student has a unique MAC byte for proof isolation
            data: studentId + ":PAYLOAD",
            keyLabel: 'ZAK_002',
            method: 'ALG3',
        },
        {
            timeout: 4000,
            headers: { 'Content-Type': 'application/json' },
        },
    );

    const mac = String(response.data?.mac || response.data?.result?.mac || '').trim().toLowerCase();
    if (!/^[0-9a-f]{16,}$/.test(mac)) {
        throw new Error('Unable to compute expected MAC for timing validation');
    }
    return mac.slice(0, 2);
}

export const proveMitm = async (req: Request, res: Response) => {
    try {
        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const challengeCode = String(req.body?.challengeCode || 'MITM-001').trim().toUpperCase();
        const capturedCvv = String(req.body?.capturedCvv || '').trim();

        if (challengeCode !== 'MITM-001') {
            return res.status(400).json({ success: false, error: 'challengeCode must be MITM-001' });
        }

        if (!/^[0-9]{3,4}$/.test(capturedCvv)) {
            return res.status(400).json({ success: false, error: 'capturedCvv must be a 3-4 digit value' });
        }

        const key = `ctf:proof:${studentId}:MITM-001:captured_cvv`;
        const expectedCvv = await ctfProofStore.get(key);

        if (!expectedCvv) {
            return res.status(400).json({
                success: false,
                error: 'No capturable MITM proof found for this student (proof expired or not generated yet).',
            });
        }

        if (capturedCvv !== expectedCvv) {
            return res.status(400).json({
                success: false,
                error: 'Captured CVV does not match the latest traffic proof for this student.',
            });
        }

        const flag = generateFlag(studentId, 'MITM-001');
        await ctfProofStore.set(
            `ctf:proof:${studentId}:MITM-001:validated`,
            JSON.stringify({ validatedAt: new Date().toISOString(), capturedCvv }),
            3600,
        );

        return res.json({
            success: true,
            challengeCode: 'MITM-001',
            flag,
            validation: {
                key,
                matched: true,
            },
        });
    } catch (error: any) {
        logger.error('CTF proveMitm failed', { error: error.message });
        return res.status(500).json({ success: false, error: 'Failed to validate MITM proof' });
    }
};

export const proveTimingAttack = async (req: Request, res: Response) => {
    try {
        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const challengeCode = String(req.body?.challengeCode || '').trim().toUpperCase();
        const discoveredByte = normalizeHexByte(req.body?.discoveredByte);
        const timingDataRaw = Array.isArray(req.body?.timingData) ? req.body.timingData : [];

        if (challengeCode !== 'HSM-005') {
            return res.status(400).json({ success: false, error: 'challengeCode must be HSM-005' });
        }

        if (!discoveredByte) {
            return res.status(400).json({ success: false, error: 'discoveredByte must be a 2-digit hex byte' });
        }

        const entries: TimingEntry[] = timingDataRaw
            .map((entry: any): TimingEntry | null => {
                const candidate = normalizeHexByte(entry?.candidate ?? entry?.byte ?? entry?.value);
                if (!candidate) return null;

                const samples = toNumberArray(entry?.samples ?? entry?.timings ?? []);
                const sampleCount = Number.isFinite(Number(entry?.sampleCount))
                    ? Number(entry.sampleCount)
                    : samples.length;

                if (sampleCount < 20) {
                    return null;
                }

                const avg = Number.isFinite(Number(entry?.avgMs))
                    ? Number(entry.avgMs)
                    : Number.isFinite(Number(entry?.meanMs))
                        ? Number(entry.meanMs)
                        : mean(samples);

                const sampleVariance = samples.length > 1
                    ? variance(samples, mean(samples))
                    : Number.isFinite(Number(entry?.varianceMs))
                        ? Number(entry.varianceMs)
                        : 0;

                return {
                    candidate,
                    count: sampleCount,
                    meanMs: avg,
                    varianceMs: sampleVariance,
                };
            })
            .filter((entry: TimingEntry | null): entry is TimingEntry => entry !== null);

        if (entries.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'timingData must contain at least 2 candidates with >=20 samples each',
            });
        }

        const ranked = [...entries].sort((a, b) => b.meanMs - a.meanMs);
        const top = ranked[0];
        const second = ranked[1];
        const deltaMs = top.meanMs - second.meanMs;

        if (deltaMs <= 3) {
            return res.status(400).json({
                success: false,
                error: 'Statistical delta too small: expected > 3ms between top candidates.',
                details: { deltaMs },
            });
        }

        const tScore = welchTScore(top, second);
        const pValue = approximateTwoTailedPValueFromT(tScore);
        if (pValue >= 0.05) {
            return res.status(400).json({
                success: false,
                error: 'Statistical significance not sufficient (p-value must be < 0.05).',
                details: { pValue },
            });
        }

        const expectedByte = await getExpectedTimingByte(studentId);
        if (top.candidate !== expectedByte || discoveredByte !== expectedByte) {
            return res.status(400).json({
                success: false,
                error: 'Discovered byte does not match server-side expected MAC byte.',
                details: {
                    expectedByte,
                    discoveredByte,
                    topCandidate: top.candidate,
                },
            });
        }

        await ctfProofStore.set(
            `ctf:proof:${studentId}:HSM-005:timing`,
            JSON.stringify({
                discoveredByte,
                expectedByte,
                deltaMs,
                pValue,
                validatedAt: new Date().toISOString(),
            }),
            3600,
        );

        const flag = generateFlag(studentId, 'HSM-005');
        return res.json({
            success: true,
            challengeCode: 'HSM-005',
            flag,
            validation: {
                discoveredByte,
                expectedByte,
                deltaMs,
                pValue,
            },
        });
    } catch (error: any) {
        logger.error('CTF proveTimingAttack failed', { error: error.message });
        return res.status(500).json({ success: false, error: 'Failed to validate timing attack proof' });
    }
};
