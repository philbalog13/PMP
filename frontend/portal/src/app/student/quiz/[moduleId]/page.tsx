'use client';

import { useState, use } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, ArrowRight, ArrowLeft, Trophy } from 'lucide-react';
import Link from 'next/link';

interface Question {
    id: number;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
}

const quizData: Record<string, { title: string; questions: Question[] }> = {
    '01': {
        title: 'Atelier 01: Introduction à la Monétique',
        questions: [
            {
                id: 1,
                question: 'Quel acteur délivre la carte bancaire au porteur?',
                options: [
                    'L\'acquéreur',
                    'L\'émetteur',
                    'Le réseau Visa/Mastercard',
                    'Le commerçant',
                ],
                correctAnswer: 1,
                explanation: 'L\'émetteur (banque du porteur) est responsable de l\'émission de la carte et de l\'autorisation des transactions.',
            },
            {
                id: 2,
                question: 'Quel est le rôle de l\'acquéreur dans le circuit de paiement?',
                options: [
                    'Émettre les cartes bancaires',
                    'Traiter les transactions côté commerçant',
                    'Authentifier le porteur',
                    'Fixer les taux d\'interchange',
                ],
                correctAnswer: 1,
                explanation: 'L\'acquéreur est la banque du commerçant qui traite les transactions et gère le règlement.',
            },
            {
                id: 3,
                question: 'Combien de chiffres contient un PAN (Primary Account Number) standard?',
                options: ['12', '14', '16', '20'],
                correctAnswer: 2,
                explanation: 'Un PAN standard contient 16 chiffres: 6 pour le BIN, 9 pour le numéro de compte, et 1 pour la clé de contrôle Luhn.',
            },
            {
                id: 4,
                question: 'Qu\'est-ce que le BIN dans un numéro de carte?',
                options: [
                    'Le code de vérification',
                    'Les 6 premiers chiffres identifiant l\'émetteur',
                    'Le code PIN chiffré',
                    'La date d\'expiration',
                ],
                correctAnswer: 1,
                explanation: 'Le BIN (Bank Identification Number) correspond aux 6 premiers chiffres du PAN et identifie l\'émetteur.',
            },
            {
                id: 5,
                question: 'Quelle étape vient après l\'autorisation dans le cycle de paiement?',
                options: [
                    'L\'initiation',
                    'L\'authentification',
                    'La compensation',
                    'La présentation',
                ],
                correctAnswer: 2,
                explanation: 'Après l\'autorisation, la compensation (clearing) permet le transfert des fonds entre les banques.',
            },
        ],
    },
    '02': {
        title: 'Atelier 02: Protocole ISO 8583',
        questions: [
            {
                id: 1,
                question: 'Quel est le rôle du MTI (Message Type Indicator) dans ISO 8583?',
                options: [
                    'Identifier le type de transaction et sa classe',
                    'Chiffrer les données sensibles',
                    'Calculer le code MAC',
                    'Valider le numéro de carte',
                ],
                correctAnswer: 0,
                explanation: 'Le MTI est un code à 4 chiffres qui identifie le type de message (0100=autorisation, 0200=transaction financière, etc.)',
            },
            {
                id: 2,
                question: 'Combien de data elements peut contenir un message ISO 8583?',
                options: ['64', '128', '256', 'Illimité'],
                correctAnswer: 1,
                explanation: 'Un message ISO 8583 peut contenir jusqu\'à 128 data elements (DE1 à DE128).',
            },
            {
                id: 3,
                question: 'Quel data element contient le PAN (Primary Account Number)?',
                options: ['DE1', 'DE2', 'DE35', 'DE52'],
                correctAnswer: 1,
                explanation: 'Le DE2 contient le PAN, tandis que le DE35 contient les données de piste magnétique.',
            },
            {
                id: 4,
                question: 'Que signifie un code réponse "00" dans ISO 8583?',
                options: [
                    'Transaction refusée',
                    'Transaction approuvée',
                    'Erreur de format',
                    'Carte invalide',
                ],
                correctAnswer: 1,
                explanation: 'Le code "00" signifie que la transaction a été approuvée avec succès.',
            },
            {
                id: 5,
                question: 'Que signifie le MTI 0400?',
                options: [
                    'Demande d\'autorisation',
                    'Réponse d\'autorisation',
                    'Demande d\'annulation (reversal)',
                    'Message réseau',
                ],
                correctAnswer: 2,
                explanation: 'MTI 0400 = Reversal Request, utilisé pour annuler une transaction précédente.',
            },
        ],
    },
    '03': {
        title: 'Atelier 03: Gestion des Clés HSM',
        questions: [
            {
                id: 1,
                question: 'Que signifie HSM?',
                options: [
                    'Hardware Security Module',
                    'High Security Mode',
                    'Hash Security Manager',
                    'Hybrid System Module',
                ],
                correctAnswer: 0,
                explanation: 'HSM = Hardware Security Module, dispositif physique sécurisé pour gérer les clés cryptographiques.',
            },
            {
                id: 2,
                question: 'Quelle est la fonction du LMK (Local Master Key)?',
                options: [
                    'Chiffrer les clés de travail stockées dans le HSM',
                    'Chiffrer les données de cartes',
                    'Générer des OTP',
                    'Valider les certificats',
                ],
                correctAnswer: 0,
                explanation: 'La LMK est la clé racine du HSM qui protège toutes les autres clés stockées.',
            },
            {
                id: 3,
                question: 'Qu\'est-ce qu\'une ZMK (Zone Master Key)?',
                options: [
                    'Clé racine du HSM',
                    'Clé d\'échange entre deux institutions',
                    'Clé de chiffrement de PIN',
                    'Clé de signature',
                ],
                correctAnswer: 1,
                explanation: 'La ZMK (aussi appelée KEK) sécurise les échanges de clés entre institutions.',
            },
            {
                id: 4,
                question: 'Qu\'est-ce que le KCV (Key Check Value)?',
                options: [
                    'Le numéro de série du HSM',
                    'Une valeur de vérification de clé (6 hex)',
                    'Le code PIN chiffré',
                    'L\'identifiant de transaction',
                ],
                correctAnswer: 1,
                explanation: 'Le KCV est une empreinte de 6 caractères hexa permettant de vérifier qu\'une clé est correcte.',
            },
            {
                id: 5,
                question: 'Combien de gardiens de clés minimum pour une cérémonie 3-of-3?',
                options: ['1', '2', '3', '5'],
                correctAnswer: 2,
                explanation: 'Un schéma 3-of-3 nécessite exactement 3 gardiens, chacun détenant 1 composant.',
            },
        ],
    },
    '04': {
        title: 'Module 04: Protocoles ISO 8583',
        questions: [
            {
                id: 1,
                question: 'Quel est le rôle du MTI (Message Type Indicator) dans ISO 8583?',
                options: [
                    'Identifier le type de transaction et sa classe',
                    'Chiffrer les données sensibles',
                    'Calculer le code MAC',
                    'Valider le numéro de carte',
                ],
                correctAnswer: 0,
                explanation:
                    'Le MTI est un code à 4 chiffres qui identifie le type de message (0100=autorisation, 0200=transaction financière, etc.)',
            },
            {
                id: 2,
                question: 'Combien de data elements peut contenir un message ISO 8583?',
                options: ['64', '128', '256', 'Illimité'],
                correctAnswer: 1,
                explanation:
                    'Un message ISO 8583 peut contenir jusqu\'à 128 data elements (DE1 à DE128), avec possibilité d\'extension via DE127.',
            },
            {
                id: 3,
                question: 'Quel data element contient le PAN (Primary Account Number)?',
                options: ['DE1', 'DE2', 'DE35', 'DE52'],
                correctAnswer: 1,
                explanation: 'Le DE2 contient le PAN, tandis que le DE35 contient les données de piste magnétique.',
            },
            {
                id: 4,
                question: 'Que signifie un code réponse "00" dans ISO 8583?',
                options: [
                    'Transaction refusée',
                    'Transaction approuvée',
                    'Erreur de format',
                    'Carte invalide',
                ],
                correctAnswer: 1,
                explanation: 'Le code "00" signifie que la transaction a été approuvée avec succès.',
            },
            {
                id: 5,
                question: 'Quel est le format du bitmap primaire dans ISO 8583?',
                options: ['16 bits', '32 bits', '64 bits', '128 bits'],
                correctAnswer: 2,
                explanation:
                    'Le bitmap primaire fait 64 bits (8 octets) et indique la présence des DE1 à DE64.',
            },
        ],
    },
    '05': {
        title: 'Module 05: 3D Secure Multi-Domain',
        questions: [
            {
                id: 1,
                question: 'Quel est le rôle du ACS (Access Control Server) dans 3DS?',
                options: [
                    'Valider l\'identité du porteur de carte',
                    'Gérer les clés cryptographiques',
                    'Router les transactions',
                    'Calculer les frais',
                ],
                correctAnswer: 0,
                explanation:
                    'L\'ACS authentifie le porteur via OTP, biométrie ou autre méthode challenge-response.',
            },
            {
                id: 2,
                question: 'Que signifie "3D" dans 3D Secure?',
                options: [
                    'Three Domains (Issuer, Acquirer, Interoperability)',
                    'Three Days validity',
                    'Three Dimensions security',
                    'Three Decryption steps',
                ],
                correctAnswer: 0,
                explanation:
                    'Les 3 domaines sont: Issuer Domain (ACS), Acquirer Domain (Merchant), Interoperability Domain (DS).',
            },
            {
                id: 3,
                question: 'Quel statut indique une authentification réussie en 3DS 2.0?',
                options: ['Y', 'A', 'N', 'U'],
                correctAnswer: 0,
                explanation:
                    'Le statut "Y" signifie que l\'authentification a réussi. "N" = échec, "A" = tentative, "U" = indisponible.',
            },
            {
                id: 4,
                question: 'Quelle version de 3DS est actuellement la plus utilisée?',
                options: ['3DS 1.0', '3DS 2.0', '3DS 2.1', '3DS 2.3'],
                correctAnswer: 2,
                explanation: '3DS 2.1 et 2.2 sont les versions les plus déployées en 2024-2026.',
            },
            {
                id: 5,
                question: 'Qu\'est-ce qu\'un "frictionless flow" en 3DS 2.x?',
                options: [
                    'Authentification sans challenge utilisateur',
                    'Paiement sans carte',
                    'Transaction sans internet',
                    'Validation sans PIN',
                ],
                correctAnswer: 0,
                explanation:
                    'Le frictionless flow permet une authentification basée sur le risk scoring sans interaction utilisateur.',
            },
        ],
    },
    '06': {
        title: 'Module 06: Cryptographie HSM v2',
        questions: [
            {
                id: 1,
                question: 'Que signifie HSM?',
                options: [
                    'Hardware Security Module',
                    'High Security Mode',
                    'Hash Security Manager',
                    'Hybrid System Module',
                ],
                correctAnswer: 0,
                explanation: 'HSM = Hardware Security Module, dispositif physique sécurisé pour gérer les clés.',
            },
            {
                id: 2,
                question: 'Quelle est la fonction du LMK (Local Master Key)?',
                options: [
                    'Chiffrer les clés de travail stockées',
                    'Chiffrer les données de cartes',
                    'Générer des OTP',
                    'Valider les certificats',
                ],
                correctAnswer: 0,
                explanation: 'La LMK protège toutes les clés de travail (ZMK, ZPK, etc.) en local.',
            },
            {
                id: 3,
                question: 'Qu\'est-ce qu\'une ZMK (Zone Master Key)?',
                options: [
                    'Clé racine du HSM',
                    'Clé d\'échange entre 2 zones sécurisées',
                    'Clé de chiffrement de PIN',
                    'Clé de signature',
                ],
                correctAnswer: 1,
                explanation: 'La ZMK sécurise les échanges de clés entre institutions (acquirer ↔ issuer).',
            },
            {
                id: 4,
                question: 'Combien de composants sont nécessaires pour reconstituer une clé split en 3-of-3?',
                options: ['1', '2', '3', '4'],
                correctAnswer: 2,
                explanation:
                    'Un schéma 3-of-3 nécessite les 3 composants pour reconstituer la clé (sécurité maximale).',
            },
            {
                id: 5,
                question: 'Quel algorithme est utilisé pour le chiffrement de PIN dans les HSM modernes?',
                options: ['DES', '3DES', 'AES-256', 'RSA'],
                correctAnswer: 2,
                explanation: 'AES-256 remplace progressivement 3DES pour le chiffrement de PIN (PCI DSS).',
            },
        ],
    },
};

