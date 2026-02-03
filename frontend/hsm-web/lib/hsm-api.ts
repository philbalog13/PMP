export class HsmApiError extends Error {
    public readonly status: number;
    public readonly code?: string;
    public readonly details?: unknown;

    constructor(message: string, status: number, code?: string, details?: unknown) {
        super(message);
        this.name = 'HsmApiError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions<TBody> {
    method?: HttpMethod;
    body?: TBody;
    token?: string | null;
    signal?: AbortSignal;
}

export interface HsmKey {
    label: string;
    type: string;
    value: string;
}

export interface HsmKeysResponse {
    keys: HsmKey[];
}

export interface HsmHealthResponse {
    status: string;
    service: string;
    version?: string;
}

export interface EncryptPinPayload {
    pin: string;
    pan: string;
    format: 'ISO-0' | 'ISO-1';
    keyLabel?: string;
}

export interface GenerateMacPayload {
    data: string;
    method: 'ALG1' | 'ALG3';
    keyLabel?: string;
}

export interface CalculateKcvPayload {
    keyLabel: string;
}

export interface HsmCommandResponse {
    success: boolean;
    command_code?: string;
    encrypted_pin_block?: string;
    mac?: string;
    kcv?: string;
    full_check_value?: string;
    trace?: string[];
    error?: string;
    code?: string;
}

function getStoredToken(): string | null {
    if (typeof window === 'undefined') {
        return null;
    }
    return window.localStorage.getItem('token');
}

async function request<TResponse, TBody = unknown>(
    path: string,
    options: RequestOptions<TBody> = {}
): Promise<TResponse> {
    const { method = 'GET', body, token, signal } = options;
    const resolvedToken = token ?? getStoredToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (resolvedToken) {
        headers.Authorization = `Bearer ${resolvedToken}`;
    }

    const response = await fetch(`/api${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
        signal,
    });

    const raw = await response.text();
    let parsed: any = null;

    if (raw) {
        try {
            parsed = JSON.parse(raw);
        } catch {
            parsed = { message: raw };
        }
    }

    if (!response.ok) {
        const message = parsed?.error || parsed?.message || `Request failed (${response.status})`;
        throw new HsmApiError(message, response.status, parsed?.code, parsed);
    }

    return parsed as TResponse;
}

export function maskKeyValue(value: string): string {
    if (value.length <= 8) {
        return value;
    }
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export async function getHsmKeys(token?: string | null): Promise<HsmKeysResponse> {
    return request<HsmKeysResponse>('/hsm/keys', { token });
}

export async function getHsmHealth(token?: string | null): Promise<HsmHealthResponse> {
    return request<HsmHealthResponse>('/hsm/health', { token });
}

export async function encryptPin(payload: EncryptPinPayload, token?: string | null): Promise<HsmCommandResponse> {
    return request<HsmCommandResponse, EncryptPinPayload>('/hsm/encrypt-pin', {
        method: 'POST',
        body: payload,
        token,
    });
}

export async function generateMac(payload: GenerateMacPayload, token?: string | null): Promise<HsmCommandResponse> {
    return request<HsmCommandResponse, GenerateMacPayload>('/hsm/generate-mac', {
        method: 'POST',
        body: payload,
        token,
    });
}

export async function calculateKcv(payload: CalculateKcvPayload, token?: string | null): Promise<HsmCommandResponse> {
    return request<HsmCommandResponse, CalculateKcvPayload>('/hsm/calculate-kcv', {
        method: 'POST',
        body: payload,
        token,
    });
}
