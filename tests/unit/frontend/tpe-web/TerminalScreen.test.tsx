/**
 * Terminal Screen Unit Tests
 * Tests display logic for TPE
 */

import { describe, it, expect } from '@jest/globals';

// Simulation of React Component props/logic
class TerminalScreen {
    getDisplayMessage(status: string): string {
        switch (status) {
            case 'IDLE': return 'INSERT CARD';
            case 'PROCESSING': return 'PROCESSING...';
            case 'APPROVED': return 'APPROVED';
            case 'DECLINED': return 'DECLINED';
            case 'PIN_ENTRY': return 'ENTER PIN: ****';
            default: return 'SYSTEM ERROR';
        }
    }
}

describe('TerminalScreen', () => {
    const screen = new TerminalScreen();

    it('should show welcome message on IDLE', () => {
        expect(screen.getDisplayMessage('IDLE')).toBe('INSERT CARD');
    });

    it('should show processing state', () => {
        expect(screen.getDisplayMessage('PROCESSING')).toBe('PROCESSING...');
    });

    it('should show error for unknown status', () => {
        expect(screen.getDisplayMessage('UNKNOWN')).toBe('SYSTEM ERROR');
    });
});
