/**
 * DisplaySimulator.ts
 * 
 * Simulation d'un écran LCD de terminal HSM/TPE
 * Affiche les messages, PIN masqué, montants, et statuts
 * 
 * @educational Simule l'écran LCD d'un terminal de paiement
 * avec gestion multi-lignes et caractères spéciaux
 */

import { EventEmitter } from 'events';
import { AuditLogger } from '../core/AuditLogger';

// Configuration écran LCD standard
export interface DisplayConfig {
    rows: number;          // Nombre de lignes (typiquement 2 ou 4)
    columns: number;       // Nombre de colonnes (typiquement 16 ou 20)
    backlight: boolean;    // Rétroéclairage
    contrast: number;      // Contraste (0-100)
    charset: 'ASCII' | 'EXTENDED' | 'CUSTOM';
}

// Types d'affichage
export type DisplayMode =
    | 'IDLE'           // Écran de veille
    | 'PIN_ENTRY'      // Saisie PIN (masqué)
    | 'AMOUNT'         // Affichage montant
    | 'MESSAGE'        // Message texte
    | 'MENU'           // Menu de sélection
    | 'STATUS'         // Statut transaction
    | 'ERROR'          // Message d'erreur
    | 'WELCOME'        // Message d'accueil
    | 'PROCESSING';    // En cours de traitement

