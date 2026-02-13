export class HsmError extends Error {
    public readonly code: string;
    public readonly statusCode: number;
    public readonly details?: Record<string, unknown>;

    constructor(
        message: string,
        options?: {
            code?: string;
            statusCode?: number;
            details?: Record<string, unknown>;
        }
    ) {
        super(message);
        this.name = 'HsmError';
        this.code = options?.code ?? 'HSM_ERROR';
        this.statusCode = options?.statusCode ?? 500;
        this.details = options?.details;
    }
}

export class ValidationError extends HsmError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(message, { code: 'VALIDATION_ERROR', statusCode: 400, details });
        this.name = 'ValidationError';
    }
}

export class KeyNotFoundError extends HsmError {
    constructor(keyLabel: string) {
        super(`Key '${keyLabel}' not found`, {
            code: 'KEY_NOT_FOUND',
            statusCode: 404,
            details: { keyLabel },
        });
        this.name = 'KeyNotFoundError';
    }
}

export class TamperDetectedError extends HsmError {
    constructor(message: string = 'HSM TAMPERED - SERVICE HALTED') {
        super(message, { code: 'TAMPER_DETECTED', statusCode: 503 });
        this.name = 'TamperDetectedError';
    }
}

export function isHsmError(error: unknown): error is HsmError {
    return error instanceof HsmError;
}
