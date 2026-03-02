'use client';

import { useState } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, AlertCircle, CheckCircle2, BookOpen, Target, Clock, Type } from 'lucide-react';
import Link from 'next/link';
import { NotionSkeleton } from '@shared/components/notion';

const WORKSHOP_OPTIONS = [
    { id: '', label: 'Aucun atelier spécifique' },
    { id: 'intro', label: 'Introduction aux Paiements' },
    { id: 'iso8583', label: 'ISO 8583 - Messages' },
    { id: 'hsm-keys', label: 'HSM et Gestion des Clés' },
    { id: '3ds-flow', label: 'Flux 3D Secure' },
    { id: 'fraud-detection', label: 'Détection de Fraude' },
    { id: 'emv', label: 'Cartes EMV' }
];

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    background: 'var(--n-bg-secondary)',
    border: '1px solid var(--n-border)',
    borderRadius: '6px',
    color: 'var(--n-text-primary)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--n-text-primary)',
    marginBottom: '6px',
};

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
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    workshopId: formData.workshopId || null,
                    content: formData.content ? JSON.parse(formData.content) : null
                })
            });
            if (response.ok) {
                setSuccess(true);
                setTimeout(() => router.push('/instructor/exercises'), 1500);
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
            <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)', padding: '32px 24px' }}>
                <NotionSkeleton type="card" />
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)', padding: '32px 24px' }}>
            <div style={{ maxWidth: '680px', margin: '0 auto' }}>

                {/* Header */}
                <div style={{ marginBottom: '28px' }}>
                    <Link href="/instructor/exercises" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        fontSize: '13px', color: 'var(--n-text-secondary)',
                        textDecoration: 'none', marginBottom: '16px'
                    }}>
                        <ArrowLeft size={14} /> Retour aux exercices
                    </Link>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--n-text-primary)', margin: 0 }}>
                        Créer un exercice
                    </h1>
                    <p style={{ color: 'var(--n-text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                        Définissez le contenu et les paramètres de l&apos;exercice.
                    </p>
                </div>

                {/* Success */}
                {success && (
                    <div style={{
                        marginBottom: '20px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px',
                        background: 'var(--n-success-bg)', border: '1px solid var(--n-success)',
                        borderRadius: '6px', color: 'var(--n-success)', fontSize: '14px'
                    }}>
                        <CheckCircle2 size={16} />
                        Exercice créé avec succès ! Redirection...
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div style={{
                        marginBottom: '20px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px',
                        background: 'var(--n-danger-bg)', border: '1px solid var(--n-danger)',
                        borderRadius: '6px', color: 'var(--n-danger)', fontSize: '14px'
                    }}>
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {/* Form card */}
                <div style={{
                    background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)',
                    borderRadius: '8px', padding: '28px'
                }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* Titre */}
                        <div>
                            <label style={labelStyle}>Titre *</label>
                            <input
                                type="text" required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Ex: Analyse de message ISO 8583"
                                style={inputStyle}
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label style={labelStyle}>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Décrivez l'objectif et le contenu de l'exercice..."
                                rows={3}
                                style={{ ...inputStyle, resize: 'none' }}
                            />
                        </div>

                        {/* Type & Difficulté */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={labelStyle}><Type className="inline w-3.5 h-3.5 mr-1" />Type</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    style={inputStyle}
                                >
                                    <option value="QUIZ">Quiz</option>
                                    <option value="PRACTICAL">Exercice pratique</option>
                                    <option value="SIMULATION">Simulation</option>
                                    <option value="CODE_REVIEW">Revue de code</option>
                                    <option value="CASE_STUDY">Étude de cas</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}><Target className="inline w-3.5 h-3.5 mr-1" />Difficulté</label>
                                <select
                                    value={formData.difficulty}
                                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                                    style={inputStyle}
                                >
                                    <option value="BEGINNER">Débutant</option>
                                    <option value="INTERMEDIATE">Intermédiaire</option>
                                    <option value="ADVANCED">Avancé</option>
                                    <option value="EXPERT">Expert</option>
                                </select>
                            </div>
                        </div>

                        {/* Atelier */}
                        <div>
                            <label style={labelStyle}><BookOpen className="inline w-3.5 h-3.5 mr-1" />Atelier associé</label>
                            <select
                                value={formData.workshopId}
                                onChange={(e) => setFormData({ ...formData, workshopId: e.target.value })}
                                style={inputStyle}
                            >
                                {WORKSHOP_OPTIONS.map(opt => (
                                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Points & Temps */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={labelStyle}>Points</label>
                                <input
                                    type="number"
                                    value={formData.points}
                                    onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                                    min={0} max={1000}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}><Clock className="inline w-3.5 h-3.5 mr-1" />Temps limite (min)</label>
                                <input
                                    type="number"
                                    value={formData.timeLimitMinutes}
                                    onChange={(e) => setFormData({ ...formData, timeLimitMinutes: parseInt(e.target.value) || 0 })}
                                    min={0} max={180}
                                    style={inputStyle}
                                />
                                <p style={{ fontSize: '12px', color: 'var(--n-text-tertiary)', marginTop: '4px' }}>0 = pas de limite</p>
                            </div>
                        </div>

                        {/* Contenu JSON */}
                        <div>
                            <label style={labelStyle}>Contenu JSON (optionnel)</label>
                            <textarea
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                placeholder='{"questions": [...], "resources": [...]}'
                                rows={5}
                                style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '13px', resize: 'vertical' }}
                            />
                            <p style={{ fontSize: '12px', color: 'var(--n-text-tertiary)', marginTop: '4px' }}>
                                Format JSON pour les questions, ressources, etc.
                            </p>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px', borderTop: '1px solid var(--n-border)' }}>
                            <Link href="/instructor/exercises" style={{
                                padding: '9px 18px', borderRadius: '6px',
                                color: 'var(--n-text-secondary)', textDecoration: 'none', fontSize: '14px'
                            }}>
                                Annuler
                            </Link>
                            <button
                                type="submit"
                                disabled={saving || !formData.title.trim()}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '9px 18px', background: 'var(--n-accent)',
                                    color: '#fff', borderRadius: '6px', fontWeight: 500,
                                    fontSize: '14px', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                                    opacity: (saving || !formData.title.trim()) ? 0.5 : 1
                                }}
                            >
                                <Save size={15} />
                                {saving ? 'Création...' : "Créer l'exercice"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
