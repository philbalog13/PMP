import { NextRequest, NextResponse } from 'next/server';

type SimulationScenario =
    | 'APPROVED'
    | 'INSUFFICIENT_FUNDS'
    | 'EXPIRED_CARD'
    | 'STOLEN_CARD'
    | 'OVER_LIMIT'
    | 'VELOCITY_EXCEEDED'
    | '3DS_REQUIRED'
    | 'FRAUD_SUSPECTED'
    | 'SYSTEM_ERROR';

type ScenarioResponse = {
    approved: boolean;
    responseCode: string;
    responseMessage: string;
    authorizationCode?: string;
};

const scenarioResponses: Record<SimulationScenario, ScenarioResponse> = {
    APPROVED: {
        approved: true,
        responseCode: '00',
        responseMessage: 'Approved',
        authorizationCode: 'AUTH' + Date.now().toString().slice(-6),
    },
    INSUFFICIENT_FUNDS: {
        approved: false,
        responseCode: '51',
        responseMessage: 'Insufficient funds',
    },
    EXPIRED_CARD: {
        approved: false,
        responseCode: '54',
        responseMessage: 'Expired card',
    },
    STOLEN_CARD: {
        approved: false,
        responseCode: '43',
        responseMessage: 'Stolen card - pick up',
    },
    OVER_LIMIT: {
        approved: false,
        responseCode: '61',
        responseMessage: 'Exceeds withdrawal limit',
    },
    VELOCITY_EXCEEDED: {
        approved: false,
        responseCode: '65',
        responseMessage: 'Soft decline - velocity exceeded',
    },
    '3DS_REQUIRED': {
        approved: false,
        responseCode: '65',
        responseMessage: 'Soft decline - 3DS required',
    },
    FRAUD_SUSPECTED: {
        approved: false,
        responseCode: '59',
        responseMessage: 'Suspected fraud',
    },
    SYSTEM_ERROR: {
        approved: false,
        responseCode: '96',
        responseMessage: 'System malfunction',
    },
};

export async function POST(request: NextRequest) {
    try {
        const { scenario } = await request.json();

        if (!scenarioResponses[scenario as SimulationScenario]) {
            return NextResponse.json(
                { error: 'Invalid scenario' },
                { status: 400 }
            );
        }

        const response = {
            ...scenarioResponses[scenario as SimulationScenario],
            matchedRules: [],
            processingTime: Math.floor(Math.random() * 200) + 50,
            timestamp: new Date(),
        };

        return NextResponse.json(response);
    } catch {
        return NextResponse.json(
            { error: 'Simulation failed' },
            { status: 500 }
        );
    }
}
