
// import { v4 as uuidv4 } from 'uuid'; // Removed to avoid Jest issues

/**
 * ==========================================
 * INTERFACES & TYPES
 * ==========================================
 */


export interface UserInput {
    amount: number;
    currency: string;
}

export interface CardData {
    pan: string;           // Primary Account Number
    expiryDate: string;    // MM/YY
    holderName: string;
    track2?: string;       // Données de la piste magnétique (simulées)
    serviceCode?: string;  // 3 digits (ex: 101)
}

export interface RiskResult {
    isValid: boolean;
    reason?: string;
    auditTrace: string[];
}

export interface ISOMessage {
    mti: string;           // Message Type Indicator (ex: 0100 for Auth Request)
    processingCode: string; // 6 chars (ex: 000000)
    amount: string;        // 12 chars padded
    transmissionDate: string; // MMDDhhmmss
    auditNumber: string;   // Stan (System Trace Audit Number)
    cardData: {
        pan: string;
        expiry: string;
    };
    pinBlock?: string;     // Encrypted PIN Block (simulated)
}

export interface PreparedTransaction {
    preparationId: string;
    timestamp: Date;
    rawInput: UserInput;
    cardData: CardData;
    isoMessage: ISOMessage;
    riskAssessment: RiskResult;
}

/**
 * ==========================================
 * SERVICE PÉDAGOGIQUE : PRÉPARATION TRANSACTION
 * ==========================================
 * Ce service simule la logique interne d'un TPE avant
 * toute communication réseau.
 */
export class TransactionPreparationService {

    /**
     * Point d'entrée principal du workflow
     */
    async prepareTransaction(userInput: UserInput, providedCardData?: CardData): Promise<PreparedTransaction> {
        const auditLog: string[] = [];
        auditLog.push(`[${new Date().toISOString()}] START: Transaction Preparation`);

        // Étape 1: Lecture Carte (Simulation matériel)
        let cardData: CardData;
        if (providedCardData) {
            auditLog.push(`[HARDWARE] Card Data Received from UI Reader`);
            cardData = providedCardData;
        } else {
            // Dans un vrai TPE, on attendrait l'insertion physique
            cardData = await this.readCardData();
            auditLog.push(`[HARDWARE] Card Read Success: ${this.maskPan(cardData.pan)}`);
        }

        // Étape 2: Contrôles de Sécurité Locaux (Offline)
        // Le TPE vérifie lui-même la cohérence avant d'appeler la banque
        const riskCheck = this.performLocalRiskChecks(cardData, userInput);
        auditLog.push(...riskCheck.auditTrace);

        if (!riskCheck.isValid) {
            throw new Error(`TRANSACTION REFUSED (OFFLINE): ${riskCheck.reason}`);
        }

        // Étape 3: Gestion du Code PIN (CVM Analysis)
        let pinBlock: string | undefined;
        if (this.requiresPin(userInput.amount)) {
            auditLog.push(`[CVM] PIN Required (Amount > Floor Limit)`);
            // Dans une vraie implémentation, on déclencherait ici l'interface de saisie PIN
            // Pour l'exercice, on simule un bloc PIN chiffré fictif
            pinBlock = "EncryptedPinBlock_Simulated";
        } else {
            auditLog.push(`[CVM] No PIN Required (Contactless/Low Amount)`);
        }

        // Étape 4: Construction du Message ISO 8583
        // Transformation des données en format standard bancaire
        const isoMessage = this.constructISOMessage(cardData, userInput, pinBlock);
        auditLog.push(`[PROTOCOL] ISO 8583 Message Built: MTI ${isoMessage.mti}`);

        return {
            preparationId: Math.random().toString(36).substring(2, 15),
            timestamp: new Date(),
            rawInput: userInput,
            cardData,
            isoMessage,
            riskAssessment: { ...riskCheck, auditTrace: auditLog }
        };
    }

