/**
 * Atelier 1 : Calculateur de Frais de Transaction
 * 
 * Ce script calcule les différents frais impliqués dans une transaction
 * par carte bancaire (Merchant Discount Rate - MDR).
 * 
 * Usage: node fees-calculator.js <montant>
 * Exemple: node fees-calculator.js 100.00
 */

// Configuration des taux (en pourcentage)
const FEES_CONFIG = {
    network: {
        name: 'Réseau (Visa/Mastercard)',
        rate: 0.10,  // 0.10%
        fixed: 0.02  // + 0.02€ fixe
    },
    acquirer: {
        name: 'Banque Acquéreur',
        rate: 0.35,  // 0.35%
        fixed: 0.05  // + 0.05€ fixe
    },
    interchange: {
        name: 'Interchange (vers Émetteur)',
        rate: 0.20,  // 0.20% (réglementé UE)
        fixed: 0.00  // Pas de frais fixe
    }
};

/**
 * Calcule les frais pour un intervenant
 * @param {number} amount - Montant de la transaction
 * @param {object} config - Configuration des frais
 * @returns {number} Frais calculés
 */
function calculateSingleFee(amount, config) {
    // TODO: Exercice - Implémenter le calcul
    // Formule: (montant * taux / 100) + frais_fixe

    const percentageFee = (amount * config.rate) / 100;
    const totalFee = percentageFee + config.fixed;

    return Math.round(totalFee * 100) / 100; // Arrondi 2 décimales
}

/**
 * Calcule tous les frais d'une transaction
 * @param {number} amount - Montant de la transaction en EUR
 * @returns {object} Détail de tous les frais
 */
function calculateFees(amount) {
    if (isNaN(amount) || amount <= 0) {
        throw new Error('Le montant doit être un nombre positif');
    }

    const fees = {
        amount: amount,
        breakdown: {},
        totalFees: 0,
        netToMerchant: 0,
        mdrRate: 0
    };

    // Calculer chaque type de frais
    for (const [key, config] of Object.entries(FEES_CONFIG)) {
        const fee = calculateSingleFee(amount, config);
        fees.breakdown[key] = {
            name: config.name,
            amount: fee,
            rate: config.rate,
            fixed: config.fixed
        };
        fees.totalFees += fee;
    }

    // Arrondir le total
    fees.totalFees = Math.round(fees.totalFees * 100) / 100;

    // Calculer le net marchand
    fees.netToMerchant = Math.round((amount - fees.totalFees) * 100) / 100;

    // Calculer le MDR effectif
    fees.mdrRate = Math.round((fees.totalFees / amount) * 10000) / 100;

    return fees;
}

/**
 * Affiche le résultat de manière formatée
 */
function displayResult(fees) {
    console.log('\n' + '='.repeat(50));
    console.log('💳 CALCUL DES FRAIS DE TRANSACTION');
    console.log('='.repeat(50));

    console.log(`\n📊 Montant de la transaction: ${fees.amount.toFixed(2)} EUR\n`);

    console.log('📋 Détail des frais:');
    console.log('-'.repeat(50));

    for (const [key, detail] of Object.entries(fees.breakdown)) {
        console.log(`  ${detail.name}:`);
        console.log(`    Taux: ${detail.rate}% + ${detail.fixed.toFixed(2)}€ fixe`);
        console.log(`    Montant: ${detail.amount.toFixed(2)} EUR`);
    }

    console.log('-'.repeat(50));
    console.log(`\n💰 TOTAL DES FRAIS: ${fees.totalFees.toFixed(2)} EUR`);
    console.log(`📈 MDR effectif: ${fees.mdrRate}%`);
    console.log(`\n✅ NET POUR LE MARCHAND: ${fees.netToMerchant.toFixed(2)} EUR`);
    console.log('\n' + '='.repeat(50));
}

/**
 * Analyse comparative pour différents montants
 */
function compareAmounts(amounts) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPARAISON MDR SELON MONTANT');
    console.log('='.repeat(60));
    console.log('\n| Montant (EUR) | Frais (EUR) | MDR (%) | Net Marchand |');
    console.log('|---------------|-------------|---------|--------------|');

    for (const amount of amounts) {
        const fees = calculateFees(amount);
        console.log(
            `| ${amount.toFixed(2).padStart(13)} | ` +
            `${fees.totalFees.toFixed(2).padStart(11)} | ` +
            `${fees.mdrRate.toFixed(2).padStart(7)} | ` +
            `${fees.netToMerchant.toFixed(2).padStart(12)} |`
        );
    }

    console.log('\n💡 Observation: Le MDR % augmente pour les petits montants');
    console.log('   car les frais fixes ont plus d\'impact proportionnellement.\n');
}

// Point d'entrée principal
function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        // Mode démo
        console.log('🎓 Mode démonstration (pas de montant fourni)');
        displayResult(calculateFees(100.00));
        compareAmounts([5, 10, 25, 50, 100, 250, 500, 1000]);
    } else {
        const amount = parseFloat(args[0]);
        try {
            const fees = calculateFees(amount);
            displayResult(fees);
        } catch (error) {
            console.error(`❌ Erreur: ${error.message}`);
            process.exit(1);
        }
    }
}

main();
