'use client';

import { Terminal, Key, Shield, ArrowRight, CheckCircle, AlertTriangle, ChevronLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const sections = [
    {
        id: 1,
        title: "Introduction aux HSM",
        content: `Un **HSM** (Hardware Security Module) est un équipement physique dédié à la gestion sécurisée des clés cryptographiques.

**Rôle dans la monétique :**
- Génération de clés cryptographiques
- Stockage sécurisé (jamais en clair en dehors du HSM)
- Opérations cryptographiques (chiffrement, MAC, PIN)
- Protection contre les attaques physiques et logiques

**Fabricants principaux :**
- Thales (ex-Gemalto, ex-SafeNet)
- Utimaco
- Futurex
- IBM

**Certifications :**
- FIPS 140-2/140-3 Level 3 ou 4
- PCI HSM
- Common Criteria EAL4+`,
        example: `Architecture HSM typique:

┌─────────────────────────────────────────────────────┐
│                      HSM                            │
│  ┌─────────────────────────────────────────────┐   │
│  │              Secure Boundary                 │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────────┐  │   │
│  │  │   LMK   │  │ Crypto  │  │   Firmware  │  │   │
│  │  │ Storage │  │ Engine  │  │   (Signed)  │  │   │
│  │  └─────────┘  └─────────┘  └─────────────┘  │   │
│  │       │            │              │         │   │
│  │       └────────────┴──────────────┘         │   │
│  │                    │                        │   │
│  └────────────────────┼────────────────────────┘   │
│                       │ Tamper Detection           │
├───────────────────────┼────────────────────────────┤
│                       │                            │
│              API Interface (Host Commands)         │
└───────────────────────┴────────────────────────────┘`
    },
    {
        id: 2,
        title: "Hiérarchie des Clés",
        content: `Les clés sont organisées en hiérarchie pour assurer la sécurité :

**LMK (Local Master Key)**
- Clé racine du HSM, jamais exportée
- Chiffre toutes les autres clés
- Composée de plusieurs parts (cérémonie de clés)

**ZMK (Zone Master Key)**
- Clé d'échange entre institutions
- Utilisée pour transporter les clés de travail
- Aussi appelée KEK (Key Encrypting Key)

**ZPK (Zone PIN Key)**
- Chiffre les blocs PIN en transit
- Partagée entre acquéreur et émetteur

**ZAK (Zone Authentication Key)**
- Génère les MAC (Message Authentication Code)
- Garantit l'intégrité des messages

**ZEK (Zone Encryption Key)**
- Chiffre les données sensibles (Track 2, etc.)`,
        example: `Hiérarchie des clés:

         ┌─────────┐
         │   LMK   │  ← Clé Maître (dans HSM)
         └────┬────┘
              │ Chiffre
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐
│  ZMK  │ │  ZMK  │ │  ZMK  │  ← Clés d'échange
│(Bank1)│ │(Bank2)│ │(Visa) │
└───┬───┘ └───┬───┘ └───┬───┘
    │         │         │
    ▼         ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐
│ZPK/ZAK│ │ZPK/ZAK│ │ZPK/ZAK│  ← Clés de travail
└───────┘ └───────┘ └───────┘

Exemple de clé chiffrée sous LMK:
Clear ZPK: 0123456789ABCDEF FEDCBA9876543210
Under LMK: U 8A7B6C5D4E3F2A1B C1D2E3F4A5B6C7D8`
    },
    {
        id: 3,
        title: "Opérations sur les PIN",
        content: `Le HSM effectue les opérations sur les codes PIN de manière sécurisée :

**PIN Block Formats :**
- **Format 0 (ISO 9564-1)** : PIN XOR PAN
- **Format 1** : PIN + padding aléatoire
- **Format 3 (ISO 9564-3)** : PIN XOR PAN avec remplissage

**Opérations principales :**

**1. Génération de PIN**
- Création aléatoire ou dérivée
- Jamais visible en clair

**2. Vérification de PIN**
- Comparaison avec référence (PVV ou offset)
- Retourne OK/NOK, jamais le PIN

**3. Translation de PIN**
- Change le chiffrement d'une ZPK à une autre
- Indispensable pour le routage réseau

**4. PIN Offset/PVV**
- Valeur de vérification dérivée du PIN
- Stockée dans la base émetteur`,
        example: `Translation de PIN Block:

1. PIN Block reçu (sous ZPK acquéreur):
   Encrypted: 7B3F4A2E1C5D6B8A

2. Commande HSM: Translate PIN Block
   Input:  7B3F4A2E1C5D6B8A (under ZPK_ACQ)
   From:   ZPK_ACQ (stored under LMK)
   To:     ZPK_ISS (stored under LMK)

3. Processus interne HSM:
   a) Déchiffre avec ZPK_ACQ → PIN Block clair
   b) Rechiffre avec ZPK_ISS → nouveau cryptogramme

4. PIN Block traduit:
   Output: 2E5F8A1B4C7D3E6F (under ZPK_ISS)

Note: Le PIN en clair n'existe que dans le HSM!

Format 0 (ISO-0):
┌────┬────────────────┐
│ 04 │ P P P P F F F F│  ← 04 = longueur PIN, P=PIN, F=fill
└────┴────────────────┘
        XOR
┌────┬────────────────┐
│ 00 │ 0 0 A A A A A A│  ← 12 derniers chiffres PAN
└────┴────────────────┘
        =
┌────────────────────┐
│    PIN Block       │
└────────────────────┘`
    },
    {
        id: 4,
        title: "Cryptogrammes EMV (ARQC/ARPC)",
        content: `Les cartes EMV génèrent des cryptogrammes pour sécuriser chaque transaction :

**ARQC (Authorization Request Cryptogram)**
- Généré par la carte
- Prouve l'authenticité de la transaction
- Contient: montant, devise, date, ATC, etc.

**ARPC (Authorization Response Cryptogram)**
- Généré par l'émetteur (via HSM)
- Prouve l'authenticité de la réponse
- Validé par la carte

**Clés impliquées :**
- **IMK** (Issuer Master Key) : Dans le HSM émetteur
- **ICC Master Key** : Dérivée pour chaque carte
- **Session Key** : Dérivée pour chaque transaction

**Dérivation :**
\`\`\`
IMK → ICC_MK (via PAN) → Session_Key (via ATC)
\`\`\``,
        example: `Vérification ARQC:

1. Données reçues de la carte:
   PAN:    4532015432101234
   ATC:    001F (compteur transaction)
   ARQC:   A1B2C3D4E5F6A7B8

2. Commande HSM: Verify ARQC
   IMK:    U 1234567890ABCDEF... (under LMK)
   PAN:    4532015432101234
   ATC:    001F
   Data:   [Amount|Currency|Date|...]
   ARQC:   A1B2C3D4E5F6A7B8

3. Processus HSM:
   a) Dérive ICC_MK from IMK + PAN
   b) Dérive Session_Key from ICC_MK + ATC
   c) Calcule ARQC attendu avec Session_Key
   d) Compare avec ARQC reçu

4. Réponse:
   ✓ ARQC Verified Successfully

5. Génération ARPC:
   ARPC: 8B7A6C5D (à renvoyer à la carte)

Flux complet:
Card → [ARQC] → Terminal → Acquirer → Network → Issuer HSM
Card ← [ARPC] ← Terminal ← Acquirer ← Network ← Issuer HSM`
    },
    {
        id: 5,
        title: "Cérémonie de Clés",
        content: `La **cérémonie de clés** est le processus sécurisé de création et distribution des clés maîtres :

**Principes :**
- Séparation des responsabilités (dual control)
- Plusieurs gardiens de clés (key custodians)
- Aucune personne seule ne connaît la clé complète
- Environnement physique sécurisé

**Processus type (3 parts) :**

**1. Génération des composants**
- 3 personnes génèrent chacune 1 composant
- Chaque composant = 1/3 de la clé

**2. Injection dans le HSM**
- Chaque gardien entre son composant
- Le HSM combine les parts (XOR)
- La clé complète n'existe que dans le HSM

**3. Vérification**
- Calcul du KCV (Key Check Value)
- 6 caractères hexa = SHA ou 3DES du zéro

**4. Documentation**
- Chaque composant scellé dans une enveloppe
- Stockage en coffres séparés`,
        example: `Exemple de cérémonie 3 parts:

Gardien A génère:
  Component 1: 1111 1111 1111 1111 2222 2222 2222 2222
  KCV: A1B2C3

Gardien B génère:
  Component 2: 3333 3333 3333 3333 4444 4444 4444 4444
  KCV: D4E5F6

Gardien C génère:
  Component 3: 5555 5555 5555 5555 6666 6666 6666 6666
  KCV: 78901A

Combinaison (XOR):
  1111...2222 XOR 3333...4444 XOR 5555...6666
  = 7777 7777 7777 7777 0000 0000 0000 0000

Clé finale (dans HSM seulement):
  LMK: 7777 7777 7777 7777 0000 0000 0000 0000
  KCV: BC3D4E

Vérification:
  ✓ KCV calculé = KCV attendu
  ✓ Clé injectée avec succès

Stockage des composants:
  ┌─────────┐  ┌─────────┐  ┌─────────┐
  │ Coffre  │  │ Coffre  │  │ Coffre  │
  │    A    │  │    B    │  │    C    │
  │ ┌─────┐ │  │ ┌─────┐ │  │ ┌─────┐ │
  │ │Comp1│ │  │ │Comp2│ │  │ │Comp3│ │
  │ └─────┘ │  │ └─────┘ │  │ └─────┘ │
  └─────────┘  └─────────┘  └─────────┘`
    }
];

export default function HSMKeysWorkshopPage() {
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
                            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                <Terminal className="text-amber-400" size={24} />
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Atelier 3 - Avancé</div>
                                <h1 className="text-xl font-bold">Gestion des Clés HSM</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                                <AlertTriangle size={14} className="text-amber-400" />
                                <span className="text-xs font-bold text-amber-400">Niveau Avancé</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-xs text-slate-500">Progression</div>
                                    <div className="text-lg font-mono font-bold">{progress}%</div>
                                </div>
                                <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-amber-500 transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
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
                                                ? 'bg-amber-500/10 border border-amber-500/20 text-white'
                                                : 'hover:bg-white/5 text-slate-400'
                                        }`}
                                    >
                                        {completedSections.includes(idx) ? (
                                            <CheckCircle size={16} className="text-green-400" />
                                        ) : (
                                            <div className={`w-4 h-4 rounded-full border-2 ${
                                                currentSection === idx ? 'border-amber-500' : 'border-slate-600'
                                            }`} />
                                        )}
                                        <span className="text-sm font-medium truncate">{section.title}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Security Notice */}
                            <div className="mt-6 p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
                                <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase mb-2">
                                    <Shield size={14} />
                                    Avertissement
                                </div>
                                <p className="text-xs text-slate-400">
                                    Les clés présentées sont des exemples pédagogiques. Ne jamais utiliser de vraies clés en dehors d'un environnement sécurisé.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="lg:col-span-3 space-y-8">
                        <div className="bg-slate-900/50 rounded-3xl border border-white/5 p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <Key className="text-amber-400" size={28} />
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

                            {/* Example */}
                            <div className="mt-8 p-6 bg-slate-950 rounded-2xl border border-amber-500/20">
                                <div className="flex items-center gap-2 mb-4 text-xs text-amber-400 font-bold uppercase tracking-wider">
                                    <Lock size={12} />
                                    Exemple Cryptographique
                                </div>
                                <pre className="text-sm text-amber-400/80 font-mono overflow-x-auto whitespace-pre-wrap">
                                    {sections[currentSection].example}
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
                                    Terminer l'atelier
                                </Link>
                            ) : (
                                <button
                                    onClick={markComplete}
                                    className="px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold flex items-center gap-2 transition-colors"
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
