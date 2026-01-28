# Scénario 5 : DoS sur Système d'Autorisation

## 🔴 Vulnérabilité

**Absence de rate limiting et de circuit breaker**

Un attaquant peut :
- Envoyer des milliers de requêtes par seconde
- Saturer le serveur d'autorisation
- Paralyser toutes les transactions légitimes

```
┌─────────────────────────────────────────────────────────────┐
│                     ATTAQUE DoS                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📱 Terminaux légitimes                                      │
│    │ ─── 10 req/s ───▶ ┌─────────────┐                      │
│    │                   │   SERVEUR   │                      │
│  👿 Attaquant          │    AUTH     │ ❌ Surchargé!        │
│    │ ─ 10000 req/s ──▶ │             │                      │
│                        └─────────────┘                      │
│                                                             │
│  Résultat:                                                  │
│  - Timeout pour tous les terminaux                          │
│  - Transactions légitimes échouent                          │
│  - Perte de chiffre d'affaires                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 💀 Impact

- Indisponibilité du service de paiement
- Pertes financières (transactions non traitées)
- Atteinte à la réputation
- Potentiel écran de fumée pour autre attaque

---

## 🔧 Fichiers

| Fichier | Description |
|---------|-------------|
| `auth-flooder.js` | Exploit : flood 1000 req/sec |
| `traffic-analyzer.py` | Détection : analyse le trafic anormal |
| `fix-rate-limiting.js` | Correctif : rate limit + circuit breaker |

---

## ▶️ Exécution

```bash
# 1. Lancer l'attaque (simulation)
node auth-flooder.js

# 2. Analyser le trafic
python traffic-analyzer.py

# 3. Appliquer le correctif
node fix-rate-limiting.js
```

---

## ✅ Correctif Recommandé

1. **Rate limiting** (max 100 req/s par terminal)
2. **Circuit breaker** (stop si erreurs > 50%)
3. **Queue management** (file d'attente limitée)
4. **IP blacklisting** (bloquer sources malveillantes)
5. **Auto-scaling** (infrastructure élastique)
