'use client';

import { useEffect } from 'react';
import { useTerminalStore } from '@/lib/store';
import { processTransaction } from '@/lib/api-client';
import { generateSTAN } from '@/lib/utils';
import { Bug, FileText } from 'lucide-react';

import TerminalScreen from '@/components/terminal/TerminalScreen';
import Keypad from '@/components/terminal/Keypad';
import CardReaderSim from '@/components/terminal/CardReaderSim';
import TransactionLog from '@/components/terminal/TransactionLog';
import ConfigPanel from '@/components/config/ConfigPanel';
import DebugView from '@/components/pedagogy/DebugView';
import StepFlow from '@/components/pedagogy/StepFlow';
import TechnicalDetail from '@/components/pedagogy/TechnicalDetail';

export default function Home() {
    const {
        state,
        amount,
        selectedType,
        setState,
        setCardData,
        setCurrentTransaction,
        addToHistory,
        debugMode,
        toggleDebugMode,
        setDebugData,
        toggleTechnicalDetails,
        reset,
    } = useTerminalStore();

    // Initialize to amount-input state
    useEffect(() => {
        if (state === 'idle') {
            setState('amount-input');
        }
    }, [state, setState]);

    const handleAmountComplete = (amt: number) => {
        setState('card-wait');
    };

    const handleCardRead = async (cardData: any) => {
        setState('processing');
        setCardData(cardData);

        try {
            // Build transaction request
            const transactionRequest = {
                stan: generateSTAN(),
                pan: cardData.pan,
                mti: '0100',
                processingCode: '000000',
                amount,
                currency: 'EUR',
                type: selectedType,
                merchantId: 'MERCH_PED_001',
                terminalId: 'TERM_WEB_01',
                mcc: '5411',
                posEntryMode: '012',
                pinEntered: false,
                cvvProvided: !!cardData.cvv,
                threeDsAuthenticated: false,
                isRecurring: false,
                isEcommerce: true,
                location: { country: 'FR', city: 'Paris' },
                timestamp: new Date(),
            };

            // Send to backend
            const response = await processTransaction(transactionRequest);

            // Update state
            setCurrentTransaction(response);
            setState(response.approved ? 'approved' : 'declined');

            // Add to history
            addToHistory({
                id: transactionRequest.stan,
                amount,
                type: selectedType,
                status: response.approved ? 'APPROVED' : 'DECLINED',
                responseCode: response.responseCode,
                authorizationCode: response.authorizationCode,
                maskedPan: `****${cardData.pan.slice(-4)}`,
                timestamp: new Date(),
                matchedRules: response.matchedRules.map((r: { ruleId: string }) => r.ruleId),
            });

            // Debug data
            if (debugMode) {
                setDebugData({
                    request: transactionRequest,
                    response,
                    iso8583Fields: [
                        { field: 0, name: 'MTI', value: '0100', format: 'n' },
                        { field: 2, name: 'PAN', value: cardData.pan, format: 'n' },
                        { field: 3, name: 'Processing Code', value: '000000', format: 'n' },
                        { field: 4, name: 'Amount', value: amount.toString(), format: 'n' },
                        { field: 39, name: 'Response Code', value: response.responseCode, format: 'an' },
                    ],
                    logs: [
                        'Transaction initiated',
                        `Routing to network switch`,
                        `Authorization engine response: ${response.responseCode}`,
                        `Transaction ${response.approved ? 'approved' : 'declined'}`,
                    ],
                });
            }

            // Auto-reset after 3 seconds
            setTimeout(() => {
                reset();
                setState('amount-input');
            }, 3000);
        } catch (error) {
            console.error('Transaction error:', error);
            setState('declined');
            setCurrentTransaction({
                approved: false,
                responseCode: '96',
                responseMessage: 'System error',
                matchedRules: [],
                processingTime: 0,
                timestamp: new Date(),
            });

            setTimeout(() => {
                reset();
                setState('amount-input');
            }, 3000);
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-slate-800 mb-2">
                        TPE Web Pédagogique
                    </h1>
                    <p className="text-slate-600">
                        Terminal de Paiement Électronique - Plateforme Monétique Pédagogique
                    </p>

                    {/* Control Buttons */}
                    <div className="flex items-center justify-center gap-4 mt-4">
                        <button
                            onClick={toggleDebugMode}
                            className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${debugMode
                                ? 'bg-green-600 text-white'
                                : 'bg-white text-slate-700 hover:bg-slate-100'
                                }`}
                        >
                            <Bug className="w-5 h-5" />
                            Mode Debug
                        </button>
                        <button
                            onClick={toggleTechnicalDetails}
                            className="px-4 py-2 bg-white text-slate-700 hover:bg-slate-100 rounded-lg font-semibold transition flex items-center gap-2"
                        >
                            <FileText className="w-5 h-5" />
                            Détails Techniques
                        </button>
                    </div>
                </div>

                {/* Main Content */}                                    <div className="grid lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Terminal and Keypad */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <TerminalScreen />
                            <Keypad onAmountComplete={handleAmountComplete} />
                        </div>

                        {/* Step Flow */}
                        <StepFlow />

                        {/* Debug View */}
                        {debugMode && <DebugView />}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        <ConfigPanel />
                        <CardReaderSim onCardRead={handleCardRead} />
                        <TransactionLog />
                    </div>
                </div>

                {/* Technical Detail Modal */}
                <TechnicalDetail />
            </div>
        </main>
    );
}
