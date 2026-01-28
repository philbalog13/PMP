# Scénario 1 : Man-in-the-Middle sur Flux ISO 8583

## 🔴 Vulnérabilité

**Absence de MAC (Message Authentication Code) sur certains champs critiques**

Un attaquant positionné entre le terminal et le serveur d'autorisation peut :
- Intercepter les messages ISO 8583
- Modifier le montant (DE4) avant transmission
- Relayer le message modifié au serveur

```
┌─────────┐                 ┌─────────────┐                 ┌─────────────┐
│   TPE   │ ────────────▶  │   ATTAQUANT  │ ────────────▶  │   SERVEUR   │
│         │   Montant:     │   (MitM)     │   Montant:     │   AUTH      │
│         │   100.00€      │   Modifie    │   10.00€       │             │
└─────────┘                 └─────────────┘                 └─────────────┘
```

## 💀 Impact

- Vol de fonds (différence de montant)
- Le commerçant croit débiter 100€, le client n'est débité que de 10€
- L'attaquant peut récupérer les 90€ de différence

---

## 🔧 Fichiers

| Fichier | Description |
|---------|-------------|
| `mitm-attack.js` | Exploit : intercepte et modifie le montant |
| `mac-verification-tool.js` | Détection : vérifie l'intégrité des messages |
| `fix-mac-mandatory.js` | Correctif : MAC obligatoire sur DE4 |

---

## ▶️ Exécution

```bash
# 1. Lancer l'attaque (simulation)
node mitm-attack.js

# 2. Détecter la vulnérabilité
node mac-verification-tool.js

# 3. Appliquer le correctif
node fix-mac-mandatory.js
```

---

## ✅ Correctif Recommandé

1. **MAC obligatoire sur tous les champs critiques** (DE4, DE39, DE38)
2. **Chiffrement de bout en bout** (TLS 1.3)
3. **Vérification du MAC côté serveur avant traitement**
