/**
 * ButtonSimulator.ts
 * 
 * Simulation des boutons physiques d'un HSM/TPE
 * Permet de simuler l'interaction utilisateur (PIN pad, touches fonction)
 * 
 * @educational Ce module simule l'interface physique d'un terminal
 * de paiement ou HSM avec gestion d'événements
 */

import { EventEmitter } from 'events';
import { AuditLogger } from '../core/AuditLogger';

// Types de boutons disponibles
export type ButtonType =
    | 'NUMERIC'    // 0-9
    | 'ENTER'      // Validation
    | 'CANCEL'     // Annulation
    | 'CLEAR'      // Effacement
    | 'FUNCTION'   // F1-F4
    | 'MENU'       // Menu principal
    | 'UP'         // Navigation haut
    | 'DOWN'       // Navigation bas
    | 'BACKSPACE'; // Retour arrière

export interface ButtonEvent {
    type: ButtonType;
    key: string;
    timestamp: Date;
    duration?: number; // Durée de pression en ms
    isLongPress?: boolean;
}

export interface ButtonConfig {
    debounceMs: number;      // Anti-rebond
    longPressMs: number;     // Durée avant long press
    timeoutMs: number;       // Timeout d'inactivité
    maskedInput: boolean;    // Masquer la saisie (PIN)
    maxDigits: number;       // Nombre max de digits
}

export interface InputBuffer {
    content: string;
    masked: string;
    type: 'PIN' | 'AMOUNT' | 'TEXT' | 'MENU';
    startTime: Date;
    lastKeyTime: Date;
}

// États du simulateur
export type ButtonSimulatorState =
    | 'IDLE'
    | 'AWAITING_INPUT'
    | 'PIN_ENTRY'
    | 'AMOUNT_ENTRY'
    | 'MENU_SELECTION'
    | 'PROCESSING'
    | 'LOCKED'
    | 'TAMPERED';

export class ButtonSimulator extends EventEmitter {
    private state: ButtonSimulatorState = 'IDLE';
    private config: ButtonConfig;
    private inputBuffer: InputBuffer | null = null;
    private auditLogger: AuditLogger;
    private lastButtonTime: Date = new Date();
    private pressStartTime: Date | null = null;
    private timeoutHandle: NodeJS.Timeout | null = null;
    private lockoutUntil: Date | null = null;
    private failedAttempts: number = 0;
    private readonly MAX_FAILED_ATTEMPTS = 3;
    private readonly LOCKOUT_DURATION_MS = 30000; // 30 secondes

    constructor(auditLogger: AuditLogger, config?: Partial<ButtonConfig>) {
        super();
        this.auditLogger = auditLogger;
        this.config = {
            debounceMs: 50,
            longPressMs: 1000,
            timeoutMs: 30000,
            maskedInput: false,
            maxDigits: 16,
            ...config
        };
    }

    // ========================
    // API Publique
    // ========================

    /**
     * Démarre une session de saisie PIN
     */
    startPinEntry(minDigits: number = 4, maxDigits: number = 6): void {
        if (this.isLocked()) {
            this.emit('error', { code: 'LOCKED', message: 'Device is locked' });
            return;
        }

        this.state = 'PIN_ENTRY';
        this.inputBuffer = {
            content: '',
            masked: '',
            type: 'PIN',
            startTime: new Date(),
            lastKeyTime: new Date()
        };
        this.config.maskedInput = true;
        this.config.maxDigits = maxDigits;

        this.startTimeout();
        this.emit('pinEntryStarted', { minDigits, maxDigits });
        this.auditLogger.log('BUTTON_PIN_START', { minDigits, maxDigits });
    }

    /**
     * Démarre une session de saisie montant
     */
    startAmountEntry(maxDigits: number = 12): void {
        if (this.isLocked()) {
            this.emit('error', { code: 'LOCKED', message: 'Device is locked' });
            return;
        }

        this.state = 'AMOUNT_ENTRY';
        this.inputBuffer = {
            content: '',
            masked: '',
            type: 'AMOUNT',
            startTime: new Date(),
            lastKeyTime: new Date()
        };
        this.config.maskedInput = false;
        this.config.maxDigits = maxDigits;

        this.startTimeout();
        this.emit('amountEntryStarted', { maxDigits });
        this.auditLogger.log('BUTTON_AMOUNT_START', { maxDigits });
    }

