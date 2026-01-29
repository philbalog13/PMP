/**
 * QR Payment Generator Component
 * Generates QR codes for merchant-presented payments
 */

import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRPaymentData {
    merchantId: string;
    merchantName: string;
    amount: number;
    currency: string;
    transactionId: string;
}

export function QRPaymentGenerator() {
    const [paymentData, setPaymentData] = useState<QRPaymentData>({
        merchantId: 'MERCHANT_001',
        merchantName: 'Demo Store',
        amount: 10.00,
        currency: 'EUR',
        transactionId: `TXN${Date.now()}`
    });
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        generateQR();
    }, [paymentData]);

    const generateQR = async () => {
        // EMV QR Format (simplified)
        const qrPayload = JSON.stringify({
            version: '01',
            type: 'dynamic',
            merchant: {
                id: paymentData.merchantId,
                name: paymentData.merchantName
            },
            transaction: {
                id: paymentData.transactionId,
                amount: paymentData.amount.toFixed(2),
                currency: paymentData.currency
            },
            timestamp: new Date().toISOString()
        });

        try {
            const dataUrl = await QRCode.toDataURL(qrPayload, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            setQrDataUrl(dataUrl);
        } catch (error) {
            console.error('QR generation failed:', error);
        }
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newAmount = parseFloat(e.target.value) || 0;
        setPaymentData({ ...paymentData, amount: newAmount });
    };

    return (
        <div className="qr-payment-generator">
            <h2>Merchant QR Payment</h2>

            <div className="merchant-info">
                <p><strong>{paymentData.merchantName}</strong></p>
                <p className="merchant-id">{paymentData.merchantId}</p>
            </div>

            <div className="amount-input">
                <label>
                    Amount ({paymentData.currency}):
                    <input
                        type="number"
                        step="0.01"
                        value={paymentData.amount}
                        onChange={handleAmountChange}
                    />
                </label>
            </div>

            <div className="qr-display">
                {qrDataUrl && (
                    <>
                        <img src={qrDataUrl} alt="Payment QR Code" />
                        <p className="instruction">Scan with your mobile wallet</p>
                    </>
                )}
            </div>

            <div className="transaction-info">
                <small>Transaction ID: {paymentData.transactionId}</small>
            </div>

            <style>{`
                .qr-payment-generator {
                    max-width: 400px;
                    margin: 2rem auto;
                    padding: 2rem;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    text-align: center;
                }
                .merchant-info {
                    margin-bottom: 1.5rem;
                }
                .merchant-id {
                    color: #666;
                    font-size: 0.9rem;
                }
                .amount-input {
                    margin-bottom: 1.5rem;
                }
                .amount-input input {
                    padding: 0.5rem;
                    font-size: 1.2rem;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    width: 150px;
                    margin-left: 0.5rem;
                }
                .qr-display {
                    margin: 2rem 0;
                }
                .qr-display img {
                    border: 2px solid #000;
                    border-radius: 8px;
                }
                .instruction {
                    margin-top: 1rem;
                    color: #666;
                }
                .transaction-info {
                    margin-top: 1rem;
                    color: #999;
                }
            `}</style>
        </div>
    );
}