    /**
     * Simule la lecture de la puce EMV ou de la piste magnétique
     */
    private async readCardData(): Promise<CardData> {
        // Simulation d'un délai matériel
        await new Promise(resolve => setTimeout(resolve, 800));

        // Retourne une carte de test par défaut
        // Amélioration possible : Lire depuis un store Zustand "Carte Insérée"
        return {
            pan: "4242424242424242",
            expiryDate: "12/28",
            holderName: "JEAN DUPONT",
            serviceCode: "101" // 1=Interchange, 0=Auth Normal, 1=Services
        };
    }

    /**
     * Exécute les vérifications de sécurité hors-ligne
     */
    private performLocalRiskChecks(card: CardData, input: UserInput): RiskResult {
        const trace: string[] = [];

        // Check 1: Luhn (Validité mathématique du PAN)
        if (!this.luhnCheck(card.pan)) {
            trace.push(`[RISK] FAIL: Luhn Check failed for PAN ends with ${card.pan.slice(-4)}`);
            return { isValid: false, reason: "Invalid Card Number (Luhn)", auditTrace: trace };
        }
        trace.push(`[RISK] PASS: Luhn Check OK`);

        // Check 2: Expiration
        if (this.isExpired(card.expiryDate)) {
            trace.push(`[RISK] FAIL: Card Expired (${card.expiryDate})`);
            return { isValid: false, reason: "Card Expired", auditTrace: trace };
        }
        trace.push(`[RISK] PASS: Expiry Check OK`);

        // Check 3: Plafond (Floor Limit) - Simulation
        // Exemple : Refus si > 5000€ en offline (règle arbitraire pour l'exercice)
        if (input.amount > 5000) {
            trace.push(`[RISK] FAIL: Amount exceeds local floor limit`);
            return { isValid: false, reason: "Amount too high", auditTrace: trace };
        }

        return { isValid: true, auditTrace: trace };
    }

    /**
     * Algorithme de Luhn standard pour validation de carte
     */
    private luhnCheck(pan: string): boolean {
        let sum = 0;
        let shouldDouble = false;
        // Parcours de droite à gauche
        for (let i = pan.length - 1; i >= 0; i--) {
            let digit = parseInt(pan.charAt(i));

            if (shouldDouble) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }

            sum += digit;
            shouldDouble = !shouldDouble;
        }
        return (sum % 10) === 0;
    }

    /**
     * Vérifie si la date (MM/YY) est passée
     */
    private isExpired(expiry: string): boolean {
        const [month, year] = expiry.split('/').map(Number);
        const now = new Date();
        // Année sur 2 digits, on assume 20xx
        const expDate = new Date(2000 + year, month, 0); // Dernier jour du mois
        return expDate < now;
    }

    /**
     * Détermine si le code PIN est nécessaire (CVM)
     */
    private requiresPin(amount: number): boolean {
        // Exemple simple : PIN requis au-dessus de 50.00 unités
        const CVM_LIMIT = 50.00;
        return amount > CVM_LIMIT;
    }

    private constructISOMessage(card: CardData, input: UserInput, pinBlock?: string): ISOMessage {
        const now = new Date();
        // Formatage MMDDhhmmss
        const transmissionDate = now.toISOString().replace(/[-:T]/g, '').slice(4, 14);

        return {
            mti: "0100", // Authorization Request
            processingCode: "000000", // Purchase
            // Format montant : 12 chiffres, cents inclus, padding 0 (ex: 10.50 -> 000000001050)
            amount: (input.amount * 100).toFixed(0).padStart(12, '0'),
            transmissionDate,
            auditNumber: Math.floor(Math.random() * 999999).toString().padStart(6, '0'),
            cardData: {
                pan: card.pan,
                expiry: card.expiryDate.replace('/', '') // MMYY
            },
            pinBlock
        };
    }

    private maskPan(pan: string): string {
        return `${pan.slice(0, 6)}******${pan.slice(-4)}`;
    }
}
