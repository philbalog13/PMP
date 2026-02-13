'use client';

import { Zap, Shield, Globe, ArrowRight, CheckCircle, ChevronLeft, Smartphone, CreditCard, Server } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

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
    const [currentSection, setCurrentSection] = useState(0);
    const [completedSections, setCompletedSections] = useState<number[]>([]);

    const markComplete = () => {
        if (!completedSections.includes(currentSection)) {
            setCompletedSections([...completedSections, currentSection]);
        }
        if (currentSection < sections.length - 1) {
            setCurrentSection(currentSection + 1);
        }
    };

    const progress = Math.round((completedSections.length / sections.length) * 100);

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <div className="border-b border-white/5 bg-slate-900/50">
                <div className="max-w-7xl mx-auto px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/workshops" className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                                <ChevronLeft size={20} />
                            </Link>
                            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                <Zap className="text-emerald-400" size={24} />
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Atelier 4 - Avancé</div>
                                <h1 className="text-xl font-bold">3D Secure v2 Multi-Domain</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-xs text-slate-500">Progression</div>
                                <div className="text-lg font-mono font-bold">{progress}%</div>
                            </div>
                            <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-8 py-8">
                <div className="grid lg:grid-cols-4 gap-8">
                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-4 sticky top-24">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Sommaire</h3>
                            <div className="space-y-2">
                                {sections.map((section, idx) => (
                                    <button
                                        key={section.id}
                                        onClick={() => setCurrentSection(idx)}
                                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${
                                            currentSection === idx
                                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-white'
                                                : 'hover:bg-white/5 text-slate-400'
                                        }`}
                                    >
                                        {completedSections.includes(idx) ? (
                                            <CheckCircle size={16} className="text-green-400" />
                                        ) : (
                                            <div className={`w-4 h-4 rounded-full border-2 ${
                                                currentSection === idx ? 'border-emerald-500' : 'border-slate-600'
                                            }`} />
                                        )}
                                        <span className="text-sm font-medium truncate">{section.title}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Legend */}
                            <div className="mt-6 p-4 bg-slate-800/50 rounded-xl">
                                <div className="text-xs font-bold text-slate-400 uppercase mb-3">Acteurs</div>
                                <div className="space-y-2 text-xs">
                                    <div className="flex items-center gap-2">
                                        <CreditCard size={14} className="text-blue-400" />
                                        <span className="text-slate-300">Porteur/Client</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Globe size={14} className="text-purple-400" />
                                        <span className="text-slate-300">Directory Server</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Server size={14} className="text-emerald-400" />
                                        <span className="text-slate-300">ACS (Émetteur)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Smartphone size={14} className="text-amber-400" />
                                        <span className="text-slate-300">3DS Server</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="lg:col-span-3 space-y-8">
                        <div className="bg-slate-900/50 rounded-3xl border border-white/5 p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <Shield className="text-emerald-400" size={28} />
                                <h2 className="text-3xl font-bold">{sections[currentSection].title}</h2>
                            </div>

                            <div className="prose prose-invert max-w-none">
                                {sections[currentSection].content.split('\n\n').map((paragraph, idx) => (
                                    <p key={idx} className="text-slate-300 leading-relaxed mb-4 whitespace-pre-line">
                                        {paragraph.split('**').map((part, i) =>
                                            i % 2 === 1 ? <strong key={i} className="text-white">{part}</strong> : part
                                        )}
                                    </p>
                                ))}
                            </div>

                            {/* Diagram */}
                            <div className="mt-8 p-6 bg-slate-950 rounded-2xl border border-emerald-500/20">
                                <div className="flex items-center gap-2 mb-4 text-xs text-emerald-400 font-bold uppercase tracking-wider">
                                    <Zap size={12} />
                                    Diagramme de flux
                                </div>
                                <pre className="text-sm text-emerald-400/80 font-mono overflow-x-auto whitespace-pre">
                                    {sections[currentSection].diagram}
                                </pre>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                                disabled={currentSection === 0}
                                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-colors"
                            >
                                Précédent
                            </button>

                            {currentSection === sections.length - 1 ? (
                                <Link
                                    href="/workshops"
                                    className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold flex items-center gap-2 transition-colors"
                                >
                                    <CheckCircle size={18} />
                                    Terminer l&apos;atelier
                                </Link>
                            ) : (
                                <button
                                    onClick={markComplete}
                                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold flex items-center gap-2 transition-colors"
                                >
                                    Continuer
                                    <ArrowRight size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}