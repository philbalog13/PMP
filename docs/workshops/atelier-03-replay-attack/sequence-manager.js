/**
 * Atelier 3 : Gestionnaire de Séquences Anti-Rejeu
 * 
 * Ce module gère les numéros de séquence (STAN) pour prévenir
 * les attaques par rejeu.
 * 
 * Usage: const seqMgr = new SequenceManager();
 */

class SequenceManager {
    constructor(options = {}) {
        // Configuration
        this.windowMs = options.windowMs || 5 * 60 * 1000; // 5 minutes
        this.cleanupIntervalMs = options.cleanupIntervalMs || 60 * 1000; // 1 minute
        this.maxCacheSize = options.maxCacheSize || 10000;

        // Cache des séquences vues
        this.seenSequences = new Map();

        // Statistiques
        this.stats = {
            totalChecks: 0,
            duplicatesBlocked: 0,
            uniqueAccepted: 0,
            cacheHits: 0,
            cleanupRuns: 0
        };

        // Démarrer le nettoyage périodique
        this._startCleanupTimer();

        console.log('🔐 SequenceManager initialisé');
        console.log(`   Fenêtre: ${this.windowMs / 1000}s`);
        console.log(`   Max cache: ${this.maxCacheSize} entrées`);
    }

    /**
     * Génère une clé unique pour une transaction
     * @param {string} terminalId - Identifiant du terminal
     * @param {string} stan - System Trace Audit Number
     * @param {string} date - Date au format YYYYMMDD
     * @returns {string} Clé unique
     */
    _generateKey(terminalId, stan, date) {
        return `${terminalId}:${stan}:${date}`;
    }

    /**
     * Vérifie si une séquence est un doublon
     * @param {string} terminalId - Identifiant du terminal
     * @param {string} stan - System Trace Audit Number  
     * @param {Date} timestamp - Horodatage de la transaction
     * @returns {object} { isDuplicate: boolean, info?: string }
     */
    checkSequence(terminalId, stan, timestamp = new Date()) {
        this.stats.totalChecks++;

        // Générer la clé
        const date = timestamp.toISOString().substring(0, 10).replace(/-/g, '');
        const key = this._generateKey(terminalId, stan, date);

        // Vérifier si déjà présent
        if (this.seenSequences.has(key)) {
            const seen = this.seenSequences.get(key);
            const ageMs = Date.now() - seen.timestamp;

            // Encore dans la fenêtre?
            if (ageMs < this.windowMs) {
                this.stats.duplicatesBlocked++;
                this.stats.cacheHits++;
                seen.attempts++;

                return {
                    isDuplicate: true,
                    info: {
                        key,
                        firstSeen: new Date(seen.timestamp).toISOString(),
                        ageSeconds: Math.round(ageMs / 1000),
                        attempts: seen.attempts
                    }
                };
            }

            // Fenêtre expirée, supprimer l'ancienne entrée
            this.seenSequences.delete(key);
        }

        // Vérifier la taille du cache
        if (this.seenSequences.size >= this.maxCacheSize) {
            this._forceCleanup();
        }

        // Enregistrer la nouvelle séquence
        this.seenSequences.set(key, {
            timestamp: Date.now(),
            attempts: 1
        });

        this.stats.uniqueAccepted++;

        return {
            isDuplicate: false,
            info: {
                key,
                recorded: true
            }
        };
    }

    /**
     * Génère un nouveau STAN unique
     * @param {string} terminalId - Identifiant du terminal
     * @returns {string} STAN à 6 chiffres
     */
    generateSTAN(terminalId) {
        // Format: 6 chiffres, incrémental avec partie aléatoire
        const timestamp = Date.now().toString().slice(-4);
        const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        return timestamp + random;
    }

