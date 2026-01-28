import { useState, useCallback } from 'react';
import type { CardData } from '@/types/transaction';
import { validateLuhn, validateExpiryDate, validateCVV } from '@/lib/utils/validation';

type CardReaderMode = 'manual' | 'qr' | 'nfc';

interface UseCardReaderResult {
    cardData: CardData | null;
    mode: CardReaderMode;
    setMode: (mode: CardReaderMode) => void;
    readCard: (data: CardData) => boolean;
    clearCard: () => void;
    validateCard: (data: Partial<CardData>) => { valid: boolean; errors: string[] };
}

export function useCardReader(): UseCardReaderResult {
    const [cardData, setCardData] = useState<CardData | null>(null);
    const [mode, setMode] = useState<CardReaderMode>('manual');

    const validateCard = useCallback((data: Partial<CardData>) => {
        const errors: string[] = [];

        if (data.pan && !validateLuhn(data.pan)) {
            errors.push('Numéro de carte invalide (Luhn check failed)');
        }

        if (data.expiryDate && !validateExpiryDate(data.expiryDate)) {
            errors.push('Date d\'expiration invalide ou expirée');
        }

        if (data.cvv && !validateCVV(data.cvv)) {
            errors.push('CVV invalide (3-4 chiffres requis)');
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }, []);

    const readCard = useCallback((data: CardData): boolean => {
        const validation = validateCard(data);

        if (!validation.valid) {
            console.error('Card validation failed:', validation.errors);
            return false;
        }

        setCardData(data);
        return true;
    }, [validateCard]);

    const clearCard = useCallback(() => {
        setCardData(null);
    }, []);

    return {
        cardData,
        mode,
        setMode,
        readCard,
        clearCard,
        validateCard,
    };
}
