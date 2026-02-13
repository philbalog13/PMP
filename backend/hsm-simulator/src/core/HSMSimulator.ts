import { EventEmitter } from 'events';
import { CommandProcessor } from './CommandProcessor';
import { KeyStorage } from './KeyStorage';
import { SessionManager } from './SessionManager';
import { LEDSimulator } from '../hardware/LEDSimulator';
import { TamperDetection, TamperReason } from '../hardware/TamperDetection';
import { TamperDetectedError } from './errors';

export interface HsmCommandTelemetry {
    code: string;
    at: string;
    durationMs: number;
    success: boolean;
    error?: string;
}

export class HSMSimulator extends EventEmitter {
    public readonly keyStorage: KeyStorage;
    public readonly sessionManager: SessionManager;
    public readonly processor: CommandProcessor;
    public readonly leds: LEDSimulator;
    public readonly tamper: TamperDetection;

    private static instance: HSMSimulator;
    private readonly startedAt: number;
    private commandCount = 0;
    private lastCommand: HsmCommandTelemetry | null = null;

    private constructor() {
        super();
        this.startedAt = Date.now();
        this.keyStorage = new KeyStorage();
        this.sessionManager = new SessionManager();
        this.processor = new CommandProcessor(this);
        this.leds = new LEDSimulator();
        this.tamper = new TamperDetection(this);
        this.initialize();
    }

    static getInstance(): HSMSimulator {
        if (!this.instance) {
            this.instance = new HSMSimulator();
        }
        return this.instance;
    }

    private initialize(): void {
        console.log('[HSM Firmware] Booting');
        this.leds.set('POWER', 'GREEN');
        this.leds.set('ACTIVE', 'OFF');
        this.leds.set('ERROR', 'OFF');
        this.leds.set('TAMPER', 'OFF');
        this.tamper.monitor();
        console.log('[HSM Firmware] Ready');
    }

    public async executeCommand(commandCode: string, payload: unknown): Promise<unknown> {
        const session = this.sessionManager.createSession(commandCode);
        const startedAt = Date.now();
        this.leds.flash('ACTIVE');

        try {
            if (this.tamper.isTampered()) {
                throw new TamperDetectedError('HSM is tampered and keys are zeroized');
            }

            const result = await this.processor.process(commandCode, payload);
            this.commandCount++;
            this.lastCommand = {
                code: commandCode,
                at: new Date().toISOString(),
                durationMs: Date.now() - startedAt,
                success: true,
            };
            return result;
        } catch (error) {
            this.leds.flash('ERROR');
            this.lastCommand = {
                code: commandCode,
                at: new Date().toISOString(),
                durationMs: Date.now() - startedAt,
                success: false,
                error: (error as Error).message,
            };
            throw error;
        } finally {
            this.sessionManager.closeSession(session.id);
        }
    }

    public getStatus(): {
        state: 'OPERATIONAL' | 'TAMPERED';
        uptimeSec: number;
        keysLoaded: number;
        commandCount: number;
        activeSessions: number;
        lastCommand: HsmCommandTelemetry | null;
        leds: Record<string, string>;
        tamper: ReturnType<TamperDetection['getStatus']>;
        defaultsLoadedAt: string;
    } {
        return {
            state: this.tamper.isTampered() ? 'TAMPERED' : 'OPERATIONAL',
            uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
            keysLoaded: this.keyStorage.getCount(),
            commandCount: this.commandCount,
            activeSessions: this.sessionManager.getActiveCount(),
            lastCommand: this.lastCommand,
            leds: this.leds.getState(),
            tamper: this.tamper.getStatus(),
            defaultsLoadedAt: this.keyStorage.getDefaultKeysLoadedAt(),
        };
    }

    public triggerTamper(reason: TamperReason = 'MANUAL_TRIGGER'): void {
        this.tamper.triggerTamper(reason);
    }

    public resetAfterTamper(): void {
        this.tamper.reset();
        this.keyStorage.reloadDefaults();
        this.leds.set('ERROR', 'OFF');
    }
}
