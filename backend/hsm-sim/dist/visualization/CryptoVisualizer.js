"use strict";
/**
 * CryptoVisualizer.ts
 *
 * Visualiseur pédagogique des opérations cryptographiques
 * Affiche étape par étape les transformations de données
 *
 * @educational Permet de comprendre visuellement les opérations crypto
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoVisualizer = void 0;
const events_1 = require("events");
class CryptoVisualizer extends events_1.EventEmitter {
    constructor(auditLogger) {
        super();
        this.sessions = new Map();
        this.currentSession = null;
        this.auditLogger = auditLogger;
    }
    // ========================
    // Session Management
    // ========================
    /**
     * Démarre une nouvelle session de visualisation
     */
    startSession(type, title) {
        const id = `vis_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.currentSession = {
            id,
            type,
            title,
            steps: [],
            startTime: new Date(),
            status: 'IN_PROGRESS',
        };
        this.sessions.set(id, this.currentSession);
        this.emit('sessionStart', { id, type, title });
        this.auditLogger.log('CRYPTO_VIS_START', { id, type, title });
        return id;
    }
    /**
     * Ajoute une étape à la session en cours
     */
    addStep(step) {
        if (!this.currentSession) {
            throw new Error('No active visualization session');
        }
        const fullStep = {
            ...step,
            stepNumber: this.currentSession.steps.length + 1,
        };
        this.currentSession.steps.push(fullStep);
        this.emit('step', fullStep);
    }
    /**
     * Termine la session en cours
     */
    endSession(status = 'COMPLETED') {
        if (!this.currentSession)
            return null;
        this.currentSession.endTime = new Date();
        this.currentSession.status = status;
        this.emit('sessionEnd', this.currentSession);
        this.auditLogger.log('CRYPTO_VIS_END', {
            id: this.currentSession.id,
            status,
            stepCount: this.currentSession.steps.length,
        });
        const session = this.currentSession;
        this.currentSession = null;
        return session;
    }
    // ========================
    // PIN Block Visualization
    // ========================
    /**
     * Visualise la création d'un PIN Block ISO 9564-1 Format 0
     */
    visualizePinBlockFormat0(pin, pan) {
        const sessionId = this.startSession('PIN_BLOCK', 'PIN Block ISO 9564-1 Format 0');
        // Étape 1: PIN padding
        const pinLength = pin.length.toString(16).toUpperCase();
        const paddedPin = pinLength + pin + 'F'.repeat(14 - pin.length);
        this.addStep({
            title: 'Préparation du PIN',
            description: 'Le PIN est converti en bloc de 8 octets avec padding',
            input: `PIN: ${pin} (${pin.length} digits)`,
            output: paddedPin,
            operation: `Length nibble (${pinLength}) + PIN + padding (F)`,
            educationalNote: 'Le nibble de longueur indique combien de digits sont réels vs padding',
            hexDump: this.formatHexDump(paddedPin),
        });
        // Étape 2: PAN block
        const pan12 = pan.slice(-13, -1);
        const panBlock = '0000' + pan12;
        this.addStep({
            title: 'Préparation du PAN',
            description: 'Les 12 derniers chiffres du PAN (sans check digit) sont utilisés',
            input: `PAN: ${pan.slice(0, 6)}******${pan.slice(-4)}`,
            output: panBlock,
            operation: '0000 + 12 rightmost PAN digits (excluding check)',
            educationalNote: 'Le PAN est utilisé pour "lier" le PIN à la carte spécifique',
            hexDump: this.formatHexDump(panBlock),
        });
        // Étape 3: XOR
        const clearBlock = this.xorHex(paddedPin, panBlock);
        this.addStep({
            title: 'XOR PIN ⊕ PAN',
            description: 'Le PIN block clair est obtenu par XOR des deux blocs',
            input: `PIN Block: ${paddedPin}\nPAN Block: ${panBlock}`,
            output: clearBlock,
            operation: 'XOR bit à bit',
            educationalNote: 'Le XOR avec le PAN masque le PIN - impossible de récupérer le PIN sans connaître le PAN',
            bitView: this.formatBitXor(paddedPin, panBlock, clearBlock),
        });
        // Étape 4: Résultat final
        this.addStep({
            title: 'PIN Block Final',
            description: 'Le bloc résultant sera chiffré avant transmission',
            input: 'Clear PIN Block',
            output: clearBlock,
            operation: 'Prêt pour chiffrement 3DES/AES',
            educationalNote: 'Ce bloc ne voyage JAMAIS en clair - il est toujours chiffré sous une clé (TPK ou ZPK)',
        });
        return this.endSession();
    }
    // ========================
    // MAC Visualization
    // ========================
    /**
     * Visualise le calcul d'un MAC Retail
     */
    visualizeRetailMac(message, key) {
        this.startSession('MAC_CALCULATION', 'Retail MAC (ISO 9797-1 Method 1)');
        // Étape 1: Padding du message
        const blockSize = 8; // DES block size
        const messageBytes = message.length / 2;
        const paddingNeeded = blockSize - (messageBytes % blockSize);
        const paddedMessage = message + '80' + '00'.repeat(paddingNeeded - 1);
        this.addStep({
            title: 'Padding ISO 7816-4',
            description: 'Le message est complété pour être multiple de 8 octets',
            input: `Message: ${message} (${messageBytes} bytes)`,
            output: paddedMessage,
            operation: 'Ajout 0x80 + 0x00... jusqu\'à 8 octets',
            educationalNote: 'Le padding 0x80 marque la fin des données réelles - les 0x00 complètent le bloc',
        });
        // Étape 2: Division en blocs
        const blocks = [];
        for (let i = 0; i < paddedMessage.length; i += 16) {
            blocks.push(paddedMessage.slice(i, i + 16));
        }
        this.addStep({
            title: 'Division en blocs',
            description: `Le message paddé est divisé en ${blocks.length} blocs de 8 octets`,
            input: paddedMessage,
            output: blocks.join(' | '),
            operation: `${blocks.length} × 8 bytes blocks`,
            educationalNote: 'Chaque bloc sera traité séquentiellement dans la chaîne CBC',
        });
        // Étape 3: CBC avec clé A
        this.addStep({
            title: 'Chaînage CBC (DES)',
            description: 'Chaque bloc est XORé avec le résultat précédent puis chiffré',
            input: `Blocs: ${blocks.join(', ')}`,
            output: '[intermediate_value]',
            operation: 'DES(Block[n] ⊕ Result[n-1], Key_A)',
            educationalNote: 'Le chaînage empêche les attaques par manipulation de blocs individuels',
        });
        // Étape 4: Triple DES final
        this.addStep({
            title: 'Triple DES Final',
            description: 'Le dernier bloc subit un triple DES complet',
            input: 'Dernier résultat CBC',
            output: '[MAC_8_bytes]',
            operation: 'DES(DES⁻¹(DES(last, Key_A), Key_B), Key_A)',
            educationalNote: 'Cette étape "retail" renforce la sécurité contre les attaques par extension',
        });
        // Résultat
        this.addStep({
            title: 'MAC Final',
            description: 'Le MAC de 8 octets authentifie le message',
            input: 'Message original',
            output: 'A1B2C3D4E5F6A7B8 (exemple)',
            operation: 'MAC prêt pour verification',
            educationalNote: 'Toute modification du message produit un MAC complètement différent',
        });
        return this.endSession();
    }
    // ========================
    // CVV Visualization  
    // ========================
    /**
     * Visualise la génération d'un CVV
     */
    visualizeCvvGeneration(pan, expiry, serviceCode) {
        this.startSession('CVV_GENERATION', 'CVV Generation (Visa Algorithm)');
        // Étape 1: Préparation des données
        const data = pan + expiry + serviceCode;
        const padded = data.padEnd(32, '0');
        this.addStep({
            title: 'Concaténation des données',
            description: 'PAN + Date expiration + Service Code',
            input: `PAN: ${pan.slice(0, 6)}***${pan.slice(-4)}\nExpiry: ${expiry}\nService: ${serviceCode}`,
            output: `${data.slice(0, 6)}...${data.slice(-4)}`,
            operation: 'Concaténation + padding zeros',
            educationalNote: 'Ces données sont liées à la carte physique - le CVV change si l\'une change',
        });
        // Étape 2: Division
        const block1 = padded.slice(0, 16);
        const block2 = padded.slice(16, 32);
        this.addStep({
            title: 'Division en 2 blocs',
            description: 'Les données sont divisées en 2 blocs de 8 octets',
            input: padded,
            output: `Block 1: ${block1}\nBlock 2: ${block2}`,
            operation: 'Split at 16 hex chars (8 bytes)',
        });
        // Étape 3: Chiffrement bloc 1
        this.addStep({
            title: 'Chiffrement Block 1',
            description: 'Le premier bloc est chiffré avec CVK-A',
            input: block1,
            output: '[encrypted_block_1]',
            operation: 'DES(Block1, CVK_A)',
            educationalNote: 'CVK (Card Verification Key) est une clé secrète de l\'émetteur',
        });
        // Étape 4: XOR avec bloc 2
        this.addStep({
            title: 'XOR avec Block 2',
            description: 'Le résultat chiffré est XORé avec le bloc 2',
            input: '[encrypted_block_1] ⊕ [block2]',
            output: '[xored_result]',
            operation: 'XOR bit à bit',
        });
        // Étape 5: Triple DES
        this.addStep({
            title: 'Triple DES',
            description: 'Chiffrement/Déchiffrement/Chiffrement avec CVK-A et CVK-B',
            input: '[xored_result]',
            output: '[triple_des_result]',
            operation: 'DES(DES⁻¹(DES(data, CVK_A), CVK_B), CVK_A)',
            educationalNote: 'Le triple DES avec 2 clés fournit ~112 bits de sécurité',
        });
        // Étape 6: Décimalisation
        this.addStep({
            title: 'Décimalisation',
            description: 'Extraction de 3 chiffres décimaux du résultat hex',
            input: '[triple_des_result] = A7B3C109...',
            output: 'CVV: 731 (exemple)',
            operation: '1ère passe: digits 0-9, 2ème passe: A→0, B→1...',
            educationalNote: 'Seuls 3 digits sont gardés - suffisant pour 1000 possibilités',
        });
        return this.endSession();
    }
    // ========================
    // Key Derivation Visualization
    // ========================
    /**
     * Visualise la dérivation DUKPT
     */
    visualizeDukptDerivation(bdk, ksn) {
        this.startSession('KEY_DERIVATION', 'DUKPT Key Derivation');
        // Étape 1: Extraction IKSN
        const iksn = ksn.slice(0, 16) + '00000';
        this.addStep({
            title: 'Initial Key Serial Number (IKSN)',
            description: 'Extraction de l\'identifiant unique initial',
            input: `KSN: ${ksn}`,
            output: `IKSN: ${iksn}`,
            operation: 'Mask transaction counter to zero',
            educationalNote: 'L\'IKSN identifie le terminal de manière unique',
        });
        // Étape 2: Calcul IPEK
        this.addStep({
            title: 'Initial PIN Encryption Key (IPEK)',
            description: 'Dérivation de la première clé pour ce terminal',
            input: `BDK: ${bdk.slice(0, 8)}...****\nIKSN: ${iksn}`,
            output: '[IPEK]',
            operation: '3DES(IKSN, BDK) || 3DES(IKSN XOR C0C0..., BDK XOR C0C0...)',
            educationalNote: 'L\'IPEK est injectée dans le terminal - la BDK reste chez l\'émetteur',
        });
        // Étape 3: Compteur de transactions
        const counter = parseInt(ksn.slice(-5), 16);
        const counterBits = counter.toString(2).padStart(21, '0');
        this.addStep({
            title: 'Transaction Counter',
            description: 'Le compteur détermine quelle clé utiliser',
            input: `KSN Counter: ${ksn.slice(-5)}`,
            output: `Counter: ${counter}\nBinary: ${counterBits}`,
            operation: 'Extraction des 21 bits de compteur',
            educationalNote: 'Chaque bit à 1 déclenche une dérivation (jusqu\'à 21 niveaux)',
        });
        // Étape 4: Dérivation récursive
        this.addStep({
            title: 'Dérivation récursive',
            description: 'Pour chaque bit à 1, une dérivation est effectuée',
            input: 'IPEK + Counter bits',
            output: '[Derived Key]',
            operation: 'Pour chaque bit i=1: Key[i] = 3DES(Register, Key[i-1])',
            educationalNote: '2^21 = ~2 million de clés possibles par terminal',
        });
        // Étape 5: Clé finale
        this.addStep({
            title: 'Clé de Transaction',
            description: 'La clé finale pour cette transaction spécifique',
            input: '[Derived Key] + variant mask',
            output: '[Transaction PIN Key]',
            operation: 'XOR avec mask selon usage (PIN, MAC, Data)',
            educationalNote: 'Cette clé n\'est utilisable que pour cette seule transaction',
        });
        return this.endSession();
    }
    // ========================
    // Utilities
    // ========================
    xorHex(a, b) {
        let result = '';
        for (let i = 0; i < a.length && i < b.length; i++) {
            const xored = parseInt(a[i], 16) ^ parseInt(b[i], 16);
            result += xored.toString(16).toUpperCase();
        }
        return result;
    }
    formatHexDump(hex) {
        let dump = '';
        for (let i = 0; i < hex.length; i += 2) {
            dump += hex.slice(i, i + 2) + ' ';
            if ((i + 2) % 16 === 0)
                dump += '\n';
        }
        return dump.trim();
    }
    formatBitXor(a, b, result) {
        const aBin = parseInt(a, 16).toString(2).padStart(a.length * 4, '0');
        const bBin = parseInt(b, 16).toString(2).padStart(b.length * 4, '0');
        const rBin = parseInt(result, 16).toString(2).padStart(result.length * 4, '0');
        return `A: ${aBin.slice(0, 32)}...\nB: ${bBin.slice(0, 32)}...\n   ${'─'.repeat(32)}\nR: ${rBin.slice(0, 32)}...`;
    }
    // ========================
    // Getters
    // ========================
    getSession(id) {
        return this.sessions.get(id);
    }
    getAllSessions() {
        return Array.from(this.sessions.values());
    }
    getCurrentSession() {
        return this.currentSession;
    }
    /**
     * Formate une session pour affichage console
     */
    formatForConsole(session) {
        let output = `\n${'═'.repeat(60)}\n`;
        output += `  ${session.title}\n`;
        output += `  Type: ${session.type}\n`;
        output += `${'═'.repeat(60)}\n\n`;
        for (const step of session.steps) {
            output += `┌─ Étape ${step.stepNumber}: ${step.title}\n`;
            output += `│  ${step.description}\n`;
            output += `│\n`;
            output += `│  📥 Input:  ${step.input.split('\n').join('\n│            ')}\n`;
            output += `│  ⚙️  Op:     ${step.operation}\n`;
            output += `│  📤 Output: ${step.output}\n`;
            if (step.educationalNote) {
                output += `│\n`;
                output += `│  💡 ${step.educationalNote}\n`;
            }
            if (step.hexDump) {
                output += `│\n│  Hex:\n`;
                step.hexDump.split('\n').forEach(line => {
                    output += `│    ${line}\n`;
                });
            }
            output += `└${'─'.repeat(58)}\n\n`;
        }
        return output;
    }
}
exports.CryptoVisualizer = CryptoVisualizer;
