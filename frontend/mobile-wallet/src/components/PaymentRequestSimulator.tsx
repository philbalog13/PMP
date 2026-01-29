/**
 * Payment Request API Simulator
 * Simulates Apple Pay / Google Pay checkout flow
 */

import { useState } from 'react';
import axios from 'axios';

interface PaymentMethodData {
    type: 'apple-pay' | 'google-pay' | 'card';
    token?: string;
    cardNumber?: string;
}

export function PaymentRequestSimulator() {
    const [amount, setAmount] = useState<number>(100.00);
    const [status, setStatus] = useState<string>('idle');
    const [selectedMethod, setSelectedMethod] = useState<'apple-pay' | 'google-pay' | null>(null);

    const initiatePayment = async (method: 'apple-pay' | 'google-pay') => {
        setSelectedMethod(method);
        setStatus('processing');

        try {
            // Simulate payment token generation
            const paymentToken = `${method.toUpperCase()}_TOKEN_${Date.now()}`;

            // Send to backend
            const response = await axios.post('http://localhost:8080/api/v1/transaction/init', {
                amount,
                currency: 'EUR',
                paymentMethod: method,
                token: paymentToken,
                deviceType: 'mobile'
            });

            if (response.data.status === 'approved') {
                setStatus('success');
            } else {
                setStatus('declined');
            }
        } catch (error) {
            console.error('Payment failed:', error);
            setStatus('error');
        }
    };

    const reset = () => {
        setStatus('idle');
        setSelectedMethod(null);
    };

    return (
        <div className="payment-request-simulator">
            <h2>Mobile Payment Checkout</h2>

            <div className="amount-display">
                <span className="label">Total:</span>
                <span className="value">{amount.toFixed(2)} EUR</span>
            </div>

            {status === 'idle' && (
                <div className="payment-methods">
                    <button
                        className="apple-pay-button"
                        onClick={() => initiatePayment('apple-pay')}
                    >
                        <span className="apple-logo">🍎</span>
                        Pay with Apple Pay
                    </button>

                    <button
                        className="google-pay-button"
                        onClick={() => initiatePayment('google-pay')}
                    >
                        <span className="google-logo">G</span>
                        Pay with Google Pay
                    </button>
                </div>
            )}

            {status === 'processing' && (
                <div className="processing-state">
                    <div className="spinner"></div>
                    <p>Processing {selectedMethod} payment...</p>
                </div>
            )}

            {status === 'success' && (
                <div className="success-state">
                    <div className="checkmark">✓</div>
                    <h3>Payment Successful</h3>
                    <p>Your {selectedMethod} payment has been approved.</p>
                    <button onClick={reset}>New Payment</button>
                </div>
            )}

            {(status === 'declined' || status === 'error') && (
                <div className="error-state">
                    <div className="error-icon">✗</div>
                    <h3>Payment Failed</h3>
                    <p>Unable to process payment. Please try again.</p>
                    <button onClick={reset}>Try Again</button>
                </div>
            )}

            <style>{`
                .payment-request-simulator {
                    max-width: 400px;
                    margin: 2rem auto;
                    padding: 2rem;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }

                .amount-display {
                    text-align: center;
                    margin-bottom: 2rem;
                    padding: 1rem;
                    background: #f5f5f5;
                    border-radius: 8px;
                }

                .amount-display .value {
                    font-size: 2rem;
                    font-weight: bold;
                    display: block;
                    margin-top: 0.5rem;
                }

                .payment-methods {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .apple-pay-button, .google-pay-button {
                    padding: 1rem;
                    border: none;
                    border-radius: 8px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    transition: transform 0.2s;
                }

                .apple-pay-button {
                    background: #000;
                    color: white;
                }

                .google-pay-button {
                    background: #4285F4;
                    color: white;
                }

                .apple-pay-button:hover, .google-pay-button:hover {
                    transform: scale(1.02);
                }

                .processing-state, .success-state, .error-state {
                    text-align: center;
                    padding: 2rem;
                }

                .spinner {
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3498db;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 1rem;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .checkmark {
                    font-size: 4rem;
                    color: #4CAF50;
                }

                .error-icon {
                    font-size: 4rem;
                    color: #f44336;
                }

                button {
                    margin-top: 1rem;
                    padding: 0.75rem 2rem;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
}
