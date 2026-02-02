'use client';

import { Code, Terminal, ArrowRight, CheckCircle, Play, ChevronLeft, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

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

export default function ISO8583WorkshopPage() {
    const [currentSection, setCurrentSection] = useState(0);
    const [completedSections, setCompletedSections] = useState<number[]>([]);
    const [copied, setCopied] = useState(false);

    const markComplete = () => {
        if (!completedSections.includes(currentSection)) {
            setCompletedSections([...completedSections, currentSection]);
        }
        if (currentSection < sections.length - 1) {
            setCurrentSection(currentSection + 1);
        }
    };

    const copyExample = () => {
        navigator.clipboard.writeText(sections[currentSection].example);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
                            <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                                <Code className="text-purple-400" size={24} />
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Atelier 2</div>
                                <h1 className="text-xl font-bold">Protocole ISO 8583</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-xs text-slate-500">Progression</div>
                                <div className="text-lg font-mono font-bold">{progress}%</div>
                            </div>
                            <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-purple-500 transition-all duration-500"
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
                                                ? 'bg-purple-500/10 border border-purple-500/20 text-white'
                                                : 'hover:bg-white/5 text-slate-400'
                                        }`}
                                    >
                                        {completedSections.includes(idx) ? (
                                            <CheckCircle size={16} className="text-green-400" />
                                        ) : (
                                            <div className={`w-4 h-4 rounded-full border-2 ${
                                                currentSection === idx ? 'border-purple-500' : 'border-slate-600'
                                            }`} />
                                        )}
                                        <span className="text-sm font-medium truncate">{section.title}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="lg:col-span-3 space-y-8">
                        <div className="bg-slate-900/50 rounded-3xl border border-white/5 p-8">
                            <h2 className="text-3xl font-bold mb-6">{sections[currentSection].title}</h2>

                            <div className="prose prose-invert max-w-none">
                                {sections[currentSection].content.split('\n\n').map((paragraph, idx) => (
                                    <p key={idx} className="text-slate-300 leading-relaxed mb-4 whitespace-pre-line">
                                        {paragraph.split('**').map((part, i) =>
                                            i % 2 === 1 ? <strong key={i} className="text-white">{part}</strong> : part
                                        )}
                                    </p>
                                ))}
                            </div>

                            {/* Example/Diagram */}
                            <div className="mt-8 p-6 bg-slate-950 rounded-2xl border border-white/10 relative">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-wider">
                                        <Terminal size={12} />
                                        Exemple
                                    </div>
                                    <button
                                        onClick={copyExample}
                                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                                    >
                                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                        {copied ? 'Copié!' : 'Copier'}
                                    </button>
                                </div>
                                <pre className="text-sm text-purple-400 font-mono overflow-x-auto whitespace-pre-wrap">
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
                                    className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold flex items-center gap-2 transition-colors"
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
