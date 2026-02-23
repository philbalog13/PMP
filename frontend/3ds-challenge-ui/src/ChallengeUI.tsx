import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AlertCircle, ArrowRight, CheckCircle2, HelpCircle, Info, Lock, Smartphone } from 'lucide-react';

type ChallengeStatus = 'pending' | 'success' | 'failed';

type PedagogicalStep = {
    title: string;
    description: string;
    icon: JSX.Element;
};

const PEDAGOGICAL_STEPS: PedagogicalStep[] = [
    {
        title: 'Authentification initiale',
        description: 'Le marchand envoie la demande 3DS au Directory Server.',
        icon: <Lock size={15} />
    },
    {
        title: 'Redirection ACS',
        description: "La banque émettrice prend la main pour vérifier l'identité.",
        icon: <ArrowRight size={15} />
    },
    {
        title: 'Challenge OTP',
        description: 'Le porteur saisit un OTP à 6 chiffres.',
        icon: <Smartphone size={15} />
    },
    {
        title: 'Validation finale',
        description: "L'ACS renvoie un résultat signé au marchand.",
        icon: <CheckCircle2 size={15} />
    }
];

function shortenId(identifier: string): string {
    if (identifier.length <= 12) {
        return identifier;
    }
    return `${identifier.slice(0, 12)}...`;
}

function resolveRedirectUrl(rawValue: string | null): string | null {
    if (!rawValue) {
        return null;
    }

    try {
        const parsed = new URL(rawValue, window.location.origin);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return null;
        }
        return parsed.toString();
    } catch {
        return null;
    }
}

