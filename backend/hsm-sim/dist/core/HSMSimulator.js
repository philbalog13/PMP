"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HSMSimulator = void 0;
const events_1 = require("events");
const CommandProcessor_1 = require("./CommandProcessor");
const KeyStorage_1 = require("./KeyStorage");
const SessionManager_1 = require("./SessionManager");
const LEDSimulator_1 = require("../hardware/LEDSimulator");
const TamperDetection_1 = require("../hardware/TamperDetection");
class HSMSimulator extends events_1.EventEmitter {
    constructor() {
        super();
        this.keyStorage = new KeyStorage_1.KeyStorage();
        this.sessionManager = new SessionManager_1.SessionManager();
        this.processor = new CommandProcessor_1.CommandProcessor(this);
        this.leds = new LEDSimulator_1.LEDSimulator();
        this.tamper = new TamperDetection_1.TamperDetection(this);
        this.initialize();
    }
    static getInstance() {
        if (!this.instance) {
            this.instance = new HSMSimulator();
        }
        return this.instance;
    }
    initialize() {
        console.log('[HSM Firmware] Booting...');
        this.leds.set('POWER', 'GREEN');
        this.leds.set('ACTIVE', 'OFF');
        this.tamper.monitor();
        console.log('[HSM Firmware] Ready.');
    }
    async executeCommand(commandCode, payload) {
        this.leds.flash('ACTIVE');
        try {
            if (this.tamper.isTampered()) {
                throw new Error('HSM TAMPERED - KEYS ZEROIZED');
            }
            return await this.processor.process(commandCode, payload);
        }
        catch (error) {
            this.leds.flash('ERROR');
            throw error;
        }
    }
}
exports.HSMSimulator = HSMSimulator;