// Caractères spéciaux LCD
export const LCD_CHARS = {
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

// Frame d'affichage
export interface DisplayFrame {
    lines: string[];
    mode: DisplayMode;
    timestamp: Date;
    blinkingPositions?: { row: number; col: number }[];
    cursorPosition?: { row: number; col: number };
}

// Animation prédéfinie
export interface DisplayAnimation {
    name: string;
    frames: string[][];
    frameDelayMs: number;
    loop: boolean;
}

export class DisplaySimulator extends EventEmitter {
    private config: DisplayConfig;
    private currentFrame: DisplayFrame;
    private auditLogger: AuditLogger;
    private animationTimer: NodeJS.Timeout | null = null;
    private backlightTimer: NodeJS.Timeout | null = null;
    private history: DisplayFrame[] = [];
    private readonly MAX_HISTORY = 100;

    // Animations prédéfinies
    private readonly ANIMATIONS: Record<string, DisplayAnimation> = {
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

    constructor(auditLogger: AuditLogger, config?: Partial<DisplayConfig>) {
        super();
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
    showMessage(lines: string[], mode: DisplayMode = 'MESSAGE'): void {
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
    showPinEntry(digitCount: number = 0, maxDigits: number = 4): void {
        this.stopAnimation();

        const masked = LCD_CHARS.MASKED.repeat(digitCount);
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
    showAmount(amountCents: number, currency: string = 'EUR'): void {
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
    showAmountEntry(digits: string): void {
        this.stopAnimation();

        // Format: 0.00 €
        const padded = digits.padStart(3, '0');
        const euros = padded.slice(0, -2) || '0';
        const cents = padded.slice(-2);
        const formatted = `${euros}.${cents} €`;

        this.currentFrame = {
            lines: this.formatLines([
                'Montant:',
                formatted.padStart(this.config.columns - 1) + LCD_CHARS.CURSOR,
            ]),
            mode: 'AMOUNT',
            timestamp: new Date(),
        };

        this.emitDisplay();
    }

    /**
     * Affiche un menu de sélection
     */
    showMenu(title: string, options: string[], selectedIndex: number = 0): void {
        this.stopAnimation();

        const lines: string[] = [];

        if (this.config.rows >= 4) {
            lines.push(this.centerText(title));
            lines.push('-'.repeat(this.config.columns));

            for (let i = 0; i < Math.min(options.length, 2); i++) {
                const prefix = i === selectedIndex ? LCD_CHARS.ARROW_RIGHT : ' ';
                lines.push(`${prefix} ${options[i]}`.slice(0, this.config.columns));
            }
        } else {
            // Écran 2 lignes: affiche titre + option sélectionnée
            lines.push(title.slice(0, this.config.columns));
            lines.push(`${LCD_CHARS.ARROW_RIGHT} ${options[selectedIndex]}`.slice(0, this.config.columns));
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
    showStatus(status: 'APPROVED' | 'DECLINED' | 'ERROR' | 'PROCESSING', details?: string): void {
        const statusMessages: Record<string, string[]> = {
            APPROVED: ['TRANSACTION', 'APPROUVÉE ✓'],
            DECLINED: ['TRANSACTION', 'REFUSÉE ✗'],
            ERROR: ['ERREUR', details || 'Réessayez'],
            PROCESSING: ['TRAITEMENT', 'En cours...'],
        };

        const mode: DisplayMode = status === 'ERROR' ? 'ERROR' : 'STATUS';
        this.showMessage(statusMessages[status], mode);

        // Animation pour processing
        if (status === 'PROCESSING') {
            this.startAnimation('processing');
        }
    }

    /**
     * Affiche le code de réponse avec description
     */
    showResponseCode(code: string, description: string): void {
        this.stopAnimation();

        const isApproved = code === '00';
        const icon = isApproved ? LCD_CHARS.CHECK : LCD_CHARS.CROSS;

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
    showError(message: string, code?: string): void {
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
    showWelcome(): void {
        this.showMessage([
            this.centerText('Bienvenue'),
            this.centerText('Insérez carte'),
        ], 'WELCOME');
    }

    /**
     * Affiche l'écran de veille
     */
    showIdle(): void {
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
    startAnimation(name: string): void {
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
                } else {
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
    stopAnimation(): void {
        if (this.animationTimer) {
            clearTimeout(this.animationTimer);
            this.animationTimer = null;
        }
    }

    /**
     * Efface l'écran
     */
    clear(): void {
        this.stopAnimation();
        this.currentFrame = this.createEmptyFrame('IDLE');
        this.emitDisplay();
    }

    /**
     * Active/désactive le rétroéclairage
     */
    setBacklight(enabled: boolean, autoOffSeconds?: number): void {
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
    setContrast(value: number): void {
        this.config.contrast = Math.max(0, Math.min(100, value));
        this.emit('contrastChange', { value: this.config.contrast });
    }

    // ========================
    // Getters
    // ========================

    getCurrentFrame(): DisplayFrame {
        return { ...this.currentFrame };
    }

    getConfig(): DisplayConfig {
        return { ...this.config };
    }

    getHistory(): DisplayFrame[] {
        return [...this.history];
    }

    /**
     * Retourne l'affichage formaté pour console (debug)
     */
    getConsoleOutput(): string {
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
    getRenderState(): {
        lines: string[];
        mode: DisplayMode;
        backlight: boolean;
        contrast: number;
        cursorPosition?: { row: number; col: number };
    } {
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

    private createEmptyFrame(mode: DisplayMode): DisplayFrame {
        return {
            lines: Array(this.config.rows).fill(' '.repeat(this.config.columns)),
            mode,
            timestamp: new Date(),
        };
    }

    private formatLines(lines: string[]): string[] {
        const formatted: string[] = [];

        for (let i = 0; i < this.config.rows; i++) {
            const line = lines[i] || '';
            formatted.push(line.slice(0, this.config.columns).padEnd(this.config.columns));
        }

        return formatted;
    }

    private centerText(text: string): string {
        const trimmed = text.slice(0, this.config.columns);
        const padding = Math.floor((this.config.columns - trimmed.length) / 2);
        return ' '.repeat(padding) + trimmed + ' '.repeat(this.config.columns - padding - trimmed.length);
    }

    private emitDisplay(): void {
        this.emit('display', this.getRenderState());
    }

    private saveToHistory(): void {
        this.history.push({ ...this.currentFrame });

        if (this.history.length > this.MAX_HISTORY) {
            this.history.shift();
        }
    }

    /**
     * Dispose du simulateur
     */
    dispose(): void {
        this.stopAnimation();
        if (this.backlightTimer) {
            clearTimeout(this.backlightTimer);
        }
        this.removeAllListeners();
    }
}
