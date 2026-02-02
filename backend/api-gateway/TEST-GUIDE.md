# Guide de Test - 4 Personas + Sécurité

## Prérequis

### 1. Services Docker démarrés

```bash
# Depuis la racine du projet
docker-compose up -d postgres redis

# Vérifier que les services sont up
docker-compose ps
```

### 2. Migrations SQL appliquées

```bash
# Se connecter à PostgreSQL
docker exec -it pmp-postgres psql -U pmp_user -d pmp_db

# Exécuter les migrations (une seule fois)
\i /docker-entrypoint-initdb.d/init-personas-data.sql
\i /scripts/add-account-lockout.sql
\i /scripts/add-refresh-tokens.sql
\i /scripts/add-audit-logs.sql

# Vérifier que les tables existent
\dt users.*
\dt security.*

# Quitter
\q
```

**OU** copier et exécuter les migrations:

```bash
# Depuis la racine du projet
docker cp scripts/add-account-lockout.sql pmp-postgres:/tmp/
docker cp scripts/add-refresh-tokens.sql pmp-postgres:/tmp/
docker cp scripts/add-audit-logs.sql pmp-postgres:/tmp/

docker exec -it pmp-postgres psql -U pmp_user -d pmp_db -f /tmp/add-account-lockout.sql
docker exec -it pmp-postgres psql -U pmp_user -d pmp_db -f /tmp/add-refresh-tokens.sql
docker exec -it pmp-postgres psql -U pmp_user -d pmp_db -f /tmp/add-audit-logs.sql
```

### 3. Variables d'environnement configurées

Créer `.env` depuis `.env.example`:

```bash
cp .env.example .env
```

Configurer au minimum:

```env
# JWT Secret (CRITIQUE - générer avec: openssl rand -base64 64)
JWT_SECRET=votre_secret_genere_ici_minimum_32_caracteres

# PostgreSQL
POSTGRES_DB=pmp_db
POSTGRES_USER=pmp_user
POSTGRES_PASSWORD=pmp_password_123

# Redis
REDIS_PASSWORD=redis_password_123

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

### 4. API Gateway démarré

```bash
cd backend/api-gateway

# Installer dépendances si pas déjà fait
npm install

# Démarrer en mode dev
npm run dev

# OU en mode production
npm run build
npm start
```

Vérifier que le serveur est accessible:

```bash
curl http://localhost:8000/health
# Devrait retourner: {"status":"healthy"}
```

---

## Exécution des Tests Automatisés

### Option 1: Script Node.js (Recommandé)

```bash
cd backend/api-gateway

# Exécuter la suite de tests complète
node test-personas.js
```

**Ce qui sera testé:**

- ✅ **CLIENT**: Register, Login, Endpoints autorisés/interdits
- ✅ **MARCHAND**: Register, Login, Endpoints autorisés/interdits
- ✅ **ÉTUDIANT**: Register, Login, Endpoints autorisés/interdits
- ✅ **FORMATEUR**: Register, Login avec 2FA, Permissions admin
- ✅ **Account Lockout**: Blocage après 5 tentatives échouées
- ✅ **Token Blacklist**: Révocation après logout
- ✅ **Password Validation**: Rejet mots de passe faibles

**Sortie attendue:**

```
╔═══════════════════════════════════════════════════════════════╗
║   SUITE DE TESTS - 4 PERSONAS + SÉCURITÉ                     ║
╚═══════════════════════════════════════════════════════════════╝

✅ API Gateway accessible

🔵 TEST PERSONA: CLIENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ CLIENT - Register avec mot de passe faible (devrait échouer)
✅ CLIENT - Register avec mot de passe fort
✅ CLIENT - Login
✅ CLIENT - Accès /api/client/cards (autorisé)
✅ CLIENT - Accès /api/marchand/transactions (interdit)

... [tests des autres personas]

╔═══════════════════════════════════════════════════════════════╗
║   RAPPORT FINAL                                               ║
╚═══════════════════════════════════════════════════════════════╝

✅ Tests réussis: 35
❌ Tests échoués: 0
📊 Taux de réussite: 100%

🎉 EXCELLENT! Score de sécurité >90% maintenu!
```

---

### Option 2: Tests manuels avec curl

#### 🔵 TEST CLIENT

```bash
# 1. Register avec mot de passe FAIBLE (devrait échouer)
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "client_weak",
    "email": "client_weak@test.com",
    "password": "123456",
    "firstName": "Test",
    "lastName": "Weak",
    "role": "ROLE_CLIENT"
  }'
# Attendu: {"success":false,"error":"Password does not meet security requirements","code":"PASSWORD_TOO_WEAK"}

# 2. Register avec mot de passe FORT
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "client1",
    "email": "client@test.com",
    "password": "ClientTest123!@#",
    "firstName": "Jean",
    "lastName": "Dupont",
    "role": "ROLE_CLIENT"
  }'
# Attendu: {"success":true, "user":{...}}

# 3. Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@test.com",
    "password": "ClientTest123!@#"
  }'
# Attendu: {"success":true, "token":"eyJhbGciOi..."}

# 4. Tester endpoint autorisé
TOKEN="<copier_token_ici>"
curl http://localhost:8000/api/client/cards \
  -H "Authorization: Bearer $TOKEN"
# Attendu: Succès (200/502) ou données

# 5. Tester endpoint INTERDIT (cross-role)
curl http://localhost:8000/api/marchand/transactions \
  -H "Authorization: Bearer $TOKEN"
