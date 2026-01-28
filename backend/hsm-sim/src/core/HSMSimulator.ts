import { EventEmitter } from 'events';
import { CommandProcessor } from './CommandProcessor';
import { KeyStorage } from './KeyStorage';
import { SessionManager } from './SessionManager';
import { LEDSimulator } from '../hardware/LEDSimulator';
import { TamperDetection } from '../hardware/TamperDetection';

export class HSMSimulator extends EventEmitter {
    public keyStorage: KeyStorage;
    public sessionManager: SessionManager;
    public processor: CommandProcessor;
    public leds: LEDSimulator;
    public tamper: TamperDetection;

    private static instance: HSMSimulator;

    private constructor() {
        super();
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

    private initialize() {
        console.log('[HSM Firmware] Booting...');
        this.leds.set('POWER', 'GREEN');
        this.leds.set('ACTIVE', 'OFF');
        this.tamper.monitor();
        console.log('[HSM Firmware] Ready.');
    }

    public async executeCommand(commandCode: string, payload: any): Promise<any> {
        this.leds.flash('ACTIVE');
        try {
            if (this.tamper.isTampered()) {
                throw new Error('HSM TAMPERED - KEYS ZEROIZED');
            }
            return await this.processor.process(commandCode, payload);
        } catch (error) {
            this.leds.flash('ERROR');
            throw error;
        }
    }
}
