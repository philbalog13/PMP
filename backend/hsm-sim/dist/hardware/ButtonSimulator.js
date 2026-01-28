"use strict";
/**
 * ButtonSimulator.ts
 *
 * Simulation des boutons physiques d'un HSM/TPE
 * Permet de simuler l'interaction utilisateur (PIN pad, touches fonction)
 *
 * @educational Ce module simule l'interface physique d'un terminal
 * de paiement ou HSM avec gestion d'événements
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ButtonSimulator = void 0;
const events_1 = require("events");
class ButtonSimulator extends events_1.EventEmitter {
    constructor(auditLogger, config) {
        super();
        this.state = 'IDLE';
        this.inputBuffer = null;
        this.lastButtonTime = new Date();
        this.pressStartTime = null;
        this.timeoutHandle = null;
        this.lockoutUntil = null;
        this.failedAttempts = 0;
        this.MAX_FAILED_ATTEMPTS = 3;
        this.LOCKOUT_DURATION_MS = 30000; // 30 secondes
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
    startPinEntry(minDigits = 4, maxDigits = 6) {
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
    startAmountEntry(maxDigits = 12) {
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
    simulateKeyPress(key) {
        if (!this.canAcceptInput())
            return;
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
        const event = {
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
    simulateEnter() {
        if (!this.canAcceptInput())
            return;
        const now = new Date();
        const event = {
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
    simulateCancel() {
        const now = new Date();
        const event = {
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
    simulateClear() {
        if (!this.canAcceptInput())
            return;
        const event = {
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
    simulateBackspace() {
        if (!this.canAcceptInput())
            return;
        const event = {
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
    simulateFunctionKey(key) {
        const event = {
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
    simulateNavigation(direction) {
        const event = {
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
    simulateLongPress(key, durationMs = 2000) {
        const event = {
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
    lock(reason = 'MANUAL') {
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
    unlock() {
        this.state = 'IDLE';
        this.lockoutUntil = null;
        this.failedAttempts = 0;
        this.emit('unlocked');
        this.auditLogger.log('BUTTON_UNLOCKED');
    }
    /**
     * Signale un échec de validation (incrément compteur)
     */
    recordFailedAttempt() {
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
    resetFailedAttempts() {
        this.failedAttempts = 0;
        this.auditLogger.log('BUTTON_ATTEMPTS_RESET');
    }
    /**
     * Simule une détection de tamper (effraction)
     */
    simulateTamper(type) {
        this.state = 'TAMPERED';
        this.clearTimeout();
        this.inputBuffer = null;
        this.emit('tamper', { type, timestamp: new Date() });
        this.auditLogger.log('BUTTON_TAMPER', { type });
    }
    // ========================
    // Getters
    // ========================
    getState() {
        return this.state;
    }
    getInputLength() {
        var _a;
        return ((_a = this.inputBuffer) === null || _a === void 0 ? void 0 : _a.content.length) || 0;
    }
    getMaskedInput() {
        var _a;
        return ((_a = this.inputBuffer) === null || _a === void 0 ? void 0 : _a.masked) || '';
    }
    isLocked() {
        if (this.lockoutUntil && new Date() < this.lockoutUntil) {
            return true;
        }
        if (this.lockoutUntil && new Date() >= this.lockoutUntil) {
            this.unlock();
        }
        return this.state === 'LOCKED';
    }
    getFailedAttempts() {
        return this.failedAttempts;
    }
    getRemainingLockTime() {
        if (!this.lockoutUntil)
            return 0;
        const remaining = this.lockoutUntil.getTime() - Date.now();
        return Math.max(0, remaining);
    }
    // ========================
    // Méthodes Privées
    // ========================
    canAcceptInput() {
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
    startTimeout() {
        this.clearTimeout();
        this.timeoutHandle = setTimeout(() => {
            this.handleTimeout();
        }, this.config.timeoutMs);
    }
    refreshTimeout() {
        this.startTimeout();
    }
    clearTimeout() {
        if (this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
            this.timeoutHandle = null;
        }
    }
    handleTimeout() {
        var _a, _b;
        this.auditLogger.log('BUTTON_TIMEOUT', {
            state: this.state,
            inputLength: ((_a = this.inputBuffer) === null || _a === void 0 ? void 0 : _a.content.length) || 0
        });
        this.emit('timeout', {
            state: this.state,
            hadPartialInput: (((_b = this.inputBuffer) === null || _b === void 0 ? void 0 : _b.content.length) || 0) > 0
        });
        this.state = 'IDLE';
        this.inputBuffer = null;
    }
    /**
     * Dispose du simulateur - nettoie les ressources
     */
    dispose() {
        this.clearTimeout();
        this.removeAllListeners();
        this.inputBuffer = null;
        this.state = 'IDLE';
    }
}
exports.ButtonSimulator = ButtonSimulator;
