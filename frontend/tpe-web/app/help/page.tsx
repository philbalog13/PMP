'use client';

import Link from 'next/link';
import { ArrowLeft, HelpCircle, BookOpen, Video, MessageCircle } from 'lucide-react';

const helpTopics = [
    {
        category: 'Premiers Pas',
        icon: '🚀',
        topics: [
            { title: 'Comment effectuer ma première transaction ?', href: '#first-transaction' },
            { title: 'Comprendre l\'interface du terminal', href: '#interface' },
            { title: 'Générer une carte de test', href: '#generate-card' }
        ]
    },
    {
        category: 'Transactions',
        icon: '💳',
        topics: [
            { title: 'Types de transactions supportées', href: '#transaction-types' },
            { title: 'Codes de réponse et leur signification', href: '#response-codes' },
            { title: 'Que faire en cas de refus ?', href: '#declined' }
        ]
    },
    {
        category: 'Sécurité',
        icon: '🔐',
        topics: [
            { title: 'Qu\'est-ce que le PIN Block ?', href: '#pin-block' },
            { title: 'Comprendre le MAC', href: '#mac' },
            { title: 'Normes PCI-DSS', href: '#pci-dss' }
        ]
    },
    {
        category: 'Dépannage',
        icon: '⚠️',
        topics: [
            { title: 'Erreur de connexion au serveur', href: '#connection-error' },
            { title: 'Transaction bloquée', href: '#stuck-transaction' },
            { title: 'Logs et débogage', href: '#debugging' }
        ]
    }
];

export default function HelpPage() {
    return (
        <div className="min-h-screen p-6">
            {/* Header */}
            <header className="mb-8">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Retour au Terminal
                </Link>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <HelpCircle className="w-8 h-8 text-blue-500" />
                    Centre d'Aide
                </h1>
                <p className="text-slate-400 mt-2">Trouvez des réponses à vos questions</p>
            </header>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
                <Link
                    href="/documentation"
                    className="p-6 rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 transition group"
                >
                    <BookOpen className="w-8 h-8 text-blue-400 mb-3" />
                    <h3 className="text-lg font-bold text-white mb-2">Documentation</h3>
                    <p className="text-slate-400 text-sm">Consultez la documentation technique complète</p>
                </Link>

                <Link
                    href="/demo"
                    className="p-6 rounded-2xl bg-gradient-to-br from-purple-600/20 to-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 transition group"
                >
                    <Video className="w-8 h-8 text-purple-400 mb-3" />
                    <h3 className="text-lg font-bold text-white mb-2">Tutoriels Vidéo</h3>
                    <p className="text-slate-400 text-sm">Apprenez avec des démonstrations guidées</p>
                </Link>

                <a
                    href="mailto:support@fined-sim.edu"
                    className="p-6 rounded-2xl bg-gradient-to-br from-green-600/20 to-green-500/10 border border-green-500/20 hover:border-green-500/40 transition group"
                >
                    <MessageCircle className="w-8 h-8 text-green-400 mb-3" />
                    <h3 className="text-lg font-bold text-white mb-2">Support Direct</h3>
                    <p className="text-slate-400 text-sm">Contactez l'équipe de support</p>
                </a>
            </div>

            {/* Help Topics */}
            <div className="grid md:grid-cols-2 gap-6">
                {helpTopics.map((section) => (
                    <div key={section.category} className="rounded-2xl bg-white/5 border border-white/5 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-3xl">{section.icon}</span>
                            <h2 className="text-xl font-bold text-white">{section.category}</h2>
                        </div>
                        <ul className="space-y-2">
                            {section.topics.map((topic, index) => (
                                <li key={index}>
                                    <a
                                        href={topic.href}
                                        className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition group"
                                    >
                                        <span className="text-slate-300 group-hover:text-white transition">
                                            {topic.title}
                                        </span>
                                        <ArrowLeft className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition rotate-180" />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* FAQ Highlight */}
            <div className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-amber-600/20 to-amber-500/10 border border-amber-500/20">
                <h2 className="text-2xl font-bold text-white mb-4">Questions Fréquentes</h2>
                <div className="space-y-4">
                    <details className="p-4 rounded-xl bg-white/5 cursor-pointer">
                        <summary className="font-medium text-white">
                            Comment tester une transaction refusée ?
                        </summary>
                        <p className="mt-3 text-slate-400 text-sm">
                            Utilisez le mode simulation et sélectionnez le scénario "Fonds Insuffisants" ou définissez un montant supérieur au solde de la carte virtuelle.
                        </p>
                    </details>

                    <details className="p-4 rounded-xl bg-white/5 cursor-pointer">
                        <summary className="font-medium text-white">
                            Où voir le détail des messages ISO 8583 ?
                        </summary>
                        <p className="mt-3 text-slate-400 text-sm">
                            Accédez au mode Debug depuis le menu principal, puis sélectionnez l'onglet "Messages ISO 8583" pour voir la structure complète des messages échangés.
                        </p>
                    </details>
                </div>
            </div>
        </div>
    );
}
