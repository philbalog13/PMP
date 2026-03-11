import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const authHeader = request.headers.get('authorization');
        const tokenFromCookie = request.cookies.get('token')?.value;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (authHeader) {
            headers.Authorization = authHeader;
        } else if (tokenFromCookie) {
            headers.Authorization = `Bearer ${tokenFromCookie}`;
        }

        // Forward to the API gateway orchestration endpoint
        const backendUrl = process.env.INTERNAL_API_URL
            || process.env.NEXT_PUBLIC_API_URL
            || 'http://api-gateway:8000';
        const response = await fetch(`${backendUrl}/api/transaction/process`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        const text = await response.text();
        const data = text ? JSON.parse(text) : {};
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('Transaction API error:', error);
        return NextResponse.json(
            { error: 'Transaction processing failed' },
            { status: 500 }
        );
    }
}
