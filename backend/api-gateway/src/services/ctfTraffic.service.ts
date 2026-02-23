import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

const mitmIntervals = new Map<string, NodeJS.Timeout>();
const MITM_INTERVAL_MS = 60_000;

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
            `${config.services.simNetworkSwitch}/transaction/authorize`,
            payload,
            {
                timeout: 4000,
                headers: {
                    'Content-Type': 'application/json',
                    'x-student-id': studentId,
                },
            },
        );
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