export default function QuizPage({ params }: { params: Promise<{ moduleId: string }> }) {
    const { moduleId } = use(params);
    const router = useRouter();

    const quiz = quizData[moduleId];
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
    const [showResults, setShowResults] = useState(false);

    if (!quiz) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-black">Quiz non disponible</h1>
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

    const handleAnswerSelect = (answerIndex: number) => {
        const newAnswers = [...selectedAnswers];
        newAnswers[currentQuestion] = answerIndex;
        setSelectedAnswers(newAnswers);
    };

    const handleNext = () => {
        if (currentQuestion < quiz.questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        } else {
            setShowResults(true);
        }
    };

    const handlePrevious = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(currentQuestion - 1);
        }
    };

    const calculateScore = () => {
        let correct = 0;
        quiz.questions.forEach((q, index) => {
            if (selectedAnswers[index] === q.correctAnswer) {
                correct++;
            }
        });
        return {
            correct,
            total: quiz.questions.length,
            percentage: Math.round((correct / quiz.questions.length) * 100),
        };
    };

    if (showResults) {
        const score = calculateScore();
        const passed = score.percentage >= 80;

        return (
            <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center space-y-8">
                        {passed ? (
                            <Trophy className="w-24 h-24 text-amber-500 mx-auto animate-bounce" />
                        ) : (
                            <XCircle className="w-24 h-24 text-red-500 mx-auto" />
                        )}

                        <h1 className="text-5xl font-black">
                            {passed ? 'Félicitations ! 🎉' : 'Presque ! 💪'}
                        </h1>

                        <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 space-y-4">
                            <div className="text-6xl font-black text-emerald-500">
                                {score.percentage}%
                            </div>
                            <p className="text-xl text-slate-400">
                                {score.correct} / {score.total} réponses correctes
                            </p>
                        </div>

                        {passed ? (
                            <p className="text-lg text-slate-300">
                                Module validé ! Vous pouvez passer au module suivant.
                            </p>
                        ) : (
                            <p className="text-lg text-slate-300">
                                Vous devez obtenir au moins 80% pour valider ce module. Révisez la
                                théorie et réessayez !
                            </p>
                        )}

                        {/* Review answers */}
                        <div className="space-y-4 text-left">
                            <h2 className="text-2xl font-black">Correction</h2>
                            {quiz.questions.map((q, index) => {
                                const isCorrect = selectedAnswers[index] === q.correctAnswer;
                                return (
                                    <div
                                        key={q.id}
                                        className={`p-6 rounded-2xl border ${isCorrect
                                                ? 'bg-emerald-500/10 border-emerald-500/30'
                                                : 'bg-red-500/10 border-red-500/30'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {isCorrect ? (
                                                <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-1" />
                                            ) : (
                                                <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                                            )}
                                            <div className="flex-1 space-y-2">
                                                <p className="font-bold">{q.question}</p>
                                                <p className="text-sm text-slate-400">
                                                    Votre réponse:{' '}
                                                    <span
                                                        className={
                                                            isCorrect
                                                                ? 'text-emerald-400'
                                                                : 'text-red-400'
                                                        }
                                                    >
                                                        {q.options[selectedAnswers[index]]}
                                                    </span>
                                                </p>
                                                {!isCorrect && (
                                                    <p className="text-sm text-emerald-400">
                                                        Bonne réponse: {q.options[q.correctAnswer]}
                                                    </p>
                                                )}
                                                <p className="text-sm text-slate-500 italic">
                                                    {q.explanation}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex gap-4 justify-center">
                            <Link
                                href="/student"
                                className="px-8 py-4 bg-slate-800 rounded-2xl font-bold hover:bg-slate-700 transition"
                            >
                                Retour au parcours
                            </Link>
                            {!passed && (
                                <button
                                    onClick={() => {
                                        setCurrentQuestion(0);
                                        setSelectedAnswers([]);
                                        setShowResults(false);
                                    }}
                                    className="px-8 py-4 bg-emerald-600 rounded-2xl font-bold hover:bg-emerald-500 transition"
                                >
                                    Réessayer
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const question = quiz.questions[currentQuestion];
    const selectedAnswer = selectedAnswers[currentQuestion];

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <Link
                        href="/student"
                        className="text-sm text-slate-400 hover:text-white transition"
                    >
                        ← Retour au parcours
                    </Link>
                    <h1 className="text-4xl font-black">{quiz.title}</h1>
                    <div className="flex items-center justify-between">
                        <p className="text-slate-400">
                            Question {currentQuestion + 1} / {quiz.questions.length}
                        </p>
                        <div className="flex gap-2">
                            {quiz.questions.map((_, index) => (
                                <div
                                    key={index}
                                    className={`w-2 h-2 rounded-full ${index === currentQuestion
                                            ? 'bg-emerald-500'
                                            : selectedAnswers[index] !== undefined
                                                ? 'bg-blue-500'
                                                : 'bg-slate-700'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Question */}
                <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 space-y-6">
                    <h2 className="text-2xl font-bold">{question.question}</h2>

                    <div className="space-y-3">
                        {question.options.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => handleAnswerSelect(index)}
                                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${selectedAnswer === index
                                        ? 'bg-emerald-500/20 border-emerald-500'
                                        : 'bg-slate-800/50 border-white/10 hover:border-white/30'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedAnswer === index
                                                ? 'border-emerald-500 bg-emerald-500'
                                                : 'border-slate-600'
                                            }`}
                                    >
                                        {selectedAnswer === index && (
                                            <CheckCircle className="w-4 h-4 text-white" />
                                        )}
                                    </div>
                                    <span>{option}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between">
                    <button
                        onClick={handlePrevious}
                        disabled={currentQuestion === 0}
                        className="px-6 py-3 bg-slate-800 rounded-2xl font-bold hover:bg-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Précédent
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={selectedAnswer === undefined}
                        className="px-6 py-3 bg-emerald-600 rounded-2xl font-bold hover:bg-emerald-500 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {currentQuestion === quiz.questions.length - 1 ? 'Terminer' : 'Suivant'}
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
