import { HSMSimulator } from '../core/HSMSimulator';

export type TamperReason =
    | 'MANUAL_TRIGGER'
    | 'COVER_OPEN'
    | 'VOLTAGE'
    | 'TEMPERATURE'
    | 'MOTION'
    | 'UNKNOWN';

export class TamperDetection {
    private readonly hsm: HSMSimulator;
    private tampered = false;
    private reason: TamperReason | null = null;
    private monitoredSince: string | null = null;
    private monitorTimer: NodeJS.Timeout | null = null;

    constructor(hsm: HSMSimulator) {
        this.hsm = hsm;
    }

    monitor(): void {
        if (this.monitorTimer) return;
        this.monitoredSince = new Date().toISOString();

        // In real HSM hardware, this loop would read physical sensors.
        this.monitorTimer = setInterval(() => {
            // Intentionally left inert in simulation mode.
        }, 5000);
        this.monitorTimer.unref?.();
    }

    stopMonitoring(): void {
        if (this.monitorTimer) {
            clearInterval(this.monitorTimer);
            this.monitorTimer = null;
        }
    }

    triggerTamper(reason: TamperReason = 'MANUAL_TRIGGER'): void {
        if (this.tampered) return;
        this.tampered = true;
        this.reason = reason;
        this.hsm.leds.set('TAMPER', 'RED');
        this.hsm.keyStorage.zeroize();
        console.error('[HSM] TAMPER DETECTED - KEYS ZEROIZED');
    }

    reset(): void {
        this.tampered = false;
        this.reason = null;
        this.hsm.leds.set('TAMPER', 'OFF');
    }

    isTampered(): boolean {
        return this.tampered;
    }

    getReason(): TamperReason | null {
        return this.reason;
    }

    getStatus(): {
        tampered: boolean;
        reason: TamperReason | null;
        monitoredSince: string | null;
        monitoring: boolean;
    } {
        return {
            tampered: this.tampered,
            reason: this.reason,
            monitoredSince: this.monitoredSince,
            monitoring: this.monitorTimer !== null,
        };
    }
}