    /**
     * Nettoie les entrées expirées
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, value] of this.seenSequences.entries()) {
            if (now - value.timestamp > this.windowMs) {
                this.seenSequences.delete(key);
                cleaned++;
            }
        }

        this.stats.cleanupRuns++;

        if (cleaned > 0) {
            console.log(`🧹 Cleanup: ${cleaned} entrées expirées supprimées`);
        }

        return cleaned;
    }

    /**
     * Force un nettoyage du cache (quand plein)
     */
    _forceCleanup() {
        console.log('⚠️ Cache proche de la limite, nettoyage forcé...');

        // D'abord, nettoyer les expirés
        this.cleanup();

        // Si encore trop plein, supprimer les plus anciens
        if (this.seenSequences.size >= this.maxCacheSize * 0.9) {
            const sorted = [...this.seenSequences.entries()]
                .sort((a, b) => a[1].timestamp - b[1].timestamp);

            const toRemove = Math.floor(sorted.length * 0.2); // 20%
            for (let i = 0; i < toRemove; i++) {
                this.seenSequences.delete(sorted[i][0]);
            }

            console.log(`🗑️ ${toRemove} anciennes entrées supprimées`);
        }
    }

    /**
     * Démarre le timer de nettoyage
     */
    _startCleanupTimer() {
        this._cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.cleanupIntervalMs);
    }

    /**
     * Arrête le timer de nettoyage
     */
    stop() {
        if (this._cleanupTimer) {
            clearInterval(this._cleanupTimer);
            console.log('🛑 SequenceManager arrêté');
        }
    }

    /**
     * Retourne les statistiques
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.seenSequences.size,
            cacheUtilization: `${Math.round((this.seenSequences.size / this.maxCacheSize) * 100)}%`
        };
    }

    /**
     * Affiche les statistiques
     */
    displayStats() {
        const stats = this.getStats();
        console.log('\n📊 Statistiques SequenceManager:');
        console.log('─'.repeat(40));
        console.log(`   Vérifications totales: ${stats.totalChecks}`);
        console.log(`   Doublons bloqués:     ${stats.duplicatesBlocked}`);
        console.log(`   Uniques acceptées:    ${stats.uniqueAccepted}`);
        console.log(`   Taille cache:         ${stats.cacheSize}`);
        console.log(`   Utilisation:          ${stats.cacheUtilization}`);
        console.log(`   Nettoyages:           ${stats.cleanupRuns}`);
        console.log('─'.repeat(40));
    }
}

// Démonstration
function demo() {
    console.log('═'.repeat(50));
    console.log('  📋 DÉMONSTRATION: SequenceManager');
    console.log('═'.repeat(50));

    const seqMgr = new SequenceManager({ windowMs: 10000 }); // 10 secondes pour la démo

    // Test 1: Première transaction
    console.log('\n1️⃣ Première transaction:');
    const result1 = seqMgr.checkSequence('TERM0001', '000001');
    console.log(`   Doublon: ${result1.isDuplicate}`);
    console.log(`   Info:`, result1.info);

    // Test 2: Rejeu immédiat
    console.log('\n2️⃣ Tentative de rejeu (même STAN):');
    const result2 = seqMgr.checkSequence('TERM0001', '000001');
    console.log(`   Doublon: ${result2.isDuplicate}`);
    console.log(`   Info:`, result2.info);

    // Test 3: Nouveau STAN
    console.log('\n3️⃣ Nouvelle transaction (STAN différent):');
    const newSTAN = seqMgr.generateSTAN('TERM0001');
    console.log(`   STAN généré: ${newSTAN}`);
    const result3 = seqMgr.checkSequence('TERM0001', newSTAN);
    console.log(`   Doublon: ${result3.isDuplicate}`);

    // Afficher stats
    seqMgr.displayStats();

    // Arrêter proprement
    seqMgr.stop();
}

// Exporter pour utilisation dans d'autres modules
if (typeof module !== 'undefined') {
    module.exports = { SequenceManager };
}

// Exécuter la démo si appelé directement
if (require.main === module) {
    demo();
}
