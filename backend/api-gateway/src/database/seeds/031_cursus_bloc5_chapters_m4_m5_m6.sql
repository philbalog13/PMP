-- BLOC 5 Chapters: Modules 5.4 (JavaCard), 5.5 (Java embarqué), 5.6 (BDD)

-- Module 5.4 – JavaCard et GlobalPlatform (5 chapters)

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-5.4.1-archi', 'mod-5.4-javacard', 'Architecture JavaCard',
$$## Qu'est-ce que JavaCard ?

JavaCard est une plateforme logicielle permettant d'exécuter des applets Java sur des **cartes à puce** et des **Secure Elements**.

### Composants

| Composant | Rôle |
|-----------|------|
| **JCVM** | JavaCard Virtual Machine (subset de Java) |
| **JCRE** | Runtime Environment (gestion applets, APDU, persistance) |
| **JavaCard API** | javacard.framework, javacard.security, javacardx.crypto |

### Restrictions vs Java SE

| Caractéristique | Java SE | JavaCard |
|----------------|---------|----------|
| Types primitifs | byte → double | byte, short, (int opt.) |
| String | Oui | **Non** |
| Garbage Collector | Oui | **Non** (persistance) |
| Multi-threading | Oui | **Non** |
| Mémoire | Go | **Ko** (2-64 KB RAM, 32-256 KB EEPROM) |

### Cycle de vie d'une applet

1. **Installation** : fichier `.cap` chargé via GlobalPlatform
2. **Enregistrement** : `install()` → `register()`
3. **Sélection** : terminal envoie SELECT AID
4. **Process** : `process(APDU)` appelé pour chaque commande
5. **Désélection** / destruction

### Persistance

- Les objets créés avec `new` sont **persistants** (EEPROM)
- Écriture lente (~1-5 ms) avec usure
- Variables locales et pile = **RAM** (volatile)$$,
'["JavaCard = subset de Java pour cartes à puce et Secure Elements","Pas de String, GC, threads, float/double","Objets persistants en EEPROM (lent), variables locales en RAM","Cycle : install → register → select → process → deselect"]'::jsonb,
1, 50) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-5.4.2-hello', 'mod-5.4-javacard', 'Hello World JavaCard',
$$## Première applet

```java
package main;
import javacard.framework.*;

public class SimpleHello extends Applet {
    final static byte HELLO_CLA = (byte)0xB0;
    private final byte INS_HELLO = (byte)0x01;
    private static final byte[] helloWorld =
        { 'H','E','L','L','O',' ','W','O','R','L','D' };

    private SimpleHello() { register(); }

    public static void install(byte bArray[], short bOffset,
                               byte bLength) {
        new SimpleHello();
    }

    public void process(APDU apdu) {
        byte[] buffer = apdu.getBuffer();
        if (selectingApplet()) return;

        if (buffer[ISO7816.OFFSET_CLA] != HELLO_CLA)
            ISOException.throwIt(ISO7816.SW_CLA_NOT_SUPPORTED);

        if (buffer[ISO7816.OFFSET_INS] == INS_HELLO)
            sendHelloWorld(apdu);
        else
            ISOException.throwIt(ISO7816.SW_INS_NOT_SUPPORTED);
    }

    private void sendHelloWorld(APDU apdu) {
        byte[] buffer = apdu.getBuffer();
        short length = (short) helloWorld.length;
        Util.arrayCopyNonAtomic(helloWorld, (short)0,
                                buffer, (short)0, length);
        apdu.setOutgoingAndSend((short)0, length);
    }
}
```

### Build avec Ant

```xml
<project name="HelloWorld" basedir=".">
  <taskdef name="javacard"
    classname="pro.javacard.ant.JavaCard"
    classpath="ant-javacard.jar"/>
  <javacard>
    <cap jckit="./sdks/jc324_kit"
         aid="0102030405"
         package="main"
         output="SimpleHello.cap">
      <applet class="main.SimpleHello"
              aid="0102030405060708"/>
    </cap>
  </javacard>
</project>
```

### Installation et test

