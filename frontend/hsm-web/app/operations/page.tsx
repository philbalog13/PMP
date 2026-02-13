'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Calculator, CheckCircle2, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { encryptPin, generateMac, HsmApiError, verifyMac } from '@/lib/hsm-api';

type DataEncoding = 'auto' | 'hex' | 'utf8';

function normalizeHex(value: string): string {
    return value.replace(/\s+/g, '').toUpperCase();
}

function isHex(value: string): boolean {
    return /^[0-9A-F]+$/.test(value) && value.length % 2 === 0;
}

export default function OperationsPage() {
    const { token } = useAuth();

    const [pan, setPan] = useState('4111111111111111');
    const [pin, setPin] = useState('1234');
    const [pinFormat, setPinFormat] = useState<'ISO-0' | 'ISO-1'>('ISO-0');
    const [pinKeyLabel, setPinKeyLabel] = useState('ZPK_TEST');
    const [pinResult, setPinResult] = useState<{ block: string; trace: string[] } | null>(null);
    const [pinError, setPinError] = useState<string | null>(null);
    const [pinLoading, setPinLoading] = useState(false);

    const [macData, setMacData] = useState('{"transactionId":"TX123","approved":true}');
    const [macMethod, setMacMethod] = useState<'ALG1' | 'ALG3'>('ALG3');
    const [macKeyLabel, setMacKeyLabel] = useState('ZAK_002');
    const [macInputEncoding, setMacInputEncoding] = useState<DataEncoding>('auto');
    const [macResult, setMacResult] = useState<{ mac: string; trace: string[] } | null>(null);
    const [macError, setMacError] = useState<string | null>(null);
    const [macLoading, setMacLoading] = useState(false);

    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyResult, setVerifyResult] = useState<{ verified: boolean; calculatedMac?: string } | null>(null);
    const [verifyError, setVerifyError] = useState<string | null>(null);

    const sanitizedPan = useMemo(() => pan.replace(/\D/g, ''), [pan]);
    const normalizedMacData = useMemo(() => normalizeHex(macData), [macData]);

    const canSubmitPin = sanitizedPan.length >= 12 && sanitizedPan.length <= 19 && /^\d{4,12}$/.test(pin);
    const canSubmitMac = useMemo(() => {
        if (macInputEncoding === 'hex') {
            return normalizedMacData.length >= 2 && isHex(normalizedMacData);
        }
        return macData.trim().length > 0;
    }, [macInputEncoding, macData, normalizedMacData]);

    const macPayloadData = useMemo(() => {
        if (macInputEncoding === 'hex') {
            return normalizedMacData;
        }
        return macData;
    }, [macData, macInputEncoding, normalizedMacData]);

    const handlePinSubmit = async () => {
        setPinLoading(true);
        setPinError(null);
        setPinResult(null);

        try {
            const response = await encryptPin(
                {
                    pin,
                    pan: sanitizedPan,
                    format: pinFormat,
                    keyLabel: pinKeyLabel.trim() || 'ZPK_TEST',
                },
                token
            );

            if (!response.encrypted_pin_block) {
                throw new Error('No encrypted PIN block returned.');
            }

            setPinResult({
                block: response.encrypted_pin_block,
                trace: response.trace || [],
            });
        } catch (error) {
            const message = error instanceof HsmApiError ? error.message : 'PIN block generation failed.';
            setPinError(message);
        } finally {
            setPinLoading(false);
        }
    };

    const handleMacSubmit = async () => {
        setMacLoading(true);
        setMacError(null);
        setMacResult(null);
        setVerifyResult(null);
        setVerifyError(null);

        try {
            const response = await generateMac(
                {
                    data: macPayloadData,
                    method: macMethod,
                    keyLabel: macKeyLabel.trim() || 'ZAK_002',
                    inputEncoding: macInputEncoding,
                },
                token
            );

            if (!response.mac) {
                throw new Error('No MAC returned.');
            }

            setMacResult({
                mac: response.mac,
                trace: response.trace || [],
            });
        } catch (error) {
            const message = error instanceof HsmApiError ? error.message : 'MAC generation failed.';
            setMacError(message);
        } finally {
            setMacLoading(false);
        }
    };

    const handleMacVerify = async () => {
        if (!macResult?.mac) {
            return;
        }

        setVerifyLoading(true);
        setVerifyError(null);
        setVerifyResult(null);

        try {
            const response = await verifyMac(
                {
                    data: macPayloadData,
                    mac: macResult.mac,
                    method: macMethod,
                    keyLabel: macKeyLabel.trim() || 'ZAK_002',
                    inputEncoding: macInputEncoding,
                },
                token
            );

            setVerifyResult({
                verified: response.verified === true,
                calculatedMac: response.calculated_mac,
            });
        } catch (error) {
            const message = error instanceof HsmApiError ? error.message : 'MAC verification failed.';
            setVerifyError(message);
        } finally {
            setVerifyLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
                    <Calculator size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold font-heading text-white">Cryptographic Operations</h1>
                    <p className="text-slate-400 text-sm">Live execution of HSM commands through API Gateway.</p>
                </div>
            </div>

            {!token && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200 text-sm">
                    No local session detected. API calls may fail until you log in.
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="glass-card p-6 rounded-xl space-y-4">
                    <h3 className="text-lg font-bold text-white border-b border-white/5 pb-2 flex items-center gap-2">
                        <LockKeyhole size={18} className="text-blue-400" />
                        PIN Block (B4)
                    </h3>

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">PAN</label>
                        <input
                            type="text"
                            value={pan}
                            onChange={(event) => setPan(event.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm font-mono text-white"
                            placeholder="4111111111111111"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">PIN</label>
                        <input
                            type="password"
                            value={pin}
                            onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm font-mono text-white"
                            placeholder="1234"
                            maxLength={12}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Format</label>
                            <select
                                value={pinFormat}
                                onChange={(event) => setPinFormat(event.target.value as 'ISO-0' | 'ISO-1')}
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white"
                            >
                                <option value="ISO-0">ISO-0</option>
                                <option value="ISO-1">ISO-1</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Key Label</label>
                            <input
                                type="text"
                                value={pinKeyLabel}
                                onChange={(event) => setPinKeyLabel(event.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm font-mono text-white"
                                placeholder="ZPK_TEST"
                            />
                        </div>
                    </div>

                    <button
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/60 disabled:text-slate-400 text-white font-bold py-2 rounded transition inline-flex items-center justify-center gap-2"
                        onClick={handlePinSubmit}
                        disabled={pinLoading || !canSubmitPin}
                    >
                        {pinLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                        {pinLoading ? 'Generating...' : 'Generate PIN Block'}
                    </button>

                    <div className="mt-2 p-3 bg-slate-950 rounded border border-white/10 min-h-20">
                        <div className="text-xs text-slate-500 mb-1">Result (Hex)</div>
                        {pinError && (
                            <div className="text-red-400 text-sm inline-flex items-center gap-2">
                                <AlertCircle size={14} />
                                {pinError}
                            </div>
                        )}
                        {pinResult && <div className="font-mono text-green-400 text-sm tracking-wider break-all">{pinResult.block}</div>}
                        {!pinError && !pinResult && <div className="font-mono text-slate-500 text-sm">READY</div>}
                    </div>

                    {pinResult?.trace?.length ? (
                        <div className="p-3 bg-slate-950/70 rounded border border-white/5">
                            <div className="text-xs text-slate-500 mb-2">Trace</div>
                            <div className="space-y-1 text-xs font-mono text-slate-300">
                                {pinResult.trace.map((step, index) => (
                                    <div key={`${step}-${index}`}>{step}</div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="glass-card p-6 rounded-xl space-y-4">
                    <h3 className="text-lg font-bold text-white border-b border-white/5 pb-2 flex items-center gap-2">
                        <ShieldCheck size={18} className="text-purple-400" />
                        MAC Generator and Verify (C0/C2)
                    </h3>

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Input Data</label>
                        <textarea
                            rows={4}
                            value={macData}
                            onChange={(event) => setMacData(event.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm font-mono text-white"
                            placeholder='{"transactionId":"TX123","approved":true}'
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Method</label>
                            <select
                                value={macMethod}
                                onChange={(event) => setMacMethod(event.target.value as 'ALG1' | 'ALG3')}
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white"
                            >
                                <option value="ALG3">ISO 9797 ALG3</option>
                                <option value="ALG1">ISO 9797 ALG1</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Input Format</label>
                            <select
                                value={macInputEncoding}
                                onChange={(event) => setMacInputEncoding(event.target.value as DataEncoding)}
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white"
                            >
                                <option value="auto">auto</option>
                                <option value="hex">hex</option>
                                <option value="utf8">utf8</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Key Label</label>
                            <input
                                type="text"
                                value={macKeyLabel}
                                onChange={(event) => setMacKeyLabel(event.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm font-mono text-white"
                                placeholder="ZAK_002"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button
                            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/60 disabled:text-slate-400 text-white font-bold py-2 rounded transition inline-flex items-center justify-center gap-2"
                            onClick={handleMacSubmit}
                            disabled={macLoading || !canSubmitMac}
                        >
                            {macLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                            {macLoading ? 'Generating...' : 'Generate MAC'}
                        </button>
                        <button
                            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/60 disabled:text-slate-400 text-white font-bold py-2 rounded transition inline-flex items-center justify-center gap-2"
                            onClick={handleMacVerify}
                            disabled={verifyLoading || !macResult?.mac}
                        >
                            {verifyLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            {verifyLoading ? 'Verifying...' : 'Verify MAC'}
                        </button>
                    </div>

                    <div className="mt-2 p-3 bg-slate-950 rounded border border-white/10 min-h-20">
                        <div className="text-xs text-slate-500 mb-1">MAC Result</div>
                        {macError && (
                            <div className="text-red-400 text-sm inline-flex items-center gap-2">
                                <AlertCircle size={14} />
                                {macError}
                            </div>
                        )}
                        {macResult && <div className="font-mono text-purple-400 text-sm tracking-wider break-all">{macResult.mac}</div>}
                        {!macError && !macResult && <div className="font-mono text-slate-500 text-sm">READY</div>}
                    </div>

                    <div className="mt-2 p-3 bg-slate-950 rounded border border-white/10 min-h-16">
                        <div className="text-xs text-slate-500 mb-1">Verification</div>
                        {verifyError && (
                            <div className="text-red-400 text-sm inline-flex items-center gap-2">
                                <AlertCircle size={14} />
                                {verifyError}
                            </div>
                        )}
                        {verifyResult && (
                            <div className={`text-sm ${verifyResult.verified ? 'text-emerald-400' : 'text-red-400'}`}>
                                {verifyResult.verified ? 'MAC VERIFIED' : 'MAC MISMATCH'}
                                {verifyResult.calculatedMac ? ` (${verifyResult.calculatedMac})` : ''}
                            </div>
                        )}
                        {!verifyError && !verifyResult && <div className="font-mono text-slate-500 text-sm">NOT CHECKED</div>}
                    </div>

                    {macResult?.trace?.length ? (
                        <div className="p-3 bg-slate-950/70 rounded border border-white/5">
                            <div className="text-xs text-slate-500 mb-2">Trace</div>
                            <div className="space-y-1 text-xs font-mono text-slate-300">
                                {macResult.trace.map((step, index) => (
                                    <div key={`${step}-${index}`}>{step}</div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
