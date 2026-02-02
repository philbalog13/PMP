'use client';

import { use } from 'react';
import Link from 'next/link';
import { Book, ArrowLeft, CheckCircle } from 'lucide-react';

const theoryContent: Record<
    string,
    {
        title: string;
        description: string;
        sections: { title: string; content: string }[];
    }
> = {
    '04': {
        title: 'Module 04: Protocoles ISO 8583',
        description:
            'Comprendre la structure et le fonctionnement des messages ISO 8583 pour les transactions bancaires.',
        sections: [
            {
                title: '1. Introduction à ISO 8583',
                content: `ISO 8583 est le standard international pour les échanges de messages de transactions financières électroniques. Développé en 1987, il définit le format des messages échangés entre terminaux de paiement, acquéreurs et émetteurs de cartes.

Le protocole est divisé en plusieurs parties :
- Format des messages
- Types de données
- Actions et codes de réponse
- Procédures de réconciliation`,
            },
            {
                title: '2. Structure d\'un message ISO 8583',
                content: `Un message ISO 8583 se compose de 4 parties principales :

**MTI (Message Type Indicator)** - 4 chiffres
- Position 1: Version (0=1987, 1=1993, 2=2003)
- Position 2: Classe (1=Authorization, 2=Financial)
- Position 3: Fonction (0=Request, 1=Response)
- Position 4: Origine (0=Acquirer, 1=Issuer)

**Bitmap** - Indique quels data elements sont présents
- Primaire: 64 bits (DE1-DE64)
- Secondaire: 64 bits (DE65-DE128)

**Data Elements** - Jusqu'à 128 champs de données
- DE2: PAN (Primary Account Number)
- DE4: Montant de la transaction
- DE11: STAN (System Trace Audit Number)
- DE39: Code de réponse

**MAC (Message Authentication Code)** - Sécurité du message`,
            },
            {
                title: '3. Exemples de MTI',
                content: `Exemples de codes MTI courants :

**0100** - Authorization Request
Demande d'autorisation initiale pour une transaction

**0110** - Authorization Response
Réponse à une demande d'autorisation

**0200** - Financial Transaction Request
Transaction financière (débit/crédit réel)

**0210** - Financial Transaction Response
Réponse à une transaction financière

**0400** - Reversal Request
Annulation d'une transaction précédente

**0800** - Network Management Request
Message de gestion réseau (echo test)`,
            },
            {
                title: '4. Codes de réponse',
                content: `Les codes de réponse (DE39) indiquent le résultat de la transaction :

**00** - Approuvée
**05** - Ne pas honorer (refus général)
**14** - Numéro de carte invalide
**41** - Carte perdue
**43** - Carte volée
**51** - Fonds insuffisants
**54** - Carte expirée
**55** - PIN incorrect
**91** - Émetteur indisponible

Ces codes permettent au terminal de savoir comment réagir et quel message afficher au porteur.`,
            },
        ],
    },
    '05': {
        title: 'Module 05: 3D Secure Multi-Domain',
        description:
            'Maîtriser le protocole 3D Secure pour l\'authentification des transactions e-commerce.',
        sections: [
            {
                title: '1. Les 3 domaines de 3D Secure',
                content: `3D Secure tire son nom de ses trois domaines de sécurité :

**Issuer Domain (Domaine Émetteur)**
- Géré par la banque émettrice de la carte
- Composant principal: ACS (Access Control Server)
- Responsable de l'authentification du porteur

**Acquirer Domain (Domaine Acquéreur)**
- Géré par le marchand et sa banque acquéreuse
- Composant principal: 3DS Server / Merchant Plug-in
- Initie la demande d'authentification

**Interoperability Domain (Domaine d'Interopérabilité)**
- Géré par les réseaux de cartes (Visa, Mastercard)
- Composant principal: DS (Directory Server)
- Route les messages entre acquéreur et émetteur`,
            },
            {
                title: '2. Flux d\'une transaction 3DS 2.x',
                content: `Étapes d'une transaction avec 3D Secure 2.0+ :

**Étape 1: Collecte de données**
Le navigateur collecte ~100 data points (appareil, comportement, historique)

**Étape 2: Demande d'authentification (AReq)**
Le marchand envoie une demande au DS avec les données collectées

**Étape 3: Routage**
Le DS identifie l'émetteur et route vers l'ACS approprié

**Étape 4: Analyse de risque**
L'ACS évalue le risque basé sur les données reçues

**Étape 5: Décision**
- Risk faible → Frictionless (pas de challenge)
- Risk élevé → Challenge requis (OTP, biométrie)

**Étape 6: Réponse (ARes)**
L'ACS renvoie le statut d'authentification (Y/N/A/U)

**Étape 7: Autorisation**
Le marchand peut procéder à l'autorisation avec le statut 3DS`,
            },
            {
                title: '3. Statuts d\'authentification',
                content: `Les statuts possibles en 3DS 2.x :

**Y (Yes)** - Authentification réussie
Le porteur a prouvé son identité avec succès

**N (No)** - Authentification échouée
Le porteur n'a pas réussi l'authentification

**A (Attempt)** - Tentative d'authentification
L'ACS ou le porteur ne supporte pas 3DS, mais tentative effectuée

**U (Unavailable)** - Indisponible
L'ACS n'est pas disponible pour cette transaction

**R (Rejected)** - Rejeté
La transaction a été rejetée pour fraude suspectée

**C (Challenge Required)** - Challenge requis
Un challenge supplémentaire est nécessaire`,
            },
            {
                title: '4. Avantages du Frictionless Flow',
                content: `Le frictionless flow de 3DS 2.x apporte plusieurs bénéfices :

**Pour le marchand:**
- Réduction de l'abandon de panier (moins de friction)
- Meilleur taux de conversion
- Transfert de liability (protection fraude)

**Pour le porteur:**
- Expérience utilisateur améliorée
- Pas d'interruption pour transactions à faible risque
- Protection contre la fraude

**Pour l'émetteur:**
- Meilleure détection de fraude via risk-based authentication
- Réduction des coûts (moins de challenges)
- Données enrichies pour scoring

Le taux de frictionless peut atteindre 85-95% selon les marchands et régions.`,
            },
        ],
    },
    '06': {
        title: 'Module 06: Cryptographie HSM v2',
        description:
            'Approfondir la gestion des clés cryptographiques et la sécurité des HSM.',
        sections: [
            {
                title: '1. Architecture HSM',
                content: `Un HSM (Hardware Security Module) est un dispositif physique sécurisé dédié à :
- Génération de clés cryptographiques
- Stockage sécurisé des clés
- Opérations cryptographiques (chiffrement, signature, MAC)
- Protection contre les attaques physiques

**Composants principaux:**
- Processeur cryptographique dédié
- Mémoire volatile sécurisée (RAM)
- Stockage persistant chiffré
- Batterie de secours
- Mécanismes anti-tampering

**Certifications:**
- FIPS 140-2 Level 3/4
- Common Criteria EAL4+
- PCI HSM v3`,
            },
            {
                title: '2. Hiérarchie des clés',
                content: `Les HSM utilisent une hiérarchie de clés pour la sécurité :

**LMK (Local Master Key)** - Niveau 0
- Clé racine du HSM, jamais exportée
- Générée à l'initialisation
- Protège toutes les clés locales

**ZMK (Zone Master Key)** - Niveau 1
- Clé d'échange entre deux zones sécurisées
- Utilisée pour chiffrer les clés de travail échangées
- Exemple: Acquirer ↔ Issuer

**ZPK (Zone PIN Key)** - Niveau 2
- Clé de chiffrement de PIN
- Protège les PINs en transit

**TMK (Terminal Master Key)** - Niveau 2
- Clé maître d'un terminal
- Protège les clés de session

**KEK (Key Encryption Key)** - Niveau 2
- Clé de chiffrement de clés
- Utilisée pour l'échange sécurisé`,
            },
            {
                title: '3. Key Splitting et Dual Control',
                content: `Pour une sécurité maximale, les clés sensibles sont "split" :

**Principe du Key Splitting:**
Une clé K est divisée en N composants (K1, K2, K3...)
K = K1 ⊕ K2 ⊕ K3 (XOR des composants)

**Schémas communs:**
- 2-of-2: Nécessite 2 composants sur 2
- 3-of-3: Nécessite 3 composants sur 3
- 3-of-5: Nécessite 3 composants sur 5 disponibles

**Dual Control:**
Principe PCI DSS: "No single person should have access to complete keys"
- Chaque composant est confié à une personne différente
- Les clés ne sont jamais reconstituées en clair hors du HSM
- Cérémonie de chargement de clés avec témoins

**Avantages:**
- Empêche la compromission par un seul insider
- Traçabilité et audit
- Conformité réglementaire`,
            },
            {
                title: '4. Rotation de clés',
                content: `La rotation régulière des clés est critique pour la sécurité :

**Pourquoi rotater:**
- Limiter l'exposition en cas de compromission
- Réduire la quantité de données chiffrées avec une même clé
- Conformité PCI DSS (rotation annuelle minimale)

**Stratégies de rotation:**

**Rolling Rotation:**
Les anciennes clés sont conservées pour déchiffrer l'ancien contenu
Les nouvelles opérations utilisent la nouvelle clé

**Big Bang Rotation:**
Toutes les clés changent simultanément
Nécessite re-chiffrement de toutes les données

**Rotation des clés de PIN:**
1. Génération nouvelle ZPK
2. Échange sécurisé avec le partenaire
3. Migration progressive des terminaux
4. Décommission ancienne ZPK après période de grâce

**Période recommandée:**
- LMK: Jamais (ou réinitialisation complète HSM)
- ZMK/ZPK: 1 an (PCI DSS minimum)
- KEK: 6 mois
- Clés de session: 24h`,
            },
        ],
    },
};