export function ChallengeUI() {
    const [otp, setOtp] = useState('');
    const [status, setStatus] = useState<ChallengeStatus>('pending');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(0);

    const queryParams = useMemo(() => new URLSearchParams(window.location.search), []);
    const txId = useMemo(
        () => queryParams.get('txId') ?? `TX_${Math.floor(Math.random() * 1_000_000)}`,
        [queryParams]
    );
    const acsTransId = useMemo(() => queryParams.get('acsTransId') ?? txId, [queryParams, txId]);
    const merchantReturnUrl = useMemo(
        () => resolveRedirectUrl(queryParams.get('returnUrl') ?? queryParams.get('redirectUrl') ?? queryParams.get('callbackUrl')),
        [queryParams]
    );
    const acsBaseUrl = useMemo(() => (import.meta.env.VITE_ACS_URL || 'http://localhost:8013').replace(/\/$/, ''), []);

    useEffect(() => {
        if (status !== 'pending' || step >= 2) {
            return;
        }
        const timerId = window.setTimeout(() => {
            setStep((previous) => Math.min(previous + 1, 2));
        }, 900);

        return () => window.clearTimeout(timerId);
    }, [status, step]);

    function redirectToMerchant(transStatus: 'Y' | 'N') {
        if (!merchantReturnUrl) {
            return;
        }

        const destination = new URL(merchantReturnUrl);
        destination.searchParams.set('transStatus', transStatus);
        destination.searchParams.set('txId', txId);
        destination.searchParams.set('acsTransId', acsTransId);
        window.location.assign(destination.toString());
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        if (otp.length !== 6 || isLoading) {
            return;
        }

        setIsLoading(true);
        setStep(3);

        try {
            const response = await axios.post(`${acsBaseUrl}/challenge/verify`, { acsTransId, otp });
            const transStatus = response.data?.transStatus;

            if (transStatus === 'Y') {
                setStatus('success');
                setMessage("Authentification validée. Le marchand peut poursuivre l'autorisation.");
                if (merchantReturnUrl) {
                    window.setTimeout(() => redirectToMerchant('Y'), 1600);
                }
                return;
            }

            setStatus('failed');
            setMessage(`Code OTP invalide (transStatus: ${transStatus || 'N'}).`);
        } catch {
            setStatus('failed');
            setMessage("Impossible de joindre l'ACS. Vérifiez que le backend tourne sur le port 8013.");
        } finally {
            setIsLoading(false);
        }
    }

    function retryChallenge() {
        setOtp('');
        setStatus('pending');
        setMessage('');
        setStep(2);
    }

    return (
        <div className="challenge-layout">
            <main className="challenge-main">
                <div className="challenge-panel">
                    <header className="challenge-header">
                        <div className="challenge-logo" aria-hidden="true">
                            <img src="/monetic-logo.svg" alt="MoneTIC" style={{width: 40, height: 40}} />
                        </div>
                        <div>
                            <p className="challenge-kicker">3DS Challenge</p>
                            <h1>MoneTIC</h1>
                            <p className="challenge-subtitle">Vérification forte du porteur</p>
                        </div>
                    </header>

                    <section className="challenge-card">
                        {status === 'pending' ? (
                            <form onSubmit={handleSubmit} className="challenge-form">
                                <div>
                                    <h2>Confirmez votre paiement</h2>
                                    <p className="challenge-text">
                                        Saisissez le code OTP de la transaction <strong>{shortenId(txId)}</strong>.
                                    </p>
                                </div>

                                <label htmlFor="otp-input">Code OTP (6 chiffres)</label>
                                <div className="otp-wrapper">
                                    <input
                                        id="otp-input"
                                        value={otp}
                                        onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                                        inputMode="numeric"
                                        pattern="[0-9]{6}"
                                        autoComplete="one-time-code"
                                        placeholder="123456"
                                        maxLength={6}
                                        autoFocus
                                    />
                                    <Smartphone size={18} />
                                </div>

                                <button type="submit" disabled={otp.length !== 6 || isLoading}>
                                    {isLoading ? 'Vérification...' : 'Valider le challenge'}
                                </button>

                                <div className="challenge-tip">
                                    <HelpCircle size={16} />
                                    <p>
                                        <strong>Mode labo:</strong> utilisez <strong>123456</strong> pour simuler un OTP valide.
                                    </p>
                                </div>
                            </form>
                        ) : (
                            <div className="challenge-result">
                                <div className={`result-icon ${status}`}>
                                    {status === 'success' ? <CheckCircle2 size={44} /> : <AlertCircle size={44} />}
                                </div>
                                <h2>{status === 'success' ? 'Challenge validé' : 'Vérification échouée'}</h2>
                                <p>{message}</p>
                                {status === 'success' && merchantReturnUrl && (
                                    <button type="button" className="secondary-button" onClick={() => redirectToMerchant('Y')}>
                                        Retourner chez le marchand
                                    </button>
                                )}
                                {status === 'failed' && (
                                    <button type="button" className="retry-button" onClick={retryChallenge}>
                                        Réessayer
                                    </button>
                                )}
                            </div>
                        )}
                    </section>

                    <footer className="challenge-footer">
                        <span>Session sécurisée</span>
                        <span>ACS Trans ID: {shortenId(acsTransId)}</span>
                    </footer>
                </div>
            </main>

            <aside className="challenge-sidebar">
                <div className="sidebar-intro">
                    <p>
                        <Info size={14} /> Guide pédagogique
                    </p>
                    <h2>Flux 3DS en cours</h2>
                </div>

                <div className="timeline">
                    {PEDAGOGICAL_STEPS.map((item, index) => {
                        const state = index < step ? 'done' : index === step ? 'active' : 'todo';
                        return (
                            <article className={`timeline-item ${state}`} key={item.title}>
                                <div className="timeline-icon">{item.icon}</div>
                                <div>
                                    <h3>{item.title}</h3>
                                    <p>{item.description}</p>
                                </div>
                            </article>
                        );
                    })}
                </div>

                <div className="acs-log">
                    <h4>Log ACS</h4>
                    <p>
                        <span>IN</span>
                        <span>AReq(txId={shortenId(txId)})</span>
                    </p>
                    <p>
                        <span>PROC</span>
                        <span>Risk score: {step > 0 ? '85 (HIGH)' : '--'}</span>
                    </p>
                    <p>
                        <span>OUT</span>
                        <span>ARes(transStatus: C)</span>
                    </p>
                    <p>
                        <span>CReq</span>
                        <span>{step === 3 ? 'OTP submitted' : 'awaiting OTP'}</span>
                    </p>
                </div>
            </aside>
        </div>
    );
}
