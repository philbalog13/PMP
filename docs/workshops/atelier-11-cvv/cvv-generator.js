/**
 * Atelier 11 : Générateur de CVV Pédagogique
 * 
 * Démontre les différents types de CVV et leur génération.
 * ATTENTION: Simplification pédagogique - pas pour production!
 * 
 * Usage: node cvv-generator.js
 */

const crypto = require('crypto');

// Clé de vérification de carte (CVK) - SIMULATION UNIQUEMENT
const CVK_A = '0123456789ABCDEF';
const CVK_B = 'FEDCBA9876543210';
const CVK = CVK_A + CVK_B;

/**
 * Génère un CVV simplifié (pédagogique)
 * En production: 3DES-CBC avec CVK sur données formatées
 */
function generateCVV(pan, expiry, serviceCode) {
    // Construire les données d'entrée
    const data = pan + expiry + serviceCode;

    // Simulation: HMAC puis extraction de 3 chiffres
    const hash = crypto.createHmac('sha256', CVK)
        .update(data)
        .digest('hex');

    // Extraire 3 chiffres (simulation)
    let cvv = '';
    for (let i = 0; i < hash.length && cvv.length < 3; i++) {
        const char = hash[i];
        if (/[0-9]/.test(char)) {
            cvv += char;
        }
    }

    // Compléter si nécessaire
    while (cvv.length < 3) {
        cvv += Math.floor(Math.random() * 10).toString();
    }

    return cvv.substring(0, 3);
}

/**
 * Génère le CVV1 (pour piste magnétique)
 */
function generateCVV1(pan, expiry) {
    // CVV1 utilise le vrai Service Code
    const serviceCode = '101'; // Normal
    return generateCVV(pan, expiry, serviceCode);
}

/**
 * Génère le CVV2 (imprimé au dos de la carte)
 */
function generateCVV2(pan, expiry) {
    // CVV2 utilise Service Code = 000 (convention)
    const serviceCode = '000';
    return generateCVV(pan, expiry, serviceCode);
}

/**
 * Génère l'iCVV (pour puce EMV)
 */
function generateiCVV(pan, expiry) {
    // iCVV utilise Service Code = 999 (convention EMV)
    const serviceCode = '999';
    return generateCVV(pan, expiry, serviceCode);
}

/**
 * Simule un dCVV (dynamique)
 */
function generatedCVV(pan, timestamp) {
    // dCVV change toutes les X minutes basé sur le timestamp
    const timeSlot = Math.floor(timestamp / (5 * 60 * 1000)); // 5 min slots
    const data = pan + timeSlot.toString();

    const hash = crypto.createHmac('sha256', CVK + 'DYNAMIC')
        .update(data)
        .digest('hex');

    // Extraire 3 chiffres
    let cvv = '';
    for (const char of hash) {
        if (/[0-9]/.test(char) && cvv.length < 3) {
            cvv += char;
        }
    }

    return cvv.padStart(3, '0').substring(0, 3);
}

/**
 * Affiche la comparaison des CVV
 */
function displayComparison(pan, expiry) {
    console.log('═'.repeat(60));
    console.log('  🔐 COMPARAISON DES TYPES DE CVV - Atelier 11');
    console.log('═'.repeat(60));

    console.log(`\n📋 Carte: ${pan.substring(0, 4)}****${pan.substring(12)}`);
    console.log(`📅 Expiration: ${expiry.substring(0, 2)}/${expiry.substring(2)}`);

    const cvv1 = generateCVV1(pan, expiry);
    const cvv2 = generateCVV2(pan, expiry);
    const icvv = generateiCVV(pan, expiry);
    const dcvv = generatedCVV(pan, Date.now());

    console.log('\n┌─────────────────────────────────────────────────────────┐');
    console.log('│                 TYPES DE CVV GÉNÉRÉS                    │');
    console.log('├──────────┬─────────┬────────────────────────────────────┤');
    console.log('│ Type     │ Valeur  │ Utilisation                        │');
    console.log('├──────────┼─────────┼────────────────────────────────────┤');
    console.log(`│ CVV1     │   ${cvv1}   │ Piste magnétique (TPE physique)    │`);
    console.log(`│ CVV2     │   ${cvv2}   │ Dos de la carte (e-commerce)       │`);
    console.log(`│ iCVV     │   ${icvv}   │ Puce EMV (transactions chip)       │`);
    console.log(`│ dCVV     │   ${dcvv}   │ Carte e-ink (change toutes 5 min)  │`);
    console.log('└──────────┴─────────┴────────────────────────────────────┘');

    // Explication de la différence
    console.log('\n' + '─'.repeat(60));
    console.log('  💡 POURQUOI CVV1 ≠ CVV2 ?');
    console.log('─'.repeat(60));
    console.log(`
  Le CVV1 est généré avec le Service Code réel (ex: 101)
  Le CVV2 est généré avec Service Code = 000 (convention)
  
  → Si un fraudeur copie la piste magnétique (avec CVV1),
    il ne peut PAS en déduire le CVV2 imprimé au dos.
  
  → Cela empêche la fraude "Card Not Present" avec une
    piste clonée.
`);

    // Démonstration dCVV
    console.log('─'.repeat(60));
    console.log('  🔄 DÉMONSTRATION dCVV (dynamique)');
    console.log('─'.repeat(60));

    console.log('\n  Le dCVV change selon le temps:');
    for (let i = 0; i < 5; i++) {
        const futureTime = Date.now() + (i * 5 * 60 * 1000); // +5 min par itération
        const futureDcvv = generatedCVV(pan, futureTime);
        const mins = i * 5;
        console.log(`    T+${mins.toString().padStart(2, '0')} min: dCVV = ${futureDcvv}`);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('  ⚠️ RAPPEL: Ces CVV sont des simulations pédagogiques!');
    console.log('═'.repeat(60) + '\n');
}

// Export pour utilisation dans d'autres modules
module.exports = { generateCVV1, generateCVV2, generateiCVV, generatedCVV };

// Démonstration
if (require.main === module) {
    const testPan = '4111111111111111';
    const testExpiry = '2812'; // YYMM
    displayComparison(testPan, testExpiry);
}
