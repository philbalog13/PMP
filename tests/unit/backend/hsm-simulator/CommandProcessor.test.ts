/**
 * Command Processor Unit Tests
 * Tests parsing and execution of HSM commands
 */

import { describe, it, expect } from '@jest/globals';

class CommandProcessor {
    process(command: string): string {
        const [cmd, ...args] = command.split(':');
        switch (cmd) {
            case 'GEN_KEY': return 'KEY_GENERATED';
            case 'TRANSLATE': return 'PIN_TRANSLATED';
            default: return 'ERR_UNKNOWN_CMD';
        }
    }
}

describe('CommandProcessor', () => {
    const processor = new CommandProcessor();

    it('should process GEN_KEY command', () => {
        expect(processor.process('GEN_KEY:AES')).toBe('KEY_GENERATED');
    });

    it('should process TRANSLATE command', () => {
        expect(processor.process('TRANSLATE:PINBLOCK')).toBe('PIN_TRANSLATED');
    });

    it('should return error for unknown command', () => {
        expect(processor.process('INVALID_CMD')).toBe('ERR_UNKNOWN_CMD');
    });
});
