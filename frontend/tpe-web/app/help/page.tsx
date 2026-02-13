'use client';

import Link from 'next/link';
import { ArrowLeft, HelpCircle, BookOpen, Bug, MessageCircle, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const helpTopics = [
    {
        category: 'Premiers Pas',
        icon: BookOpen,
        color: 'text-blue-400',
        topics: [
            {
                title: 'Comment effectuer ma première transaction ?',
                answer: 'Sur la page principale du terminal, suivez les étapes : 1) Sélectionnez une carte virtuelle, 2) Choisissez un marchand, 3) Entrez le montant avec le clavier numérique, 4) Validez avec OK puis confirmez le paiement.'
            },
            {
                title: 'Comprendre l\'interface du terminal',
                answer: 'Le terminal est composé de deux parties : à gauche, le terminal physique avec son écran et clavier ; à droite, le flux de paiement guidé étape par étape. L\'écran du terminal affiche le montant saisi en temps réel.'
            },
            {
                title: 'Comment choisir une carte de test ?',
                answer: 'Le sélecteur de cartes affiche toutes les cartes virtuelles disponibles avec leur réseau (Visa, Mastercard), solde et statut 3DS. Chaque carte a des caractéristiques différentes pour tester divers scénarios.'
            }
        ]
    },
    {
        category: 'Transactions',
        icon: MessageCircle,
        color: 'text-emerald-400',
        topics: [
            {
                title: 'Types de transactions supportées',
                answer: 'Le terminal supporte 4 types : PURCHASE (achat standard), REFUND (remboursement), VOID (annulation), PRE_AUTH (pré-autorisation / blocage de fonds). Sélectionnez le type dans les Contrôles Rapides.'
            },
            {
                title: 'Codes de réponse et leur signification',
                answer: 'Code 00 = Approuvé, Code 05 = Refusé (ne pas honorer), Code 51 = Fonds insuffisants, Code 54 = Carte expirée, Code 43 = Carte volée/bloquée, Code 96 = Erreur système. Consultez le mode Debug pour voir les détails ISO 8583.'
            },
            {
                title: 'Que faire en cas de refus ?',
                answer: 'Vérifiez le code de réponse dans le résultat de la transaction. Consultez le solde de la carte, sa date d\'expiration et son statut. Utilisez le mode Debug pour analyser le message ISO 8583 complet.'
            }
        ]
    },
    {
        category: 'Sécurité',
        icon: HelpCircle,
        color: 'text-purple-400',
        topics: [
            {
                title: 'Qu\'est-ce que le 3D Secure ?',
                answer: '3D Secure est un protocole d\'authentification forte pour les paiements en ligne. Quand activé, l\'émetteur peut demander une vérification supplémentaire (OTP, biométrie). Le toggle 3DS sur la page de confirmation active/désactive cette vérification.'
            },
            {
                title: 'Comprendre le score de fraude',
                answer: 'Chaque transaction est analysée par un moteur de détection de fraude qui attribue un score de 0 à 100. Un score élevé indique un risque accru. Les règles incluent : montant élevé, velocity (fréquence), géolocalisation suspecte.'
            },
            {
                title: 'PIN Block et MAC',
                answer: 'Le PIN Block est le chiffrement du code PIN selon le format ISO 9564. Le MAC (Message Authentication Code) garantit l\'intégrité du message ISO 8583. Consultez le mode Debug > onglet Crypto pour voir ces valeurs.'
            }
        ]
    },
    {
        category: 'Dépannage',
        icon: Bug,
        color: 'text-amber-400',
        topics: [
            {
                title: 'Erreur de connexion au serveur',
                answer: 'Vérifiez que le backend API Gateway est démarré. Le terminal effectue un health check au démarrage. Si la connexion échoue, il passe en "mode dégradé" — les fonctionnalités de base restent disponibles mais les transactions ne seront pas persistées.'
            },
            {
                title: 'Transaction bloquée en "Traitement"',
                answer: 'Patientez quelques secondes, le timeout est de 30s. Si le problème persiste, actualisez la page. La transaction sera marquée comme timeout côté serveur et n\'apparaîtra pas comme approuvée.'
            },
            {
                title: 'Les logs ne s\'affichent pas',
                answer: 'Cliquez sur le bouton "Logs" dans les Contrôles Rapides pour ouvrir le panneau technique. Pour le mode Debug avancé, utilisez le lien "Debug" dans la barre de navigation.'
            }
        ]
    }
];

export default function HelpPage() {
    const [openTopic, setOpenTopic] = useState<string | null>(null);

    return (
        <div className="min-h-screen p-6">
            <header className="mb-8">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Retour au Terminal
                </Link>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <HelpCircle className="w-8 h-8 text-blue-500" />
                    Centre d&apos;Aide
                </h1>
                <p className="text-slate-400 mt-2">Trouvez des réponses à vos questions</p>
            </header>

            {/* Quick Links */}
            <div className="grid md:grid-cols-3 gap-4 mb-10">
                <Link
                    href="/simulation"
                    className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 transition"
                >
                    <BookOpen className="w-7 h-7 text-blue-400 mb-2" />
                    <h3 className="text-lg font-bold text-white mb-1">Scénarios de Test</h3>
                    <p className="text-slate-400 text-sm">Testez différents cas de paiement guidés</p>
                </Link>

                <Link
                    href="/debug"
                    className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition"
                >
                    <Bug className="w-7 h-7 text-amber-400 mb-2" />
                    <h3 className="text-lg font-bold text-white mb-1">Mode Debug</h3>
                    <p className="text-slate-400 text-sm">Analysez les messages ISO 8583 et la crypto</p>
                </Link>

                <Link
                    href="/transactions"
                    className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition"
                >
                    <MessageCircle className="w-7 h-7 text-emerald-400 mb-2" />
                    <h3 className="text-lg font-bold text-white mb-1">Historique</h3>
                    <p className="text-slate-400 text-sm">Consultez vos transactions passées</p>
                </Link>
            </div>

            {/* FAQ Sections */}
            <div className="space-y-6">
                {helpTopics.map((section) => {
                    const Icon = section.icon;
                    return (
                        <div key={section.category} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                            <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
                                <Icon size={20} className={section.color} />
                                <h2 className="text-lg font-bold text-white">{section.category}</h2>
                            </div>
                            <div className="divide-y divide-white/5">
                                {section.topics.map((topic) => {
                                    const key = `${section.category}-${topic.title}`;
                                    const isOpen = openTopic === key;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setOpenTopic(isOpen ? null : key)}
                                            className="w-full text-left px-6 py-4 hover:bg-white/5 transition"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-slate-200">{topic.title}</span>
                                                <ChevronDown size={16} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                            </div>
                                            {isOpen && (
                                                <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                                                    {topic.answer}
                                                </p>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
