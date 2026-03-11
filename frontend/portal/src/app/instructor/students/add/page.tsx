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

const INPUT_STYLE: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid var(--n-border)',
    background: 'var(--n-bg-secondary)',
    color: 'var(--n-text-primary)',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
};

const INPUT_WITH_ICON_STYLE: React.CSSProperties = {
    ...INPUT_STYLE,
    paddingLeft: 38,
};

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
        } catch (err: any) {
            setError(getErrorMessage(err, 'Erreur lors de la création de l\'étudiant'));
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
                } catch (err: any) {
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
            <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--n-success-bg)', border: '1px solid var(--n-success-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <CheckCircle2 size={36} style={{ color: 'var(--n-success)' }} />
                    </div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--n-text-primary)', marginBottom: 8 }}>
                        {mode === 'single' ? 'Étudiant créé avec succès !' : 'Étudiants importés avec succès !'}
                    </h1>
                    <p style={{ fontSize: 14, color: 'var(--n-text-tertiary)' }}>Redirection en cours...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)' }}>
            {/* Page Header */}
            <div style={{ background: 'var(--n-bg-primary)', borderBottom: '1px solid var(--n-border)', padding: '24px 32px' }}>
                <div style={{ maxWidth: 720, margin: '0 auto' }}>
                    <Link
                        href="/instructor/students"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--n-text-tertiary)', textDecoration: 'none', marginBottom: 12 }}
                    >
                        <ArrowLeft size={14} />
                        Retour à la liste
                    </Link>
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--n-text-primary)', margin: 0 }}>Ajouter un étudiant</h1>
                    <p style={{ fontSize: 13, color: 'var(--n-text-tertiary)', margin: '4px 0 0' }}>
                        Créez un nouveau compte étudiant ou importez plusieurs étudiants en masse
                    </p>
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: '32px', maxWidth: 720, margin: '0 auto' }}>
                {/* Mode Toggle */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: 10, padding: 4 }}>
                    {(['single', 'bulk'] as const).map(m => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                                cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                                background: mode === m ? 'var(--n-accent)' : 'transparent',
                                color: mode === m ? '#fff' : 'var(--n-text-secondary)',
                            }}
                        >
                            {m === 'single' ? <User size={15} /> : <Users size={15} />}
                            {m === 'single' ? 'Un seul étudiant' : 'Import en masse'}
                        </button>
                    ))}
                </div>

                {/* Error */}
                {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--n-danger-bg)', border: '1px solid var(--n-danger-border)', borderRadius: 8, color: 'var(--n-danger)', fontSize: 13, marginBottom: 20 }}>
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {/* Single Student Form */}
                {mode === 'single' && (
                    <form onSubmit={handleSubmit} style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: 10, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--n-text-secondary)', marginBottom: 6 }}>Prénom</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-text-tertiary)', pointerEvents: 'none' }} />
                                    <input
                                        type="text"
                                        value={student.firstName}
                                        onChange={(e) => setStudent({ ...student, firstName: e.target.value })}
                                        placeholder="Jean"
                                        style={{ ...INPUT_WITH_ICON_STYLE }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--n-text-secondary)', marginBottom: 6 }}>Nom</label>
                                <input
                                    type="text"
                                    value={student.lastName}
                                    onChange={(e) => setStudent({ ...student, lastName: e.target.value })}
                                    placeholder="Dupont"
                                    style={INPUT_STYLE}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--n-text-secondary)', marginBottom: 6 }}>Email</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-text-tertiary)', pointerEvents: 'none' }} />
                                <input
                                    type="email"
                                    value={student.email}
                                    onChange={(e) => setStudent({ ...student, email: e.target.value })}
                                    placeholder="jean.dupont@pmp.edu"
                                    style={{ ...INPUT_WITH_ICON_STYLE }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--n-text-secondary)', marginBottom: 6 }}>Mot de passe</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-text-tertiary)', pointerEvents: 'none' }} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={student.password}
                                    onChange={(e) => setStudent({ ...student, password: e.target.value })}
                                    placeholder="Minimum 8 caractères"
                                    style={{ ...INPUT_WITH_ICON_STYLE, paddingRight: 104 }}
                                />
                                <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4, alignItems: 'center' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--n-text-tertiary)' }}
                                    >
                                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={generatePassword}
                                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--n-accent-border)', background: 'var(--n-accent-bg)', color: 'var(--n-accent)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Générer
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--n-text-secondary)', marginBottom: 6 }}>Groupe / Promotion</label>
                            <select
                                value={student.group}
                                onChange={(e) => setStudent({ ...student, group: e.target.value })}
                                style={{ ...INPUT_STYLE }}
                            >
                                <option value="Promotion 2026">Promotion 2026</option>
                                <option value="Promotion 2025">Promotion 2025</option>
                                <option value="Formation Continue">Formation Continue</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 24px', borderRadius: 8, background: isSubmitting ? 'var(--n-accent-bg)' : 'var(--n-accent)', color: isSubmitting ? 'var(--n-accent)' : '#fff', fontSize: 14, fontWeight: 600, border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
                        >
                            {isSubmitting ? (
                                <>
                                    <div style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                    Création en cours...
                                </>
                            ) : (
                                <>
                                    <UserPlus size={16} />
                                    Créer l&apos;étudiant
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Bulk Import Form */}
                {mode === 'bulk' && (
                    <div style={{ background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)', borderRadius: 10, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ padding: '14px 16px', background: 'var(--n-accent-bg)', border: '1px solid var(--n-accent-border)', borderRadius: 8 }}>
                            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--n-text-primary)', margin: '0 0 6px' }}>Format attendu (CSV)</h3>
                            <p style={{ fontSize: 12, color: 'var(--n-text-tertiary)', margin: '0 0 8px' }}>Une ligne par étudiant : prénom, nom, email</p>
                            <code style={{ fontSize: 12, color: 'var(--n-success)', fontFamily: 'monospace' }}>
                                Jean,Dupont,jean.dupont@pmp.edu<br />
                                Marie,Martin,marie.martin@pmp.edu
                            </code>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--n-text-secondary)', marginBottom: 6 }}>Données des étudiants</label>
                            <textarea
                                value={bulkStudents}
                                onChange={(e) => setBulkStudents(e.target.value)}
                                placeholder={'Jean,Dupont,jean.dupont@pmp.edu\nMarie,Martin,marie.martin@pmp.edu'}
                                rows={10}
                                style={{ ...INPUT_STYLE, fontFamily: 'monospace', fontSize: 12, resize: 'vertical', paddingTop: 10, paddingBottom: 10 }}
                            />
                        </div>

                        <button
                            onClick={() => document.getElementById('file-upload')?.click()}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', borderRadius: 8, border: '1px solid var(--n-border)', background: 'var(--n-bg-secondary)', color: 'var(--n-text-secondary)', fontSize: 13, cursor: 'pointer' }}
                        >
                            <Upload size={15} />
                            Importer un fichier CSV
                        </button>
                        <input
                            id="file-upload"
                            type="file"
                            accept=".csv"
                            style={{ display: 'none' }}
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

                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--n-text-secondary)', marginBottom: 6 }}>Groupe / Promotion</label>
                            <select value={bulkGroup} onChange={(e) => setBulkGroup(e.target.value)} style={{ ...INPUT_STYLE }}>
                                <option value="Promotion 2026">Promotion 2026</option>
                                <option value="Promotion 2025">Promotion 2025</option>
                                <option value="Formation Continue">Formation Continue</option>
                            </select>
                        </div>

                        <p style={{ fontSize: 12, color: 'var(--n-text-tertiary)', margin: 0 }}>
                            Les mots de passe sont générés automatiquement pendant l&apos;import.
                        </p>

                        <button
                            onClick={handleBulkSubmit}
                            disabled={isSubmitting || !bulkStudents.trim()}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 24px', borderRadius: 8, background: 'var(--n-accent)', color: '#fff', fontSize: 14, fontWeight: 600, border: 'none', cursor: isSubmitting || !bulkStudents.trim() ? 'not-allowed' : 'pointer', opacity: isSubmitting || !bulkStudents.trim() ? 0.5 : 1 }}
                        >
                            {isSubmitting ? (
                                <>
                                    <div style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                    Import en cours...
                                </>
                            ) : (
                                <>
                                    <Users size={16} />
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