```bash
# Compiler
ant

# Installer sur carte
java -jar gp.jar -install SimpleHello.cap -default

# Tester
java -jar gp.jar -a "B00100000B"
# Réponse : 48 45 4C 4C 4F 20 57 4F 52 4C 44 = HELLO WORLD
```$$,
'["install() est static, crée l''instance et appelle register()","process(APDU) est appelé pour chaque commande reçue","Util.arrayCopyNonAtomic = copie rapide vers le buffer APDU","gp.jar (GlobalPlatformPro) = outil CLI pour installer et tester"]'::jsonb,
2, 50) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-5.4.3-wallet', 'mod-5.4-javacard', 'Simple Wallet avec PIN',
$$## Applet Wallet sécurisé

### Commandes APDU

| CLA | INS | Nom | Contrainte |
|-----|-----|-----|-----------|
| B0 | 40 | CREDIT | PIN vérifié |
| B0 | 30 | DEBIT | PIN vérifié |
| B0 | 50 | BALANCE | Libre |
| 00 | 20 | VERIFY PIN | — |

### Gestion du PIN avec OwnerPIN

```java
import javacard.framework.OwnerPIN;

public class SecureWallet extends Applet {
    private OwnerPIN pin;
    private short balance;
    private final static byte PIN_MAX_TRIES = 3;

    private SecureWallet() {
        pin = new OwnerPIN(PIN_MAX_TRIES, (byte)4);
        pin.update(new byte[]{0x12, 0x34}, (short)0, (byte)2);
        balance = 0;
        register();
    }

    public void process(APDU apdu) {
        byte[] buf = apdu.getBuffer();
        if (selectingApplet()) return;

        if (buf[ISO7816.OFFSET_INS] == (byte)0x20) {
            verify(apdu);
            return;
        }

        // Opérations sensibles : PIN requis
        if (!pin.isValidated())
            ISOException.throwIt(
                ISO7816.SW_SECURITY_STATUS_NOT_SATISFIED);

        switch (buf[ISO7816.OFFSET_INS]) {
            case 0x40: credit(apdu); break;
            case 0x30: debit(apdu); break;
            case 0x50: getBalance(apdu); break;
            default:
                ISOException.throwIt(
                    ISO7816.SW_INS_NOT_SUPPORTED);
        }
    }
}
```

### Logique de vérification PIN

- 3 tentatives maximum
- Après 3 échecs → **PIN bloqué définitivement** (SW 69 83)
- `pin.check()` décrémente automatiquement le compteur
- `pin.isValidated()` reste vrai jusqu'à désélection$$,
'["OwnerPIN gère automatiquement le compteur de tentatives","PIN bloqué après 3 échecs → carte inutilisable (nécessite déblocage)","pin.isValidated() = true après check réussi, jusqu''à désélection","Toutes les opérations sensibles vérifient pin.isValidated()"]'::jsonb,
3, 50) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-5.4.4-globalplatform', 'mod-5.4-javacard', 'GlobalPlatform et gestion des clés',
$$## GlobalPlatform : le « système d'exploitation » de la carte

### Concepts clés

| Concept | Description |
|---------|-------------|
| **ISD** | Issuer Security Domain – applet privilégié |
| **SD** | Security Domain – conteneur pour applets |
| **SCP** | Secure Channel Protocol (01, 02, **03**=AES) |
| **DAP** | Data Authentication Pattern (signature du code) |

### GlobalPlatformPro (gp.jar)

| Commande | Action |
|----------|--------|
| `-info` | Informations de la carte |
| `-list` | Lister les applets installées |
| `-install X.cap` | Installer un applet |
| `-delete AID` | Supprimer un applet |
| `-lock NEWKEY` | Changer les clés de l'ISD |

### ⚠️ Gestion des clés

Les clés par défaut (cartes de test) :
```
404142434445464748494A4B4C4D4E4F
```

Changer les clés :
```bash
java -jar gp.jar -lock \\
  010203040506070801020304050607080102030405060708
```

Désormais, toutes les commandes nécessitent `-key` :
```bash
java -jar gp.jar \\
  -key 0102030405060708... -info
```

> ⚠️ **Si vous perdez les clés, la carte est définitivement verrouillée (brickée).**

