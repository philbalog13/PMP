"use strict";
/**
 * DisplaySimulator.ts
 *
 * Simulation d'un écran LCD de terminal HSM/TPE
 * Affiche les messages, PIN masqué, montants, et statuts
 *
 * @educational Simule l'écran LCD d'un terminal de paiement
 * avec gestion multi-lignes et caractères spéciaux
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisplaySimulator = exports.LCD_CHARS = void 0;
const events_1 = require("events");
// Caractères spéciaux LCD
exports.LCD_CHARS = {
    CURSOR: '█',
    MASKED: '*',
    ARROW_RIGHT: '→',
    ARROW_LEFT: '←',
    ARROW_UP: '↑',
    ARROW_DOWN: '↓',
    CHECK: '✓',
    CROSS: '✗',
    EURO: '€',
    CARD: '💳',
    LOCK: '🔒',
    UNLOCK: '🔓',
    HOURGLASS: '⏳',
    OK: '✅',
    ERROR: '❌',
};
class DisplaySimulator extends events_1.EventEmitter {
    constructor(auditLogger, config) {
        super();
        this.animationTimer = null;
        this.backlightTimer = null;
        this.history = [];
        this.MAX_HISTORY = 100;
        // Animations prédéfinies
        this.ANIMATIONS = {
            processing: {
                name: 'processing',
                frames: [
                    ['En cours...    ', '|              '],
                    ['En cours...    ', '/              '],
                    ['En cours...    ', '-              '],
                    ['En cours...    ', '\\              '],
                ],
                frameDelayMs: 200,
                loop: true,
            },
            success: {
                name: 'success',
                frames: [
                    ['                ', '       ✓        '],
                    ['   APPROUVÉ     ', '       ✓        '],
                ],
                frameDelayMs: 500,
                loop: false,
            },
            error: {
                name: 'error',
                frames: [
                    ['                ', '       ✗        '],
                    ['    REFUSÉ      ', '       ✗        '],
                ],
                frameDelayMs: 500,
                loop: false,
            },
            cardRead: {
                name: 'cardRead',
                frames: [
                    ['Insérez carte   ', '    💳→[    ]   '],
                    ['Lecture...      ', '    💳→[█   ]   '],
                    ['Lecture...      ', '    💳→[██  ]   '],
                    ['Lecture...      ', '    💳→[███ ]   '],
                    ['Lecture...      ', '    💳→[████]   '],
                    ['Carte lue       ', '       ✓        '],
                ],
                frameDelayMs: 300,
                loop: false,
            },
        };
        this.auditLogger = auditLogger;
        this.config = {
            rows: 2,
            columns: 16,
            backlight: true,
            contrast: 80,
            charset: 'EXTENDED',
            ...config,
        };
        this.currentFrame = this.createEmptyFrame('IDLE');
        this.showWelcome();
    }
    // ========================
    // API Publique
    // ========================
    /**
     * Affiche un message sur une ou plusieurs lignes
     */
    showMessage(lines, mode = 'MESSAGE') {
        this.stopAnimation();
        const formattedLines = this.formatLines(lines);
        this.currentFrame = {
            lines: formattedLines,
            mode,
            timestamp: new Date(),
        };
        this.emitDisplay();
        this.saveToHistory();
        this.auditLogger.log('DISPLAY_MESSAGE', {
            mode,
            lines: formattedLines,
        });
    }
    /**
     * Affiche l'écran de saisie PIN
     */
    showPinEntry(digitCount = 0, maxDigits = 4) {
        this.stopAnimation();
        const masked = exports.LCD_CHARS.MASKED.repeat(digitCount);
        const remaining = '_'.repeat(maxDigits - digitCount);
        const pinDisplay = masked + remaining;
        this.currentFrame = {
            lines: this.formatLines([
                'Entrez votre PIN',
                `    ${pinDisplay}    `,
            ]),
            mode: 'PIN_ENTRY',
            timestamp: new Date(),
            cursorPosition: { row: 1, col: 4 + digitCount },
        };
        this.emitDisplay();
        this.saveToHistory();
    }
    /**
     * Affiche un montant formaté
     */
    showAmount(amountCents, currency = 'EUR') {
        this.stopAnimation();
        const euros = Math.floor(amountCents / 100);
        const cents = amountCents % 100;
        const formatted = `${euros}.${cents.toString().padStart(2, '0')} ${currency === 'EUR' ? '€' : currency}`;
        this.currentFrame = {
            lines: this.formatLines([
                'MONTANT:',
                formatted.padStart(this.config.columns),
            ]),
            mode: 'AMOUNT',
            timestamp: new Date(),
        };
        this.emitDisplay();
        this.saveToHistory();
    }
    /**
     * Affiche le montant en cours de saisie
     */
    showAmountEntry(digits) {
        this.stopAnimation();
        // Format: 0.00 €
        const padded = digits.padStart(3, '0');
        const euros = padded.slice(0, -2) || '0';
        const cents = padded.slice(-2);
        const formatted = `${euros}.${cents} €`;
        this.currentFrame = {
            lines: this.formatLines([
                'Montant:',
                formatted.padStart(this.config.columns - 1) + exports.LCD_CHARS.CURSOR,
            ]),
            mode: 'AMOUNT',
            timestamp: new Date(),
        };
        this.emitDisplay();
    }
    /**
     * Affiche un menu de sélection
     */
    showMenu(title, options, selectedIndex = 0) {
        this.stopAnimation();
        const lines = [];
        if (this.config.rows >= 4) {
            lines.push(this.centerText(title));
            lines.push('-'.repeat(this.config.columns));
            for (let i = 0; i < Math.min(options.length, 2); i++) {
                const prefix = i === selectedIndex ? exports.LCD_CHARS.ARROW_RIGHT : ' ';
                lines.push(`${prefix} ${options[i]}`.slice(0, this.config.columns));
            }
        }
        else {
            // Écran 2 lignes: affiche titre + option sélectionnée
            lines.push(title.slice(0, this.config.columns));
            lines.push(`${exports.LCD_CHARS.ARROW_RIGHT} ${options[selectedIndex]}`.slice(0, this.config.columns));
        }
        this.currentFrame = {
            lines: this.formatLines(lines),
            mode: 'MENU',
            timestamp: new Date(),
        };
        this.emitDisplay();
        this.saveToHistory();
    }
    /**
     * Affiche un statut de transaction
     */
    showStatus(status, details) {
        const statusMessages = {
            APPROVED: ['TRANSACTION', 'APPROUVÉE ✓'],
            DECLINED: ['TRANSACTION', 'REFUSÉE ✗'],
            ERROR: ['ERREUR', details || 'Réessayez'],
            PROCESSING: ['TRAITEMENT', 'En cours...'],
        };
        const mode = status === 'ERROR' ? 'ERROR' : 'STATUS';
        this.showMessage(statusMessages[status], mode);
        // Animation pour processing
        if (status === 'PROCESSING') {
            this.startAnimation('processing');
        }
    }
    /**
     * Affiche le code de réponse avec description
     */
    showResponseCode(code, description) {
        this.stopAnimation();
        const isApproved = code === '00';
        const icon = isApproved ? exports.LCD_CHARS.CHECK : exports.LCD_CHARS.CROSS;
        this.currentFrame = {
            lines: this.formatLines([
                `Code: ${code} ${icon}`,
                description.slice(0, this.config.columns),
            ]),
            mode: isApproved ? 'STATUS' : 'ERROR',
            timestamp: new Date(),
        };
        this.emitDisplay();
        this.saveToHistory();
    }
    /**
     * Affiche une erreur
     */
    showError(message, code) {
        this.stopAnimation();
        const lines = code
            ? [`ERREUR ${code}`, message]
            : ['ERREUR', message];
        this.currentFrame = {
            lines: this.formatLines(lines),
            mode: 'ERROR',
            timestamp: new Date(),
        };
        this.emitDisplay();
        this.saveToHistory();
        this.auditLogger.log('DISPLAY_ERROR', { message, code });
    }
    /**
     * Affiche l'écran d'accueil
     */
    showWelcome() {
        this.showMessage([
            this.centerText('Bienvenue'),
            this.centerText('Insérez carte'),
        ], 'WELCOME');
    }
    /**
     * Affiche l'écran de veille
     */
    showIdle() {
        const now = new Date();
        const time = now.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        this.showMessage([
            this.centerText('PMP Terminal'),
            this.centerText(time),
        ], 'IDLE');
    }
    /**
     * Démarre une animation prédéfinie
     */
    startAnimation(name) {
        const animation = this.ANIMATIONS[name];
        if (!animation) {
            this.auditLogger.log('DISPLAY_ANIMATION_NOT_FOUND', { name });
            return;
        }
        this.stopAnimation();
        let frameIndex = 0;
        const animate = () => {
            this.currentFrame = {
                lines: this.formatLines(animation.frames[frameIndex]),
                mode: 'PROCESSING',
                timestamp: new Date(),
            };
            this.emitDisplay();
            frameIndex++;
            if (frameIndex >= animation.frames.length) {
                if (animation.loop) {
                    frameIndex = 0;
                }
                else {
                    this.stopAnimation();
                    return;
                }
            }
            this.animationTimer = setTimeout(animate, animation.frameDelayMs);
        };
        animate();
        this.auditLogger.log('DISPLAY_ANIMATION_START', { name });
    }
    /**
     * Arrête l'animation en cours
     */
    stopAnimation() {
        if (this.animationTimer) {
            clearTimeout(this.animationTimer);
            this.animationTimer = null;
        }
    }
    /**
     * Efface l'écran
     */
    clear() {
        this.stopAnimation();
        this.currentFrame = this.createEmptyFrame('IDLE');
        this.emitDisplay();
    }
    /**
     * Active/désactive le rétroéclairage
     */
    setBacklight(enabled, autoOffSeconds) {
        this.config.backlight = enabled;
        if (this.backlightTimer) {
            clearTimeout(this.backlightTimer);
            this.backlightTimer = null;
        }
        if (enabled && autoOffSeconds) {
            this.backlightTimer = setTimeout(() => {
                this.setBacklight(false);
            }, autoOffSeconds * 1000);
        }
        this.emit('backlightChange', { enabled });
    }
    /**
     * Définit le contraste
     */
    setContrast(value) {
        this.config.contrast = Math.max(0, Math.min(100, value));
        this.emit('contrastChange', { value: this.config.contrast });
    }
    // ========================
    // Getters
    // ========================
    getCurrentFrame() {
        return { ...this.currentFrame };
    }
    getConfig() {
        return { ...this.config };
    }
    getHistory() {
        return [...this.history];
    }
    /**
     * Retourne l'affichage formaté pour console (debug)
     */
    getConsoleOutput() {
        const border = '┌' + '─'.repeat(this.config.columns + 2) + '┐';
        const bottom = '└' + '─'.repeat(this.config.columns + 2) + '┘';
        let output = border + '\n';
        for (const line of this.currentFrame.lines) {
            output += '│ ' + line + ' │\n';
        }
        output += bottom;
        return output;
    }
    /**
     * Retourne l'état pour rendu React/Vue
     */
    getRenderState() {
        return {
            lines: this.currentFrame.lines,
            mode: this.currentFrame.mode,
            backlight: this.config.backlight,
            contrast: this.config.contrast,
            cursorPosition: this.currentFrame.cursorPosition,
        };
    }
    // ========================
    // Méthodes Privées
    // ========================
    createEmptyFrame(mode) {
        return {
            lines: Array(this.config.rows).fill(' '.repeat(this.config.columns)),
            mode,
            timestamp: new Date(),
        };
    }
    formatLines(lines) {
        const formatted = [];
        for (let i = 0; i < this.config.rows; i++) {
            const line = lines[i] || '';
            formatted.push(line.slice(0, this.config.columns).padEnd(this.config.columns));
        }
        return formatted;
    }
    centerText(text) {
        const trimmed = text.slice(0, this.config.columns);
        const padding = Math.floor((this.config.columns - trimmed.length) / 2);
        return ' '.repeat(padding) + trimmed + ' '.repeat(this.config.columns - padding - trimmed.length);
    }
    emitDisplay() {
        this.emit('display', this.getRenderState());
    }
    saveToHistory() {
        this.history.push({ ...this.currentFrame });
        if (this.history.length > this.MAX_HISTORY) {
            this.history.shift();
        }
    }
    /**
     * Dispose du simulateur
     */
    dispose() {
        this.stopAnimation();
        if (this.backlightTimer) {
            clearTimeout(this.backlightTimer);
        }
        this.removeAllListeners();
    }
}
exports.DisplaySimulator = DisplaySimulator;
