'use client';

import { useState } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Save,
    AlertCircle,
    CheckCircle2,
    BookOpen,
    Target,
    Clock,
    Type
} from 'lucide-react';
import Link from 'next/link';

const WORKSHOP_OPTIONS = [
    { id: '', label: 'Aucun atelier spécifique' },
    { id: 'intro', label: 'Introduction aux Paiements' },
    { id: 'iso8583', label: 'ISO 8583 - Messages' },
    { id: 'hsm-keys', label: 'HSM et Gestion des Clés' },
    { id: '3ds-flow', label: 'Flux 3D Secure' },
    { id: 'fraud-detection', label: 'Détection de Fraude' },
    { id: 'emv', label: 'Cartes EMV' }
];

export default function CreateExercisePage() {
    const { isLoading: authLoading } = useAuth(true);
    const router = useRouter();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'PRACTICAL',
        difficulty: 'INTERMEDIATE',
        workshopId: '',
        points: 100,
        timeLimitMinutes: 30,
        content: ''
    });

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSaving(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/exercises', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...formData,
                    workshopId: formData.workshopId || null,
                    content: formData.content ? JSON.parse(formData.content) : null
                })
            });

            if (response.ok) {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/instructor/exercises');
                }, 1500);
            } else {
                const data = await response.json();
                setError(data.error || 'Erreur lors de la création');
            }
        } catch {
            setError('Erreur de connexion au serveur');
        } finally {
            setSaving(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pt-24 pb-12">
            <div className="max-w-3xl mx-auto px-6">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/instructor/exercises"
                        className="flex items-center gap-2 text-slate-400 hover:text-blue-400 text-sm mb-4"
                    >
                        <ArrowLeft size={16} />
                        Retour aux exercices
                    </Link>
                    <h1 className="text-3xl font-bold text-white">Créer un exercice</h1>
                    <p className="text-slate-400 mt-1">
                        Définissez le contenu et les paramètres de l&apos;exercice.
                    </p>
                </div>

                {/* Success Message */}
                {success && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span className="text-emerald-400">Exercice créé avec succès ! Redirection...</span>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <span className="text-red-400">{error}</span>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Titre *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Ex: Analyse de message ISO 8583"
                            required
                            className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Décrivez l'objectif et le contenu de l'exercice..."
                            rows={3}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    {/* Type & Difficulty */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                <Type className="inline w-4 h-4 mr-1" />
                                Type
                            </label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="QUIZ">Quiz</option>
                                <option value="PRACTICAL">Exercice pratique</option>
                                <option value="SIMULATION">Simulation</option>
                                <option value="CODE_REVIEW">Revue de code</option>
                                <option value="CASE_STUDY">Étude de cas</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                <Target className="inline w-4 h-4 mr-1" />
                                Difficulté
                            </label>
                            <select
                                value={formData.difficulty}
                                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="BEGINNER">Débutant</option>
                                <option value="INTERMEDIATE">Intermédiaire</option>
                                <option value="ADVANCED">Avancé</option>
                                <option value="EXPERT">Expert</option>
                            </select>
                        </div>
                    </div>

                    {/* Workshop */}
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            <BookOpen className="inline w-4 h-4 mr-1" />
                            Atelier associé
                        </label>
                        <select
                            value={formData.workshopId}
                            onChange={(e) => setFormData({ ...formData, workshopId: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {WORKSHOP_OPTIONS.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Points & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                Points
                            </label>
                            <input
                                type="number"
                                value={formData.points}
                                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                                min={0}
                                max={1000}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                <Clock className="inline w-4 h-4 mr-1" />
                                Temps limite (minutes)
                            </label>
                            <input
                                type="number"
                                value={formData.timeLimitMinutes}
                                onChange={(e) => setFormData({ ...formData, timeLimitMinutes: parseInt(e.target.value) || 0 })}
                                min={0}
                                max={180}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-slate-500 mt-1">0 = pas de limite</p>
                        </div>
                    </div>

                    {/* Content (JSON) */}
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Contenu (JSON optionnel)
                        </label>
                        <textarea
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            placeholder='{"questions": [...], "resources": [...]}'
                            rows={6}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Format JSON pour les questions, ressources, etc.
                        </p>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-4 pt-4">
                        <Link
                            href="/instructor/exercises"
                            className="px-6 py-3 text-slate-400 hover:text-white transition-colors"
                        >
                            Annuler
                        </Link>
                        <button
                            type="submit"
                            disabled={saving || !formData.title.trim()}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                        >
                            <Save size={18} />
                            {saving ? 'Création...' : 'Créer l\'exercice'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