### SCP03 (recommandé)

SCP03 utilise **AES** au lieu de 3DES :
- Canal sécurisé entre PC et carte
- Confidentialité + intégrité + authentification mutuelle
- Obligatoire pour les nouvelles cartes certifiées$$,
'["ISD = Issuer Security Domain, gère la sécurité globale de la carte","gp.jar = outil CLI open-source pour gérer les applets","Clés perdues = carte brickée définitivement","SCP03 = canal sécurisé AES (remplace SCP02 3DES)"]'::jsonb,
4, 40) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-5.4.5-securite', 'mod-5.4-javacard', 'Sécurité JavaCard et contremesures',
$$## Menaces sur les cartes à puce

### Attaques physiques

| Attaque | Méthode | Objectif |
|---------|---------|---------|
| **Fault injection** | Variation tension/horloge, laser | Sauter des instructions |
| **SPA** | Simple Power Analysis | Déduire les clés du profil de consommation |
| **DPA** | Differential Power Analysis | Analyse statistique de la consommation |
| **EM** | Émissions électromagnétiques | Fuite d'information |

### Contremesures à implémenter

**1. Temps constant** : éviter les branchements dépendants des données secrètes.

```java
// ❌ MAUVAIS : le temps dépend du PIN
if (pinCheck(provided)) { ... }

// ✅ BON : temps constant
boolean result = pinCheck(provided);
Util.arrayCopy(DUMMY, ...); // opération factice
if (result) { ... }
```

**2. Ordre aléatoire** :
```java
byte rnd = randomByte();
if ((rnd & 0x01) == 0) {
    processPartA(); processPartB();
} else {
    processPartB(); processPartA();
}
```

**3. Double exécution** : exécuter chaque opération sensible deux fois et comparer.

**4. Zéroïsation** : effacer les buffers après usage.

### Certification Common Criteria

Les cartes JavaCard peuvent être certifiées **EAL5+** :
- Analyse de vulnérabilité formelle
- Tests de résistance aux attaques physiques
- Évaluation du code source$$,
'["Fault injection : variation tension pour corrompre l''exécution","DPA : analyse statistique de la consommation → extraction de clés","Contremesures : temps constant, ordre aléatoire, double exécution","Certification EAL5+ = plus haut niveau pratique pour les cartes"]'::jsonb,
5, 40) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Module 5.5 – Java pour Embarqué (3 chapters)
-- =============================================================================

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-5.5.1-contraintes', 'mod-5.5-java-embarque', 'Contraintes Java embarqué',
$$## Java SE vs JavaCard

| Caractéristique | Java SE | JavaCard |
|----------------|---------|----------|
| Types | byte→double | byte, short, (int opt.) |
| Objets | Complets | Pas de String, ArrayList |
| GC | Oui | Non |
| Multi-threading | Oui | Non |
| Exceptions | Complètes | ISOException principalement |
| API | Énorme | ~50 classes |
| Mémoire | Go | Ko |

### Bonnes pratiques

1. **Utiliser `short`** plutôt que `int` (16 bits natif)
2. **Pas de `new`** dans `process()` (allocation EEPROM = lente + usure)
3. **Réutiliser le buffer APDU** comme mémoire de travail
4. **`Util.arrayCopy`** au lieu de boucles manuelles
5. **Constantes `static final`** stockées en ROM (pas EEPROM)

### Exemple de conversion Java SE → JavaCard

```java
// Java SE
public static int calculate(byte[] data) {
    int sum = 0;
    for (int i = 0; i < data.length; i++)
        sum += data[i] & 0xFF;
    return sum & 0xFFFF;
}

// JavaCard optimisé
public static short calculate(byte[] data,
    short offset, short length) {
    short sum = 0;
    for (short i = 0; i < length; i++)
        sum += (short)(data[(short)(offset + i)] & 0xFF);
    return sum;
}
```$$,
'["Utiliser short (16 bits) plutôt que int pour les indices et calculs","Pas d''allocation (new) dans process() : EEPROM lente + usure","Réutiliser le buffer APDU comme mémoire de travail temporaire","Util.arrayCopy = optimisé par la VM, plus rapide que les boucles"]'::jsonb,
1, 50) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-5.5.2-transactions', 'mod-5.5-java-embarque', 'Transactions atomiques JCRE',
$$## Atomicité en JavaCard

