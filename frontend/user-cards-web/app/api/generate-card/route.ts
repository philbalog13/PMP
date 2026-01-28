import { NextRequest, NextResponse } from 'next/server';
import { generateCard, CardConfig, CardScheme, CardType } from '@/lib/card-engine/generator';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Server-side validation logic would go here
        // For now we trust the client's enum types but strictly type the config
        const config: CardConfig = {
            scheme: body.scheme as CardScheme,
            type: body.type as CardType,
            holderName: body.holderName || 'Unknown Holder',
        };

        const newCard = generateCard(config);

        return NextResponse.json(newCard);
    } catch (error) {
        console.error('Card generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate card' },
            { status: 500 }
        );
    }
}
