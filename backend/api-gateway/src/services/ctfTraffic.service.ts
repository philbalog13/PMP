import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ctfProofStore } from './ctfProofStore.service';

const mitmIntervals = new Map<string, NodeJS.Timeout>();
const MITM_INTERVAL_MS = 60_000;

// TTL for the captured CVV proof — 90 min (longer than the interval so the student
// always has at least one valid window to sniff and submit).
const PROOF_TTL_SECONDS = 5400;

// MITM-001: traffic MUST route through ctf-target-net (10.10.10.0/24) so that
// tshark on the attackbox (10.10.10.20, ctf0 interface) can capture the plaintext
// HTTP packet.  Using the Docker DNS name "sim-network-switch" routes traffic over
// the monetic-network bridge which is invisible to tshark on ctf0.
// We therefore use the static ctf-target-net IP of the switch directly.
const CTF_SWITCH_URL = process.env.CTF_MITM_SWITCH_URL || 'http://10.10.10.12:8004';

function randomCvv(): string {
    return String(Math.floor(100 + Math.random() * 900));
}

async function emitMitmTraffic(studentId: string): Promise<void> {
    const cvv = randomCvv();
    const payload = {
        pan: '4111111111111111',
        amount: 37,
        currency: '978',
        merchantId: 'SHOPMITM',
        terminalId: 'TERM9001',
        stan: `${Math.floor(Math.random() * 1_000_000)}`.padStart(6, '0'),
        cvv,
    };

    try {
        await axios.post(
            `${CTF_SWITCH_URL}/transaction/authorize`,
            payload,
            {
                timeout: 4000,
                headers: {
                    'Content-Type': 'application/json',
                    'x-student-id': studentId,
                },
            },
        );

        // ── CRITICAL: persist the CVV so proveMitm can verify the student captured it ──
        // The student must intercept this plaintext HTTP traffic (tshark on ctf-target-net)
        // and submit the CVV value they extracted from the captured packet.
        const proofKey = `ctf:proof:${studentId}:MITM-001:captured_cvv`;
        await ctfProofStore.set(proofKey, cvv, PROOF_TTL_SECONDS);
        logger.debug('[ctfTraffic] MITM proof CVV stored', { studentId, proofKey });
    } catch (error: any) {
        logger.warn('[ctfTraffic] Failed to emit MITM background traffic', {
            studentId,
            error: error.message,
        });
    }
}

export async function startMitmBackgroundTraffic(studentId: string): Promise<void> {
    if (!studentId || mitmIntervals.has(studentId)) {
        return;
    }

    await emitMitmTraffic(studentId);

    const timer = setInterval(() => {
        void emitMitmTraffic(studentId);
    }, MITM_INTERVAL_MS);

    mitmIntervals.set(studentId, timer);
    logger.info('[ctfTraffic] MITM background traffic started', { studentId, intervalMs: MITM_INTERVAL_MS });
}

export function stopMitmBackgroundTraffic(studentId: string): void {
    const timer = mitmIntervals.get(studentId);
    if (!timer) {
        return;
    }
    clearInterval(timer);
    mitmIntervals.delete(studentId);
}