export default function TheoryPage({ params }: { params: Promise<{ moduleId: string }> }) {
    const { moduleId } = use(params);

    const content = theoryContent[moduleId];

    if (!content) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-black">Théorie non disponible</h1>
                    <Link
                        href="/student"
                        className="inline-block px-6 py-3 bg-emerald-600 rounded-lg hover:bg-emerald-500 transition"
                    >
                        Retour au parcours
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <Link
                        href="/student"
                        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Retour au parcours
                    </Link>

                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-blue-500/20 rounded-2xl border border-blue-500/30">
                            <Book className="w-8 h-8 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black">{content.title}</h1>
                            <p className="text-slate-400 mt-2">{content.description}</p>
                        </div>
                    </div>
                </div>

                {/* Table of contents */}
                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6">
                    <h2 className="text-xl font-bold mb-4">Sommaire</h2>
                    <ul className="space-y-2">
                        {content.sections.map((section, index) => (
                            <li key={index}>
                                <a
                                    href={`#section-${index}`}
                                    className="text-slate-400 hover:text-emerald-400 transition"
                                >
                                    {section.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Content sections */}
                <div className="space-y-8">
                    {content.sections.map((section, index) => (
                        <div
                            key={index}
                            id={`section-${index}`}
                            className="bg-slate-900/60 border border-white/10 rounded-2xl p-8 space-y-4"
                        >
                            <h2 className="text-2xl font-black text-emerald-400">
                                {section.title}
                            </h2>
                            <div className="prose prose-invert prose-slate max-w-none">
                                {section.content.split('\n\n').map((paragraph, pIndex) => {
                                    // Check if paragraph starts with ** (bold heading)
                                    if (paragraph.startsWith('**')) {
                                        const match = paragraph.match(/\*\*(.*?)\*\*/);
                                        if (match) {
                                            const heading = match[1];
                                            const rest = paragraph.replace(match[0], '').trim();
                                            return (
                                                <div key={pIndex} className="mt-4">
                                                    <h3 className="text-lg font-bold text-blue-400 mb-2">
                                                        {heading}
                                                    </h3>
                                                    <p className="text-slate-300 leading-relaxed">
                                                        {rest}
                                                    </p>
                                                </div>
                                            );
                                        }
                                    }
                                    return (
                                        <p
                                            key={pIndex}
                                            className="text-slate-300 leading-relaxed"
                                        >
                                            {paragraph}
                                        </p>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Action buttons */}
                <div className="flex gap-4 justify-center pt-8">
                    <Link
                        href={`/student/quiz/${moduleId}`}
                        className="px-8 py-4 bg-emerald-600 rounded-2xl font-bold hover:bg-emerald-500 transition flex items-center gap-2"
                    >
                        <CheckCircle className="w-5 h-5" />
                        Passer le quiz
                    </Link>
                    <Link
                        href="/student"
                        className="px-8 py-4 bg-slate-800 rounded-2xl font-bold hover:bg-slate-700 transition"
                    >
                        Retour au parcours
                    </Link>
                </div>
            </div>
        </div>
    );
}
