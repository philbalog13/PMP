# crypto-service - Opérations Cryptographiques

Service d'opérations cryptographiques pour les paiements.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/encrypt` | Chiffrer données |
| POST | `/decrypt` | Déchiffrer données |
| POST | `/mac/generate` | Générer MAC |
| POST | `/mac/verify` | Vérifier MAC |
| POST | `/pin/encode` | PIN Block ISO 9564 |
| POST | `/cvv/generate` | Générer CVV |

## Algorithmes supportés

| Famille | Algorithmes |
|---------|-------------|
| Chiffrement | AES-128, AES-256, DES, 3DES |
| MAC | HMAC-SHA256, HMAC-SHA1, HMAC-MD5 |
| PIN Block | ISO 9564 Format 0, 1, 3 |

## Exemple: PIN Block Format 0

```bash
curl -X POST http://localhost:8010/pin/encode \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "1234",
    "pan": "4111111111111111",
    "format": 0
  }'
```

Réponse:
```json
{
  "success": true,
  "data": "041234FFFFFFFF",
  "steps": ["PIN XOR PAN → PIN Block"]
}
```

## Démarrage

```bash
npm install
npm run dev  # Port 8010
```
