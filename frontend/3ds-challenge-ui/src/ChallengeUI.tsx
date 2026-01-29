/**
 * 3DS Challenge UI - OTP Verification Page
 * Premium Dark Neon Glassmorphism Design
 */

import { useState } from 'react';
import axios from 'axios';

export function ChallengeUI() {
    const [otp, setOtp] = useState('');
    const [status, setStatus] = useState<'pending' | 'success' | 'failed'>('pending');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Get transaction ID from URL params
    const params = new URLSearchParams(window.location.search);
    const txId = params.get('txId') || 'UNKNOWN';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await axios.post('http://localhost:8088/challenge/verify', {
                otp,
                acsTransId: txId
            });

            if (response.data.transStatus === 'Y') {
                setStatus('success');
                setMessage('Authentification réussie !');
                setTimeout(() => {
                    window.close();
                }, 2000);
            } else {
                setStatus('failed');
                setMessage('Code OTP invalide. Veuillez réessayer.');
            }
        } catch (error) {
            setStatus('failed');
            setMessage('Erreur d\'authentification. Contactez votre banque.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="challenge-ui">
            <div className="challenge-container">
                {/* Bank Header */}
                <div className="bank-header">
                    <div className="bank-logo">
                        <div className="logo-circle">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        </div>
                        <span className="bank-name">PMP Secure</span>
                    </div>
                    <span className="badge-3ds">3D Secure 2.0</span>
                </div>

                <h2>Vérification Requise</h2>
                <p className="instruction">
                    Entrez le code à 6 chiffres envoyé sur votre téléphone pour confirmer cette transaction.
                </p>

                {status === 'pending' && (
                    <form onSubmit={handleSubmit}>
                        <div className="otp-input-group">
                            <label htmlFor="otp">Code OTP</label>
                            <div className="otp-input-wrapper">
                                <input
                                    id="otp"
                                    type="text"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    placeholder="• • • • • •"
                                    autoFocus
                                    autoComplete="one-time-code"
                                />
                            </div>
                        </div>

                        <button type="submit" disabled={otp.length !== 6 || isLoading} className="btn-primary">
                            {isLoading ? (
                                <span className="loader"></span>
                            ) : (
                                'Vérifier'
                            )}
                        </button>

                        <p className="hint">💡 Demo: Utilisez le code "123456"</p>
                    </form>
                )}

                {status === 'success' && (
                    <div className="result-message success">
                        <div className="result-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <p>{message}</p>
                        <small>Fermeture automatique...</small>
                    </div>
                )}

                {status === 'failed' && (
                    <div className="result-message error">
                        <div className="result-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                            </svg>
                        </div>
                        <p>{message}</p>
                        <button onClick={() => { setStatus('pending'); setOtp(''); }} className="btn-secondary">
                            Réessayer
                        </button>
                    </div>
                )}

                <div className="transaction-info">
                    <small>Transaction ID: {txId}</small>
                </div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');

                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }

                .challenge-ui {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #020617;
                    background-image: 
                        radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.15) 0%, transparent 40%),
                        radial-gradient(circle at 80% 70%, rgba(168, 85, 247, 0.15) 0%, transparent 40%);
                    font-family: 'Inter', -apple-system, sans-serif;
                    padding: 1rem;
                }

                .challenge-container {
                    background: rgba(15, 23, 42, 0.8);
                    backdrop-filter: blur(24px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 24px;
                    padding: 2.5rem;
                    width: 100%;
                    max-width: 420px;
                    box-shadow: 
                        0 0 0 1px rgba(255, 255, 255, 0.05),
                        0 20px 50px rgba(0, 0, 0, 0.5),
                        0 0 100px rgba(59, 130, 246, 0.1);
                }

                .bank-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 2rem;
                }

                .bank-logo {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .logo-circle {
                    width: 48px;
                    height: 48px;
                    background: linear-gradient(135deg, #3b82f6, #a855f7);
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
                }

                .bank-name {
                    font-family: 'Outfit', sans-serif;
                    font-size: 1.25rem;
                    font-weight: 700;
                    background: linear-gradient(135deg, #3b82f6, #a855f7);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .badge-3ds {
                    background: rgba(34, 197, 94, 0.15);
                    color: #22c55e;
                    font-size: 0.7rem;
                    font-weight: 600;
                    padding: 0.35rem 0.75rem;
                    border-radius: 100px;
                    border: 1px solid rgba(34, 197, 94, 0.3);
                }

                h2 {
                    font-family: 'Outfit', sans-serif;
                    text-align: center;
                    margin-bottom: 0.75rem;
                    color: #f8fafc;
                    font-size: 1.5rem;
                    font-weight: 600;
                }

                .instruction {
                    text-align: center;
                    color: #94a3b8;
                    margin-bottom: 2rem;
                    font-size: 0.9rem;
                    line-height: 1.6;
                }

                form {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .otp-input-group label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: 500;
                    color: #94a3b8;
                    font-size: 0.875rem;
                }

                .otp-input-wrapper {
                    position: relative;
                }

                .otp-input-wrapper input {
                    width: 100%;
                    padding: 1.25rem;
                    font-size: 1.75rem;
                    text-align: center;
                    letter-spacing: 0.75rem;
                    background: rgba(30, 41, 59, 0.6);
                    border: 2px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    font-family: 'JetBrains Mono', monospace;
                    color: #f8fafc;
                    transition: all 0.3s ease;
                }

                .otp-input-wrapper input::placeholder {
                    color: #475569;
                    letter-spacing: 0.5rem;
                }

                .otp-input-wrapper input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2), 0 0 30px rgba(59, 130, 246, 0.15);
                }

                .btn-primary {
                    padding: 1rem;
                    background: linear-gradient(135deg, #3b82f6, #a855f7);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 52px;
                    box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
                }

                .btn-primary:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 15px 40px rgba(59, 130, 246, 0.4);
                }

                .btn-primary:disabled {
                    background: #334155;
                    cursor: not-allowed;
                    box-shadow: none;
                }

                .btn-secondary {
                    padding: 0.75rem 1.5rem;
                    background: transparent;
                    color: #3b82f6;
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    border-radius: 10px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-secondary:hover {
                    background: rgba(59, 130, 246, 0.1);
                    border-color: rgba(59, 130, 246, 0.5);
                }

                .loader {
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .hint {
                    text-align: center;
                    color: #64748b;
                    font-size: 0.8rem;
                }

                .result-message {
                    text-align: center;
                    padding: 2rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1rem;
                }

                .result-icon {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .result-message.success .result-icon {
                    background: rgba(34, 197, 94, 0.15);
                    color: #22c55e;
                    box-shadow: 0 0 40px rgba(34, 197, 94, 0.3);
                }

                .result-message.error .result-icon {
                    background: rgba(239, 68, 68, 0.15);
                    color: #ef4444;
                    box-shadow: 0 0 40px rgba(239, 68, 68, 0.3);
                }

                .result-message p {
                    color: #f8fafc;
                    font-size: 1.1rem;
                    font-weight: 500;
                }

                .result-message small {
                    color: #64748b;
                }

                .transaction-info {
                    text-align: center;
                    margin-top: 2rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                }

                .transaction-info small {
                    color: #475569;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.75rem;
                }
            `}</style>
        </div>
    );
}
