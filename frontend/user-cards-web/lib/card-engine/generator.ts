import { calculateLuhnChecksum } from './luhn';

export type CardScheme = 'VISA' | 'MASTERCARD';
export type CardType = 'DEBIT' | 'CREDIT' | 'PREPAID' | 'CORPORATE' | 'GOLD';

export interface CardConfig {
    scheme: CardScheme;
    type: CardType;
    holderName: string;
}

export interface GeneratedCard {
    id: string;
    pan: string;
    panFormatted: string;
    expiryDate: string;
    cvv: string;
    scheme: CardScheme;
    type: CardType;
    holder: string;
    color: string;
    balance: number;
    status: 'ACTIVE' | 'BLOCKED';
}

const PEDAGOGICAL_BINS = {
    VISA: {
        DEBIT: '400000',
        CREDIT: '410000',
        PREPAID: '420000',
        CORPORATE: '430000',
        GOLD: '440000',
    },
    MASTERCARD: {
        DEBIT: '500000',
        CREDIT: '510000',
        PREPAID: '520000',
        CORPORATE: '530000',
        GOLD: '540000',
    },
};

/**
 * Génère un PAN valide complet
 */
export function generatePAN(scheme: CardScheme, type: CardType): string {
    const bin = PEDAGOGICAL_BINS[scheme][type];

    // Générer 9 chiffres aléatoires pour atteindre 15 chiffres
    let account = '';
    for (let i = 0; i < 9; i++) {
        account += Math.floor(Math.random() * 10).toString();
    }

    const partialPan = bin + account;
    const checksum = calculateLuhnChecksum(partialPan); // Note: Fix logic in Luhn if needed to match parity

    // Correction: calculateLuhnChecksum assumes we are adding the check digit at the end. 
    // The 'isEven' logic in calculateLuhnChecksum depends on the position relative to the check digit.
    // In `calculateLuhnChecksum(partialPan)`, if partialPan is 15 digits, we want the 16th.

    return partialPan + checksum;
}

/**
 * Génère un CVV déterministe (Pedagogical CVK simulation)
 */
export function generateCVV(pan: string, expiry: string): string {
    // Simple simulation of crypto hashing for pedagogical purpose
    // In real world: 3DES(CVK, PAN + EXP + SVC)

    let hash = 0;
    const input = pan + expiry + 'PEDAGOGICAL_SECRET';

    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    const positiveHash = Math.abs(hash);
    return (positiveHash % 1000).toString().padStart(3, '0');
}

/**
 * Formate le PAN par groupes de 4
 */
export function formatPAN(pan: string): string {
    return pan.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function generateCard(config: CardConfig): GeneratedCard {
    const pan = generatePAN(config.scheme, config.type);

    // Expiration 3 ans
    const now = new Date();
    const expYear = (now.getFullYear() + 3).toString().slice(-2);
    const expMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const expiryDate = `${expMonth}/${expYear}`;

    const cvv = generateCVV(pan, expiryDate);

    // Couleurs par défaut basées sur le type
    const colors = {
        DEBIT: 'bg-gradient-to-br from-blue-600 to-blue-800',
        CREDIT: 'bg-gradient-to-br from-slate-700 to-slate-900',
        PREPAID: 'bg-gradient-to-br from-teal-500 to-teal-700',
        CORPORATE: 'bg-gradient-to-br from-slate-800 to-black border border-gold-400',
        GOLD: 'bg-gradient-to-br from-yellow-500 to-yellow-700',
    };

    return {
        id: crypto.randomUUID(),
        pan,
        panFormatted: formatPAN(pan),
        expiryDate,
        cvv,
        scheme: config.scheme,
        type: config.type,
        holder: config.holderName.toUpperCase(),
        color: colors[config.type],
        balance: Math.floor(Math.random() * 5000) + 100, // Solde initial fictif
        status: 'ACTIVE',
    };
}
