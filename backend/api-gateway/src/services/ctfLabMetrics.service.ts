/**
 * Minimal metrics placeholder for THM-like lab migration.
 * This is intentionally lightweight and can later be swapped with prom-client.
 */

type DurationSample = {
    at: string;
    ms: number;
    success: boolean;
};

interface CtfLabMetricsState {
    startTotal: number;
    startFailedTotal: number;
    stopTotal: number;
    stopFailedTotal: number;
    activeSessions: number;
    startDurations: DurationSample[];
    stopDurations: DurationSample[];
}

const MAX_DURATION_SAMPLES = 200;

const state: CtfLabMetricsState = {
    startTotal: 0,
    startFailedTotal: 0,
    stopTotal: 0,
    stopFailedTotal: 0,
    activeSessions: 0,
    startDurations: [],
    stopDurations: [],
};

function pushSample(samples: DurationSample[], sample: DurationSample): void {
    samples.push(sample);
    if (samples.length > MAX_DURATION_SAMPLES) {
        samples.splice(0, samples.length - MAX_DURATION_SAMPLES);
    }
}

export function recordLabStart(durationMs: number, success: boolean): void {
    state.startTotal += 1;
    if (!success) {
        state.startFailedTotal += 1;
    }
    pushSample(state.startDurations, {
        at: new Date().toISOString(),
        ms: Math.max(0, Math.round(durationMs)),
        success,
    });
}

export function recordLabStop(durationMs: number, success: boolean): void {
    state.stopTotal += 1;
    if (!success) {
        state.stopFailedTotal += 1;
    }
    pushSample(state.stopDurations, {
        at: new Date().toISOString(),
        ms: Math.max(0, Math.round(durationMs)),
        success,
    });
}

export function setLabActiveSessions(value: number): void {
    state.activeSessions = Math.max(0, Math.round(value));
}

export function getLabMetricsSnapshot(): CtfLabMetricsState {
    return {
        startTotal: state.startTotal,
        startFailedTotal: state.startFailedTotal,
        stopTotal: state.stopTotal,
        stopFailedTotal: state.stopFailedTotal,
        activeSessions: state.activeSessions,
        startDurations: [...state.startDurations],
        stopDurations: [...state.stopDurations],
    };
}
