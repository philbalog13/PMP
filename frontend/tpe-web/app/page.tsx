'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTerminalStore }                     from '@/lib/store';
import {
  getAvailableMerchants, simulateClientPayment, processTransaction,
} from '@/lib/api-client';
import type { MerchantApi }                     from '@/lib/api-client';
import type { SelectedMerchant }                from '@/lib/store';
import type { CardData }                        from '@/types/transaction';
import { useAuth }                              from '@shared/context/AuthContext';
import { Permission, UserRole }                 from '@shared/types/user';
import { APP_URLS }                             from '@shared/lib/app-urls';
import { normalizeRole }                        from '@shared/utils/roleUtils';
import {
  AlertTriangle, Bug, FileText, Settings, Wifi, Activity,
  CreditCard, Store, ArrowRight, CheckCircle2, XCircle,
  ExternalLink, Home as HomeIcon,
} from 'lucide-react';

/* ── Sub-composants terminal (inchangés) ── */
import TerminalScreen   from '@/components/terminal/TerminalScreen';
import Keypad           from '@/components/terminal/Keypad';
import CardSelector     from '@/components/terminal/CardSelector';
import CardReaderSim    from '@/components/terminal/CardReaderSim';
import MerchantSelector from '@/components/terminal/MerchantSelector';
import TPEShell         from '@/components/banking/TPEShell';
import ConfigPanel      from '@/components/config/ConfigPanel';
import DebugView        from '@/components/pedagogy/DebugView';
import TechnicalDetail  from '@/components/pedagogy/TechnicalDetail';

/* ── Banking design system ── */
import { BankSpinner } from '@shared/components/banking/primitives/BankSpinner';

/* ══════════════════════════════════════════════════════
   TYPES (inchangés)
   ══════════════════════════════════════════════════════ */
type PaymentStep = 'card' | 'merchant' | 'amount' | 'confirm';

type PaymentTransaction = {
  id?: string; transaction_id?: string; transactionId?: string;
  stan?: string; authorization_code?: string; authorizationCode?: string;
  response_code?: string;
};

type PaymentResultPayload = {
  success: boolean; transaction?: PaymentTransaction; error?: string;
  message?: string; responseCode?: string; response_code?: string; ledgerBooked?: boolean;
};

/* ══════════════════════════════════════════════════════
   HELPERS (inchangés)
   ══════════════════════════════════════════════════════ */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (isRecord(error)) {
    const response = isRecord(error.response) ? error.response : null;
    const data     = response && isRecord(response.data) ? response.data : null;
    if (data && typeof data.error === 'string' && data.error.trim()) return data.error;
    if (typeof error.message === 'string' && error.message.trim()) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64    = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded    = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    try {
      const utf8Payload = decodeURIComponent(
        atob(padded).split('').map(c => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''),
      );
      const parsed = JSON.parse(utf8Payload);
      return isRecord(parsed) ? parsed : null;
    } catch {
      const parsed = JSON.parse(atob(padded));
      return isRecord(parsed) ? parsed : null;
    }
  } catch { return null; }
};

const permissionValues = new Set<string>(Object.values(Permission));

const toSelectedMerchant = (merchant: MerchantApi): SelectedMerchant => {
  const terminal = merchant.terminals?.[0];
  return {
    id:           merchant.id,
    displayName:  merchant.displayName || merchant.username || 'Merchant',
    merchantName: terminal?.merchantName || merchant.displayName || merchant.username || 'Merchant',
    mcc:          terminal?.mcc || '5411',
    terminalId:   terminal?.terminalId || null,
    locationName: terminal?.locationName || null,
    city:         terminal?.city || null,
  };
};

/* ══════════════════════════════════════════════════════
   STYLES PARTAGÉS
   ══════════════════════════════════════════════════════ */
const S = {
  card: {
    borderRadius: 16,
    border:       '1px solid var(--bank-border-subtle)',
    background:   'var(--bank-bg-surface)',
  } as React.CSSProperties,

  cardPad: (extra?: React.CSSProperties): React.CSSProperties => ({
    borderRadius: 16,
    border:       '1px solid var(--bank-border-subtle)',
    background:   'var(--bank-bg-surface)',
    padding:      24,
    ...extra,
  }),

  row: (extra?: React.CSSProperties): React.CSSProperties => ({
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    ...extra,
  }),

  label: { fontSize: 13, color: 'var(--bank-text-tertiary)' } as React.CSSProperties,
  value: { fontSize: 13, color: 'var(--bank-text-primary)', fontWeight: 500 } as React.CSSProperties,
  mono:  { fontFamily: '"Courier New", monospace' } as React.CSSProperties,
  sep:   { height: 1, background: 'var(--bank-border-subtle)', margin: '8px 0' } as React.CSSProperties,
};

/* ══════════════════════════════════════════════════════
   COMPOSANT LOADING CARD
   ══════════════════════════════════════════════════════ */
function LoadingCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bank-bg-base)', padding: 32 }}>
      <div style={{ ...S.cardPad(), maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><BankSpinner size={40} /></div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--bank-text-primary)', marginBottom: 8 }}>{title}</h1>
        <p style={{ fontSize: 14, color: 'var(--bank-text-tertiary)' }}>{subtitle}</p>
      </div>
    </main>
  );
}

