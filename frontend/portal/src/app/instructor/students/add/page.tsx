'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    UserPlus,
    ArrowLeft,
    Mail,
    User,
    Lock,
    Eye,
    EyeOff,
    CheckCircle2,
    AlertCircle,
    Upload,
    Users
} from 'lucide-react';

interface NewStudent {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    group: string;
}

export default function AddStudentPage() {
    const router = useRouter();
    const [mode, setMode] = useState<'single' | 'bulk'>('single');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const [student, setStudent] = useState<NewStudent>({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        group: 'Promotion 2026'
    });

    const [bulkStudents, setBulkStudents] = useState<string>('');
    const [bulkGroup, setBulkGroup] = useState<string>('Promotion 2026');

    const getErrorMessage = (err: unknown, fallback: string): string => (
        err instanceof Error && err.message ? err.message : fallback
    );

    const generatePassword = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setStudent({ ...student, password });
    };

    const generateRandomPassword = (): string => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    };

    const buildUsername = (firstName: string, lastName: string, email: string): string => {
        const fromNames = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z0-9.]/g, '');
        if (fromNames.replace('.', '').length > 0) return fromNames;
        return email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
    };

    const createStudent = async (payload: {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
        group: string;
    }) => {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Session expirée. Merci de vous reconnecter.');
        }

        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: buildUsername(payload.firstName, payload.lastName, payload.email),
                email: payload.email,
                password: payload.password,
                firstName: payload.firstName,
                lastName: payload.lastName,
                role: 'ROLE_ETUDIANT',
                groupName: payload.group
            })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Impossible de créer le compte étudiant');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        // Validation
        if (!student.firstName || !student.lastName || !student.email || !student.password) {
            setError('Tous les champs sont requis');
            setIsSubmitting(false);
            return;
        }

        if (!student.email.includes('@')) {
            setError('Email invalide');
            setIsSubmitting(false);
            return;
        }

        if (student.password.length < 8) {
            setError('Le mot de passe doit contenir au moins 8 caractères');
            setIsSubmitting(false);
            return;
        }

        try {
            await createStudent(student);
            setSuccess(true);
            setTimeout(() => {
                router.push('/instructor/students');
            }, 2000);
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Erreur lors de la création de l’étudiant'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBulkSubmit = async () => {
        setIsSubmitting(true);
        setError('');

        const lines = bulkStudents.trim().split('\n').filter(l => l.trim());
        if (lines.length === 0) {
            setError('Aucun étudiant à importer');
            setIsSubmitting(false);
            return;
        }

        let createdCount = 0;
        const failures: string[] = [];

        try {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const [firstNameRaw, lastNameRaw, emailRaw] = line.split(',').map(v => v?.trim() || '');
                const firstName = firstNameRaw;
                const lastName = lastNameRaw;
                const email = emailRaw.toLowerCase();

                if (!firstName || !lastName || !email || !email.includes('@')) {
                    failures.push(`Ligne ${i + 1} invalide`);
                    continue;
                }

                try {
                    await createStudent({
                        firstName,
                        lastName,
                        email,
                        password: generateRandomPassword(),
                        group: bulkGroup
                    });
                    createdCount++;
                } catch (err: unknown) {
                    failures.push(`Ligne ${i + 1}: ${getErrorMessage(err, 'Erreur API')}`);
                }
            }

            if (createdCount === 0) {
                setError(`Aucun étudiant importé. ${failures.slice(0, 2).join(' | ')}`);
                return;
            }

            if (failures.length > 0) {
                setError(`Import partiel (${createdCount}/${lines.length}). ${failures.slice(0, 2).join(' | ')}`);
                return;
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/instructor/students');
            }, 2000);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-950 pt-24 pb-12 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} className="text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">
                        {mode === 'single' ? 'Étudiant créé avec succès !' : 'Étudiants importés avec succès !'}
                    </h1>
                    <p className="text-slate-400">Redirection en cours...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pt-24 pb-12">
            <div className="max-w-2xl mx-auto px-6">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/instructor/students"
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
                    >
                        <ArrowLeft size={18} />
                        Retour à la liste
                    </Link>
                    <h1 className="text-3xl font-bold text-white mb-2">Ajouter un étudiant</h1>
                    <p className="text-slate-400">
                        Créez un nouveau compte étudiant ou importez plusieurs étudiants en masse
                    </p>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-2 mb-8">
                    <button
                        onClick={() => setMode('single')}
                        className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                            mode === 'single'
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                    >
                        <User size={18} />
                        Un seul étudiant
                    </button>
                    <button
                        onClick={() => setMode('bulk')}
                        className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                            mode === 'bulk'
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                    >
                        <Users size={18} />
                        Import en masse
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
                        <AlertCircle size={20} className="text-red-400" />
                        <span className="text-red-400">{error}</span>
                    </div>
                )}

                {/* Single Student Form */}
                {mode === 'single' && (
                    <form onSubmit={handleSubmit} className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-slate-400 mb-2 block">Prénom</label>
                                <div className="relative">
                                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={student.firstName}
                                        onChange={(e) => setStudent({ ...student, firstName: e.target.value })}
                                        placeholder="Jean"
                                        className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-slate-400 mb-2 block">Nom</label>
                                <input
                                    type="text"
                                    value={student.lastName}
                                    onChange={(e) => setStudent({ ...student, lastName: e.target.value })}
                                    placeholder="Dupont"
                                    className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Email</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="email"
                                    value={student.email}
                                    onChange={(e) => setStudent({ ...student, email: e.target.value })}
                                    placeholder="jean.dupont@pmp.edu"
                                    className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Mot de passe</label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={student.password}
                                    onChange={(e) => setStudent({ ...student, password: e.target.value })}
                                    placeholder="Minimum 8 caractères"
                                    className="w-full pl-12 pr-24 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} className="text-slate-400" /> : <Eye size={16} className="text-slate-400" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={generatePassword}
                                        className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
                                    >
                                        Générer
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Groupe / Promotion</label>
                            <select
                                value={student.group}
                                onChange={(e) => setStudent({ ...student, group: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            >
                                <option value="Promotion 2026">Promotion 2026</option>
                                <option value="Promotion 2025">Promotion 2025</option>
                                <option value="Formation Continue">Formation Continue</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                                    Création en cours...
                                </>
                            ) : (
                                <>
                                    <UserPlus size={20} />
                                    Créer l'étudiant
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Bulk Import Form */}
                {mode === 'bulk' && (
                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 space-y-6">
                        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                            <h3 className="text-sm font-medium text-white mb-2">Format attendu (CSV)</h3>
                            <p className="text-xs text-slate-400 mb-2">
                                Une ligne par étudiant : prénom, nom, email
                            </p>
                            <code className="text-xs text-emerald-400 block">
                                Jean,Dupont,jean.dupont@pmp.edu<br />
                                Marie,Martin,marie.martin@pmp.edu
                            </code>
                        </div>

                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Données des étudiants</label>
                            <textarea
                                value={bulkStudents}
                                onChange={(e) => setBulkStudents(e.target.value)}
                                placeholder="Jean,Dupont,jean.dupont@pmp.edu
Marie,Martin,marie.martin@pmp.edu"
                                rows={10}
                                className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-sm"
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => document.getElementById('file-upload')?.click()}
                                className="flex-1 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <Upload size={18} />
                                Importer un fichier CSV
                            </button>
                            <input
                                id="file-upload"
                                type="file"
                                accept=".csv"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                            setBulkStudents(event.target?.result as string);
                                        };
                                        reader.readAsText(file);
                                    }
                                }}
                            />
                        </div>

                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Groupe / Promotion</label>
                            <select
                                value={bulkGroup}
                                onChange={(e) => setBulkGroup(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            >
                                <option value="Promotion 2026">Promotion 2026</option>
                                <option value="Promotion 2025">Promotion 2025</option>
                                <option value="Formation Continue">Formation Continue</option>
                            </select>
                        </div>

                        <p className="text-xs text-slate-500">
                            Les mots de passe sont générés automatiquement pendant l'import.
                        </p>

                        <button
                            onClick={handleBulkSubmit}
                            disabled={isSubmitting || !bulkStudents.trim()}
                            className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                                    Import en cours...
                                </>
                            ) : (
                                <>
                                    <Users size={20} />
                                    Importer les étudiants
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
