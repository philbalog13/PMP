/**
 * Transaction Timeline - Full lifecycle timestamp tracking
 * Target: 2.2 seconds for complete transaction
 */
export interface TransactionTimeline {
    preparation: {
        start: Date;          // T0: User input
        validation: Date;     // T0+100ms: Data validation
        tokenization: Date;   // T0+200ms: PAN tokenization
        pinEncryption: Date;  // T0+300ms: PIN encryption
        ready: Date;          // T0+500ms: Message ready
    };

    network: {
        acquirerSent: Date;   // T0+600ms: Sent to acquirer
        networkReceived: Date;// T0+700ms: Network received
        issuerSent: Date;     // T0+800ms: Sent to issuer
        issuerReceived: Date; // T0+900ms: Issuer received
    };

    processing: {
        pinDecryption: Date;  // T0+950ms: PIN decryption
        accountCheck: Date;   // T0+1000ms: Account check
        ruleEvaluation: Date; // T0+1100ms: Rule evaluation
        fraudAnalysis: Date;  // T0+1200ms: Fraud analysis
        decision: Date;       // T0+1300ms: Decision made
    };

    response: {
        signature: Date;      // T0+1400ms: Response signature
        networkReturn: Date;  // T0+1500ms: Network return
        acquirerReturn: Date; // T0+1600ms: Acquirer return
        tpeReceived: Date;    // T0+1700ms: TPE received
        userDisplayed: Date;  // T0+1800ms: User display
    };

    postProcessing: {
        dbUpdate: Date;       // T0+1900ms: DB update
        auditLog: Date;       // T0+2000ms: Audit log
        monitoring: Date;     // T0+2100ms: Monitoring update
        complete: Date;       // T0+2200ms: Transaction complete
    };
}

export interface TimelineContext {
    transactionId: string;
    timeline: Partial<TransactionTimeline>;
    startTime: number;
}

export const createTimelineContext = (transactionId: string): TimelineContext => ({
    transactionId,
    timeline: {
        preparation: {} as any,
        network: {} as any,
        processing: {} as any,
        response: {} as any,
        postProcessing: {} as any
    },
    startTime: Date.now()
});

export const markTimestamp = (context: TimelineContext, phase: keyof TransactionTimeline, step: string): void => {
    const phaseObj = context.timeline[phase] as any;
    if (phaseObj) {
        phaseObj[step] = new Date();
    }
};

export const getElapsedMs = (context: TimelineContext): number => {
    return Date.now() - context.startTime;
};