### Problème

Si une coupure survient pendant la mise à jour de plusieurs objets, les données peuvent être incohérentes.

### Solution : JCSystem

```java
public void transfer(APDU apdu) {
    byte[] buf = apdu.getBuffer();
    apdu.setIncomingAndReceive();

    short amount = Util.getShort(buf, ISO7816.OFFSET_CDATA);

    JCSystem.beginTransaction();
    try {
        if (!debit(sourceAccount, amount))
            ISOException.throwIt(ISO7816.SW_WRONG_DATA);
        credit(destAccount, amount);
        JCSystem.commitTransaction();
    } catch (Exception e) {
        JCSystem.abortTransaction();
        ISOException.throwIt(ISO7816.SW_UNKNOWN);
    }
}
```

### Comportement

| Événement | Résultat |
|-----------|---------|
| `commitTransaction()` | Toutes les modifications appliquées atomiquement |
| `abortTransaction()` | Toutes les modifications annulées |
| Coupure pendant | Rollback automatique au power-on |

### arrayCopy vs arrayCopyNonAtomic

| Méthode | Dans transaction ? | Rollback ? | Vitesse |
|---------|-------------------|-----------|---------|
| `Util.arrayCopy` | Oui | Oui | Lente |
| `Util.arrayCopyNonAtomic` | Non | Non | Rapide |

> Utiliser `arrayCopyNonAtomic` pour les données temporaires (non sensibles) hors transaction.$$,
'["JCSystem.beginTransaction/commitTransaction = atomicité garantie","Coupure pendant une transaction = rollback automatique","arrayCopy = transactionnel (lent), arrayCopyNonAtomic = non-transactionnel (rapide)","Essentiel pour maintenir la cohérence des données financières"]'::jsonb,
2, 40) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-5.5.3-optimisation', 'mod-5.5-java-embarque', 'Optimisation mémoire',
$$## Analyse de la consommation mémoire

### Types de mémoire

| Type | Contenu | Taille typique | Caractéristique |
|------|---------|---------------|----------------|
| **ROM** | Code, constantes `static final` | 32-256 KB | Lecture seule |
| **EEPROM/Flash** | Objets persistants (`new`) | 32-144 KB | Lent, usure |
| **RAM** | Variables locales, pile, buffer APDU | 2-8 KB | Rapide, volatile |

### Techniques d'optimisation

**1. Constantes en ROM**
```java
// Stocké en ROM (pas d'allocation EEPROM)
private static final byte[] HELLO =
    { 'H','E','L','L','O' };
```

**2. Réutilisation du buffer APDU**
```java
public void process(APDU apdu) {
    byte[] buf = apdu.getBuffer(); // 256 octets disponibles
    // Utiliser buf comme espace de travail temporaire
    // Pas besoin d'allouer un nouveau tableau
}
```

**3. Transient arrays (RAM)**
```java
// Alloué en RAM, pas en EEPROM
byte[] tempBuffer = JCSystem.makeTransientByteArray(
    (short)32, JCSystem.CLEAR_ON_DESELECT);
```

### Objectif : fichier .cap < 5 KB

| Composant | Taille typique |
|-----------|---------------|
| Code applet | 1-3 KB |
| Constantes | 0.5-1 KB |
| Métadonnées | 0.5 KB |
| **Total** | **2-5 KB** |

> Le fichier .cap doit être aussi petit que possible. Chaque octet compte sur une carte à puce.$$,
'["ROM = code + constantes, EEPROM = objets persistants, RAM = temporaire","makeTransientByteArray = allocation en RAM (non persistante)","Réutiliser le buffer APDU (256 octets) comme espace de travail","Objectif : fichier .cap < 5 KB pour une applet typique"]'::jsonb,
3, 40) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Module 5.6 – Base de Données bancaire (4 chapters)
-- =============================================================================

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-5.6.1-schema', 'mod-5.6-bdd', 'Schéma de base de données pour switch monétique',
$$## Tables principales

