'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { Calculator, Binary, FileCode, Hash, Repeat, ChevronRight, Copy, Check, Terminal, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

export default function ToolsPage() {
    const [activeTab, setActiveTab] = useState('hex');

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 relative overflow-hidden">
            {/* Background Patterns */}
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px] -z-10" />

            <div className="max-w-7xl mx-auto space-y-16 relative z-10">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    <Link href="/" className="hover:text-white transition">Home</Link>
                    <ChevronRight size={12} />
                    <span className="text-indigo-500">Dev Tools</span>
                </div>

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 border-b border-white/5 pb-16">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-500 text-[10px] font-black uppercase tracking-widest">
                            <Terminal size={14} /> Protocol Utilities
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.8]">
                            Dev <span className="text-indigo-500">Tools.</span>
                        </h1>
                        <p className="text-slate-400 text-xl max-w-2xl font-medium leading-relaxed">
                            Utilitaires essentiels pour le débogage de trames ISO8583,
                            la validation d&apos;algorithmes de Luhn et la manipulation de clés HSM.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-10">
                    {/* Sidebar Nav */}
                    <div className="col-span-12 lg:col-span-3 space-y-3">
                        <ToolTab id="hex" label="Hex / ASCII" icon={Binary} active={activeTab} set={setActiveTab} />
                        <ToolTab id="base64" label="Base64" icon={FileCode} active={activeTab} set={setActiveTab} />
                        <ToolTab id="luhn" label="Luhn Validator" icon={Calculator} active={activeTab} set={setActiveTab} />
                        <ToolTab id="hash" label="Hash Forge" icon={Hash} active={activeTab} set={setActiveTab} />
                        <ToolTab id="xor" label="XOR Engine" icon={Repeat} active={activeTab} set={setActiveTab} />
                    </div>

                    {/* Content Panel */}
                    <div className="col-span-12 lg:col-span-9 bg-slate-900/50 border border-white/5 rounded-[40px] p-8 md:p-12 backdrop-blur-3xl shadow-3xl shadow-black/50 min-h-[600px] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition duration-1000">
                            {activeTab === 'hex' && <Binary size={300} />}
                            {activeTab === 'base64' && <FileCode size={300} />}
                            {activeTab === 'luhn' && <Calculator size={300} />}
                            {activeTab === 'hash' && <Hash size={300} />}
                            {activeTab === 'xor' && <Repeat size={300} />}
                        </div>

                        <div className="relative z-10">
                            {activeTab === 'hex' && <HexConverter />}
                            {activeTab === 'base64' && <Base64Tool />}
                            {activeTab === 'luhn' && <LuhnTool />}
                            {activeTab === 'hash' && <HashTool />}
                            {activeTab === 'xor' && <XORTool />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ToolTab({ id, label, icon: Icon, active, set }: { id: string; label: string; icon: LucideIcon; active: string; set: Dispatch<SetStateAction<string>> }) {
    const isActive = active === id;
    return (
        <button
            onClick={() => set(id)}
            className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all duration-500 group ${isActive
                ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/40 translate-x-2'
                : 'bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
        >
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isActive ? 'bg-white/20' : 'bg-white/5 group-hover:bg-indigo-500/20'}`}>
                    <Icon size={20} />
                </div>
                <span className="font-black uppercase tracking-widest text-[10px]">{label}</span>
            </div>
            <ChevronRight size={16} className={`transition-transform duration-500 ${isActive ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`} />
        </button>
    );
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            onClick={handleCopy}
            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
        >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            {copied ? 'Copié' : 'Copier'}
        </button>
    );
}

function HexConverter() {
    const [ascii, setAscii] = useState('');
    const [hex, setHex] = useState('');

    const handleAscii = (val: string) => {
        setAscii(val);
        setHex(val.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ').toUpperCase());
    };

    const handleHex = (val: string) => {
        const clean = val.replace(/\s/g, '');
        setHex(val.toUpperCase());
        try {
            let str = '';
            for (let i = 0; i < clean.length; i += 2) {
                str += String.fromCharCode(parseInt(clean.substr(i, 2), 16));
            }
            setAscii(str);
        } catch { /* ignore */ }
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter">Hex / ASCII <span className="text-indigo-500">Converter.</span></h2>
            <div className="grid gap-8">
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Texte ASCII</label>
                        <CopyButton text={ascii} />
                    </div>
                    <textarea
                        className="w-full bg-slate-950/50 border border-white/5 rounded-3xl p-6 font-mono text-lg focus:outline-none focus:border-indigo-500 transition shadow-inner min-h-[120px]"
                        value={ascii}
                        onChange={(e) => handleAscii(e.target.value)}
                        placeholder="Hello PMP..."
                    />
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Trame Hexadécimale</label>
                        <CopyButton text={hex} />
                    </div>
                    <textarea
                        className="w-full bg-slate-950/50 border border-white/5 rounded-3xl p-6 font-mono text-lg focus:outline-none focus:border-indigo-500 transition shadow-inner uppercase min-h-[120px]"
                        value={hex}
                        onChange={(e) => handleHex(e.target.value)}
                        placeholder="48 65 6C 6C 6F..."
                    />
                </div>
            </div>
        </div>
    );
}

function Base64Tool() {
    const [text, setText] = useState('');
    const [encoded, setEncoded] = useState('');

    const handleChange = (val: string) => {
        setText(val);
        try { setEncoded(btoa(val)); } catch { setEncoded('Invalid characters'); }
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter">Base64 <span className="text-indigo-500">Encoder.</span></h2>
            <div className="grid gap-8">
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Entrée</label>
                    </div>
                    <textarea
                        className="w-full bg-slate-950/50 border border-white/5 rounded-3xl p-6 font-mono text-lg focus:outline-none focus:border-indigo-500 transition min-h-[150px]"
                        value={text}
                        onChange={(e) => handleChange(e.target.value)}
                    />
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Output Base64</label>
                        <CopyButton text={encoded} />
                    </div>
                    <div className="w-full bg-indigo-950/20 border border-white/5 rounded-3xl p-8 font-mono text-indigo-400 break-all text-xl">
                        {encoded || '...'}
                    </div>
                </div>
            </div>
        </div>
    );
}

function LuhnTool() {
    const [pan, setPan] = useState('');
    const [isValid, setIsValid] = useState<boolean | null>(null);

    const checkLuhn = (val: string) => {
        setPan(val);
        if (val.length < 13) { setIsValid(null); return; }

        let sum = 0;
        let shouldDouble = false;
        for (let i = val.length - 1; i >= 0; i--) {
            let digit = parseInt(val.charAt(i));
            if (shouldDouble) {
                if ((digit *= 2) > 9) digit -= 9;
            }
            sum += digit;
            shouldDouble = !shouldDouble;
        }
        setIsValid((sum % 10) === 0);
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter">Luhn <span className="text-indigo-500">Validator.</span></h2>
            <div className="space-y-10">
                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block px-2">Numéro de Carte (PAN)</label>
                    <input
                        type="text"
                        className="w-full bg-slate-950/50 border border-white/5 rounded-3xl p-10 font-mono text-4xl focus:outline-none focus:border-indigo-500 transition tracking-[0.2em] text-center"
                        value={pan}
                        onChange={(e) => checkLuhn(e.target.value.replace(/\D/g, ''))}
                        placeholder="4532 0000 1111 2222"
                        maxLength={19}
                    />
                </div>

                {isValid !== null && (
                    <div className={`p-10 rounded-[40px] border flex items-center gap-8 ${isValid ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl font-black shadow-2xl ${isValid ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-red-500 text-white shadow-red-500/30'}`}>
                            {isValid ? '✓' : '✗'}
                        </div>
                        <div className="space-y-2">
                            <h3 className={`text-3xl font-black italic uppercase tracking-tighter ${isValid ? 'text-emerald-400' : 'text-red-400'}`}>
                                {isValid ? 'Checksum Valide' : 'Checksum Invalide'}
                            </h3>
                            <p className="text-slate-400 font-medium">L&apos;algorithme de Luhn confirme l&apos;intégrité du numéro fourni.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function HashTool() {
    const [input, setInput] = useState('');
    const [algo, setAlgo] = useState('SHA-256');
    const [hash, setHash] = useState('');

    const calculateHash = async (text: string, algorithm: string) => {
        setInput(text);
        if (!text) { setHash(''); return; }
        const msgBuffer = new TextEncoder().encode(text);
        const hashBuffer = await crypto.subtle.digest(algorithm, msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        setHash(hashHex);
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter">Hash <span className="text-indigo-500">Forge.</span></h2>
            <div className="grid gap-8">
                <div className="flex gap-4">
                    {['SHA-1', 'SHA-256', 'SHA-512'].map(a => (
                        <button
                            key={a}
                            onClick={() => { setAlgo(a); calculateHash(input, a); }}
                            className={`px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition ${algo === a ? 'bg-indigo-600' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
                        >
                            {a}
                        </button>
                    ))}
                </div>

                <textarea
                    className="w-full bg-slate-950/50 border border-white/5 rounded-3xl p-6 font-mono focus:outline-none focus:border-indigo-500 transition min-h-[150px]"
                    value={input}
                    onChange={(e) => calculateHash(e.target.value, algo)}
                    placeholder="Contenu à hasher..."
                />

                <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Empreinte (Hex)</label>
                        <CopyButton text={hash} />
                    </div>
                    <div className="p-8 bg-indigo-950/20 border border-white/5 rounded-3xl font-mono text-sm break-all text-indigo-400">
                        {hash || 'En attente...'}
                    </div>
                </div>
            </div>
        </div>
    );
}

function XORTool() {
    const [inputA, setInputA] = useState('');
    const [inputB, setInputB] = useState('');
    const [result, setResult] = useState('');

    const calculateXOR = (a: string, b: string) => {
        setInputA(a.toUpperCase());
        setInputB(b.toUpperCase());
        if (!a || !b) { setResult(''); return; }

        try {
            const cleanA = a.replace(/\s/g, '');
            const cleanB = b.replace(/\s/g, '');
            const maxLength = Math.max(cleanA.length, cleanB.length);
            let res = '';

            for (let i = 0; i < maxLength; i += 2) {
                const byteA = parseInt(cleanA.substring(i, i + 2) || '00', 16);
                const byteB = parseInt(cleanB.substring(i, i + 2) || '00', 16);
                res += (byteA ^ byteB).toString(16).padStart(2, '0');
            }
            setResult(res.toUpperCase());
        } catch { setResult('INVALID HEX'); }
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter">XOR <span className="text-indigo-500">Engine.</span></h2>
            <div className="grid gap-6">
                <input
                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-6 font-mono text-xl focus:outline-none focus:border-indigo-500 transition"
                    placeholder="HEX COMPONENT A (Ex: 31 32 33)"
                    value={inputA}
                    onChange={(e) => calculateXOR(e.target.value, inputB)}
                />
                <input
                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-6 font-mono text-xl focus:outline-none focus:border-indigo-500 transition"
                    placeholder="HEX COMPONENT B (Ex: FF FF FF)"
                    value={inputB}
                    onChange={(e) => calculateXOR(inputA, e.target.value)}
                />

                <div className="flex justify-center py-4">
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center text-slate-600">
                        <Repeat size={24} />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Résultat XOR</label>
                        <CopyButton text={result} />
                    </div>
                    <div className="p-10 bg-indigo-600 rounded-3xl font-black font-mono text-3xl text-white text-center uppercase tracking-widest shadow-2xl shadow-indigo-600/30">
                        {result || '000000'}
                    </div>
                </div>
            </div>
        </div>
    );
}
