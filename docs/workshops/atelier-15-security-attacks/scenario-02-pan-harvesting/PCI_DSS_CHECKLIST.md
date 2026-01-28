# Configuration PCI-DSS Pédagogique

## 🎯 Objectif

Ce document détaille les exigences PCI-DSS applicables au scénario 2 (PAN Harvesting) et fournit des exercices pratiques pour comprendre la conformité.

---

## 📋 Exigences PCI-DSS Concernées

### Requirement 3 : Protection des Données de Titulaire

| Sous-exigence | Description | Vérification |
|---------------|-------------|--------------|
| 3.1 | Limiter le stockage des données de titulaire | `[ ]` Politique de rétention définie |
| 3.2 | Ne pas stocker les données sensibles après autorisation | `[ ]` CVV/CVC jamais stocké |
| 3.3 | Masquer le PAN lors de l'affichage | `[ ]` Format: ****1234 |
| 3.4 | Rendre le PAN illisible partout où il est stocké | `[ ]` Chiffrement AES-256 |
| 3.5 | Protéger les clés de chiffrement | `[ ]` Stockage HSM |
| 3.6 | Documenter les procédures de gestion des clés | `[ ]` Documentation à jour |

### Requirement 4 : Chiffrement des Données en Transit

| Sous-exigence | Description | Vérification |
|---------------|-------------|--------------|
| 4.1 | Utiliser une cryptographie robuste pour la transmission | `[ ]` TLS 1.3 |
| 4.2 | Ne jamais envoyer de PAN non chiffré | `[ ]` Pas de PAN en clair |

### Requirement 10 : Traçabilité et Monitoring

| Sous-exigence | Description | Vérification |
|---------------|-------------|--------------|
| 10.1 | Implémenter les pistes d'audit | `[ ]` Logs centralisés |
| 10.2 | Enregistrer les événements spécifiques | `[ ]` Accès aux données sensibles loggés |
| 10.5 | Sécuriser les pistes d'audit | `[ ]` Logs en lecture seule |
| 10.6 | Examiner régulièrement les logs | `[ ]` Revue quotidienne |

---

## 🛠️ Exercices Pratiques

### Exercice 1 : Audit des Logs

```bash
# Chercher les PAN exposés dans les logs
grep -r -E '4[0-9]{12}([0-9]{3})?' /var/log/app/
grep -r -E '5[1-5][0-9]{14}' /var/log/app/

# Compter les occurrences
find /var/log -name "*.log" -exec grep -l '[0-9]\{16\}' {} \;
```

**Questions :**
1. Combien de fichiers contiennent des PAN en clair ?
2. Quels sont les processus responsables ?
3. Comment corriger chaque source ?

### Exercice 2 : Implémentation du Masking

```javascript
// Avant (VULNÉRABLE)
console.log(`Transaction pour carte ${cardNumber}`);

// Après (CONFORME)
function maskPAN(pan) {
  return pan.replace(/^(\d{6})\d+(\d{4})$/, '$1****$2');
}
console.log(`Transaction pour carte ${maskPAN(cardNumber)}`);
```

**Tâche :** Modifier le code de l'application pour masquer tous les PAN avant logging.

### Exercice 3 : Chiffrement des Logs

```javascript
const crypto = require('crypto');

class SecureLogger {
  constructor(encryptionKey) {
    this.key = encryptionKey;
    this.algorithm = 'aes-256-gcm';
  }
  
  log(level, message, sensitiveData = {}) {
    // Chiffrer les données sensibles
    const encrypted = this.encrypt(JSON.stringify(sensitiveData));
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      encryptedData: encrypted.ciphertext,
      iv: encrypted.iv,
      tag: encrypted.tag
    };
    
    // Écrire le log sécurisé
    console.log(JSON.stringify(logEntry));
  }
  
  encrypt(plaintext) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    
    return {
      iv: iv.toString('hex'),
      ciphertext,
      tag: cipher.getAuthTag().toString('hex')
    };
  }
}
```

---

## ✅ Checklist de Conformité

### Avant Déploiement

- [ ] Aucun PAN en clair dans les logs
- [ ] Aucun CVV/CVC stocké
- [ ] PAN masqué dans tous les affichages
- [ ] Chiffrement AES-256 pour les PAN stockés
- [ ] TLS 1.3 pour toutes les communications
- [ ] Logs centralisés et sécurisés
- [ ] Politique de rétention documentée

### Monitoring Continu

- [ ] Scanner quotidien des logs
- [ ] Alertes sur détection de PAN
- [ ] Revue hebdomadaire des accès
- [ ] Audit trimestriel PCI-DSS

---

## 📊 Grille de Scoring

| Critère | Points | Score |
|---------|--------|-------|
| Pas de PAN en clair dans les logs | 25 | __/25 |
| Masking correct (format ****1234) | 20 | __/20 |
| Chiffrement des données stockées | 20 | __/20 |
| TLS pour toutes les communications | 15 | __/15 |
| Monitoring et alertes configurés | 10 | __/10 |
| Documentation à jour | 10 | __/10 |
| **TOTAL** | | __/100 |

**Seuil de conformité : 80/100 minimum**

---

## 🔗 Références

- [PCI-DSS v4.0 Official Document](https://www.pcisecuritystandards.org/)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [NIST SP 800-92 Guide to Computer Security Log Management](https://csrc.nist.gov/publications/detail/sp/800-92/final)