### Transactions d'autorisation

```sql
CREATE TABLE authorizations (
    id BIGINT PRIMARY KEY,
    pan_hash VARCHAR(64) NOT NULL,
    pan_token VARCHAR(32),
    amount DECIMAL(10,2),
    currency CHAR(3),
    merchant_id VARCHAR(15),
    terminal_id VARCHAR(8),
    response_code CHAR(2),
    arqc CHAR(16),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pan_hash (pan_hash),
    INDEX idx_merchant_date (merchant_id, created_at)
) PARTITION BY RANGE (YEAR(created_at));
```

### Routage BIN

```sql
CREATE TABLE bin_routing (
    bin_prefix VARCHAR(8) PRIMARY KEY,
    issuer_id INT NOT NULL,
    acquirer_id INT,
    scheme ENUM('VISA','MC','CB','AMEX'),
    priority TINYINT DEFAULT 1,
    active BOOLEAN DEFAULT TRUE,
    fallback_bin VARCHAR(8)
);
```

### Opposition (hotlist)

```sql
CREATE TABLE card_blocklist (
    pan_hash VARCHAR(64) PRIMARY KEY,
    reason ENUM('LOST','STOLEN','FRAUD','EXPIRED'),
    blocked_at TIMESTAMP,
    reported_by VARCHAR(50)
);
```

### Contraintes de conception

| Contrainte | Solution |
|-----------|---------|
| < 10 ms/requête | Index optimisés + cache Redis |
| ACID | Transactions DB + journalisation |
| PAN non en clair | Hash pour recherche, chiffré pour stockage |
| Millions TX/jour | Partitionnement mensuel |$$,
'["PAN stocké en hash (recherche) + chiffré (stockage séparé)","Partitionnement par mois pour gérer les volumes","Table bin_routing = cœur du routage du switch","Table card_blocklist = opposition en temps réel"]'::jsonb,
1, 50) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-5.6.2-dao', 'mod-5.6-bdd', 'DAO sécurisé avec chiffrement',
$$## Couche d'accès aux données

### Architecture

```
[Service d'autorisation]
        ↓
[TransactionDAO]
   ├── hashPAN() → stocker le hash
   ├── encrypt() → chiffrer le PAN (HSM)
   └── tokenize() → obtenir un token
        ↓
[PostgreSQL / MySQL]
```

### Implémentation Java

```java
public class TransactionDAO {
    private DataSource ds;
    private CipherUtil cipher; // Wrapper HSM

    public void save(Transaction tx) throws SQLException {
        String sql = "INSERT INTO authorizations " +
            "(pan_hash, pan_token, amount, currency, " +
            "merchant_id, terminal_id, response_code) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?)";

        try (Connection c = ds.getConnection();
             PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, hashPAN(tx.getPan()));
            ps.setString(2, tx.getToken());
            ps.setBigDecimal(3, tx.getAmount());
            ps.setString(4, tx.getCurrency());
            ps.setString(5, tx.getMerchantId());
            ps.setString(6, tx.getTerminalId());
            ps.setString(7, tx.getResponseCode());
            ps.executeUpdate();
        }
        // Sauvegarder le PAN chiffré séparément
        saveEncrypted(tx.getPan(), tx.getToken());
    }

    private String hashPAN(String pan) {
        return SHA256.hash(pan + SALT);
    }

    private void saveEncrypted(String pan, String token) {
        byte[] enc = cipher.encrypt(pan.getBytes());
        // INSERT INTO sensitive_card_data ...
    }
}
```

> Le PAN n'est **jamais** stocké en clair. Hash pour la recherche, chiffré pour la restitution (si autorisé).$$,
'["DAO sépare hash (recherche) et chiffré (stockage) du PAN","Hash SHA-256 avec sel pour la recherche rapide","Chiffrement AES-256 via HSM pour le stockage sécurisé","Le PAN en clair ne traverse que la mémoire du service, jamais persisté"]'::jsonb,
2, 45) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-5.6.3-optim', 'mod-5.6-bdd', 'Optimisation des performances',
$$## Requêtes problématiques

### Avant optimisation

