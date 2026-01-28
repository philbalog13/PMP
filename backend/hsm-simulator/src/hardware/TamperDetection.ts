import { HSMSimulator } from '../core/HSMSimulator';

export class TamperDetection {
    private hsm: HSMSimulator;
    private tampered: boolean = false;

    constructor(hsm: HSMSimulator) {
        this.hsm = hsm;
    }

    monitor() {
        // Mock monitoring loop
        setInterval(() => {
            // Check sensors (Heat, Voltage, Chassis)
            // if (voltage < 4.5V) this.triggerTamper();
        }, 5000);
    }

    triggerTamper() {
        this.tampered = true;
        this.hsm.leds.set('TAMPER', 'RED');
        this.hsm.keyStorage.zeroize();
        console.error('!!! HSM TAMPER DETECTED !!! KEYS ZEROIZED !!!');
    }

    isTampered() {
        return this.tampered;
    }
}
