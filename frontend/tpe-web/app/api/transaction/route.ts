import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Forward to backend sim-network-switch
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8004';
        const response = await fetch(`${backendUrl}/api/v1/process`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`Backend returned ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Transaction API error:', error);
        return NextResponse.json(
            { error: 'Transaction processing failed' },
            { status: 500 }
        );
    }
}
