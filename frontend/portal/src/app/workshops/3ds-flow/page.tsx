'use client';

import { Zap } from 'lucide-react';
import { WorkshopCoursePage } from '@/components/workshops/WorkshopCoursePage';

const sections = [
    {
        id: 1,
        title: "Introduction au 3D Secure",
        content: `**3D Secure** (3DS) est un protocole d'authentification forte pour les paiements en ligne.

**Les 3 Domaines (3D) :**
- **Issuer Domain** : Banque émettrice (authentifie le porteur)
- **Acquirer Domain** : Banque du marchand (initie la transaction)
- **Interoperability Domain** : Réseau (Visa/Mastercard) qui fait le lien

**Évolution :**
- **3DS 1.0** (2001) : Redirect + iframe, UX médiocre
- **3DS 2.0** (2016) : Intégré, données enrichies, frictionless
- **3DS 2.1/2.2** : Améliorations SCA, exemptions

**Objectifs :**
- Réduire la fraude CNP (Card Not Present)
- Conformité PSD2/SCA en Europe
- Transfert de responsabilité (liability shift)`,
        diagram: `Comparaison 3DS v1 vs v2:

3DS 1.0 (Ancien):
┌────────┐   redirect   ┌─────────┐
│ Client │───────────▶│   ACS   │
│Browser │◀───────────│ (iframe)│
└────────┘   password   └─────────┘
     ↓
  Friction: 100%
  Abandon: ~30%

3DS 2.0 (Moderne):
┌────────┐   SDK/API    ┌─────────┐
│ Client │─────────────▶│   ACS   │
│App/Web │◀─────────────│(Native) │
└────────┘  frictionless └─────────┘
     ↓
  Friction: ~5%
  Abandon: ~5%`
    },
    {
        id: 2,
        title: "Les Acteurs du 3DS",
        content: `**3DS Server** (côté marchand/acquéreur)
- Collecte les données de transaction
- Envoie l'Authentication Request (AReq)
- Reçoit l'Authentication Response (ARes)

**Directory Server** (DS - géré par Visa/Mastercard)
- Route les messages entre 3DS Server et ACS
- Maintient les BIN ranges des émetteurs
- Fournit les clés de chiffrement

**Access Control Server** (ACS - côté émetteur)
- Authentifie le porteur
- Décide: Frictionless ou Challenge
- Génère l'Authentication Value (CAVV)

**3DS SDK/Client**
- Intégré dans l'app/site marchand
- Collecte les device fingerprints
- Affiche le challenge si nécessaire`,
        diagram: `Architecture 3DS 2.0:

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │     │  3DS Server │     │   Acquirer  │
│   ou App    │     │  (Marchand) │     │   (Banque)  │
└──────┬──────┘     └──────┬──────┘     └─────────────┘
       │                   │
       │ Device Info       │ AReq
       ▼                   ▼
┌─────────────┐     ┌─────────────┐
│   3DS SDK   │     │  Directory  │
│  (Client)   │     │   Server    │
└──────┬──────┘     └──────┬──────┘
       │                   │
       │ Challenge         │ Route
       ▼                   ▼
┌─────────────────────────────────┐
│              ACS                │
│    (Émetteur - Authentification)│
│  ┌─────────┐    ┌─────────────┐ │
│  │  Risk   │    │   Challenge │ │
│  │ Engine  │    │   Handler   │ │
│  └─────────┘    └─────────────┘ │
└─────────────────────────────────┘`
    },
    {
        id: 3,
        title: "Le Flux d'Authentification",
        content: `**Étape 1: Versioning (3DSMethod)**
- Détection de la version 3DS supportée par l'émetteur
- Collecte du device fingerprint (silent)

**Étape 2: Authentication Request (AReq)**
- Le 3DS Server envoie les données au DS
- Données: montant, marchand, device info, historique

**Étape 3: Décision Risk-Based**
L'ACS analyse et décide:
- **Frictionless** : Authentification silencieuse (pas de challenge)
- **Challenge** : Authentification requise (OTP, biométrie, etc.)
- **Reject** : Refus d'authentification

**Étape 4: Challenge (si requis)**
- L'ACS présente le challenge au porteur
- OTP SMS, notification push, biométrie, etc.
- Le porteur complète le challenge

**Étape 5: Authentication Response (ARes)**
- L'ACS retourne le résultat
- CAVV généré si succès
- Transaction Status: Y, N, A, U, R`,
        diagram: `Flux complet 3DS 2.0:

Browser        3DS Server      DS           ACS
   │               │            │            │
   │──[1] Init────▶│            │            │
   │               │──[2] Vers──▶│            │
   │               │◀──BIN OK───│            │
   │◀──3DSMethod───│            │            │
   │───Fingerprint─▶│            │            │
   │               │            │            │
   │               │──[3] AReq──▶│──AReq────▶│
   │               │            │            │
   │               │            │   ┌────────┤
   │               │            │   │ Risk   │
   │               │            │   │Analysis│
   │               │            │   └────────┤
   │               │            │            │
   │               │◀──ARes─────│◀──ARes────│
   │               │            │            │
   │   [Si Challenge requis]    │            │
   │◀──CReq────────│            │            │
   │               │            │            │
   │══════════[4] Challenge Screen══════════│
   │               │            │            │
   │───OTP/Bio────▶│────────────────────────▶│
   │               │            │            │
   │◀──CRes────────│◀───────────────────────│
   │               │            │            │
   │──[5] Complete─▶│            │            │
   │               │──Auth OK───▶│            │
   └───────────────┴────────────┴────────────┘

Légende:
  Y = Authentifié
  N = Non authentifié
  A = Tentative (issuer not enrolled)
  U = Impossible de vérifier
  R = Rejeté`
    },
    {
        id: 4,
        title: "Transaction Status et CAVV",
        content: `**Transaction Status (transStatus):**

| Code | Signification | Liability Shift |
|------|--------------|-----------------|
| **Y** | Authentifié | Oui (vers émetteur) |
| **N** | Non authentifié | Non |
| **A** | Tentative | Oui (selon réseau) |
| **U** | Non disponible | Non |
| **R** | Rejeté | Non |
| **C** | Challenge requis | En attente |

**CAVV (Cardholder Authentication Verification Value)**
- Cryptogramme prouvant l'authentification
- 28 caractères Base64
- Inclus dans le message d'autorisation (DE 55)

**ECI (Electronic Commerce Indicator)**
- Indique le niveau d'authentification
- Visa: 05 (full 3DS), 06 (attempted), 07 (non-3DS)
- Mastercard: 02 (full), 01 (attempted), 00 (non-3DS)`,
        diagram: `Génération du CAVV:

┌─────────────────────────────────────────────────────┐
│                      ACS                            │
│                                                     │
│  Inputs:                                            │
│  ├─ Transaction ID                                  │
│  ├─ ACS Reference Number                            │
│  ├─ Authentication Method                           │
│  ├─ Timestamp                                       │
│  └─ Secret Key (ACS)                               │
│                                                     │
│         │                                           │
│         ▼                                           │
│  ┌─────────────┐                                    │
│  │   HMAC      │                                    │
│  │  SHA-256    │                                    │
│  └─────────────┘                                    │
│         │                                           │
│         ▼                                           │
│  CAVV: AAABBWFlmQAAAABjRWWZEEFgFz0=                │
│                                                     │
└─────────────────────────────────────────────────────┘

Dans le message ISO 8583 (DE 55 - ICC Data):

Tag 9F26: Application Cryptogram (ARQC)
Tag 9F27: Cryptogram Information Data
Tag 9F10: Issuer Application Data
  └─ Contains: CAVV + ECI + 3DS Result

Exemple Authorization:
  MTI: 0100
  DE 55: ...9F269F10[CAVV_DATA]...

Si CAVV valide → Liability shift vers émetteur`
    },
    {
        id: 5,
        title: "Exemptions et SCA",
        content: `**SCA (Strong Customer Authentication)** - PSD2

Requiert 2 facteurs parmi:
- **Connaissance** : PIN, mot de passe
- **Possession** : Téléphone, carte
- **Inhérence** : Biométrie

**Exemptions SCA (éviter le challenge):**

**1. Faibles montants**
- < 30€ par transaction
- Cumul < 100€ ou 5 transactions

**2. Analyse de risque (TRA)**
- Taux de fraude acquéreur qualifié
- Montant selon seuil: 100€, 250€, 500€

**3. Bénéficiaire de confiance**
- Liste blanche du porteur
- Géré par l'émetteur

**4. Transactions récurrentes**
- Même montant, même marchand
- SCA sur première transaction uniquement

**5. MOTO/MIT**
- Mail Order / Telephone Order
- Merchant Initiated Transactions`,
        diagram: `Arbre de décision SCA:

                    ┌────────────────┐
                    │  Transaction   │
                    │   E-commerce   │
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │ Exemption      │
                    │ applicable ?   │
                    └───────┬────────┘
                           /│\\
              ┌───────────┘ │ └───────────┐
              │             │             │
       ┌──────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
       │  < 30€ ?   │ │  TRA OK?  │ │ Whitelist?│
       └──────┬─────┘ └─────┬─────┘ └─────┬─────┘
              │             │             │
    ┌─────────┴─────────────┴─────────────┴─────────┐
    │                                               │
    ▼ OUI                                     NON ▼
┌───────────┐                              ┌───────────┐
│Frictionless│                             │ Challenge │
│(Pas de SCA)│                             │  Requis   │
└───────────┘                              └───────────┘

Note: L'émetteur a toujours le dernier mot!
Il peut rejeter l'exemption et demander un challenge.`
    }
];

export default function ThreeDSFlowWorkshopPage() {
    return (
        <WorkshopCoursePage
            workshopLabel="Atelier 4"
            title="3D Secure v2 Multi-Domain"
            description="Analyse du flux Directory Server, ACS et challenge utilisateur."
            icon={<Zap className="h-8 w-8 text-emerald-300" />}
            sections={sections}
        />
    );
}
