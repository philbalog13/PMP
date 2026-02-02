'use client';

import { BookOpen, CreditCard, Building2, ArrowRight, CheckCircle, Play, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

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
                            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                <BookOpen className="text-blue-400" size={24} />
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Atelier 1</div>
                                <h1 className="text-xl font-bold">Introduction à la Monétique</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-xs text-slate-500">Progression</div>
                                <div className="text-lg font-mono font-bold">{progress}%</div>
                            </div>
                            <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-500"
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
                                                ? 'bg-blue-500/10 border border-blue-500/20 text-white'
                                                : 'hover:bg-white/5 text-slate-400'
                                        }`}
                                    >
                                        {completedSections.includes(idx) ? (
                                            <CheckCircle size={16} className="text-green-400" />
                                        ) : (
                                            <div className={`w-4 h-4 rounded-full border-2 ${
                                                currentSection === idx ? 'border-blue-500' : 'border-slate-600'
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

                            {/* Diagram */}
                            <div className="mt-8 p-6 bg-slate-950 rounded-2xl border border-white/10">
                                <div className="flex items-center gap-2 mb-4 text-xs text-slate-500 font-bold uppercase tracking-wider">
                                    <Play size={12} />
                                    Schéma
                                </div>
                                <pre className="text-sm text-blue-400 font-mono overflow-x-auto">
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
                                    Terminer l'atelier
                                </Link>
                            ) : (
                                <button
                                    onClick={markComplete}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold flex items-center gap-2 transition-colors"
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
