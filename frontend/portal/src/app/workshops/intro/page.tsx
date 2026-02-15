'use client';

import { BookOpen } from 'lucide-react';
import { WorkshopCoursePage } from '@/components/workshops/WorkshopCoursePage';

const sections = [
    {
        id: 1,
        title: "Les Acteurs de la Monétique",
        content: `Le système de paiement par carte implique plusieurs acteurs clés :

**Le Porteur** : Le client qui utilise sa carte pour effectuer un paiement.

**Le Commerçant** : L'entreprise qui accepte le paiement par carte via un terminal (TPE).

**L'Acquéreur** : La banque du commerçant qui traite les transactions côté marchand.

**L'Émetteur** : La banque du porteur qui a émis la carte et autorise les transactions.

**Les Réseaux** : Visa, Mastercard, CB qui acheminent les messages entre acquéreur et émetteur.`,
        diagram: `
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Porteur  │───▶│   TPE    │───▶│Acquéreur │───▶│  Réseau  │
│  (Carte) │    │(Terminal)│    │ (Banque) │    │(Visa/MC) │
└──────────┘    └──────────┘    └──────────┘    └────┬─────┘
                                                     │
                                                     ▼
                                               ┌──────────┐
                                               │ Émetteur │
                                               │ (Banque) │
                                               └──────────┘
        `
    },
    {
        id: 2,
        title: "Cycle de Vie d'une Transaction",
        content: `Une transaction carte passe par plusieurs étapes :

**1. Initiation** : Le porteur présente sa carte (puce, sans contact, ou e-commerce).

**2. Authentification** : Vérification de l'identité (PIN, 3D Secure, biométrie).

**3. Autorisation** : L'émetteur vérifie le solde et approuve ou refuse.

**4. Compensation** : Les fonds sont transférés entre les banques (J+1 à J+3).

**5. Règlement** : Le commerçant reçoit les fonds sur son compte.`,
        diagram: `
Timeline d'une transaction:

T+0ms    : Carte insérée/approchée
T+50ms   : Lecture des données carte
T+100ms  : Demande d'autorisation envoyée
T+500ms  : Réponse émetteur reçue
T+600ms  : Ticket imprimé

J+1      : Fichier de compensation envoyé
J+2      : Règlement interbancaire
        `
    },
    {
        id: 3,
        title: "Les Types de Cartes",
        content: `Il existe plusieurs types de cartes bancaires :

**Cartes de Débit** : Prélèvement immédiat sur le compte (ex: Visa Débit).

**Cartes de Crédit** : Paiement différé avec ligne de crédit (ex: Visa Premier).

**Cartes Prépayées** : Rechargeable, sans compte bancaire associé.

**Cartes Virtuelles** : Numéros temporaires pour les paiements en ligne.

Chaque carte possède un **PAN** (Primary Account Number) de 16 chiffres :
- 6 premiers chiffres : BIN (identifie l'émetteur)
- Chiffres suivants : Numéro de compte
- Dernier chiffre : Clé de contrôle (Luhn)`,
        diagram: `
Structure d'un PAN:

4 9 7 0 - 1 2 3 4 - 5 6 7 8 - 9 0 1 2
├─────┤   ├─────────────────┤   ├─┤
  BIN      Numéro de compte   Luhn

BIN 497010 = Visa France (exemple)
        `
    },
    {
        id: 4,
        title: "Sécurité des Transactions",
        content: `La sécurité repose sur plusieurs couches :

**Puce EMV** : Cryptogramme unique par transaction (ARQC).

**PIN** : Code secret à 4-6 chiffres, vérifié en ligne ou hors ligne.

**CVV/CVC** : Code de sécurité pour les paiements à distance.

**3D Secure** : Authentification forte pour l'e-commerce (SMS, app bancaire).

**Tokenisation** : Remplacement du PAN par un jeton pour le stockage.

**Chiffrement Point-à-Point (P2PE)** : Protection des données en transit.`,
        diagram: `
Couches de sécurité:

┌─────────────────────────────────────┐
│         3D Secure (SCA)             │  ← E-commerce
├─────────────────────────────────────┤
│         Tokenisation                │  ← Stockage
├─────────────────────────────────────┤
│      Chiffrement P2PE               │  ← Transit
├─────────────────────────────────────┤
│    Cryptogramme EMV (ARQC)          │  ← Transaction
├─────────────────────────────────────┤
│         PIN / Biométrie             │  ← Authentification
└─────────────────────────────────────┘
        `
    }
];

export default function IntroWorkshopPage() {
    return (
        <WorkshopCoursePage
            workshopLabel="Atelier 1"
            title="Introduction à la Monétique"
            description="Comprendre le cycle de vie d'une transaction carte, du client au commerçant."
            icon={<BookOpen className="h-8 w-8 text-emerald-300" />}
            sections={sections}
        />
    );
}