```sql
-- MAUVAIS : fonctions sur les colonnes = pas d'index
SELECT COUNT(*) FROM authorizations
WHERE merchant_id = 12345
AND YEAR(created_at) = 2026
AND MONTH(created_at) = 2;
```

### Après optimisation

```sql
-- BON : condition de plage = utilise l'index
SELECT COUNT(*) FROM authorizations
WHERE merchant_id = '12345'
AND created_at >= '2026-02-01'
AND created_at < '2026-03-01';
```

### Techniques d'optimisation

| Technique | Gain | Quand utiliser |
|-----------|------|---------------|
| **Index composé** | ×100 | Requêtes fréquentes multi-colonnes |
| **Partitionnement** | ×10 | Tables > 10M lignes |
| **Cache Redis** | ×1000 | Données lues fréquemment (BIN, opposition) |
| **Prepared statements** | ×2 | Requêtes répétitives |
| **Connection pool** | ×5 | Haute concurrence |

### Calcul de capacité

```
5 000 TPS × 512 octets/msg = 2,56 Mo/s
Par jour : 2,56 × 86 400 = 221 Go
Par mois : 221 × 30 = 6,6 To
```

### Stratégie de rétention

| Période | Stockage | Accès |
|---------|----------|-------|
| 0-7 jours | Base primaire (SSD) | Temps réel |
| 7-90 jours | Base secondaire | Requêtes |
| 90j-13 mois | Archive (compressée) | Batch |
| > 13 mois | Supprimé (sauf obligation LCB-FT) | — |$$,
'["Éviter les fonctions sur les colonnes indexées (YEAR(), MONTH())","Cache Redis pour les données lues fréquemment (BIN routing, hotlist)","5 000 TPS = 221 Go/jour, partitionnement mensuel obligatoire","Rétention : temps réel → archive → suppression selon obligations"]'::jsonb,
3, 45) ON CONFLICT (id) DO NOTHING;

INSERT INTO learning.cursus_chapters (id, module_id, title, content, key_points, chapter_order, estimated_minutes)
VALUES ('ch-5.6.4-ha', 'mod-5.6-bdd', 'Haute disponibilité et intégration switch',
$$## Réplication et failover

### MySQL InnoDB Cluster

```yaml
# docker-compose.yml simplifié
services:
  mysql-primary:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: secret
    command: --server-id=1 --log-bin=mysql-bin
  mysql-replica:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: secret
    command: --server-id=2 --read-only=1
```

### PostgreSQL Patroni

```yaml
services:
  patroni1:
    image: patroni
    environment:
      PATRONI_NAME: pg1
      PATRONI_SCOPE: monetique
  patroni2:
    image: patroni
    environment:
      PATRONI_NAME: pg2
      PATRONI_SCOPE: monetique
  etcd:
    image: bitnami/etcd
```

### Intégration avec le switch

```java
public class DatabaseRoutingTable implements RoutingTable {
    private JdbcTemplate jdbc;
    private Cache<String, Route> cache; // Caffeine/Redis

    @Override
    public Route lookup(String bin) {
        // 1. Vérifier le cache
        Route cached = cache.getIfPresent(bin);
        if (cached != null) return cached;

        // 2. Requête DB
        String sql = "SELECT issuer_id, scheme, target_ip "
            + "FROM bin_routing "
            + "WHERE bin_prefix = LEFT(?, 6) "
            + "AND active = true "
            + "ORDER BY priority LIMIT 1";

        Route route = jdbc.queryForObject(sql, mapper, bin);
        cache.put(bin, route); // TTL 5 min
        return route;
    }
}
```

### Test de charge

```
Objectif : 1 000 TPS, latence < 5 ms (P99)
Outil : Apache JMeter ou Gatling
Métriques : P50, P95, P99, erreurs
```$$,
'["Réplication synchrone = 0 perte de données, asynchrone = meilleures perfs","Patroni + etcd = solution HA PostgreSQL recommandée","Cache (Redis/Caffeine) devant la DB pour le routage BIN","Test de charge : 1000 TPS, P99 < 5 ms"]'::jsonb,
4, 45) ON CONFLICT (id) DO NOTHING;