    /**
     * Simule une pression de touche numérique (0-9)
     */
    simulateKeyPress(key: string): void {
        if (!this.canAcceptInput()) return;

        // Vérification anti-rebond
        const now = new Date();
        if (now.getTime() - this.lastButtonTime.getTime() < this.config.debounceMs) {
            return;
        }
        this.lastButtonTime = now;

        // Vérification que c'est un digit
        if (!/^[0-9]$/.test(key)) {
            this.emit('invalidKey', { key });
            return;
        }

        const event: ButtonEvent = {
            type: 'NUMERIC',
            key,
            timestamp: now
        };

        // Ajoute au buffer si pas plein
        if (this.inputBuffer && this.inputBuffer.content.length < this.config.maxDigits) {
            this.inputBuffer.content += key;
            this.inputBuffer.masked += '*';
            this.inputBuffer.lastKeyTime = now;

            this.refreshTimeout();
            this.emit('keyPressed', event);
            this.emit('inputChanged', {
                length: this.inputBuffer.content.length,
                masked: this.inputBuffer.masked,
                type: this.inputBuffer.type
            });

            this.auditLogger.log('BUTTON_KEY', {
                type: 'NUMERIC',
                bufferLength: this.inputBuffer.content.length,
                masked: true
            });
        }
    }

    /**
     * Simule la touche ENTER (validation)
     */
    simulateEnter(): void {
        if (!this.canAcceptInput()) return;

        const now = new Date();
        const event: ButtonEvent = {
            type: 'ENTER',
            key: 'ENTER',
            timestamp: now
        };

        this.clearTimeout();
        this.emit('keyPressed', event);

        if (this.inputBuffer) {
            const result = {
                content: this.inputBuffer.content,
                type: this.inputBuffer.type,
                duration: now.getTime() - this.inputBuffer.startTime.getTime()
            };

            this.auditLogger.log('BUTTON_ENTER', {
                type: this.inputBuffer.type,
                contentLength: this.inputBuffer.content.length,
                durationMs: result.duration
            });

            this.emit('inputComplete', result);

            // Réinitialise après validation
            this.state = 'IDLE';
            this.inputBuffer = null;
        }
    }

    /**
     * Simule la touche CANCEL (annulation)
     */
    simulateCancel(): void {
        const now = new Date();
        const event: ButtonEvent = {
            type: 'CANCEL',
            key: 'CANCEL',
            timestamp: now
        };

        this.clearTimeout();
        this.emit('keyPressed', event);

        const hadInput = this.inputBuffer !== null;

        this.auditLogger.log('BUTTON_CANCEL', {
            hadInput,
            previousState: this.state
        });

        this.emit('inputCancelled', {
            reason: 'USER_CANCEL',
            hadPartialInput: hadInput
        });

        // Réinitialise
        this.state = 'IDLE';
        this.inputBuffer = null;
    }

    /**
     * Simule la touche CLEAR (effacement complet)
     */
    simulateClear(): void {
        if (!this.canAcceptInput()) return;

        const event: ButtonEvent = {
            type: 'CLEAR',
            key: 'CLEAR',
            timestamp: new Date()
        };

        if (this.inputBuffer) {
            this.inputBuffer.content = '';
            this.inputBuffer.masked = '';
            this.refreshTimeout();
        }

        this.emit('keyPressed', event);
        this.emit('inputCleared');
        this.auditLogger.log('BUTTON_CLEAR');
    }

    /**
     * Simule la touche BACKSPACE (effacement dernier caractère)
     */
    simulateBackspace(): void {
        if (!this.canAcceptInput()) return;

        const event: ButtonEvent = {
            type: 'BACKSPACE',
            key: 'BACKSPACE',
            timestamp: new Date()
        };

        if (this.inputBuffer && this.inputBuffer.content.length > 0) {
            this.inputBuffer.content = this.inputBuffer.content.slice(0, -1);
            this.inputBuffer.masked = this.inputBuffer.masked.slice(0, -1);
            this.refreshTimeout();

            this.emit('keyPressed', event);
            this.emit('inputChanged', {
                length: this.inputBuffer.content.length,
                masked: this.inputBuffer.masked,
                type: this.inputBuffer.type
            });

            this.auditLogger.log('BUTTON_BACKSPACE', {
                newLength: this.inputBuffer.content.length
            });
        }
    }

    /**
     * Simule les touches de fonction (F1-F4)
     */
    simulateFunctionKey(key: 'F1' | 'F2' | 'F3' | 'F4'): void {
        const event: ButtonEvent = {
            type: 'FUNCTION',
            key,
            timestamp: new Date()
        };

        this.emit('keyPressed', event);
        this.emit('functionKey', { key });
        this.auditLogger.log('BUTTON_FUNCTION', { key });
    }

    /**
     * Simule les touches de navigation (UP/DOWN)
     */
    simulateNavigation(direction: 'UP' | 'DOWN'): void {
        const event: ButtonEvent = {
            type: direction,
            key: direction,
            timestamp: new Date()
        };

        this.emit('keyPressed', event);
        this.emit('navigation', { direction });
        this.auditLogger.log('BUTTON_NAV', { direction });
    }

