'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../auth/useAuth';
import {
    ArrowRight,
    CheckCircle2,
    ChevronRight,
    CreditCard,
    Eye,
    EyeOff,
    Info,
    Keyboard,
    Printer,
    RefreshCcw,
    RotateCcw,
    Shield,
    Wifi,
    XCircle,
} from 'lucide-react';
import { BankPageHeader } from '@shared/components/banking/layout/BankPageHeader';
import { BankButton } from '@shared/components/banking/primitives/BankButton';
import { BankBadge } from '@shared/components/banking/primitives/BankBadge';
import { BankInput } from '@shared/components/banking/primitives/BankInput';
import { BankSpinner } from '@shared/components/banking/primitives/BankSpinner';
import { AmountInput } from '@shared/components/banking/forms/AmountInput';
import { BankSelect, type BankSelectOption } from '@shared/components/banking/forms/BankSelect';

type PaymentMode = 'chip' | 'contactless' | 'manual';
type TransactionStep = 'idle' | 'amount' | 'card' | 'pin' | 'processing' | 'result';

interface TransactionResult {
    success: boolean;
    authCode?: string;
    responseCode: string;
    responseMessage: string;
    rrn?: string;
    timestamp: string;
}

interface MerchantTerminal {
    terminalId: string;
    terminalName: string;
    status: string;
}

const STEP_ORDER: Array<{ id: Exclude<TransactionStep, 'idle'>; label: string }> = [
    { id: 'amount', label: 'Montant' },
    { id: 'card', label: 'Carte' },
    { id: 'pin', label: 'PIN' },
    { id: 'processing', label: 'Traitement' },
    { id: 'result', label: 'Resultat' },
];

const MODE_OPTIONS: BankSelectOption[] = [
    { value: 'contactless', label: 'Sans contact' },
    { value: 'chip', label: 'Puce' },
    { value: 'manual', label: 'Manuel' },
];

