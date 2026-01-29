/**
 * Keypad Unit Tests
 * Tests input handling
 */

import { describe, it, expect } from '@jest/globals';

class Keypad {
    private buffer: string = '';

    press(key: string) {
        if (key === 'CLEAR') {
            this.buffer = '';
        } else if (key === 'ENTER') {
            // submit action
        } else if (this.buffer.length < 4) {
            this.buffer += key;
        }
    }

    getValue(): string {
        return this.buffer;
    }
}

describe('Keypad', () => {
    it('should accumulate digits', () => {
        const keypad = new Keypad();
        keypad.press('1');
        keypad.press('2');
        expect(keypad.getValue()).toBe('12');
    });

    it('should limit input to 4 digits', () => {
        const keypad = new Keypad();
        ['1', '2', '3', '4', '5'].forEach(k => keypad.press(k));
        expect(keypad.getValue()).toBe('1234');
    });

    it('should clear buffer', () => {
        const keypad = new Keypad();
        keypad.press('1');
        keypad.press('CLEAR');
        expect(keypad.getValue()).toBe('');
    });
});