# Attendu: {"success":false,"error":"...","code":"FORBIDDEN_PERMISSION"} (403)
```

#### 🟢 TEST MARCHAND

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "marchand1",
    "email": "marchand@test.com",
    "password": "MarchandTest123!@#",
    "firstName": "Marie",
    "lastName": "Commerce",
    "role": "ROLE_MARCHAND"
  }'

curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "marchand@test.com",
    "password": "MarchandTest123!@#"
  }'

TOKEN="<copier_token>"
curl http://localhost:8000/api/marchand/transactions -H "Authorization: Bearer $TOKEN"
curl http://localhost:8000/api/marchand/reports/daily -H "Authorization: Bearer $TOKEN"
```

#### 🟡 TEST ÉTUDIANT

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "etudiant1",
    "email": "etudiant@test.com",
    "password": "EtudiantTest123!@#",
    "firstName": "Paul",
    "lastName": "Martin",
    "role": "ROLE_ETUDIANT"
  }'

curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "etudiant@test.com",
    "password": "EtudiantTest123!@#"
  }'

TOKEN="<copier_token>"
curl http://localhost:8000/api/etudiant/progression -H "Authorization: Bearer $TOKEN"
curl http://localhost:8000/api/etudiant/quiz -H "Authorization: Bearer $TOKEN"
curl http://localhost:8000/api/etudiant/exercises -H "Authorization: Bearer $TOKEN"
```

#### 🔴 TEST FORMATEUR (avec 2FA)

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "formateur1",
    "email": "formateur@test.com",
    "password": "FormateurTest123!@#",
    "firstName": "Sophie",
    "lastName": "Prof",
    "role": "ROLE_FORMATEUR"
  }'

# Login SANS code 2FA (devrait ÉCHOUER)
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "formateur@test.com",
    "password": "FormateurTest123!@#"
  }'
# Attendu: {"success":false,"error":"2FA code required"}

# Login AVEC code 2FA correct
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "formateur@test.com",
    "password": "FormateurTest123!@#",
    "code2fa": "ADMIN_SECRET"
  }'
# Attendu: {"success":true, "token":"..."}

TOKEN="<copier_token>"
curl http://localhost:8000/api/formateur/sessions-actives -H "Authorization: Bearer $TOKEN"
curl http://localhost:8000/api/admin/logs -H "Authorization: Bearer $TOKEN"
curl http://localhost:8000/api/admin/users -H "Authorization: Bearer $TOKEN"
```

---

## Tests de Sécurité

### 🔒 Test Account Lockout

```bash
# 6 tentatives échouées consécutives
for i in {1..6}; do
  echo "Tentative $i..."
  curl -X POST http://localhost:8000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"client@test.com","password":"wrong_password"}'
  echo ""
done

# Au 6ème essai → ACCOUNT_LOCKED
# {"success":false,"error":"Account locked due to too many failed attempts","code":"ACCOUNT_LOCKED"}
```

### 🔒 Test Token Blacklist (Logout)

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"client@test.com","password":"ClientTest123!@#"}' \
  | jq -r '.token')

echo "Token: $TOKEN"

# 2. Utiliser token (devrait fonctionner)
curl http://localhost:8000/api/client/cards -H "Authorization: Bearer $TOKEN"

# 3. Logout (blacklist le token)
curl -X POST http://localhost:8000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
# Attendu: {"success":true,"message":"Token has been revoked"}

# 4. Réutiliser token (devrait ÉCHOUER - AUTH_TOKEN_REVOKED)
curl http://localhost:8000/api/client/cards -H "Authorization: Bearer $TOKEN"
# Attendu: {"success":false,"error":"Token has been revoked","code":"AUTH_TOKEN_REVOKED"}
```

### 🔒 Test Password Validation

```bash
# Mots de passe FAIBLES (devraient échouer)
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test1","email":"test1@test.com","password":"123456","role":"ROLE_CLIENT"}'
# Attendu: PASSWORD_TOO_WEAK

curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test2","email":"test2@test.com","password":"password","role":"ROLE_CLIENT"}'
# Attendu: PASSWORD_TOO_WEAK

# Mot de passe FORT (devrait réussir)
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test3","email":"test3@test.com","password":"MyStr0ng!P@ssw0rd#2024","role":"ROLE_CLIENT"}'
# Attendu: {"success":true}
```

---

## Nettoyage après les Tests

```bash
# Supprimer les utilisateurs de test de la DB
docker exec -it pmp-postgres psql -U pmp_user -d pmp_db -c "DELETE FROM users.users WHERE email LIKE '%@test.com';"

# Vider Redis (blacklist)
docker exec -it pmp-redis redis-cli -a redis_password_123 FLUSHALL
```

---

## Dépannage

### Erreur: "API Gateway non accessible"

```bash
# Vérifier que le serveur est démarré
cd backend/api-gateway
npm run dev

# Vérifier les logs
tail -f logs/app.log
```

### Erreur: "FATAL: JWT_SECRET environment variable is required"

```bash
# Ajouter JWT_SECRET dans .env
echo 'JWT_SECRET=votre_secret_fort_minimum_32_caracteres_ici' >> .env
```

### Erreur: "connect ECONNREFUSED ::1:5432" (PostgreSQL)

```bash
# Démarrer PostgreSQL
docker-compose up -d postgres

# Vérifier
docker-compose ps postgres
```

### Erreur: "connect ECONNREFUSED ::1:6379" (Redis)

```bash
# Démarrer Redis
docker-compose up -d redis

# Vérifier
docker-compose ps redis
```

---

## Résultats Attendus

Si tout fonctionne correctement, vous devriez obtenir:

- ✅ **35+ tests passent** avec le script automatisé
- ✅ **Taux de réussite: 100%**
- ✅ **Score de sécurité: 92/100** (maintenu depuis la refonte)

---

## Contact

En cas de problème, vérifier:
1. Tous les services Docker sont up
2. Les migrations SQL ont été appliquées
3. Le fichier `.env` est configuré
4. L'API Gateway est démarrée et accessible sur http://localhost:8000
