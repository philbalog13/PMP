import { NextResponse } from 'next/server';

const presetCards = [
    {
        id: '1',
        name: 'Carte Valide',
        pan: '4111111111111111',
        expiryDate: '12/26',
        cvv: '123',
        cardholderName: 'Jean Dupont',
        scenario: 'APPROVED',
    },
    {
        id: '2',
        name: 'Solde Insuffisant',
        pan: '4000056655665556',
        expiryDate: '06/25',
        cvv: '456',
        cardholderName: 'Marie Martin',
        scenario: 'INSUFFICIENT_FUNDS',
    },
    {
        id: '3',
        name: 'Carte Expirée',
        pan: '4532015112830366',
        expiryDate: '01/20',
        cvv: '789',
        cardholderName: 'Pierre Dubois',
        scenario: 'EXPIRED_CARD',
    },
    {
        id: '4',
        name: 'Carte Volée',
        pan: '4916338506082832',
        expiryDate: '09/27',
        cvv: '321',
        cardholderName: 'Sophie Bernard',
        scenario: 'STOLEN_CARD',
    },
];

export async function GET() {
    return NextResponse.json({ cards: presetCards });
}
