/**
 * Card Reader Simulator Unit Tests
 * Tests card insertion and reading logic
 */

import { describe, it, expect } from '@jest/globals';

class CardReaderSim {
    private cardPresent: boolean = false;
    private cardData: any = null;

    insertCard(data: any) {
        this.cardPresent = true;
        this.cardData = data;
    }

    removeCard() {
        this.cardPresent = false;
        this.cardData = null;
    }

    readTrack2(): string | null {
        if (!this.cardPresent) return null;
        return `${this.cardData.pan}=${this.cardData.expiry}`;
    }
}

describe('CardReaderSim', () => {
    it('should detect card insertion', () => {
        const reader = new CardReaderSim();
        reader.insertCard({ pan: '1234', expiry: '1225' });
        expect(reader.readTrack2()).toBe('1234=1225');
    });

    it('should return null when no card present', () => {
        const reader = new CardReaderSim();
        expect(reader.readTrack2()).toBeNull();
    });

    it('should clear data on removal', () => {
        const reader = new CardReaderSim();
        reader.insertCard({ pan: '1234', expiry: '1225' });
        reader.removeCard();
        expect(reader.readTrack2()).toBeNull();
    });
});