    /**
     * Simule un appui long (pour fonctions spéciales)
     */
    simulateLongPress(key: string, durationMs: number = 2000): void {
        const event: ButtonEvent = {
            type: 'NUMERIC',
            key,
            timestamp: new Date(),
            duration: durationMs,
            isLongPress: true
        };

        this.emit('longPress', event);
        this.auditLogger.log('BUTTON_LONG_PRESS', { key, durationMs });
    }

    /**
     * Verrouille le simulateur (après échecs multiples)
     */
    lock(reason: string = 'MANUAL'): void {
        this.state = 'LOCKED';
        this.lockoutUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MS);
        this.clearTimeout();

        this.emit('locked', {
            reason,
            until: this.lockoutUntil,
            failedAttempts: this.failedAttempts
        });

        this.auditLogger.log('BUTTON_LOCKED', {
            reason,
            lockoutUntil: this.lockoutUntil.toISOString()
        });
    }

    /**
     * Déverrouille le simulateur
     */
    unlock(): void {
        this.state = 'IDLE';
        this.lockoutUntil = null;
        this.failedAttempts = 0;

        this.emit('unlocked');
        this.auditLogger.log('BUTTON_UNLOCKED');
    }

    /**
     * Signale un échec de validation (incrément compteur)
     */
    recordFailedAttempt(): void {
        this.failedAttempts++;

        if (this.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
            this.lock('MAX_ATTEMPTS_EXCEEDED');
        }

        this.emit('failedAttempt', {
            count: this.failedAttempts,
            maxAttempts: this.MAX_FAILED_ATTEMPTS
        });

        this.auditLogger.log('BUTTON_FAILED_ATTEMPT', {
            count: this.failedAttempts
        });
    }

    /**
     * Réinitialise le compteur d'échecs (après succès)
     */
    resetFailedAttempts(): void {
        this.failedAttempts = 0;
        this.auditLogger.log('BUTTON_ATTEMPTS_RESET');
    }

    /**
     * Simule une détection de tamper (effraction)
     */
    simulateTamper(type: 'COVER_OPEN' | 'VOLTAGE' | 'TEMPERATURE' | 'MOTION'): void {
        this.state = 'TAMPERED';
        this.clearTimeout();
        this.inputBuffer = null;

        this.emit('tamper', { type, timestamp: new Date() });
        this.auditLogger.log('BUTTON_TAMPER', { type });
    }

    // ========================
    // Getters
    // ========================

    getState(): ButtonSimulatorState {
        return this.state;
    }

    getInputLength(): number {
        return this.inputBuffer?.content.length || 0;
    }

    getMaskedInput(): string {
        return this.inputBuffer?.masked || '';
    }

    isLocked(): boolean {
        if (this.lockoutUntil && new Date() < this.lockoutUntil) {
            return true;
        }
        if (this.lockoutUntil && new Date() >= this.lockoutUntil) {
            this.unlock();
        }
        return this.state === 'LOCKED';
    }

    getFailedAttempts(): number {
        return this.failedAttempts;
    }

    getRemainingLockTime(): number {
        if (!this.lockoutUntil) return 0;
        const remaining = this.lockoutUntil.getTime() - Date.now();
        return Math.max(0, remaining);
    }

    // ========================
    // Méthodes Privées
    // ========================

    private canAcceptInput(): boolean {
        if (this.isLocked()) {
            this.emit('error', { code: 'LOCKED', message: 'Device is locked' });
            return false;
        }

        if (this.state === 'TAMPERED') {
            this.emit('error', { code: 'TAMPERED', message: 'Device is tampered' });
            return false;
        }

        if (this.state === 'IDLE' || this.state === 'PROCESSING') {
            return false;
        }

        return true;
    }

    private startTimeout(): void {
        this.clearTimeout();
        this.timeoutHandle = setTimeout(() => {
            this.handleTimeout();
        }, this.config.timeoutMs);
    }

    private refreshTimeout(): void {
        this.startTimeout();
    }

    private clearTimeout(): void {
        if (this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
            this.timeoutHandle = null;
        }
    }

    private handleTimeout(): void {
        this.auditLogger.log('BUTTON_TIMEOUT', {
            state: this.state,
            inputLength: this.inputBuffer?.content.length || 0
        });

        this.emit('timeout', {
            state: this.state,
            hadPartialInput: (this.inputBuffer?.content.length || 0) > 0
        });

        this.state = 'IDLE';
        this.inputBuffer = null;
    }

    /**
     * Dispose du simulateur - nettoie les ressources
     */
    dispose(): void {
        this.clearTimeout();
        this.removeAllListeners();
        this.inputBuffer = null;
        this.state = 'IDLE';
    }
}
