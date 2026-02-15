'use client';

import { Code } from 'lucide-react';
import { WorkshopCoursePage } from '@/components/workshops/WorkshopCoursePage';

const sections = [
    {
        id: 1,
        title: "Qu'est-ce que ISO 8583 ?",
        content: `**ISO 8583** est le standard international pour les messages de transactions financières par carte.

Il définit le format des messages échangés entre les terminaux de paiement, les acquéreurs, les réseaux et les émetteurs.

**Caractéristiques principales :**
- Format binaire optimisé pour les télécommunications
- Structure flexible avec des champs optionnels (bitmaps)
- Utilisé par Visa, Mastercard, et la plupart des réseaux

**Versions :**
- ISO 8583:1987 (originale)
- ISO 8583:1993 (améliorée)
- ISO 8583:2003 (actuelle)`,
        example: `Structure générale d'un message ISO 8583:

┌─────────┬─────────┬─────────────────────────────────┐
│   MTI   │ Bitmap  │        Data Elements            │
│ 4 bytes │ 8-16 B  │      Variable length            │
└─────────┴─────────┴─────────────────────────────────┘

Exemple de message (hexadécimal):
0100 7238000000C00000 164532...

MTI 0100 = Authorization Request`
    },
    {
        id: 2,
        title: "Message Type Indicator (MTI)",
        content: `Le **MTI** est un code à 4 chiffres qui identifie le type de message :

**Position 1 - Version ISO :**
- 0 = ISO 8583:1987
- 1 = ISO 8583:1993
- 2 = ISO 8583:2003

**Position 2 - Classe de message :**
- 1 = Authorization
- 2 = Financial (présentation)
- 4 = Reversal
- 8 = Network Management

**Position 3 - Fonction :**
- 0 = Request
- 1 = Response
- 2 = Advice
- 3 = Advice Response

**Position 4 - Origine :**
- 0 = Acquirer
- 1 = Acquirer Repeat
- 2 = Issuer
- 3 = Issuer Repeat`,
        example: `Exemples de MTI courants:

┌──────┬─────────────────────────────────────┐
│ MTI  │ Description                         │
├──────┼─────────────────────────────────────┤
│ 0100 │ Authorization Request               │
│ 0110 │ Authorization Response              │
│ 0200 │ Financial Request (Presentment)     │
│ 0210 │ Financial Response                  │
│ 0400 │ Reversal Request                    │
│ 0410 │ Reversal Response                   │
│ 0420 │ Reversal Advice                     │
│ 0800 │ Network Management Request          │
│ 0810 │ Network Management Response         │
└──────┴─────────────────────────────────────┘`
    },
    {
        id: 3,
        title: "Bitmap et Data Elements",
        content: `Le **Bitmap** indique quels champs (Data Elements) sont présents dans le message.

**Primary Bitmap** : 64 bits (champs 1-64)
**Secondary Bitmap** : 64 bits additionnels (champs 65-128) si bit 1 = 1

**Data Elements importants :**
- **DE 2** : PAN (Primary Account Number)
- **DE 3** : Processing Code
- **DE 4** : Transaction Amount
- **DE 11** : STAN (System Trace Audit Number)
- **DE 12/13** : Date et heure
- **DE 22** : Point of Service Entry Mode
- **DE 35** : Track 2 Data
- **DE 39** : Response Code
- **DE 41** : Terminal ID
- **DE 42** : Merchant ID
- **DE 55** : ICC Data (EMV)`,
        example: `Décodage d'un Bitmap:

Bitmap: 7238000000C00000 (hex)

Binary: 0111 0010 0011 1000 0000 0000 0000 0000
        0000 0000 1100 0000 0000 0000 0000 0000

Champs présents:
Bit 2  (1) → DE 2  : PAN ✓
Bit 3  (1) → DE 3  : Processing Code ✓
Bit 4  (1) → DE 4  : Amount ✓
Bit 7  (1) → DE 7  : Transmission Date ✓
Bit 11 (1) → DE 11 : STAN ✓
Bit 12 (1) → DE 12 : Local Time ✓
Bit 41 (1) → DE 41 : Terminal ID ✓
Bit 42 (1) → DE 42 : Merchant ID ✓`
    },
    {
        id: 4,
        title: "Codes de Réponse (DE 39)",
        content: `Le **Data Element 39** contient le code de réponse de l'émetteur :

**Codes d'approbation :**
- **00** : Approved
- **08** : Approved with ID
- **10** : Partial Approval

**Codes de refus :**
- **05** : Do Not Honor
- **14** : Invalid Card Number
- **51** : Insufficient Funds
- **54** : Expired Card
- **55** : Incorrect PIN
- **61** : Exceeds Withdrawal Limit
- **65** : Exceeds Frequency Limit

**Codes techniques :**
- **91** : Issuer Unavailable
- **96** : System Malfunction`,
        example: `Matrice de décision Response Code:

┌──────┬──────────────────┬───────────────────┐
│ Code │ Action Terminal  │ Message Client    │
├──────┼──────────────────┼───────────────────┤
│  00  │ Imprimer ticket  │ "Paiement accepté"│
│  05  │ Refuser          │ "Refusé"          │
│  51  │ Refuser          │ "Solde insuffisant│
│  55  │ Retry PIN        │ "PIN incorrect"   │
│  91  │ Store & Forward  │ "Réessayer"       │
└──────┴──────────────────┴───────────────────┘

Note: Max 3 tentatives PIN avant blocage (DE 55)`
    },
    {
        id: 5,
        title: "Exercice Pratique",
        content: `**Décodez ce message ISO 8583 :**

Message complet (hex):
\`0100 7238000000C00000 16 4532015432101234 00 0000 000000100000 1234567890 123456 143022 00000001 TERM0001 MERCHANT00001\`

**Questions :**
1. Quel est le type de message (MTI) ?
2. Quels Data Elements sont présents ?
3. Quel est le montant de la transaction ?
4. Quel est le PAN (masqué) ?

**Indices :**
- MTI 0100 = ?
- DE 4 = Montant en centimes
- DE 2 = PAN avec préfixe de longueur`,
        example: `Solution:

1. MTI 0100 = Authorization Request (demande d'autorisation)

2. Bitmap 7238000000C00000:
   - DE 2  : PAN
   - DE 3  : Processing Code
   - DE 4  : Amount
   - DE 11 : STAN
   - DE 12 : Local Time
   - DE 41 : Terminal ID
   - DE 42 : Merchant ID

3. DE 4 = 000000100000 = 1000,00 EUR (100000 centimes)

4. DE 2 = 4532015432101234 → 4532 01** **** 1234

Terminal: TERM0001
Marchand: MERCHANT00001`
    }
];
export default function Iso8583WorkshopPage() {
    return (
        <WorkshopCoursePage
            workshopLabel="Atelier 2"
            title="Protocole ISO 8583"
            description="Maîtrisez le format standard des messages financiers et décodez les MTI."
            icon={<Code className="h-8 w-8 text-emerald-300" />}
            sections={sections}
        />
    );
}
