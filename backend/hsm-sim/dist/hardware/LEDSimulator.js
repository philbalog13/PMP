"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEDSimulator = void 0;
class LEDSimulator {
    constructor() {
        this.state = {
            POWER: 'OFF',
            ACTIVE: 'OFF',
            ERROR: 'OFF',
            TAMPER: 'OFF'
        };
    }
    set(led, color) {
        this.state[led] = color;
        // In real hardware, this would drive GPIO
        // console.log(`[HSM Hardware] LED ${led} -> ${color}`);
    }
    flash(led, duration = 100) {
        const prev = this.state[led];
        this.set(led, 'YELLOW'); // Activity
        setTimeout(() => this.set(led, prev), duration);
    }
    getState() {
        return { ...this.state };
    }
}
exports.LEDSimulator = LEDSimulator;