export default function POSTerminalPage() {
    const { isLoading } = useAuth(true);
    const [step, setStep] = useState<TransactionStep>('idle');
    const [amount, setAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('contactless');
    const [cardNumber, setCardNumber] = useState('');
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [result, setResult] = useState<TransactionResult | null>(null);
    const [showIso8583, setShowIso8583] = useState(false);
    const [terminals, setTerminals] = useState<MerchantTerminal[]>([]);
    const [selectedTerminalId, setSelectedTerminalId] = useState('');
    const [apiError, setApiError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTerminals = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/merchant/pos', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!response.ok) return;

                const payload = await response.json();
                if (!Array.isArray(payload.terminals)) return;

                const mapped: MerchantTerminal[] = payload.terminals.map((terminal: Record<string, unknown>) => ({
                    terminalId: String(terminal.terminal_id || terminal.terminalId || ''),
                    terminalName: String(terminal.terminal_name || terminal.terminalName || 'Terminal'),
                    status: String(terminal.status || 'ACTIVE')
                }));
                setTerminals(mapped);

                const firstActive = mapped.find((terminal) => terminal.status === 'ACTIVE');
                if (firstActive) {
                    setSelectedTerminalId(firstActive.terminalId);
                }
            } catch {
                // Keep UI usable even if terminal fetch fails.
            }
        };

        fetchTerminals();
    }, []);

    const terminalOptions = useMemo<BankSelectOption[]>(() => {
        if (!terminals.length) {
            return [{ value: '', label: 'Terminal auto' }];
        }
        return terminals.map((terminal) => ({
            value: terminal.terminalId,
            label: `${terminal.terminalId} - ${terminal.terminalName}${terminal.status !== 'ACTIVE' ? ` (${terminal.status})` : ''}`,
            disabled: terminal.status !== 'ACTIVE',
        }));
    }, [terminals]);

    const amountValueNumber = useMemo(() => {
        if (!amount) return null;
        const parsed = Number.parseFloat(amount.replace(/\s/g, '').replace(',', '.'));
        return Number.isFinite(parsed) ? parsed : null;
    }, [amount]);

    const formatAmount = (value: string) => {
        const num = value.replace(/[^\d]/g, '');
        if (!num) return '';
        const cents = Number.parseInt(num, 10) / 100;
        return cents.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handleAmountInput = (digit: string) => {
        if (digit === 'clear') {
            setAmount('');
            return;
        }
        if (digit === 'backspace') {
            setAmount((prev) => prev.slice(0, -1));
            return;
        }
        if (amount.replace(/[^\d]/g, '').length < 8) {
            const newAmount = amount.replace(/[^\d]/g, '') + digit;
            setAmount(formatAmount(newAmount));
        }
    };

    const handlePinInput = (digit: string) => {
        if (digit === 'clear') {
            setPin('');
            return;
        }
        if (digit === 'backspace') {
            setPin((prev) => prev.slice(0, -1));
            return;
        }
        if (pin.length < 4) {
            setPin((prev) => prev + digit);
        }
    };

    const startTransaction = () => {
        if (!amount || Number.parseFloat(amount.replace(/\s/g, '').replace(',', '.')) === 0) return;
        setApiError(null);
        setStep('card');
    };

    const processCard = () => {
        if (paymentMode === 'manual') {
            if (!cardNumber || cardNumber.length < 16) return;
        }
        setCardNumber(cardNumber || '4532892176544532');
        if (paymentMode === 'chip') {
            setStep('pin');
        } else {
            processTransaction();
        }
    };

    const verifyPin = () => {
        if (pin.length !== 4) return;
        processTransaction();
    };

    const processTransaction = async () => {
        setStep('processing');
        setApiError(null);

        const amountNum = Number.parseFloat(amount.replace(/\s/g, '').replace(',', '.'));
        const token = localStorage.getItem('token');

        try {
            const response = await fetch('/api/merchant/pos/transaction', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    terminalId: selectedTerminalId || undefined,
                    maskedPan: cardNumber ? `${cardNumber.slice(0, 6)}****${cardNumber.slice(-4)}` : undefined,
                    amount: amountNum,
                    paymentMethod: paymentMode
                })
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error || 'Erreur lors du traitement');
            }

            const transaction = payload.transaction || {};
            const approved = payload.approved === true || transaction.status === 'APPROVED';
            const txnResponseCode = transaction.response_code || transaction.responseCode || '';

            setResult({
                success: approved,
                authCode: approved ? (transaction.authorization_code || transaction.authorizationCode || undefined) : undefined,
                responseCode: txnResponseCode || (approved ? '00' : '05'),
                responseMessage: approved ? 'APPROUVEE' : (txnResponseCode === '51' ? 'SOLDE INSUFFISANT' : 'REFUSEE'),
                rrn: transaction.stan || transaction.transaction_id || '',
                timestamp: transaction.timestamp || new Date().toISOString()
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Erreur reseau';
            setApiError(message);
            setResult({
                success: false,
                responseCode: '96',
                responseMessage: 'ERREUR TECHNIQUE',
                timestamp: new Date().toISOString()
            });
        } finally {
            setStep('result');
        }
    };

    const resetTerminal = () => {
        setStep('idle');
        setAmount('');
        setCardNumber('');
        setPin('');
        setResult(null);
        setApiError(null);
    };

    const generateIso8583Request = () => {
        const amountCents = Math.round(Number.parseFloat(amount.replace(/\s/g, '').replace(',', '.')) * 100);
        const now = new Date();
        return `MTI: 0100 (Authorization Request)
DE002: ${cardNumber.slice(0, 6)}******${cardNumber.slice(-4)} (PAN)
DE003: 000000 (Processing Code - Purchase)
DE004: ${amountCents.toString().padStart(12, '0')} (Amount)
DE007: ${now.toISOString().replace(/[-:T]/g, '').slice(0, 10)} (Transmission Date/Time)
DE011: ${Math.floor(Math.random() * 999999).toString().padStart(6, '0')} (STAN)
DE012: ${now.toTimeString().slice(0, 8).replace(/:/g, '')} (Local Time)
DE013: ${now.toISOString().slice(5, 10).replace('-', '')} (Local Date)
DE014: ${cardNumber ? '2712' : ''} (Expiration Date)
DE022: ${paymentMode === 'contactless' ? '071' : paymentMode === 'chip' ? '051' : '012'} (POS Entry Mode)
DE023: 001 (Card Sequence Number)
DE025: 00 (POS Condition Code)
DE026: 12 (PIN Capture Code)
DE032: 123456 (Acquiring Institution ID)
DE035: ${cardNumber}D2712... (Track 2 Data)
DE037: ${Math.random().toString(36).substring(2, 14).toUpperCase()} (RRN)
DE041: ${(selectedTerminalId || 'POS-001').padEnd(15, ' ')} (Terminal ID)
DE042: MERCHANT001     (Merchant ID)
DE043: PMP BAKERY            PARIS         FR
DE049: 978 (Currency Code - EUR)
DE052: ${paymentMode === 'chip' ? '****PIN_BLOCK****' : ''} (PIN Data)
DE055: 9F26...9F27... (EMV Data)`;
    };

    const generateIso8583Response = () => {
        if (!result) return '';
        return `MTI: 0110 (Authorization Response)
DE002: ${cardNumber.slice(0, 6)}******${cardNumber.slice(-4)} (PAN)
DE003: 000000 (Processing Code)
DE004: ${Math.round(Number.parseFloat(amount.replace(/\s/g, '').replace(',', '.')) * 100).toString().padStart(12, '0')} (Amount)
DE011: ${result.rrn?.slice(0, 6)} (STAN)
DE037: ${result.rrn} (RRN)
DE038: ${result.authCode || ''} (Authorization Code)
DE039: ${result.responseCode} (Response Code - ${result.responseMessage})
DE041: ${(selectedTerminalId || 'POS-001').padEnd(15, ' ')} (Terminal ID)
DE042: MERCHANT001     (Merchant ID)
DE055: 91...9F27... (EMV Response Data)`;
    };

    const currentStepIndex = STEP_ORDER.findIndex((item) => item.id === (step === 'idle' ? 'amount' : step));

    if (isLoading) {
        return (
            <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BankSpinner size={40} />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'var(--bank-space-6)' }}>
            <div className="bk-caption" style={{ marginBottom: 'var(--bank-space-4)' }}>
                <Link href="/merchant" style={{ color: 'var(--bank-text-tertiary)', textDecoration: 'none' }}>Dashboard Marchand</Link>
                <ChevronRight size={12} style={{ display: 'inline', margin: '0 6px' }} />
                <span style={{ color: 'var(--bank-accent)' }}>Terminal POS</span>
            </div>

            <BankPageHeader
                title="Terminal POS"
                subtitle="Simulation d encaissement avec messages ISO 8583 et etapes de traitement."
            />

            <section className="bk-card" style={{ marginBottom: 'var(--bank-space-5)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STEP_ORDER.length}, minmax(0, 1fr))`, gap: 'var(--bank-space-2)' }}>
                    {STEP_ORDER.map((item, index) => {
                        const active = index <= currentStepIndex;
                        return (
                            <div
                                key={item.id}
                                style={{
                                    border: '1px solid var(--bank-border-subtle)',
                                    borderRadius: 'var(--bank-radius-md)',
                                    padding: 'var(--bank-space-2)',
                                    textAlign: 'center',
                                    background: active ? 'var(--bank-accent-subtle)' : 'var(--bank-bg-sunken)',
                                }}
                            >
                                <p className="bk-caption" style={{ margin: 0, color: active ? 'var(--bank-accent)' : 'var(--bank-text-tertiary)' }}>
                                    {index + 1}. {item.label}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--bank-space-5)' }} className="bk-pos-grid">
                <section className="bk-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-4)' }}>
                    <div
                        style={{
                            border: '1px solid var(--bank-border-subtle)',
                            background: 'var(--bank-bg-sunken)',
                            borderRadius: 'var(--bank-radius-xl)',
                            padding: 'var(--bank-space-5)',
                            minHeight: 330,
                        }}
                    >
                        {step === 'idle' && (
                            <div style={{ display: 'grid', gap: 'var(--bank-space-4)' }}>
                                <AmountInput
                                    label="Montant"
                                    value={amountValueNumber}
                                    onChange={(value) => {
                                        if (value === null) {
                                            setAmount('');
                                            return;
                                        }
                                        setAmount(value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                                    }}
                                    currency="EUR"
                                    size="lg"
                                    align="right"
                                />

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--bank-space-3)' }}>
                                    <BankSelect
                                        label="Terminal marchand"
                                        value={selectedTerminalId}
                                        onChange={(value) => setSelectedTerminalId(value)}
                                        options={terminalOptions}
                                    />
                                    <BankSelect
                                        label="Mode de paiement"
                                        value={paymentMode}
                                        onChange={(value) => setPaymentMode(value as PaymentMode)}
                                        options={MODE_OPTIONS}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--bank-space-2)' }}>
                                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'].map((key) => (
                                        <BankButton
                                            key={key}
                                            variant={key === 'clear' ? 'danger' : 'ghost'}
                                            onClick={() => handleAmountInput(key)}
                                        >
                                            {key === 'clear' ? 'C' : key === 'backspace' ? '←' : key}
                                        </BankButton>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 'card' && (
                            <div style={{ display: 'grid', gap: 'var(--bank-space-4)' }}>
                                {paymentMode === 'manual' ? (
                                    <BankInput
                                        label="Numero de carte"
                                        value={cardNumber}
                                        onChange={(event) => setCardNumber(event.target.value.replace(/\D/g, '').slice(0, 16))}
                                        placeholder="4532 8921 7654 4532"
                                        prefix={CreditCard}
                                    />
                                ) : (
                                    <div style={{ textAlign: 'center', padding: 'var(--bank-space-8) 0' }}>
                                        <div style={{ marginBottom: 'var(--bank-space-4)' }}>
                                            {paymentMode === 'contactless' ? (
                                                <Wifi size={54} style={{ color: 'var(--bank-accent)', transform: 'rotate(90deg)' }} />
                                            ) : (
                                                <CreditCard size={54} style={{ color: 'var(--bank-accent)' }} />
                                            )}
                                        </div>
                                        <p style={{ margin: 0, color: 'var(--bank-text-primary)', fontWeight: 'var(--bank-font-semibold)' }}>
                                            {paymentMode === 'contactless' ? 'Presentez la carte' : 'Inserez la carte'}
                                        </p>
                                        <p className="bk-caption" style={{ marginTop: 6 }}>{amount || '0,00'} EUR</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 'pin' && (
                            <div style={{ display: 'grid', gap: 'var(--bank-space-4)' }}>
                                <p style={{ margin: 0, color: 'var(--bank-text-secondary)', textAlign: 'center' }}>Entrez le code PIN</p>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--bank-space-2)' }}>
                                    {[0, 1, 2, 3].map((i) => (
                                        <div
                                            key={i}
                                            style={{
                                                width: 46,
                                                height: 46,
                                                borderRadius: 'var(--bank-radius-md)',
                                                border: `1px solid ${pin.length > i ? 'var(--bank-accent)' : 'var(--bank-border-default)'}`,
                                                display: 'grid',
                                                placeItems: 'center',
                                                background: pin.length > i ? 'var(--bank-accent-subtle)' : 'var(--bank-bg-elevated)',
                                            }}
                                        >
                                            {pin.length > i ? (showPin ? <span>{pin[i]}</span> : '•') : null}
                                        </div>
                                    ))}
                                </div>
                                <BankButton variant="ghost" size="sm" icon={showPin ? EyeOff : Eye} onClick={() => setShowPin((prev) => !prev)}>
                                    {showPin ? 'Masquer PIN' : 'Afficher PIN'}
                                </BankButton>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--bank-space-2)' }}>
                                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'].map((key) => (
                                        <BankButton
                                            key={key}
                                            variant={key === 'clear' ? 'danger' : 'ghost'}
                                            onClick={() => handlePinInput(key)}
                                        >
                                            {key === 'clear' ? 'C' : key === 'backspace' ? '←' : key}
                                        </BankButton>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 'processing' && (
                            <div style={{ minHeight: 250, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                                <div>
                                    <BankSpinner size={52} />
                                    <p style={{ marginTop: 'var(--bank-space-4)', color: 'var(--bank-text-primary)', fontWeight: 'var(--bank-font-semibold)' }}>
                                        Traitement en cours
                                    </p>
                                    <p className="bk-caption">Communication avec le reseau bancaire...</p>
                                </div>
                            </div>
                        )}

                        {step === 'result' && result && (
                            <div style={{ minHeight: 250, display: 'grid', placeItems: 'center', textAlign: 'center', gap: 'var(--bank-space-3)' }}>
                                {result.success ? (
                                    <CheckCircle2 size={56} style={{ color: 'var(--bank-success)' }} />
                                ) : (
                                    <XCircle size={56} style={{ color: 'var(--bank-danger)' }} />
                                )}
                                <BankBadge
                                    variant={result.success ? 'success' : 'danger'}
                                    label={result.success ? 'APPROUVEE' : 'REFUSEE'}
                                />
                                <p style={{ margin: 0, color: 'var(--bank-text-primary)', fontWeight: 'var(--bank-font-semibold)' }}>
                                    {amount || '0,00'} EUR
                                </p>
                                <p className="bk-caption" style={{ margin: 0 }}>
                                    Code {result.responseCode} - {result.responseMessage}
                                </p>
                                <p className="bk-caption" style={{ margin: 0, fontFamily: 'var(--bank-font-mono)' }}>
                                    AUTH {result.authCode || '-'} · RRN {result.rrn || '-'}
                                </p>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--bank-space-2)', flexWrap: 'wrap' }}>
                        <BankButton variant="danger" icon={RotateCcw} onClick={resetTerminal}>
                            Annuler
                        </BankButton>

                        {step === 'idle' && (
                            <BankButton onClick={startTransaction} iconRight={ArrowRight} disabled={!amount}>
                                Simuler transaction
                            </BankButton>
                        )}

                        {step === 'card' && (
                            <BankButton onClick={processCard} icon={paymentMode === 'manual' ? Keyboard : CreditCard}>
                                {paymentMode === 'manual' ? 'Valider la carte' : 'Simuler lecture'}
                            </BankButton>
                        )}

                        {step === 'pin' && (
                            <BankButton onClick={verifyPin} icon={Shield} disabled={pin.length !== 4}>
                                Confirmer PIN
                            </BankButton>
                        )}

                        {step === 'result' && (
                            <>
                                <BankButton variant="ghost" icon={Printer}>
                                    Ticket
                                </BankButton>
                                <BankButton onClick={resetTerminal} icon={RefreshCcw}>
                                    Nouvelle vente
                                </BankButton>
                            </>
                        )}
                    </div>

                    {apiError && (
                        <div style={{
                            borderRadius: 'var(--bank-radius-lg)',
                            border: '1px solid color-mix(in srgb, var(--bank-danger) 30%, transparent)',
                            background: 'color-mix(in srgb, var(--bank-danger) 8%, transparent)',
                            color: 'var(--bank-danger)',
                            padding: 'var(--bank-space-3)',
                            fontSize: 'var(--bank-text-sm)',
                        }}>
                            {apiError}
                        </div>
                    )}
                </section>

                <section className="bk-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ margin: 0, fontSize: 'var(--bank-text-base)', color: 'var(--bank-text-primary)' }}>
                            Messages ISO 8583
                        </h2>
                        <BankBadge variant="info" icon={Info} label="Pedagogique" />
                    </div>

                    <div style={{ border: '1px solid var(--bank-border-subtle)', borderRadius: 'var(--bank-radius-lg)', overflow: 'hidden' }}>
                        <button
                            onClick={() => setShowIso8583((prev) => !prev)}
                            style={{
                                width: '100%',
                                background: 'var(--bank-bg-surface)',
                                color: 'var(--bank-text-primary)',
                                border: 'none',
                                padding: 'var(--bank-space-4)',
                                textAlign: 'left',
                                cursor: 'pointer',
                            }}
                        >
                            0100 - Authorization Request
                        </button>
                        {showIso8583 && (step === 'processing' || step === 'result') && (
                            <pre style={{
                                margin: 0,
                                padding: 'var(--bank-space-4)',
                                background: 'var(--bank-bg-sunken)',
                                color: 'var(--bank-text-secondary)',
                                fontSize: 11,
                                overflowX: 'auto',
                                whiteSpace: 'pre-wrap',
                            }}>{generateIso8583Request()}</pre>
                        )}
                    </div>

                    {step === 'result' && result && (
                        <div style={{ border: '1px solid var(--bank-border-subtle)', borderRadius: 'var(--bank-radius-lg)', overflow: 'hidden' }}>
                            <div style={{ padding: 'var(--bank-space-4)', background: 'var(--bank-bg-surface)', color: 'var(--bank-text-primary)' }}>
                                0110 - Authorization Response
                            </div>
                            {showIso8583 && (
                                <pre style={{
                                    margin: 0,
                                    padding: 'var(--bank-space-4)',
                                    background: 'var(--bank-bg-sunken)',
                                    color: 'var(--bank-text-secondary)',
                                    fontSize: 11,
                                    overflowX: 'auto',
                                    whiteSpace: 'pre-wrap',
                                }}>{generateIso8583Response()}</pre>
                            )}
                        </div>
                    )}

                    <div style={{ border: '1px solid var(--bank-border-subtle)', borderRadius: 'var(--bank-radius-lg)', padding: 'var(--bank-space-4)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: 'var(--bank-space-3)', fontSize: 'var(--bank-text-sm)', color: 'var(--bank-text-primary)' }}>
                            Codes de reponse courants
                        </h3>
                        <div style={{ display: 'grid', gap: 'var(--bank-space-2)' }}>
                            <BankBadge variant="success" label="00 - Approuvee" />
                            <BankBadge variant="danger" label="51 - Fonds insuffisants" />
                            <BankBadge variant="danger" label="14 - Numero de carte invalide" />
                            <BankBadge variant="danger" label="54 - Carte expiree" />
                            <BankBadge variant="warning" label="05 - Ne pas honorer" />
                        </div>
                    </div>

                    <div style={{
                        borderRadius: 'var(--bank-radius-lg)',
                        border: '1px solid color-mix(in srgb, var(--bank-info) 30%, transparent)',
                        background: 'color-mix(in srgb, var(--bank-info) 10%, transparent)',
                        padding: 'var(--bank-space-4)',
                    }}>
                        <p style={{ margin: 0, color: 'var(--bank-text-primary)', fontSize: 'var(--bank-text-sm)', fontWeight: 'var(--bank-font-medium)' }}>
                            Mode simulation
                        </p>
                        <p className="bk-caption" style={{ marginTop: 6, marginBottom: 0 }}>
                            Les montants inferieurs a 1000 EUR sont generalement approuves. PIN de test: 1234.
                        </p>
                    </div>
                </section>
            </div>

            <style>{`
              @media (max-width: 1024px) {
                .bk-pos-grid { grid-template-columns: 1fr !important; }
              }
            `}</style>
        </div>
    );
}
