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

interface ErrorLikeResponse {
    error?: string;
    message?: string;
    code?: string;
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
    inputEncoding?: 'auto' | 'hex' | 'utf8';
}

export interface VerifyMacPayload {
    data: string;
    mac: string;
    method: 'ALG1' | 'ALG3';
    keyLabel?: string;
    inputEncoding?: 'auto' | 'hex' | 'utf8';
}

export interface CalculateKcvPayload {
    keyLabel: string;
}

export interface HsmStatus {
    state: 'OPERATIONAL' | 'TAMPERED';
    uptimeSec: number;
    keysLoaded: number;
    commandCount: number;
    activeSessions: number;
    lastCommand: {
        code: string;
        at: string;
        durationMs: number;
        success: boolean;
        error?: string;
    } | null;
    leds: Record<string, string>;
    tamper: {
        tampered: boolean;
        reason: string | null;
        monitoredSince: string | null;
        monitoring: boolean;
    };
    defaultsLoadedAt: string;
}

export interface VulnerabilityConfig {
    allowReplay: boolean;
    weakKeysEnabled: boolean;
    verboseErrors: boolean;
    keyLeakInLogs: boolean;
}

export interface HsmStatusResponse {
    success: boolean;
    status: HsmStatus;
}

export interface HsmConfigResponse {
    success: boolean;
    vulnerabilities: VulnerabilityConfig;
    status: HsmStatus;
}

export interface UpdateHsmConfigPayload {
    vulnerabilities?: Partial<VulnerabilityConfig>;
    simulateTamper?: boolean;
    resetTamper?: boolean;
    reloadKeys?: boolean;
}

export interface HsmCommandResponse {
    success: boolean;
    command_code?: string;
    encrypted_pin_block?: string;
    mac?: string;
    verified?: boolean;
    calculated_mac?: string;
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
    let parsed: unknown = null;

    if (raw) {
        try {
            parsed = JSON.parse(raw);
        } catch {
            parsed = { message: raw };
        }
    }

    if (!response.ok) {
        const parsedObject = (parsed && typeof parsed === 'object') ? parsed as ErrorLikeResponse : null;
        const message = parsedObject?.error || parsedObject?.message || `Request failed (${response.status})`;
        throw new HsmApiError(message, response.status, parsedObject?.code, parsed);
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

export async function verifyMac(payload: VerifyMacPayload, token?: string | null): Promise<HsmCommandResponse> {
    return request<HsmCommandResponse, VerifyMacPayload>('/hsm/verify-mac', {
        method: 'POST',
        body: payload,
        token,
    });
}

export async function getHsmStatus(token?: string | null): Promise<HsmStatusResponse> {
    return request<HsmStatusResponse>('/hsm/status', { token });
}

export async function getHsmConfig(token?: string | null): Promise<HsmConfigResponse> {
    return request<HsmConfigResponse>('/hsm/config', { token });
}

export async function updateHsmConfig(
    payload: UpdateHsmConfigPayload,
    token?: string | null
): Promise<HsmConfigResponse> {
    return request<HsmConfigResponse, UpdateHsmConfigPayload>('/hsm/config', {
        method: 'POST',
        body: payload,
        token,
    });
}