/* ══════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ══════════════════════════════════════════════════════ */
function HomeContent() {
  const searchParams = useSearchParams();
  const { isLoading: isAuthLoading, isAuthenticated, token: authToken, user, login } = useAuth();
  const {
    amount, selectedType, selectedCard, selectedMerchant, cardData,
    setState, setSelectedCard, setSelectedMerchant, setCardData,
    setLastTransactionId, setCurrentTransaction, addToHistory,
    debugMode, toggleTechnicalDetails, reset,
  } = useTerminalStore();

  const requestedMerchantId  = searchParams.get('merchantId')?.trim() || null;
  const fromParam            = (searchParams.get('from') || '').toLowerCase();
  const urlToken             = searchParams.get('token')?.trim() || null;
  const isClientCheckoutFlow = fromParam === 'client' || Boolean(requestedMerchantId);
  const isMerchantLocked     = Boolean(requestedMerchantId);
  const isMerchantUser       = normalizeRole(user?.role) === UserRole.MARCHAND;

  const [isBooting,             setIsBooting]             = useState(true);
  const [bootError,             setBootError]             = useState<string | null>(null);
  const [lastBootCheckAt,       setLastBootCheckAt]       = useState<Date | null>(null);
  const [paymentStep,           setPaymentStep]           = useState<PaymentStep>('card');
  const [isProcessing,          setIsProcessing]          = useState(false);
  const [paymentResult,         setPaymentResult]         = useState<PaymentResultPayload | null>(null);
  const [use3DS,                setUse3DS]                = useState(true);
  const [merchantPrefillLoading,setMerchantPrefillLoading]= useState(false);
  const [merchantPrefillError,  setMerchantPrefillError]  = useState<string | null>(null);
  const [tokenRestored,         setTokenRestored]         = useState(false);

  /* ── Restore client auth token passed via URL ── */
  useEffect(() => {
    if (!urlToken || tokenRestored) return;
    if (authToken && authToken === urlToken) {
      setTokenRestored(true);
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('token');
      window.history.replaceState({}, '', cleanUrl.toString());
      return;
    }
    setTokenRestored(true);
    try {
      const payload = decodeJwtPayload(urlToken);
      const role    = normalizeRole(payload?.role) || UserRole.CLIENT;
      const payloadPermissions = Array.isArray(payload?.permissions)
        ? payload.permissions.filter((p): p is Permission => typeof p === 'string' && permissionValues.has(p))
        : [];
      const tokenUser = {
        id:        (typeof payload?.userId === 'string' && payload.userId) || (typeof payload?.sub === 'string' && payload.sub) || (typeof payload?.id === 'string' && payload.id) || '',
        email:     (typeof payload?.email === 'string' && payload.email) || '',
        role,
        permissions: payloadPermissions,
        firstName: (typeof payload?.firstName === 'string' && payload.firstName) || 'Client',
        lastName:  (typeof payload?.lastName  === 'string' && payload.lastName)  || '',
      };
      login(urlToken, tokenUser, null);
    } catch { console.error('Failed to restore token from URL'); }
    finally {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('token');
      window.history.replaceState({}, '', cleanUrl.toString());
    }
  }, [urlToken, tokenRestored, authToken, login]);

  /* ── Boot sequence ── */
  useEffect(() => {
    const bootSequence = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        const { checkSystemHealth } = await import('@/lib/api-client');
        const isHealthy             = await checkSystemHealth();
        setLastBootCheckAt(new Date());
        if (isHealthy) { setIsBooting(false); setState('amount-input'); }
        else { setBootError('Erreur de connexion Gateway'); setTimeout(() => setIsBooting(false), 2000); }
      } catch (err) { console.error('Boot failed', err); setBootError('System Failure'); setIsBooting(false); }
    };
    bootSequence();
  }, [setState]);

  /* ── Merchant prefill (URL merchantId) ── */
  useEffect(() => {
    if (!requestedMerchantId || selectedMerchant?.id === requestedMerchantId) return;
    let active = true;
    const resolveMerchant = async () => {
      setMerchantPrefillLoading(true); setMerchantPrefillError(null);
      try {
        const payload      = await getAvailableMerchants();
        const merchantList = Array.isArray(payload?.merchants) ? payload.merchants : [];
        const match        = merchantList.find((m): m is MerchantApi => typeof m?.id === 'string' && m.id === requestedMerchantId);
        if (!match) { if (active) setMerchantPrefillError('Marchand introuvable pour ce lien de paiement.'); return; }
        if (active) { setSelectedMerchant(toSelectedMerchant(match)); setMerchantPrefillError(null); }
      } catch (error: unknown) { if (active) setMerchantPrefillError(getErrorMessage(error, 'Impossible de charger ce marchand.')); }
      finally { if (active) setMerchantPrefillLoading(false); }
    };
    void resolveMerchant();
    return () => { active = false; };
  }, [requestedMerchantId, selectedMerchant?.id, setSelectedMerchant]);

  useEffect(() => {
    if (!isClientCheckoutFlow || paymentStep !== 'merchant' || !selectedMerchant) return;
    setPaymentStep('amount');
  }, [isClientCheckoutFlow, paymentStep, selectedMerchant]);

  /* ── Merchant auto-select (self) ── */
  useEffect(() => {
    if (isAuthLoading || !isAuthenticated || isClientCheckoutFlow) return;
    if (isMerchantUser && !selectedMerchant && user?.id) {
      let active = true;
      const resolveSelf = async () => {
        try {
          const payload      = await getAvailableMerchants();
          const merchantList = Array.isArray(payload?.merchants) ? payload.merchants : [];
          const self         = merchantList.find((m): m is MerchantApi => typeof m?.id === 'string' && m.id === user.id)
            || (merchantList.length > 0 ? merchantList[0] as MerchantApi : null);
          if (self && active) setSelectedMerchant(toSelectedMerchant(self));
        } catch { /* Ignore — merchant selector will handle */ }
      };
      void resolveSelf();
      return () => { active = false; };
    }
  }, [isAuthLoading, isAuthenticated, isMerchantUser, isClientCheckoutFlow, selectedMerchant, user?.id, setSelectedMerchant]);

  useEffect(() => {
    if (!isClientCheckoutFlow && paymentStep === 'card') setState('card-wait');
  }, [isClientCheckoutFlow, paymentStep, setState]);

  /* ── Handlers ── */
  const handleAmountComplete = () => {
    if (isClientCheckoutFlow) {
      if (!selectedCard)     { setPaymentStep('card');     return; }
      if (!selectedMerchant) { setPaymentStep('merchant'); return; }
      setPaymentStep('confirm');
    } else { setPaymentStep('confirm'); }
  };

  const canPay = isClientCheckoutFlow
    ? Boolean(selectedCard && selectedMerchant && amount > 0 && !isProcessing)
    : Boolean(cardData && amount > 0 && !isProcessing);

  const handleCardRead = (data: CardData) => { setCardData(data); setState('amount-input'); };

  const displayMaskedPan = selectedCard?.maskedPan || (cardData ? `**** **** **** ${cardData.pan.slice(-4)}` : '—');

  /* ── Client payment handler ── */
  const handleProcessPayment = async () => {
    if (!selectedCard || !selectedMerchant || amount <= 0) {
      setPaymentResult({ success: false, error: !selectedCard ? 'Carte non sélectionnée' : !selectedMerchant ? 'Marchand non sélectionné' : 'Montant invalide', responseCode: '99' });
      return;
    }
    if (isProcessing) return;
    setIsProcessing(true); setPaymentResult(null);
    try {
      const response = await simulateClientPayment({ cardId: selectedCard.id, merchantId: selectedMerchant.id, amount, use3DS: use3DS && selectedCard.threedsEnrolled, paymentType: selectedType });
      const normalizedError        = typeof response.error === 'string' ? response.error : (typeof response.message === 'string' ? response.message : undefined);
      const normalizedResponseCode = typeof response.responseCode === 'string' ? response.responseCode : (typeof response.response_code === 'string' ? response.response_code : '96');
      const normalizedResponse: PaymentResultPayload = response.success ? response : { ...response, success: false, error: normalizedError || 'Aucune réponse exploitable.', responseCode: normalizedResponseCode };
      setPaymentResult(normalizedResponse);
      if (normalizedResponse.success) {
        const txn    = normalizedResponse.transaction;
        const authCode = txn?.authorization_code || txn?.authorizationCode || '';
        const txnId    = txn?.transaction_id || txn?.transactionId || txn?.stan || '';
        setLastTransactionId(txn?.id || null);
        setCurrentTransaction({ approved: true, responseCode: txn?.response_code || '00', responseMessage: 'Approved', authorizationCode: authCode, processingTime: 0, matchedRules: [], timestamp: new Date() });
        addToHistory({ id: txnId || txn?.id || String(Date.now()), amount, type: selectedType, status: 'APPROVED', responseCode: txn?.response_code || '00', authorizationCode: authCode, maskedPan: selectedCard.maskedPan, timestamp: new Date(), matchedRules: [] });
        setSelectedCard({ ...selectedCard, balance: selectedCard.balance - amount });
      } else {
        const errorCode = typeof normalizedResponse.responseCode === 'string' ? normalizedResponse.responseCode : (typeof normalizedResponse.response_code === 'string' ? normalizedResponse.response_code : '05');
        const errorMsg  = typeof normalizedResponse.error === 'string' ? normalizedResponse.error : (typeof normalizedResponse.message === 'string' ? normalizedResponse.message : 'Declined');
        const failedTxn = normalizedResponse.transaction;
        setCurrentTransaction({ approved: false, responseCode: errorCode, responseMessage: errorMsg, matchedRules: [], processingTime: 0, timestamp: new Date() });
        addToHistory({ id: failedTxn?.transaction_id || failedTxn?.id || `DECLINED-${Date.now()}`, amount, type: selectedType, status: 'DECLINED', responseCode: errorCode, authorizationCode: '', maskedPan: selectedCard.maskedPan, timestamp: new Date(), matchedRules: [] });
      }
    } catch (error: unknown) {
      console.error('Payment error:', error);
      const responseData = isRecord(error) && isRecord(error.response) && isRecord((error.response as Record<string, unknown>).data) ? (error.response as Record<string, unknown>).data as Record<string, unknown> : null;
      const errMsg  = responseData && typeof responseData.error === 'string' ? responseData.error : (error instanceof Error ? error.message : 'Erreur système');
      const errCode = responseData && typeof responseData.responseCode === 'string' ? responseData.responseCode : '96';
      setPaymentResult({ success: false, error: errMsg, responseCode: errCode });
      setCurrentTransaction({ approved: false, responseCode: errCode, responseMessage: errMsg, matchedRules: [], processingTime: 0, timestamp: new Date() });
      addToHistory({ id: `ERR-${Date.now()}`, amount, type: selectedType, status: 'DECLINED', responseCode: errCode, authorizationCode: '', maskedPan: selectedCard?.maskedPan || '****', timestamp: new Date(), matchedRules: [] });
    } finally { setIsProcessing(false); }
  };

  /* ── Merchant standalone payment handler ── */
  const handleMerchantProcessPayment = async () => {
    if (!cardData || amount <= 0) {
      setPaymentResult({ success: false, error: !cardData ? 'Carte non présentée' : 'Montant invalide', responseCode: '99' }); return;
    }
    if (isProcessing) return;
    setIsProcessing(true); setPaymentResult(null);
    try {
      const result      = await processTransaction({ pan: cardData.pan, amount, type: selectedType, merchantId: selectedMerchant?.id, mcc: selectedMerchant?.mcc });
      const maskedPan   = `**** **** **** ${cardData.pan.slice(-4)}`;
      if (result.approved) {
        setPaymentResult({ success: true, responseCode: result.responseCode, transaction: { authorization_code: result.authorizationCode || result.authCode, response_code: result.responseCode } });
        setCurrentTransaction({ approved: true, responseCode: result.responseCode, responseMessage: result.responseMessage, authorizationCode: result.authorizationCode || result.authCode || '', processingTime: result.processingTime, matchedRules: [], timestamp: new Date() });
        addToHistory({ id: String(Date.now()), amount, type: selectedType, status: 'APPROVED', responseCode: result.responseCode, authorizationCode: result.authorizationCode || result.authCode || '', maskedPan, timestamp: new Date(), matchedRules: [] });
        setState('approved');
      } else {
        setPaymentResult({ success: false, error: result.responseMessage, responseCode: result.responseCode });
        setCurrentTransaction({ approved: false, responseCode: result.responseCode, responseMessage: result.responseMessage, matchedRules: [], processingTime: result.processingTime, timestamp: new Date() });
        addToHistory({ id: `DECLINED-${Date.now()}`, amount, type: selectedType, status: 'DECLINED', responseCode: result.responseCode, authorizationCode: '', maskedPan, timestamp: new Date(), matchedRules: [] });
        setState('declined');
      }
    } catch (error: unknown) {
      console.error('Merchant payment error:', error);
      const errMsg = error instanceof Error ? error.message : 'Erreur système';
      setPaymentResult({ success: false, error: errMsg, responseCode: '96' });
      setCurrentTransaction({ approved: false, responseCode: '96', responseMessage: errMsg, matchedRules: [], processingTime: 0, timestamp: new Date() });
      setState('declined');
    } finally { setIsProcessing(false); }
  };

  const handleNewTransaction = () => {
    const lockedMerchant = isClientCheckoutFlow ? selectedMerchant : null;
    setPaymentResult(null); setPaymentStep('card'); setLastTransactionId(null); reset();
    if (lockedMerchant) setSelectedMerchant(lockedMerchant);
    setState('amount-input');
  };

  /* ════════════════════ ÉTAT LOADING ════════════════════ */
  if (isAuthLoading || (urlToken && !tokenRestored)) {
    return <LoadingCard title="Chargement de la session" subtitle="Vérification de l'authentification…" />;
  }
  if (isBooting) {
    return <LoadingCard title="Initialisation du terminal" subtitle="Vérification des services monétiques en cours…" />;
  }

  /* ════════════════════ ÉTAT NON AUTHENTIFIÉ ════════════════════ */
  if (isClientCheckoutFlow && !isAuthenticated) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bank-bg-base)', padding: 32 }}>
        <div style={{ ...S.cardPad(), maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <AlertTriangle size={48} style={{ color: 'var(--bank-warning)', margin: '0 auto 16px' }} aria-hidden="true" />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--bank-text-primary)', marginBottom: 8 }}>Session non authentifiée</h1>
          <p style={{ fontSize: 14, color: 'var(--bank-text-tertiary)', marginBottom: 24, lineHeight: 1.6 }}>
            Pour effectuer un paiement client, vous devez être connecté. Accédez à votre espace client pour sélectionner un marchand et payer.
          </p>
          <a href={APP_URLS.userCards}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 10, background: 'var(--bank-accent)', color: 'white', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
            Aller à l&apos;espace client <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </main>
    );
  }

  /* ════════════════════ RENDU PRINCIPAL ════════════════════ */
  const STEPS: Array<{ key: PaymentStep; icon: typeof CreditCard; label: string }> = [
    { key: 'card',     icon: CreditCard,   label: 'Carte' },
    { key: 'merchant', icon: Store,        label: 'Marchand' },
    { key: 'amount',   icon: Activity,     label: 'Montant' },
    { key: 'confirm',  icon: CheckCircle2, label: 'Confirmer' },
  ];
  const currentStepIdx = STEPS.findIndex(s => s.key === paymentStep);

  return (
    <TPEShell className="font-sans">
      {/* ── Status bar ── */}
      {(bootError || lastBootCheckAt) && (
        <div style={{ maxWidth: 1280, margin: '0 auto 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {selectedMerchant && (
            <div style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--bank-accent) 25%, transparent)', background: 'color-mix(in srgb, var(--bank-accent) 6%, transparent)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, fontSize: 13 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--bank-text-primary)' }}>
                <Store size={15} style={{ color: 'var(--bank-accent)' }} aria-hidden="true" />
                {selectedMerchant.merchantName}
              </span>
              <span style={{ display: 'flex', gap: 16, color: 'var(--bank-text-tertiary)', fontSize: 12, flexWrap: 'wrap' }}>
                {selectedMerchant.terminalId && <span><span style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em', marginRight: 4 }}>TID</span><span style={{ ...S.mono, color: 'var(--bank-text-secondary)' }}>{selectedMerchant.terminalId}</span></span>}
                <span><span style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em', marginRight: 4 }}>MCC</span><span style={{ ...S.mono, color: 'var(--bank-text-secondary)' }}>{selectedMerchant.mcc}</span></span>
                {selectedMerchant.locationName && <span>{selectedMerchant.locationName}</span>}
              </span>
            </div>
          )}
          <div style={{ padding: '10px 16px', borderRadius: 12, border: `1px solid ${bootError ? 'color-mix(in srgb, var(--bank-warning) 30%, transparent)' : 'color-mix(in srgb, var(--bank-success) 25%, transparent)'}`, background: bootError ? 'color-mix(in srgb, var(--bank-warning) 6%, transparent)' : 'color-mix(in srgb, var(--bank-success) 6%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, fontSize: 13 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: bootError ? 'var(--bank-warning)' : 'var(--bank-success)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: bootError ? 'var(--bank-warning)' : 'var(--bank-success)', display: 'inline-block' }} />
              {bootError ? `Mode dégradé : ${bootError}` : 'Terminal connecté. Prêt à encaisser.'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {lastBootCheckAt && <span style={{ fontSize: 11, color: 'var(--bank-text-tertiary)' }}>{lastBootCheckAt.toLocaleTimeString('fr-FR')}</span>}
              {isClientCheckoutFlow ? (
                <a href={APP_URLS.userCards} style={{ fontSize: 11, color: 'var(--bank-text-tertiary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Dashboard client <ExternalLink size={10} aria-hidden="true" />
                </a>
              ) : (
                <Link href={process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}
                  style={{ fontSize: 11, color: 'var(--bank-text-tertiary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Portail <ExternalLink size={10} aria-hidden="true" />
                </Link>
              )}
            </span>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'start' }}
        className="bk-tpe-grid">

        {/* ══════════════ TERMINAL PHYSIQUE ══════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Corps du terminal */}
          <div style={{
            padding:      32,
            borderRadius: 48,
            width:        '100%',
            maxWidth:     400,
            position:     'relative',
            border:       '1px solid rgba(255,255,255,0.12)',
            borderTop:    '1px solid rgba(255,255,255,0.20)',
            background:   'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(24px)',
            boxShadow:    '0 24px 80px rgba(79,70,229,0.2), 0 4px 16px rgba(0,0,0,0.6)',
          }}>
            {/* Halo derrière */}
            <div style={{ position: 'absolute', inset: -4, borderRadius: 52, background: 'linear-gradient(180deg, rgba(79,70,229,0.15), transparent)', opacity: 0.6, filter: 'blur(4px)', zIndex: -1, pointerEvents: 'none' }} aria-hidden="true" />

            {/* Header terminal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, padding: '0 8px' }}>
              <span style={{ fontWeight: 700, letterSpacing: '0.18em', fontSize: 10, textTransform: 'uppercase', color: 'rgba(129,140,248,0.7)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={12} style={{ color: '#818CF8' }} aria-hidden="true" />
                Ingenico PMP <span style={{ color: '#818CF8' }}>NEO</span>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Wifi size={15} style={{ color: '#818CF8' }} aria-label="Sans-fil" />
                {/* Batterie */}
                <div style={{ width: 32, height: 16, background: 'rgba(15,23,42,0.9)', borderRadius: 4, border: '1px solid rgba(100,116,139,0.5)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', padding: '0 2px' }}>
                  <div style={{ height: '75%', width: '85%', background: 'linear-gradient(90deg, #22c55e, #4ade80)', borderRadius: 2, boxShadow: '0 0 6px rgba(74,222,128,0.5)' }} />
                </div>
              </div>
            </div>

            {/* Écran */}
            <div style={{ background: 'rgba(2,6,23,1)', borderRadius: 12, padding: 4, marginBottom: 32, boxShadow: 'inset 0 0 20px rgba(0,0,0,1)', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, background: 'rgba(255,255,255,0.04)', borderRadius: '50%', filter: 'blur(20px)', pointerEvents: 'none' }} aria-hidden="true" />
              <TerminalScreen />
            </div>

            {/* Clavier */}
            <div style={{ marginBottom: 40 }}>
              <Keypad onAmountComplete={handleAmountComplete} />
            </div>

            {/* NFC footer */}
            <div style={{ textAlign: 'center', paddingBottom: 8, position: 'relative' }}>
              <div style={{ height: 8, width: 128, background: '#000', margin: '0 auto', borderRadius: 'var(--bank-radius-full)', boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }} aria-hidden="true" />
              <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 16, width: 16, height: 16, background: 'rgba(129,140,248,0.15)', borderRadius: '50%', filter: 'blur(8px)' }} aria-hidden="true" />
              <p style={{ fontSize: 9, color: 'rgba(129,140,248,0.45)', marginTop: 12, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700 }}>NFC Ready</p>
            </div>
          </div>

          <p style={{ color: 'var(--bank-text-tertiary)', fontSize: 13, marginTop: 24, textAlign: 'center', maxWidth: 320, lineHeight: 1.6 }}>
            Sélectionnez votre carte et le marchand, entrez le montant, puis validez le paiement.
          </p>
        </div>

        {/* ══════════════ FLUX DE PAIEMENT ══════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isClientCheckoutFlow && (
            <div style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--bank-warning) 30%, transparent)', background: 'color-mix(in srgb, var(--bank-warning) 6%, transparent)' }}>
              <p style={{ fontSize: 13, color: 'var(--bank-warning)', lineHeight: 1.5 }}>
                Mode paiement client : cette page sert uniquement à effectuer le paiement.
                Les données de compte et l&apos;historique marchand sont disponibles uniquement dans l&apos;espace marchand.
              </p>
            </div>
          )}

          {!paymentResult ? (
            <div style={S.cardPad()}>
              {/* Step indicators */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
                {STEPS.map((s, i) => {
                  const isActive  = i === currentStepIdx;
                  const isDone    = i < currentStepIdx;
                  const canBack   = isDone;
                  return (
                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {i > 0 && <div style={{ width: 24, height: 2, background: isDone ? 'var(--bank-accent)' : 'var(--bank-border-subtle)', borderRadius: 1 }} aria-hidden="true" />}
                      <button
                        type="button"
                        onClick={() => { if (canBack) setPaymentStep(s.key); }}
                        disabled={!canBack && !isActive}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, border: `1px solid ${isActive ? 'color-mix(in srgb, var(--bank-accent) 40%, transparent)' : isDone ? 'color-mix(in srgb, var(--bank-success) 30%, transparent)' : 'var(--bank-border-subtle)'}`, background: isActive ? 'color-mix(in srgb, var(--bank-accent) 12%, transparent)' : isDone ? 'color-mix(in srgb, var(--bank-success) 8%, transparent)' : 'var(--bank-bg-elevated)', color: isActive ? 'var(--bank-accent)' : isDone ? 'var(--bank-success)' : 'var(--bank-text-tertiary)', fontSize: 12, fontWeight: 500, cursor: canBack ? 'pointer' : 'default', transition: 'all var(--bank-t-fast)' }}
                        aria-current={isActive ? 'step' : undefined}
                      >
                        <s.icon size={13} aria-hidden="true" />
                        {s.label}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* ── Étape Carte ── */}
              {paymentStep === 'card' && (
                isClientCheckoutFlow ? (
                  <CardSelector selectedCard={selectedCard} onSelect={card => { setSelectedCard(card); setPaymentStep(selectedMerchant ? 'amount' : 'merchant'); }} />
                ) : (
                  <CardReaderSim onCardRead={data => { handleCardRead(data); setPaymentStep(selectedMerchant ? 'amount' : 'merchant'); }} />
                )
              )}

              {/* ── Étape Marchand ── */}
              {paymentStep === 'merchant' && (
                <div>
                  {merchantPrefillLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '24px 0', color: 'var(--bank-text-tertiary)', fontSize: 13 }}>
                      <BankSpinner size={18} />
                      Chargement du marchand…
                    </div>
                  )}
                  {!merchantPrefillLoading && merchantPrefillError && (
                    <div style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--bank-warning) 30%, transparent)', background: 'color-mix(in srgb, var(--bank-warning) 8%, transparent)', fontSize: 13, color: 'var(--bank-warning)', marginBottom: 12 }}>
                      {merchantPrefillError}
                    </div>
                  )}
                  {isMerchantLocked && selectedMerchant && !merchantPrefillError ? (
                    <div style={{ borderRadius: 12, border: '1px solid var(--bank-border-subtle)', background: 'rgba(0,0,0,0.15)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <p style={{ fontSize: 13, color: 'var(--bank-text-tertiary)' }}>Marchand imposé par le parcours client.</p>
                      <div style={S.row()}><span style={S.label}>Marchand</span><span style={S.value}>{selectedMerchant.merchantName}</span></div>
                      <div style={S.row()}><span style={S.label}>MCC</span><span style={S.value}>{selectedMerchant.mcc}</span></div>
                      <button onClick={() => setPaymentStep('amount')} style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--bank-accent) 35%, transparent)', background: 'color-mix(in srgb, var(--bank-accent) 10%, transparent)', color: 'var(--bank-accent)', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                        Continuer
                      </button>
                    </div>
                  ) : (
                    <MerchantSelector selectedMerchant={selectedMerchant} onSelect={merchant => { setSelectedMerchant(merchant); setMerchantPrefillError(null); setPaymentStep('amount'); }} />
                  )}
                </div>
              )}

              {/* ── Étape Montant ── */}
              {paymentStep === 'amount' && (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <Activity size={32} style={{ color: 'var(--bank-accent)', margin: '0 auto 12px' }} aria-hidden="true" />
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--bank-text-primary)', marginBottom: 8 }}>Saisir le montant</h3>
                  <p style={{ fontSize: 13, color: 'var(--bank-text-tertiary)', marginBottom: 16, lineHeight: 1.5 }}>
                    Utilisez le clavier du terminal pour entrer le montant puis appuyez sur VALIDER
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 13, flexWrap: 'wrap' }}>
                    <span style={S.label}>Carte :</span>
                    <span style={{ ...S.mono, color: 'var(--bank-text-primary)' }}>{displayMaskedPan}</span>
                    <ArrowRight size={12} style={{ color: 'var(--bank-text-tertiary)' }} aria-hidden="true" />
                    <span style={S.label}>Marchand :</span>
                    <span style={S.value}>{selectedMerchant?.merchantName || '—'}</span>
                  </div>
                  {amount > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ marginBottom: 16 }}>
                        <span style={{ fontSize: 36, fontWeight: 700, color: 'var(--bank-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{amount.toFixed(2)}</span>
                        <span style={{ fontSize: 18, color: 'var(--bank-text-tertiary)', marginLeft: 6 }}>EUR</span>
                      </div>
                      <button onClick={handleAmountComplete} style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: 'var(--bank-accent)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                        Continuer vers la confirmation
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Étape Confirmer (marchand standalone) ── */}
              {paymentStep === 'confirm' && !isClientCheckoutFlow && (
                !cardData ? (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <AlertTriangle size={32} style={{ color: 'var(--bank-warning)', margin: '0 auto 12px' }} aria-hidden="true" />
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--bank-text-primary)', marginBottom: 8 }}>Carte non présentée</h3>
                    <p style={{ fontSize: 13, color: 'var(--bank-text-tertiary)', marginBottom: 16 }}>Veuillez d&apos;abord lire une carte avant de confirmer le paiement.</p>
                    <button onClick={() => setPaymentStep('card')} style={{ padding: '10px 24px', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--bank-accent) 35%, transparent)', background: 'color-mix(in srgb, var(--bank-accent) 10%, transparent)', color: 'var(--bank-accent)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                      Revenir au lecteur
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--bank-text-primary)', textAlign: 'center' }}>Confirmer l&apos;encaissement</h3>
                    <div style={{ borderRadius: 12, border: '1px solid var(--bank-border-subtle)', background: 'rgba(0,0,0,0.2)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={S.row()}><span style={S.label}>Carte</span><span style={{ ...S.mono, ...S.value }}>{displayMaskedPan}</span></div>
                      <div style={S.row()}><span style={S.label}>Marchand</span><span style={S.value}>{selectedMerchant?.merchantName || 'Marchand'}</span></div>
                      <div style={S.row()}><span style={S.label}>MCC</span><span style={S.value}>{selectedMerchant?.mcc || '-'}</span></div>
                      <div style={S.sep} />
                      <div style={S.row()}><span style={S.label}>Montant</span><span style={{ fontSize: 20, fontWeight: 700, color: 'var(--bank-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{amount.toFixed(2)} EUR</span></div>
                    </div>
                    <button onClick={handleMerchantProcessPayment} disabled={isProcessing || !canPay}
                      style={{ padding: '16px', borderRadius: 12, border: 'none', background: (isProcessing || !canPay) ? 'var(--bank-bg-elevated)' : 'var(--bank-accent)', color: (isProcessing || !canPay) ? 'var(--bank-text-tertiary)' : 'white', fontSize: 16, fontWeight: 700, cursor: (isProcessing || !canPay) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all var(--bank-t-normal)' }}>
                      {isProcessing ? <><BankSpinner size={18} />Traitement en cours…</> : <>Encaisser {amount.toFixed(2)} EUR<ArrowRight size={18} aria-hidden="true" /></>}
                    </button>
                  </div>
                )
              )}

              {/* ── Étape Confirmer (client checkout) — carte manquante ── */}
              {paymentStep === 'confirm' && isClientCheckoutFlow && !selectedCard && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <AlertTriangle size={32} style={{ color: 'var(--bank-warning)', margin: '0 auto 12px' }} aria-hidden="true" />
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--bank-text-primary)', marginBottom: 8 }}>Carte non sélectionnée</h3>
                  <p style={{ fontSize: 13, color: 'var(--bank-text-tertiary)', marginBottom: 16 }}>Veuillez d&apos;abord sélectionner une carte pour continuer.</p>
                  <button onClick={() => setPaymentStep('card')} style={{ padding: '10px 24px', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--bank-accent) 35%, transparent)', background: 'color-mix(in srgb, var(--bank-accent) 10%, transparent)', color: 'var(--bank-accent)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                    Sélectionner une carte
                  </button>
                </div>
              )}

              {/* ── Étape Confirmer (client checkout) — marchand manquant ── */}
              {paymentStep === 'confirm' && isClientCheckoutFlow && selectedCard && !selectedMerchant && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <AlertTriangle size={32} style={{ color: 'var(--bank-warning)', margin: '0 auto 12px' }} aria-hidden="true" />
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--bank-text-primary)', marginBottom: 8 }}>Marchand non sélectionné</h3>
                  <p style={{ fontSize: 13, color: 'var(--bank-text-tertiary)', marginBottom: 16 }}>Veuillez d&apos;abord sélectionner un marchand pour continuer.</p>
                  <button onClick={() => setPaymentStep('merchant')} style={{ padding: '10px 24px', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--bank-success) 35%, transparent)', background: 'color-mix(in srgb, var(--bank-success) 8%, transparent)', color: 'var(--bank-success)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                    Sélectionner un marchand
                  </button>
                </div>
              )}

              {/* ── Étape Confirmer (client checkout) — OK ── */}
              {paymentStep === 'confirm' && isClientCheckoutFlow && selectedCard && selectedMerchant && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--bank-text-primary)', textAlign: 'center' }}>Confirmer le paiement</h3>
                  <div style={{ borderRadius: 12, border: '1px solid var(--bank-border-subtle)', background: 'rgba(0,0,0,0.2)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={S.row()}><span style={S.label}>Carte</span><span style={{ ...S.mono, ...S.value }}>{selectedCard.maskedPan} ({selectedCard.network})</span></div>
                    <div style={S.row()}><span style={S.label}>Solde disponible</span><span style={{ fontSize: 13, fontWeight: 500, color: 'var(--bank-success)' }}>{selectedCard.balance.toFixed(2)} EUR</span></div>
                    <div style={S.sep} />
                    <div style={S.row()}><span style={S.label}>Marchand</span><span style={S.value}>{selectedMerchant.merchantName}</span></div>
                    {selectedMerchant.locationName && <div style={S.row()}><span style={S.label}>Localisation</span><span style={S.value}>{selectedMerchant.locationName}</span></div>}
                    <div style={S.sep} />
                    <div style={S.row()}><span style={S.label}>Montant</span><span style={{ fontSize: 20, fontWeight: 700, color: 'var(--bank-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{amount.toFixed(2)} EUR</span></div>
                  </div>
                  {/* 3DS toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--bank-border-subtle)', background: 'rgba(0,0,0,0.15)' }}>
                    <span style={{ fontSize: 13, color: 'var(--bank-text-tertiary)' }}>3D Secure</span>
                    <button onClick={() => setUse3DS(!use3DS)}
                      style={{ padding: '3px 12px', borderRadius: 'var(--bank-radius-full)', border: `1px solid ${use3DS ? 'color-mix(in srgb, var(--bank-accent) 35%, transparent)' : 'var(--bank-border-default)'}`, background: use3DS ? 'color-mix(in srgb, var(--bank-accent) 10%, transparent)' : 'var(--bank-bg-elevated)', color: use3DS ? 'var(--bank-accent)' : 'var(--bank-text-tertiary)', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em', transition: 'all var(--bank-t-fast)' }}>
                      {use3DS ? 'ACTIF' : 'INACTIF'}
                    </button>
                  </div>
                  <button onClick={handleProcessPayment} disabled={isProcessing || !canPay}
                    style={{ padding: 16, borderRadius: 12, border: 'none', background: (isProcessing || !canPay) ? 'var(--bank-bg-elevated)' : 'var(--bank-accent)', color: (isProcessing || !canPay) ? 'var(--bank-text-tertiary)' : 'white', fontSize: 16, fontWeight: 700, cursor: (isProcessing || !canPay) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all var(--bank-t-normal)' }}>
                    {isProcessing ? <><BankSpinner size={18} />Traitement en cours…</> : <>Payer {amount.toFixed(2)} EUR<ArrowRight size={18} aria-hidden="true" /></>}
                  </button>
                </div>
              )}
            </div>

          ) : (
            /* ══ RÉSULTAT ══ */
            <div style={{ ...S.cardPad(), border: `1px solid ${paymentResult.success ? 'color-mix(in srgb, var(--bank-success) 30%, transparent)' : 'color-mix(in srgb, var(--bank-danger) 30%, transparent)'}`, background: paymentResult.success ? 'color-mix(in srgb, var(--bank-success) 4%, var(--bank-bg-surface))' : 'color-mix(in srgb, var(--bank-danger) 4%, var(--bank-bg-surface))' }}>
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                {paymentResult.success
                  ? <CheckCircle2 size={48} style={{ color: 'var(--bank-success)', margin: '0 auto 16px' }} aria-label="Approuvé" />
                  : <XCircle     size={48} style={{ color: 'var(--bank-danger)',  margin: '0 auto 16px' }} aria-label="Refusé" />}
                <h3 style={{ fontSize: 22, fontWeight: 700, color: paymentResult.success ? 'var(--bank-success)' : 'var(--bank-danger)', marginBottom: 6 }}>
                  {paymentResult.success ? 'Paiement Approuvé' : 'Paiement Refusé'}
                </h3>
                <p style={{ color: 'var(--bank-text-secondary)', marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>{amount.toFixed(2)} EUR</p>
                <p style={{ fontSize: 12, color: 'var(--bank-text-tertiary)', marginBottom: 20 }}>
                  {selectedMerchant?.merchantName} — {displayMaskedPan}
                </p>

                <div style={{ borderRadius: 12, border: '1px solid var(--bank-border-subtle)', background: 'rgba(0,0,0,0.2)', padding: 14, marginBottom: 20, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {paymentResult.success && paymentResult.transaction && (
                    <>
                      <div style={S.row()}><span style={S.label}>Code auth.</span><span style={{ ...S.mono, ...S.value }}>{paymentResult.transaction.authorization_code}</span></div>
                      <div style={S.row()}><span style={S.label}>Transaction ID</span><span style={{ ...S.mono, fontSize: 11, color: 'var(--bank-text-secondary)' }}>{paymentResult.transaction.transaction_id}</span></div>
                      {paymentResult.ledgerBooked !== undefined && (
                        <div style={S.row()}><span style={S.label}>Ledger marchand</span><span style={{ fontSize: 13, fontWeight: 500, color: paymentResult.ledgerBooked ? 'var(--bank-success)' : 'var(--bank-warning)' }}>{paymentResult.ledgerBooked ? 'Enregistré' : 'En attente'}</span></div>
                      )}
                    </>
                  )}
                  {!paymentResult.success && (
                    <>
                      {paymentResult.responseCode && <div style={S.row()}><span style={S.label}>Code réponse</span><span style={{ ...S.mono, fontSize: 13, fontWeight: 500, color: 'var(--bank-danger)' }}>{paymentResult.responseCode}</span></div>}
                      {paymentResult.error && <div style={S.row()}><span style={S.label}>Motif</span><span style={{ fontSize: 13, color: 'var(--bank-danger)' }}>{paymentResult.error}</span></div>}
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handleNewTransaction} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid var(--bank-border-default)', background: 'transparent', color: 'var(--bank-text-primary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                      Nouvelle transaction
                    </button>
                    {paymentResult.success && paymentResult.transaction?.id && (
                      <a href={`${process.env.NEXT_PUBLIC_USER_CARDS_URL || 'http://localhost:3004'}/transactions/${paymentResult.transaction.id}`} target="_blank" rel="noopener noreferrer"
                        style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid color-mix(in srgb, var(--bank-accent) 35%, transparent)', background: 'color-mix(in srgb, var(--bank-accent) 8%, transparent)', color: 'var(--bank-accent)', fontSize: 13, fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        Voir détails <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                  {isClientCheckoutFlow && (
                    <a href={APP_URLS.userCards} style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid color-mix(in srgb, var(--bank-success) 30%, transparent)', background: 'color-mix(in srgb, var(--bank-success) 6%, transparent)', color: 'var(--bank-success)', fontSize: 13, fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <HomeIcon size={14} aria-hidden="true" />
                      Retour au tableau de bord
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Contrôles terminal (mode marchand standalone) ── */}
          {!isClientCheckoutFlow && (
            <div style={S.cardPad()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--bank-text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Settings size={14} style={{ color: 'var(--bank-accent)' }} aria-hidden="true" />
                  Contrôles terminal
                </h2>
                <button onClick={toggleTechnicalDetails}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--bank-border-default)', background: 'transparent', color: 'var(--bank-text-secondary)', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all var(--bank-t-fast)' }}>
                  <FileText size={13} aria-hidden="true" />
                  Logs
                </button>
              </div>
              <ConfigPanel />
            </div>
          )}

          {/* ── Debug ── */}
          {debugMode && (
            <div style={{ borderRadius: 16, border: '1px solid color-mix(in srgb, var(--bank-accent) 25%, transparent)', background: 'var(--bank-bg-surface)', padding: 24 }}>
              <h3 style={{ fontFamily: '"Courier New", monospace', fontWeight: 700, color: 'var(--bank-accent)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bug size={16} aria-hidden="true" /> Debug Output
              </h3>
              <DebugView />
            </div>
          )}
        </div>
      </div>

      <TechnicalDetail />

      {/* Responsive */}
      <style>{`
        .bk-tpe-grid { grid-template-columns: 1fr 1fr; }
        @media (max-width: 900px) { .bk-tpe-grid { grid-template-columns: 1fr !important; } }
        .bk-spin { animation: bk-rotate 1s linear infinite; }
        @keyframes bk-rotate { to { transform: rotate(360deg); } }
      `}</style>
    </TPEShell>
  );
}

/* ══════════════════════════════════════════════════════
   FALLBACK SUSPENSE
   ══════════════════════════════════════════════════════ */
function TerminalPageFallback() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0C0E1A', padding: 32 }}>
      <div style={{ maxWidth: 480, width: '100%', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: '#131525', padding: 40, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><BankSpinner size={40} /></div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>Chargement du terminal</h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>Initialisation de l&apos;interface de paiement…</p>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<TerminalPageFallback />}>
      <HomeContent />
    </Suspense>
  );
}
